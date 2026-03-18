import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { criarNotificacao } from '@/services/notificacao.service'
import { NumeracaoService } from '@/services/numeracao.service'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'

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
        const numeroResult = await NumeracaoService.alocarNumero(id, tipoDocumento, (session.id as string), ip)
        if (!numeroResult.ok) {
            return NextResponse.json(
                { success: false, error: numeroResult.error },
                { status: 500 }
            )
        }

        const numeroOficial = numeroResult.value
        const agora = new Date()
        const nomeAutor = session.name || 'Sistema'

        let pdfUrlFinal: string | undefined
        // Gerar PDF final — falha aqui NÃO bloqueia a publicação
        try {
            const templatePath = portaria.modelo?.docxTemplateUrl
            if (templatePath) {
                // Flow DOCX
                const MESES = ['janeiro','fevereiro','março','abril','maio','junho', 'julho','agosto','setembro','outubro','novembro','dezembro']
                const varsBD = await prisma.variavelSistema.findMany()
                const varsMap: Record<string, string> = {}
                for (const v of varsBD) varsMap[v.chave] = v.valor
                varsMap['SYS_DATA'] = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                varsMap['SYS_DATA_EXTENSO'] = `${agora.getDate()}º de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`
                varsMap['SYS_NUMERO'] = numeroOficial

                try {
                    const gestao = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
                    if (gestao?.valor) {
                        const dados = JSON.parse(gestao.valor)
                        const g = Array.isArray(dados) ? dados[0] : dados
                        varsMap['SYS_PREFEITO'] = g?.prefeito || varsMap['SYS_PREFEITO'] || 'PREFEITO NÃO CONFIGURADO'
                    }
                } catch { /* mantém padrão */ }

                const portariaFull = await prisma.portaria.findUnique({
                    where: { id },
                    include: { secretaria: true, setor: true, criadoPor: true }
                })

                if (portariaFull?.secretaria) {
                    varsMap['SYS_SECRETARIA'] = portariaFull.secretaria.nome || ''
                    varsMap['SYS_SECRETARIA_SIGLA'] = portariaFull.secretaria.sigla || ''
                }
                if ((portariaFull as any)?.setor) {
                    varsMap['SYS_SETOR'] = (portariaFull as any).setor.nome || ''
                }
                if (portariaFull?.criadoPor) {
                    varsMap['SYS_AUTOR'] = portariaFull.criadoPor.name || portariaFull.criadoPor.username || ''
                }

                // ── Variáveis de assinatura ────────────────────────────────────
                const assinante = (portaria as any).assinadoPor?.name || 'Autoridade Competente'
                const dataAssinatura = portaria.assinadoEm
                    ? new Date(portaria.assinadoEm).toLocaleString('pt-BR')
                    : new Date().toLocaleString('pt-BR')

                if (portaria.assinaturaStatus === 'ASSINADA_DIGITAL' || portaria.assinaturaStatus === 'ASSINADA_MANUAL') {
                    const strTipo = portaria.assinaturaStatus === 'ASSINADA_DIGITAL' ? 'DIGITALMENTE' : 'MANUALMENTE'
                    // SYS_ASSINATURA — linha compacta de texto para DOCX
                    varsMap['SYS_ASSINATURA'] = `DOCUMENTO ASSINADO ${strTipo} POR ${assinante} EM ${dataAssinatura}`
                    // LINHA_ASSINATURA — linha de assinatura visual para modelos (assinante + cargo)
                    const secretariaNome = portariaFull?.secretaria?.nome || varsMap['SYS_SECRETARIA'] || ''
                    varsMap['LINHA_ASSINATURA'] = `${assinante}\n${secretariaNome}\nAssinado ${strTipo.toLowerCase()} em ${dataAssinatura}`
                } else if (portaria.assinaturaStatus === 'DISPENSADA_COM_JUSTIFICATIVA') {
                    varsMap['SYS_ASSINATURA'] = `ASSINATURA DISPENSADA — Registrado por ${assinante} em ${dataAssinatura}`
                    varsMap['LINHA_ASSINATURA'] = `${assinante}\nAssinatura dispensada por ato formal\n${dataAssinatura}`
                } else {
                    varsMap['SYS_ASSINATURA'] = ''
                    varsMap['LINHA_ASSINATURA'] = ''
                }

                const formData = (portaria.formData ?? {}) as Record<string, any>
                const allVariables = { ...varsMap, ...formData }

                const docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
                const pdfResult = await PdfService.docxToPdf(docxBuffer)

                if (pdfResult.ok) {
                    const pdfPath = `portarias/${id}/publicada-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                    pdfUrlFinal = pdfPath
                } else {
                    console.warn('[/publicar] PDF DOCX não gerado (CloudConvert):', pdfResult.error, '— publicação continua sem PDF.')
                }
            } else if (portaria.modelo?.conteudoHtml) {
                // Flow HTML Legado
                let htmlFinal = portaria.modelo.conteudoHtml
                const formData = (portaria.formData as Record<string, string>) || {}

                for (const [key, value] of Object.entries(formData)) {
                    htmlFinal = htmlFinal.split(`{{${key}}}`).join(String(value))
                }

                htmlFinal = htmlFinal.split('{{SYS_NUMERO}}').join(numeroOficial)

                const dataBR = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                htmlFinal = htmlFinal.split('{{SYS_DATA}}').join(dataBR)
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
                const dataExtenso = `${agora.getDate()}º de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`
                htmlFinal = htmlFinal.split('{{SYS_DATA_EXTENSO}}').join(dataExtenso)

                // ── Bloco de assinatura HTML ──────────────────────────────────
                const _assinante = (portaria as any).assinadoPor?.name || 'Autoridade Competente'
                const _assinadoEm = portaria.assinadoEm ? new Date(portaria.assinadoEm).toLocaleString('pt-BR') : agora.toLocaleString('pt-BR')

                if (portaria.assinaturaStatus === 'ASSINADA_DIGITAL' || portaria.assinaturaStatus === 'ASSINADA_MANUAL') {
                    const strTipo = portaria.assinaturaStatus === 'ASSINADA_DIGITAL' ? 'DIGITALMENTE' : 'MANUALMENTE'
                    // Bloco completo {{SYS_ASSINATURA}} — box com borda
                    const blocoAssinatura = [
                        `<div style="margin-top:40px;padding:15px;border:1px solid #ddd;border-radius:4px;font-family:sans-serif;font-size:10pt;max-width:450px;text-align:left;background-color:#fcfcfc;">`,
                        `<div style="font-weight:bold;margin-bottom:5px;color:#333;">DOCUMENTO ASSINADO ${strTipo}</div>`,
                        `<div style="color:#444;margin-bottom:3px;"><strong>Assinado por:</strong> ${_assinante}</div>`,
                        `<div style="color:#444;margin-bottom:3px;"><strong>Data e Hora:</strong> ${_assinadoEm}</div>`,
                        portaria.hashIntegridade ? `<div style="color:#666;font-size:8pt;margin-top:5px;word-break:break-all;"><strong>Hash:</strong> ${portaria.hashIntegridade}</div>` : '',
                        `</div>`,
                    ].join('')
                    if (htmlFinal.includes('{{SYS_ASSINATURA}}')) {
                        htmlFinal = htmlFinal.split('{{SYS_ASSINATURA}}').join(blocoAssinatura)
                    } else if (htmlFinal.includes('</body>')) {
                        htmlFinal = htmlFinal.replace('</body>', blocoAssinatura + '</body>')
                    } else {
                        htmlFinal += '<br/><br/>' + blocoAssinatura
                    }
                    // Linha de assinatura simples {{LINHA_ASSINATURA}} — para uso inline nos modelos
                    const linhaAssinatura = [
                        `<div style="margin-top:30px;text-align:center;font-family:sans-serif;">`,
                        `<div style="display:inline-block;border-top:1px solid #333;padding-top:6px;min-width:280px;">`,
                        `<div style="font-weight:bold;font-size:10pt;">${_assinante}</div>`,
                        `<div style="font-size:9pt;color:#555;">Assinado ${strTipo.toLowerCase()} em ${_assinadoEm}</div>`,
                        portaria.hashIntegridade ? `<div style="font-size:7pt;color:#999;margin-top:2px;">Hash: ${portaria.hashIntegridade.slice(0,20)}…</div>` : '',
                        `</div></div>`,
                    ].join('')
                    htmlFinal = htmlFinal.split('{{LINHA_ASSINATURA}}').join(linhaAssinatura)
                } else if (portaria.assinaturaStatus === 'DISPENSADA_COM_JUSTIFICATIVA') {
                    const blocoDispensada = `<div style="margin-top:30px;text-align:center;font-family:sans-serif;font-size:9pt;color:#777;border-top:1px solid #ccc;padding-top:6px;">Assinatura dispensada por ato formal — Registrado por ${_assinante} em ${_assinadoEm}</div>`
                    htmlFinal = htmlFinal.split('{{SYS_ASSINATURA}}').join(blocoDispensada)
                    htmlFinal = htmlFinal.split('{{LINHA_ASSINATURA}}').join(blocoDispensada)
                } else {
                    htmlFinal = htmlFinal.split('{{SYS_ASSINATURA}}').join('')
                    htmlFinal = htmlFinal.split('{{LINHA_ASSINATURA}}').join('')
                }

                const todasVariaveisGlobais = await prisma.variavelSistema.findMany()
                for (const vGlobal of todasVariaveisGlobais) {
                    if (['SYS_DATA', 'SYS_DATA_EXTENSO', 'SYS_NUMERO', 'SYS_GESTAO_DADOS'].includes(vGlobal.chave)) continue
                    if (vGlobal.valor) htmlFinal = htmlFinal.split(`{{${vGlobal.chave}}}`).join(vGlobal.valor)
                }

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
                } else {
                    console.warn('[/publicar] PDF HTML não gerado (CloudConvert):', pdfResult.error, '— publicação continua sem PDF.')
                }
            }
        } catch (e: any) {
            // Qualquer erro na geração de PDF é apenas um aviso — publicação continua
            console.warn('[/publicar] Falha ao gerar PDF (não bloqueia publicação):', e?.message || e)
        }

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

            await (tx.jornalQueue as any).updateMany({
                where: { portariaId: id, status: { not: 'CONCLUIDA' } },
                data: { status: 'CONCLUIDA', updatedAt: agora }
            }).catch((e: any) => {
                console.warn('[/publicar] JornalQueue updateMany skipped:', e.message)
            })

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
        }, { timeout: 15000, maxWait: 10000 }).catch(e => {
            console.error('Falha transacional na publicação', e)
            throw new Error('O banco de dados rejeitou a transação ou esgotou o limite de tempo.')
        })

        // Notifica o autor da portaria sobre a publicação
        try {
            const portariaComAutor = await prisma.portaria.findUnique({
                where: { id },
                select: { criadoPorId: true },
            }) as any
            if (portariaComAutor?.criadoPorId) {
                await criarNotificacao({
                    userId: portariaComAutor.criadoPorId,
                    tipo: 'PORTARIA_PUBLICADA',
                    mensagem: `"${portaria.titulo}" foi publicada com número ${numeroOficial} por ${nomeAutor}. Acesse para visualizar o documento final.`,
                    portariaId: id,
                    metadata: { numeroOficial },
                })
            }
        } catch (notifErr) {
            console.warn('[/publicar] Falha ao criar notificação:', notifErr)
        }

        return NextResponse.json({ success: true, data: p })
    } catch (error: any) {
        console.error('[/publicar]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Falha durante o processo de publicação. Por favor, tente novamente.' },
            { status: 500 }
        )
    }
}
