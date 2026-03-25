import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { criarNotificacao } from '@/services/notificacao.service'
import { NumeracaoService } from '@/services/numeracao.service'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'
import { VariableService } from '@/services/variable.service'

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
    username?: string
    secretariaId?: string
}

const ROLES_PUBLICAR = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO']

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

        if (!ROLES_PUBLICAR.includes(session.role as string)) {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para publicar portarias' },
                { status: 403 }
            )
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: { 
                modelo: { select: { conteudoHtml: true, tipoDocumento: true, docxTemplateUrl: true } },
                assinadoPor: { select: { name: true } }
            }
        })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }
        
        const tipoDocumento: string = (portaria as any).modelo?.tipoDocumento ?? 'PORTARIA'

        if (portaria.status !== 'PRONTO_PUBLICACAO') {
            return NextResponse.json({
                success: false,
                error: 'Apenas portarias "Prontas para Publicação" podem ser publicadas'
            }, { status: 400 })
        }

        // Bloqueia publicação sem nenhum registro de assinatura
        if (portaria.assinaturaStatus === 'NAO_ASSINADA') {
            return NextResponse.json({
                success: false,
                error: 'Esta portaria não possui registro de assinatura. Registre uma assinatura antes de publicar.'
            }, { status: 400 })
        }

        // IP do cliente para auditoria
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'

        // 1. Alocação atômica do número oficial
        const numeroResult = await NumeracaoService.alocarNumero(id, tipoDocumento, (session.id as string), ip)
        if (!numeroResult.ok) {
            return NextResponse.json({ success: false, error: numeroResult.error }, { status: 500 })
        }

        const numeroOficial = numeroResult.value
        const agora = new Date()
        const nomeAutor = session.name || 'Sistema'

        let pdfUrlFinal: string | undefined

        // 2. Gerar PDF final
        try {
            const templatePath = portaria.modelo?.docxTemplateUrl
            if (templatePath) {
                // Flow DOCX usando VariableService
                const varsMap = await VariableService.resolverVariaveis(id, { context: 'DOCX' })
                varsMap['SYS_NUMERO'] = numeroOficial // Força o número oficial alocado agora
                
                const formData = (portaria.formData ?? {}) as Record<string, any>
                const allVariables = { ...varsMap, ...formData }

                const docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
                const pdfResult = await PdfService.docxToPdf(docxBuffer)

                if (pdfResult.ok) {
                    const pdfPath = `portarias/${id}/publicada-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                    pdfUrlFinal = pdfPath
                }
            } else if (portaria.modelo?.conteudoHtml) {
                // Flow HTML usando VariableService
                const fallbackVarsMap = await VariableService.resolverVariaveis(id, { context: 'HTML' })
                fallbackVarsMap['SYS_NUMERO'] = numeroOficial
                
                let htmlFinal = portaria.modelo.conteudoHtml
                const formData = (portaria.formData as Record<string, any>) || {}
                const allVariables = { ...fallbackVarsMap, ...formData }

                Object.entries(allVariables).forEach(([key, value]) => {
                    htmlFinal = htmlFinal.split(`{{${key}}}`).join(String(value))
                })

                // Garante que o bloco de assinatura apareça se não estiver presente no template
                if (!htmlFinal.includes(allVariables['SYS_ASSINATURA']) && !htmlFinal.includes(allVariables['LINHA_ASSINATURA'])) {
                    const bloco = allVariables['SYS_ASSINATURA'] || allVariables['LINHA_ASSINATURA'] || ''
                    if (htmlFinal.includes('</body>')) {
                        htmlFinal = htmlFinal.replace('</body>', bloco + '</body>')
                    } else {
                        htmlFinal += '<br/><br/>' + bloco
                    }
                }

                const pdfResult = await PdfService.htmlToPdf(htmlFinal)
                if (pdfResult.ok) {
                    const pdfPath = `portarias/${id}/publicada-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                    pdfUrlFinal = pdfPath
                }
            }
        } catch (e: any) {
            console.warn('[/publicar] Falha ao gerar PDF final:', e?.message)
        }

        // 3. Persistência e Transação Final
        const p = await prisma.$transaction(async (tx) => {
            const atualizada = await tx.portaria.update({
                where: { id },
                data: {
                    status: 'PUBLICADA',
                    numeroOficial,
                    dataPublicacao: agora,
                    ...(pdfUrlFinal ? { pdfUrl: pdfUrlFinal } : {})
                }
            })

            // Marca item na fila do jornal como concluído
            await (tx.jornalQueue as any).updateMany({
                where: { portariaId: id, status: { not: 'CONCLUIDA' } },
                data: { status: 'CONCLUIDA', updatedAt: agora }
            }).catch(() => {})

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PORTARIA_PUBLICADA',
                    mensagem: `Portaria publicada com número ${numeroOficial} por ${nomeAutor}`,
                    portariaId: id,
                    autorId: session.id as string,
                    secretariaId: portaria.secretariaId,
                    metadata: { numeroOficial, publicadaPor: session.id as string }
                }
            })

            return atualizada
        })

        // 4. Notificação
        try {
            const portariaComAutor = await prisma.portaria.findUnique({
                where: { id },
                select: { criadoPorId: true },
            }) as any
            if (portariaComAutor?.criadoPorId) {
                await criarNotificacao({
                    userId: portariaComAutor.criadoPorId,
                    tipo: 'PORTARIA_PUBLICADA',
                    mensagem: `"${portaria.titulo}" foi publicada com número ${numeroOficial}.`,
                    portariaId: id,
                    metadata: { numeroOficial },
                })
            }
        } catch {}

        return NextResponse.json({ success: true, data: p })
    } catch (error: any) {
        console.error('[/publicar]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Falha durante a publicação.' },
            { status: 500 }
        )
    }
}
