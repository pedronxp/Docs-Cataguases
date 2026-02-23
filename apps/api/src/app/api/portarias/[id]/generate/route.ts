import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        // Apenas usuários logados podem gerar PDF
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params

        // 1. Busca a portaria e os dados do modelo
        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: true,
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        if (!portaria.numeroOficial) {
            return NextResponse.json({ success: false, error: 'Portaria ainda não possui número oficial. Submeta o documento primeiro.' }, { status: 400 })
        }

        // 2. Prepara o HTML final (substituição de variáveis)
        let htmlFinal = portaria.modelo.conteudoHtml
        const formData = portaria.formData as Record<string, string>

        // Substitui variáveis do formulário no HTML
        Object.entries(formData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g')
            htmlFinal = htmlFinal.replace(regex, value)
        })

        // Injeta variáveis de sistema
        htmlFinal = htmlFinal.replace(/{{NUMERO_OFICIAL}}/g, portaria.numeroOficial)
        htmlFinal = htmlFinal.replace(/{{DATA_ATUAL}}/g, new Date().toLocaleDateString('pt-BR'))

        // 3. Gera o Hash de Integridade
        const hash = PdfService.gerarHash(htmlFinal)

        // 4. Gera o PDF
        const pdfResult = await PdfService.gerarPDF(htmlFinal, portaria.numeroOficial, hash)

        if (pdfResult.ok) {
            // 5. Upload para o Supabase Storage
            const nomeArquivo = `portaria-${portaria.numeroOficial.replace('/', '-')}-${Date.now()}.pdf`
            const caminhoStorage = `${portaria.secretariaId}/${nomeArquivo}`

            const uploadResult = await StorageService.uploadDocumento(
                caminhoStorage,
                pdfResult.value
            )

            const pdfUrl = uploadResult.ok ? uploadResult.value : null

            // 6. Salva o Hash e o link do PDF no banco
            await prisma.portaria.update({
                where: { id },
                data: {
                    hashIntegridade: hash,
                    pdfUrl: pdfUrl,
                    status: 'PROCESSANDO'
                }
            })

            // Retorna o PDF para download imediato
            return new Response(new Uint8Array(pdfResult.value), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${nomeArquivo}"`
                }
            })
        } else {
            return NextResponse.json({ success: false, error: pdfResult.error }, { status: 500 })
        }

    } catch (error) {
        console.error('Erro no endpoint de geração de PDF:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao gerar PDF' }, { status: 500 })
    }
}
