import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'
import crypto from 'crypto'

const MESES_SUBMETER = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

async function resolverVariaveisParaSubmeter(portaria: any): Promise<Record<string, string>> {
    const agora = new Date()
    const dataBR = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const dataExtenso = `${agora.getDate()}º de ${MESES_SUBMETER[agora.getMonth()]} de ${agora.getFullYear()}`

    const varsBD = await prisma.variavelSistema.findMany()
    const varsMap: Record<string, string> = {}
    for (const v of varsBD) {
        varsMap[v.chave] = v.valor
    }

    varsMap['SYS_DATA'] = dataBR
    varsMap['SYS_DATA_EXTENSO'] = dataExtenso
    varsMap['SYS_NUMERO'] = portaria.numeroOficial || '______'

    try {
        const gestao = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
        if (gestao?.valor) {
            const dados = JSON.parse(gestao.valor)
            const gestaoAtual = Array.isArray(dados) ? dados[0] : dados
            varsMap['SYS_PREFEITO'] = gestaoAtual?.prefeito || varsMap['SYS_PREFEITO'] || 'PREFEITO NÃO CONFIGURADO'
        }
    } catch { /* mantém valor padrão */ }

    if (portaria.secretaria) {
        varsMap['SYS_SECRETARIA'] = portaria.secretaria.nome || ''
        varsMap['SYS_SECRETARIA_SIGLA'] = portaria.secretaria.sigla || ''
    }
    if (portaria.setor) {
        varsMap['SYS_SETOR'] = portaria.setor.nome || ''
        varsMap['SYS_SETOR_SIGLA'] = portaria.setor.sigla || ''
    }
    if (portaria.criadoPor) {
        varsMap['SYS_AUTOR'] = portaria.criadoPor.name || portaria.criadoPor.username || ''
    }

    return varsMap
}

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
            status: 'EM_REVISAO_ABERTA'
        }

        // ── Gera DOCX preenchido + PDF a partir do template Word ─────────────────
        const modelo = portaria.modelo
        const templatePath = modelo?.docxTemplateUrl

        if (templatePath) {
            try {
                const formData = (portaria.formData ?? {}) as Record<string, any>
                const varsSistema = await resolverVariaveisParaSubmeter(portaria)
                const allVariables: Record<string, any> = { ...varsSistema, ...formData }

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

                // 4. Converte DOCX → PDF via CloudConvert (idêntico ao template Word)
                const pdfResult = await PdfService.docxToPdf(docxBuffer)
                if (pdfResult.ok) {
                    const pdfPath = `portarias/${id}/documento-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                    updateData.pdfUrl = pdfPath
                } else {
                    console.warn('[/submeter] Falha ao converter DOCX→PDF:', pdfResult.error)
                    // Não bloqueia — PDF pode ser regenerado
                }
            } catch (docxErr: any) {
                console.warn('[/submeter] Falha ao gerar DOCX preenchido:', docxErr?.message)
                // Fallback: tenta gerar PDF pelo HTML se o DOCX falhar
                if (modelo?.conteudoHtml) {
                    console.warn('[/submeter] Usando fallback HTML→PDF')
                    let html = modelo.conteudoHtml
                    // Usa todas as variáveis de sistema (já resolvidas) + formData
                    const formData = (portaria.formData as Record<string, string>) || {}
                    const allFallbackVars: Record<string, string> = {
                        ...await resolverVariaveisParaSubmeter(portaria),
                        ...formData
                    }
                    for (const [key, value] of Object.entries(allFallbackVars)) {
                        html = html.split(`{{${key}}}`).join(String(value))
                    }
                    // Limpa tags não substituídas
                    html = html.replace(/\{\{[^}]+\}\}/g, '')
                    const pdfResult = await PdfService.htmlToPdf(html)
                    if (pdfResult.ok) {
                        const pdfPath = `portarias/${id}/documento-${Date.now()}.pdf`
                        await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                        updateData.pdfUrl = pdfPath
                    }
                }
            }
        } else if (modelo?.conteudoHtml) {
            // Modelo sem template DOCX — gera pelo HTML (legado)
            console.warn('[/submeter] Modelo sem docxTemplateUrl, usando HTML→PDF')
            let html = modelo.conteudoHtml
            const formData = (portaria.formData as Record<string, string>) || {}
            const allLegacyVars: Record<string, string> = {
                ...await resolverVariaveisParaSubmeter(portaria),
                ...formData
            }
            for (const [key, value] of Object.entries(allLegacyVars)) {
                html = html.split(`{{${key}}}`).join(String(value))
            }
            // Limpa tags não substituídas
            html = html.replace(/\{\{[^}]+\}\}/g, '')
            const pdfResult = await PdfService.htmlToPdf(html)
            if (pdfResult.ok) {
                const pdfPath = `portarias/${id}/documento-${Date.now()}.pdf`
                await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                updateData.pdfUrl = pdfPath
            }
        }

        const nomeAutor = session.name || session.username || 'Sistema'

        // Transação: atualiza portaria + registra evento no feed
        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: updateData
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PORTARIA_SUBMETIDA',
                    mensagem: `Documento submetido para revisão por ${nomeAutor}`,
                    portariaId: id,
                    autorId: (session.id as string),
                    secretariaId: portaria.secretariaId,
                    metadata: {
                        temDocx: !!docxEditadoBase64,
                        temPdf: !!updateData.pdfUrl
                    }
                }
            })

            return p
        })

        const semDocumento = !updateData.pdfUrl && !updateData.docxRascunhoUrl
        return NextResponse.json({
            success: true,
            data: atualizada,
            warning: semDocumento
                ? 'Portaria submetida, mas o documento não pôde ser gerado. O modelo pode não possuir template configurado.'
                : undefined
        })
    } catch (error: any) {
        console.error('[/submeter]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao submeter portaria' },
            { status: 500 }
        )
    }
}
