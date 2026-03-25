import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PdfService } from '@/services/pdf.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: true,
                criadoPor: true,
                secretaria: true,
                setor: true,
                assinadoPor: true
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        const agora = portaria.dataPublicacao || new Date()
        let pdfUrlFinal: string | undefined
        
        const templatePath = portaria.modelo?.docxTemplateUrl
        const numeroOficial = portaria.numeroOficial || 'S/N'
        const formData = (portaria.formData as Record<string, string>) || {}

        if (templatePath) {
            // Gerar via DOCX
            const MESES = ['janeiro','fevereiro','março','abril','maio','junho', 'julho','agosto','setembro','outubro','novembro','dezembro']
            const varsBD = await prisma.variavelSistema.findMany()
            const varsMap: Record<string, string> = {}
            for (const v of varsBD) varsMap[v.chave] = v.valor
            
            varsMap['SYS_DATA'] = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            varsMap['SYS_DATA_EXTENSO'] = `${agora.getDate()}º de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`
            varsMap['SYS_NUMERO'] = numeroOficial
            
            if (portaria.secretaria) {
                varsMap['SYS_SECRETARIA'] = portaria.secretaria.nome || ''
                varsMap['SYS_SECRETARIA_SIGLA'] = portaria.secretaria.sigla || ''
            }
            if (portaria.setor) {
                varsMap['SYS_SETOR'] = portaria.setor.nome || ''
            }
            if (portaria.criadoPor) {
                varsMap['SYS_AUTOR'] = portaria.criadoPor.name || portaria.criadoPor.username || ''
            }

            const assinante = portaria.assinadoPor?.name || 'Autoridade Competente'
            const dataAssinatura = portaria.assinadoEm
                ? new Date(portaria.assinadoEm).toLocaleString('pt-BR')
                : new Date().toLocaleString('pt-BR')

            if (portaria.assinaturaStatus === 'ASSINADA_DIGITAL' || portaria.assinaturaStatus === 'ASSINADA_MANUAL') {
                const strTipo = portaria.assinaturaStatus === 'ASSINADA_DIGITAL' ? 'DIGITALMENTE' : 'MANUALMENTE'
                varsMap['SYS_ASSINATURA'] = `DOCUMENTO ASSINADO ${strTipo} POR ${assinante} EM ${dataAssinatura}`
                const secretariaNome = portaria.secretaria?.nome || varsMap['SYS_SECRETARIA'] || ''
                varsMap['LINHA_ASSINATURA'] = `${assinante}\n${secretariaNome}\nAssinado ${strTipo.toLowerCase()} em ${dataAssinatura}`
            } else if (portaria.assinaturaStatus === 'DISPENSADA_COM_JUSTIFICATIVA') {
                varsMap['SYS_ASSINATURA'] = `ASSINATURA DISPENSADA — Registrado por ${assinante} em ${dataAssinatura}`
                varsMap['LINHA_ASSINATURA'] = `${assinante}\nAssinatura dispensada por ato formal\n${dataAssinatura}`
            } else {
                varsMap['SYS_ASSINATURA'] = ''
                varsMap['LINHA_ASSINATURA'] = ''
            }

            const allVariables = { ...varsMap, ...formData }

            const docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
            const pdfResult = await PdfService.docxToPdf(docxBuffer)

            if (pdfResult.ok) {
                const pdfPath = `portarias/${id}/documento-regenerado-${Date.now()}.pdf`
                await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                pdfUrlFinal = pdfPath
            } else {
                return NextResponse.json({ success: false, error: `Falha no CloudConvert: ${pdfResult.error}` }, { status: 500 })
            }
            
        } else if (portaria.modelo?.conteudoHtml) {
            // Gerar via HTML Legado
            let htmlFinal = portaria.modelo.conteudoHtml

            for (const [key, value] of Object.entries(formData)) {
                htmlFinal = htmlFinal.split(`{{${key}}}`).join(String(value))
            }

            htmlFinal = htmlFinal.split('{{SYS_NUMERO}}').join(numeroOficial)
            htmlFinal = htmlFinal.replace(/{{NUMERO_OFICIAL}}/g, numeroOficial) // compatibilidade
            const dataBR = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            htmlFinal = htmlFinal.split('{{SYS_DATA}}').join(dataBR)
            htmlFinal = htmlFinal.replace(/{{DATA_ATUAL}}/g, dataBR)

            const pdfResult = await PdfService.htmlToPdf(htmlFinal)
            if (pdfResult.ok) {
                const pdfPath = `portarias/${id}/documento-regenerado-${Date.now()}.pdf`
                await StorageService.uploadBuffer(pdfPath, pdfResult.value, 'application/pdf')
                pdfUrlFinal = pdfPath
            } else {
                return NextResponse.json({ success: false, error: `Falha no CloudConvert: ${pdfResult.error}` }, { status: 500 })
            }
        }

        if (pdfUrlFinal) {
            const atualizada = await prisma.portaria.update({
                where: { id },
                data: { pdfUrl: pdfUrlFinal }
            })
            
            return NextResponse.json({ success: true, data: atualizada })
        }

        return NextResponse.json({ success: false, error: 'Modelo não possui template DOCX nem HTML' }, { status: 400 })

    } catch (error: any) {
        console.error('Erro no endpoint de geração/regeneração de PDF:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao gerar PDF' }, { status: 500 })
    }
}
