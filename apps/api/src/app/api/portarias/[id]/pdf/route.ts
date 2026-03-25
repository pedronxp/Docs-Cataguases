import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'
import { VariableService } from '@/services/variable.service'

export const dynamic = 'force-dynamic'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: true,
                secretaria: true,
                setor:      true,
                criadoPor:  true,
                assinadoPor: true
            }
        })

        if (!portaria) return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })

        // ── 1. Já tem PDF salvo → retorna URL assinada ──────────────────────────
        if (portaria.pdfUrl) {
            try {
                const signedUrl = await StorageService.getSignedUrl(portaria.pdfUrl)
                return NextResponse.json({ url: signedUrl })
            } catch {
                console.warn('[PDF Route] URL assinada falhou — regenerando PDF...')
            }
        }

        // ── 2. Tenta gerar via DOCX (mesmo template do rascunho) ────────────────
        const templatePath = portaria.modelo?.docxTemplateUrl

        if (templatePath) {
            try {
                // Resolve variáveis de sistema usando o novo VariableService
                const varsMap = await VariableService.resolverVariaveis(id, { context: 'DOCX' })
                const formData = (portaria.formData ?? {}) as Record<string, any>
                const allVariables = { ...varsMap, ...formData }

                const docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
                const pdfResult = await PdfService.docxToPdf(docxBuffer)

                if (pdfResult.ok) {
                    const filePath = `portarias/${portaria.id}/pdf-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(filePath, pdfResult.value, 'application/pdf')
                    await prisma.portaria.update({ where: { id: portaria.id }, data: { pdfUrl: filePath } })
                    const signedUrl = await StorageService.getSignedUrl(filePath)
                    
                    // Log silencioso
                    await prisma.feedAtividade.create({
                        data: {
                            tipoEvento: 'PDF_GERADO',
                            mensagem: `PDF (DOCX) gerado para visualização`,
                            portariaId: id,
                            autorId: usuario.id,
                            secretariaId: portaria.secretariaId,
                        }
                    }).catch(() => {})

                    return NextResponse.json({ url: signedUrl })
                }

                console.warn('[PDF Route] docxToPdf falhou, tentando HTML fallback:', pdfResult.error)
            } catch (docxErr: any) {
                console.warn('[PDF Route] Erro no fluxo DOCX→PDF:', docxErr?.message)
            }
        }

        // ── 3. Fallback: HTML → PDF (legado, sem brasão) ────────────────────────
        const htmlBase = portaria.modelo?.conteudoHtml
        if (!htmlBase) {
            return NextResponse.json({ error: 'Modelo sem conteúdo configurado' }, { status: 404 })
        }

        // Resolve variáveis de sistema para o fallback HTML usando o VariableService
        const fallbackVarsMap = await VariableService.resolverVariaveis(id, { context: 'HTML' })
        
        let html = htmlBase
        const formData2 = (portaria.formData ?? {}) as Record<string, any>
        const allFallbackVars = { ...fallbackVarsMap, ...formData2 }
        
        Object.entries(allFallbackVars).forEach(([key, value]) => {
            html = html.split(`{{${key}}}`).join(String(value))
        })

        // Se o template HTML não tinha a tag {{SYS_ASSINATURA}} ou {{LINHA_ASSINATURA}}, 
        // o VariableService já resolveu mas precisamos garantir que o bloco de assinatura 
        // apareça se não estiver presente no template.
        if (!html.includes(fallbackVarsMap['SYS_ASSINATURA']) && !html.includes(fallbackVarsMap['LINHA_ASSINATURA'])) {
            const blocoAssinatura = fallbackVarsMap['SYS_ASSINATURA'] || fallbackVarsMap['LINHA_ASSINATURA'] || ''
            if (html.includes('</body>')) {
                html = html.replace('</body>', blocoAssinatura + '</body>')
            } else {
                html += '<br/><br/>' + blocoAssinatura
            }
        }

        const pdfResult = await PdfService.htmlToPdf(html)
        if (!pdfResult.ok) {
            return NextResponse.json({ error: `Falha na geração do PDF: ${pdfResult.error}` }, { status: 500 })
        }

        const filePath = `${portaria.secretariaId}/portaria_${portaria.id}_${Date.now()}.pdf`
        await StorageService.uploadBuffer(filePath, pdfResult.value, 'application/pdf')
        await prisma.portaria.update({ where: { id: portaria.id }, data: { pdfUrl: filePath } })

        const signedUrl = await StorageService.getSignedUrl(filePath)
        return NextResponse.json({ url: signedUrl })

    } catch (error: any) {
        console.error('[PDF Route] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao processar PDF' }, { status: 500 })
    }
}
