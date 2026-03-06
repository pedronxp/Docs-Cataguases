import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import crypto from 'crypto'

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

        // Fetch portaria with modelo and variaveis
        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: {
                    select: {
                        id: true,
                        conteudoHtml: true,
                        variaveis: { select: { chave: true } }
                    }
                }
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        // Apenas o autor ou admin pode submeter
        if (portaria.criadoPorId !== session.id && session.role !== 'ADMIN_GERAL') {
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

        // Salvar DOCX editado se fornecido
        if (docxEditadoBase64) {
            const docxBuffer = Buffer.from(docxEditadoBase64, 'base64')
            const docxPath = `portarias/${id}/rascunho-${Date.now()}.docx`
            await StorageService.uploadBuffer(
                docxPath,
                docxBuffer,
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            updateData.docxRascunhoUrl = docxPath
        }

        // Substituir variáveis no HTML e gerar PDF
        const modelo = portaria.modelo
        if (modelo?.conteudoHtml) {
            let html = modelo.conteudoHtml
            const formData = (portaria.formData as Record<string, string>) || {}

            // Substituir todos os placeholders {{chave}} pelos valores do formData
            for (const [key, value] of Object.entries(formData)) {
                html = html.split(`{{${key}}}`).join(String(value))
            }

            // Resolver SYS_DATA (data da submissão)
            const dataBR = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            html = html.split('{{SYS_DATA}}').join(dataBR)

            // Resolver SYS_DATA_EXTENSO
            const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
            const agora = new Date()
            const dataExtenso = `${agora.getDate()}º de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`
            html = html.split('{{SYS_DATA_EXTENSO}}').join(dataExtenso)

            // Resolver SYS_PREFEITO a partir dos dados de gestão municipal
            try {
                const gestao = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
                if (gestao?.valor) {
                    const dados = JSON.parse(gestao.valor)
                    const gestaoAtual = Array.isArray(dados) ? dados[0] : dados
                    html = html.split('{{SYS_PREFEITO}}').join(gestaoAtual?.prefeito || 'PREFEITO NÃO CONFIGURADO')
                }
            } catch (e) {
                console.warn('[/submeter] Falha ao resolver SYS_PREFEITO:', e)
            }

            // SYS_NUMERO — ainda não alocado neste momento (alocado apenas na publicação)
            html = html.split('{{SYS_NUMERO}}').join('______')

            // Hash SHA-256 do conteúdo final para integridade
            const hash = crypto.createHash('sha256').update(html).digest('hex')
            updateData.hashIntegridade = hash

            // Gerar PDF via CloudConvert
            const pdfResult = await PdfService.htmlToPdf(html)
            if (pdfResult.ok) {
                const pdfPath = `portarias/${id}/documento-${Date.now()}.pdf`
                await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                updateData.pdfUrl = pdfPath
            } else {
                console.warn('[/submeter] Falha ao gerar PDF:', pdfResult.error)
                // Não bloqueia — PDF pode ser regenerado
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
                    tipoEvento: 'DOCUMENTO_SUBMETIDO',
                    mensagem: `Documento submetido para revisão por ${nomeAutor}`,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId,
                    metadata: {
                        temDocx: !!docxEditadoBase64,
                        temPdf: !!updateData.pdfUrl
                    }
                }
            })

            return p
        })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error: any) {
        console.error('[/submeter]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao submeter portaria' },
            { status: 500 }
        )
    }
}
