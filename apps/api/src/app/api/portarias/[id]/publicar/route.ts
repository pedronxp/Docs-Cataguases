import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'

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

        if (!ROLES_PUBLICAR.includes(session.role)) {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para publicar portarias' },
                { status: 403 }
            )
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: { modelo: { select: { conteudoHtml: true } } }
        })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }
        // tipoDocumento disponível após prisma migrate dev; fallback seguro para PORTARIA
        const tipoDocumento: string = (portaria as any).modelo?.tipoDocumento ?? 'PORTARIA'

        if (portaria.status !== 'PRONTO_PUBLICACAO') {
            return NextResponse.json({
                success: false,
                error: 'Apenas portarias "Prontas para Publicação" podem ser publicadas'
            }, { status: 400 })
        }

        // Bloqueia publicação sem nenhum registro de assinatura
        const portariaComAssinatura = portaria as typeof portaria & { assinaturaStatus: string }
        if (portariaComAssinatura.assinaturaStatus === 'NAO_ASSINADA') {
            return NextResponse.json({
                success: false,
                error: 'Esta portaria não possui registro de assinatura. Registre uma assinatura (digital, manual ou dispensada com justificativa) antes de publicar.'
            }, { status: 400 })
        }

        // IP do cliente para auditoria
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'

        // Alocação atômica do número oficial (SELECT FOR UPDATE)
        const numeroResult = await NumeracaoService.alocarNumero(id, tipoDocumento, session.id, ip)
        if (!numeroResult.ok) {
            return NextResponse.json(
                { success: false, error: numeroResult.error },
                { status: 500 }
            )
        }

        const numeroOficial = numeroResult.value
        const agora = new Date()
        const nomeAutor = session.name || 'Sistema'

        // Gerar PDF final com SYS_NUMERO real (agora conhecido)
        let pdfUrlFinal: string | undefined
        try {
            if (portaria.modelo?.conteudoHtml) {
                let htmlFinal = portaria.modelo.conteudoHtml
                const formData = (portaria.formData as Record<string, string>) || {}

                // Valores do formulário preenchidos pelo operador
                for (const [key, value] of Object.entries(formData)) {
                    htmlFinal = htmlFinal.split(`{{${key}}}`).join(String(value))
                }

                // SYS_NUMERO — agora com o número real alocado
                htmlFinal = htmlFinal.split('{{SYS_NUMERO}}').join(numeroOficial)

                // SYS_DATA e SYS_DATA_EXTENSO
                const dataBR = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                htmlFinal = htmlFinal.split('{{SYS_DATA}}').join(dataBR)
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
                const dataExtenso = `${agora.getDate()}º de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`
                htmlFinal = htmlFinal.split('{{SYS_DATA_EXTENSO}}').join(dataExtenso)

                // INJEÇÃO DINÂMICA DE TODAS AS VARIÁVEIS DE SISTEMA DO BANCO DE DADOS
                // Isso permite que se você criar {{SYS_SEC_ADM_NOME}}, {{SYS_NOME_PREFEITURA}}, eles entrem magicamente no PDF
                const todasVariaveisGlobais = await prisma.variavelSistema.findMany()
                for (const vGlobal of todasVariaveisGlobais) {
                    // Impede que sobrescreva as datas dinâmicas acima, caso existam no bd
                    if (['SYS_DATA', 'SYS_DATA_EXTENSO', 'SYS_NUMERO', 'SYS_GESTAO_DADOS'].includes(vGlobal.chave)) continue
                    if (vGlobal.valor) {
                        htmlFinal = htmlFinal.split(`{{${vGlobal.chave}}}`).join(vGlobal.valor)
                    }
                }

                // Fallback legado para o SYS_PREFEITO caso venha do JSON (se não houver chave livre no BD)
                if (!htmlFinal.includes('José') && !htmlFinal.includes('Prefeito')) {
                    const gestao = todasVariaveisGlobais.find(v => v.chave === 'SYS_GESTAO_DADOS')
                    if (gestao?.valor) {
                        try {
                            const dados = JSON.parse(gestao.valor)
                            const gestaoAtual = Array.isArray(dados) ? dados[0] : dados
                            htmlFinal = htmlFinal.split('{{SYS_PREFEITO}}').join(gestaoAtual?.prefeito || 'PREFEITO NÃO CONFIGURADO')
                        } catch (e) { }
                    }
                }

                const pdfResult = await PdfService.htmlToPdf(htmlFinal)
                if (pdfResult.ok) {
                    const pdfPath = `portarias/${id}/publicada-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                    pdfUrlFinal = pdfPath
                }
            }
        } catch (e) {
            console.warn('[/publicar] Falha ao gerar PDF final:', e)
            // Não bloqueia a publicação — o número já foi alocado
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: {
                    status: 'PUBLICADA',
                    numeroOficial,
                    dataPublicacao: agora,
                    ...(pdfUrlFinal ? { pdfUrl: pdfUrlFinal } : {})
                }
            })

            // Conclui a entrada do JornalQueue se existir
            await (tx.jornalQueue as any).updateMany({
                where: { portariaId: id, status: { not: 'CONCLUIDA' } },
                data: { status: 'CONCLUIDA', updatedAt: agora }
            }).catch((e: any) => {
                console.warn('[/publicar] JornalQueue updateMany skipped:', e.message)
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PUBLICADA',
                    mensagem: `Portaria publicada com número ${numeroOficial} por ${nomeAutor}`,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId,
                    metadata: { numeroOficial, publicadaPor: session.id }
                }
            })

            return p
        })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error: any) {
        console.error('[/publicar]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao publicar portaria' },
            { status: 500 }
        )
    }
}
