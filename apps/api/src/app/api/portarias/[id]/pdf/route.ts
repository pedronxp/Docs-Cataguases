import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id: params.id },
            include: { modelo: true }
        })

        if (!portaria) return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })

        // Se já tiver o PDF, retorna a URL assinada
        if (portaria.pdfUrl) {
            try {
                const signedUrl = await StorageService.getSignedUrl(portaria.pdfUrl)
                return NextResponse.json({ url: signedUrl })
            } catch (e) {
                console.warn('[PDF Route] Erro ao gerar URL assinada, tentando gerar novo PDF...')
            }
        }

        // Caso contrário, gera o PDF
        // Aqui precisaríamos injetar as variáveis no HTML do modelo
        // Por simplicidade agora, vamos usar o HTML base ou o rascunho se houver
        let htmlParaGerar = portaria.modelo.conteudoHtml

        // Injetar variáveis do formData no HTML
        const formData = portaria.formData as Record<string, any>
        Object.entries(formData).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
            htmlParaGerar = htmlParaGerar.replace(regex, String(value))
        })

        const pdfResult = await PdfService.htmlToPdf(htmlParaGerar)
        if (!pdfResult.ok) {
            return NextResponse.json({ error: `Falha na geração do PDF: ${pdfResult.error}` }, { status: 500 })
        }

        const fileName = `portaria_${portaria.id}_${Date.now()}.pdf`
        const filePath = `${portaria.secretariaId}/${fileName}`

        await StorageService.uploadBuffer(filePath, pdfResult.value, 'application/pdf')

        // Atualiza a portaria no banco
        await prisma.portaria.update({
            where: { id: portaria.id },
            data: { pdfUrl: filePath }
        })

        const signedUrl = await StorageService.getSignedUrl(filePath)
        return NextResponse.json({ url: signedUrl })

    } catch (error: any) {
        console.error('[PDF Route] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao processar PDF' }, { status: 500 })
    }
}
