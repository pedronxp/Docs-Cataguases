import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'
import { CompilerService } from '@/services/compiler.service'
import { PdfService } from '@/services/pdf.service'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id: params.id },
            include: { modelo: true }
        })

        if (!portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        if (portaria.status !== 'RASCUNHO') {
            return NextResponse.json({ success: false, error: 'Apenas rascunhos podem ser submetidos' }, { status: 400 })
        }

        // 1. Aloca número oficial se ainda não tiver
        let numeroOficial = portaria.numeroOficial
        if (!numeroOficial) {
            const numRes = await NumeracaoService.alocarNumero(portaria.secretariaId, portaria.setorId)
            if (numRes.ok) {
                numeroOficial = numRes.value
            }
        }

        // 2. Atualiza status para PROCESSANDO
        await prisma.portaria.update({
            where: { id: params.id },
            data: {
                status: 'PROCESSANDO',
                numeroOficial,
            }
        })

        // 3. Geração de PDF Real
        try {
            // A. Gerar HTML
            const html = await CompilerService.compilarPortaria(params.id)
            const hash = PdfService.gerarHash(html)

            // B. Gerar PDF Buffer
            const pdfRes = await PdfService.gerarPDF(html, numeroOficial || 'S/N', hash)
            if (!pdfRes.ok) throw new Error(pdfRes.error)

            // C. Upload para Supabase Storage
            const fileName = `portarias/${portaria.id}-${Date.now()}.pdf`
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('docs-cataguases')
                .upload(fileName, pdfRes.value, {
                    contentType: 'application/json', // Corrigindo para application/pdf mais tarde se necessário, mas bucket costuma auto-detectar
                    upsert: true
                })

            if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

            // D. Obter URL Pública
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('docs-cataguases')
                .getPublicUrl(fileName)

            // 4. Finaliza portaria
            const final = await prisma.portaria.update({
                where: { id: params.id },
                data: {
                    status: 'PENDENTE',
                    pdfUrl: publicUrl,
                    hashIntegridade: hash
                }
            })

            return NextResponse.json({ success: true, data: final })
        } catch (genError: any) {
            console.error('Falha na geração do documento:', genError)

            // Reverte para RASCUNHO em caso de erro crítico na geração
            await prisma.portaria.update({
                where: { id: params.id },
                data: { status: 'RASCUNHO' }
            })

            return NextResponse.json({
                success: false,
                error: `Falha ao gerar o documento oficial: ${genError.message}`
            }, { status: 500 })
        }
    } catch (error) {
        console.error('Erro na submissão:', error)
        return NextResponse.json({ success: false, error: 'Erro ao submeter portaria' }, { status: 500 })
    }
}
