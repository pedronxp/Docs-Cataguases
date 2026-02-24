import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PdfService } from '@/services/pdf.service'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getAuthUser()
        // Apenas usuários logados podem gerar PDF
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = params

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
            // 5. Salva o Hash e o status no banco (em uma implementação real, o PDF seria enviado para o Supabase Storage)
            await prisma.portaria.update({
                where: { id },
                data: {
                    hashIntegridade: hash,
                    // Aqui poderíamos salvar a URL do storage: arquivoUrl: ...
                }
            })

            // Retorna o PDF como stream
            return new Response(pdfResult.value as any, {
                headers: {
                    'Content-Type': 'application/json', // Por enquanto retornamos o hash confirmação ou podemos mudar para application/pdf
                    'Content-Disposition': `attachment; filename="portaria-${portaria.numeroOficial.replace('/', '-')}.pdf"`
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
