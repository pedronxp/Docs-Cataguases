import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { StorageService, supabaseAdmin } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portarias/[id]/stream?type=docx|pdf
 *
 * Proxy de streaming: autentica a sessão, busca o arquivo no Supabase Storage
 * e o serve diretamente com os headers corretos.
 *
 * Isso resolve dois problemas:
 *  1. window.open() bloqueado por popup blocker (agora usamos <a download>)
 *  2. Office Online / visualizador DOCX que precisa de URL pública e direta
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params
        const type = req.nextUrl.searchParams.get('type') || 'docx'

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            select: {
                id: true,
                titulo: true,
                pdfUrl: true,
                docxRascunhoUrl: true,
                secretariaId: true,
                modelo: { select: { nome: true } },
            }
        })

        if (!portaria) {
            return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })
        }

        let storagePath: string | null = null
        let contentType: string
        let fileName: string
        let disposition: 'inline' | 'attachment'

        if (type === 'pdf') {
            storagePath = portaria.pdfUrl
            contentType = 'application/pdf'
            fileName = `portaria-${portaria.titulo.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`
            disposition = 'inline' // PDF pode ser exibido inline no browser/iframe
        } else {
            // docx
            storagePath = portaria.docxRascunhoUrl
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            fileName = `rascunho-${portaria.titulo.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.docx`
            disposition = 'attachment' // DOCX deve ser baixado
        }

        if (!storagePath) {
            return NextResponse.json(
                { error: `Arquivo ${type.toUpperCase()} ainda não foi gerado para esta portaria.` },
                { status: 404 }
            )
        }

        // Faz o download do Supabase Storage diretamente
        const safePath = StorageService.sanitizePath(storagePath)
        const { data: blob, error } = await supabaseAdmin.storage
            .from('portarias')
            .download(safePath)

        if (error || !blob) {
            console.error('[stream] Erro ao baixar do Supabase:', error)
            return NextResponse.json(
                { error: 'Não foi possível obter o arquivo. Tente regenerar o documento.' },
                { status: 500 }
            )
        }

        const buffer = Buffer.from(await blob.arrayBuffer())

        // Registra log de download (não crítico)
        prisma.feedAtividade.create({
            data: {
                tipoEvento: type === 'pdf' ? 'PDF_BAIXADO' : 'DOCX_BAIXADO',
                mensagem: `Arquivo ${type.toUpperCase()} baixado por ${usuario.name || usuario.username}`,
                portariaId: id,
                autorId: usuario.id,
                secretariaId: portaria.secretariaId,
                metadata: { acao: 'stream_download', tipo: type },
            }
        }).catch(() => {/* log não crítico */})

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `${disposition}; filename="${fileName}"`,
                'Content-Length': String(buffer.byteLength),
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
                'X-Content-Type-Options': 'nosniff',
            }
        })

    } catch (err: any) {
        console.error('[stream] Erro interno:', err)
        return NextResponse.json({ error: 'Erro interno ao processar arquivo' }, { status: 500 })
    }
}
