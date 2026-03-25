import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'
import { VariableService } from '@/services/variable.service'
import crypto from 'crypto'
import { Client } from '@upstash/qstash'

const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null;

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
    username?: string
    secretariaId?: string
    setorId?: string
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload

        const { id } = await params
        const body = await request.json()
        const { docxEditadoBase64 } = body

        // Fetch portaria com todas as relações necessárias para gerar o DOCX preenchido
        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: {
                    select: {
                        id: true,
                        nome: true,
                        conteudoHtml: true,
                        docxTemplateUrl: true,
                        variaveis: { select: { chave: true } }
                    }
                },
                secretaria: { select: { nome: true, sigla: true } },
                setor:      { select: { nome: true, sigla: true } },
                criadoPor:  { select: { name: true, username: true } },
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        // Apenas o autor ou admin pode submeter
        if (portaria.criadoPorId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Apenas o autor pode submeter a portaria' }, { status: 403 })
        }

        // Guard de status
        if (!['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)) {
            return NextResponse.json({
                success: false,
                error: `Portaria não pode ser submetida no status "${portaria.status}"`
            }, { status: 400 })
        }

        const updateData: Record<string, any> = {
            status: 'PROCESSANDO'
        }

        // ── Gera DOCX preenchido localmente ─────────────────
        const modelo = portaria.modelo
        const templatePath = modelo?.docxTemplateUrl

        let varsSistema: Record<string, any> = {}
        let allVariables: Record<string, any> = {}

        if (templatePath) {
            try {
                const formData = (portaria.formData ?? {}) as Record<string, any>
                varsSistema = await VariableService.resolverVariaveis(id, { context: 'DOCX' })
                allVariables = { ...varsSistema, ...formData }

                // 1. Preenche o template DOCX com as variáveis
                let docxBuffer: Buffer
                if (docxEditadoBase64) {
                    // Usuário enviou DOCX editado manualmente — usa ele diretamente
                    docxBuffer = Buffer.from(docxEditadoBase64, 'base64')
                } else {
                    docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
                }

                // 2. Salva o DOCX preenchido no storage (atualiza rascunho)
                const CHAVES_PESSOA = ['NOMEADO', 'NOME', 'SERVIDOR', 'DESIGNADO', 'EXONERADO', 'CONTRATADO', 'INTERESSADO']
                const pessoa = CHAVES_PESSOA
                    .map(k => allVariables[k] || allVariables[k.toLowerCase()])
                    .find(v => v && String(v).trim() !== '')
                const modeloNome = modelo?.nome || 'Documento'
                const sufixo = pessoa ? ` - ${String(pessoa).trim()}` : ''
                const baseName = `${modeloNome}${sufixo}`.replace(/[<>:"/\\|?*]/g, '').trim()
                const docxPath = `${portaria.secretariaId}/${baseName}.docx`

                await StorageService.uploadBuffer(
                    docxPath,
                    docxBuffer,
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                )
                updateData.docxRascunhoUrl = docxPath

                // 3. Hash SHA-256 do DOCX para integridade
                const hash = crypto.createHash('sha256').update(docxBuffer).digest('hex')
                updateData.hashIntegridade = hash

            } catch (docxErr: any) {
                console.warn('[/submeter] Falha ao gerar DOCX preenchido:', docxErr?.message)
                if (modelo?.conteudoHtml) {
                    varsSistema = await VariableService.resolverVariaveis(id, { context: 'HTML' })
                    allVariables = { ...varsSistema, ...((portaria.formData as Record<string, string>) || {}) }
                }
            }
        } else if (modelo?.conteudoHtml) {
            varsSistema = await VariableService.resolverVariaveis(id, { context: 'HTML' })
            allVariables = { ...varsSistema, ...((portaria.formData as Record<string, string>) || {}) }
        }

        const nomeAutor = session.name || session.username || 'Sistema'

        // Transação: atualiza portaria (status: PROCESSANDO) + registra evento
        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: updateData
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PORTARIA_SUBMETIDA',
                    mensagem: `Documento em processamento para revisão por ${nomeAutor}`,
                    portariaId: id,
                    autorId: (session.id as string),
                    secretariaId: portaria.secretariaId,
                    metadata: {
                        temDocx: !!docxEditadoBase64,
                        assincrono: true
                    }
                }
            })

            return p
        })

        // Dispara Webhook via QStash ou fetch local
        const webhookPayload = {
            portariaId: id,
            docxRascunhoUrl: updateData.docxRascunhoUrl,
            htmlFallback: modelo?.conteudoHtml,
            fallbackVars: allVariables,
            sessionUserId: session.id,
            nomeAutor: nomeAutor
        }

        if (qstash && process.env.VERCEL_URL) {
            const baseUrl = `https://${process.env.VERCEL_URL}`
            await qstash.publishJSON({
                url: `${baseUrl}/api/webhooks/qstash/pdf-generator`,
                body: webhookPayload,
                retries: 3
            })
        } else {
            // Fallback para desenvolvimento local ou falta de token
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
            fetch(`${baseUrl}/api/webhooks/qstash/pdf-generator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload)
            }).catch(e => console.error('Erro ao chamar webhook local', e))
        }

        return NextResponse.json({
            success: true,
            data: atualizada,
            message: 'Documento enviado para processamento. Aguarde alguns instantes.'
        })
    } catch (error: any) {
        console.error('[/submeter]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao submeter portaria' },
            { status: 500 }
        )
    }
}
