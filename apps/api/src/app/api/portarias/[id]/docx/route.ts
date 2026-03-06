import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: { select: { docxTemplateUrl: true, nome: true } }
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        // Prefere o rascunho editado; cai no template do modelo
        const portariaComCampos = portaria as typeof portaria & {
            docxRascunhoUrl: string | null
            modelo: { docxTemplateUrl: string; nome: string } | null
        }

        const path = portariaComCampos.docxRascunhoUrl || portariaComCampos.modelo?.docxTemplateUrl

        if (!path) {
            return NextResponse.json(
                { success: false, error: 'Arquivo DOCX não disponível para esta portaria' },
                { status: 404 }
            )
        }

        // URL absoluta (CDN externo) → retorna diretamente
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return NextResponse.json({ success: true, data: { url: path } })
        }

        // Caminho relativo no Supabase Storage → gera URL assinada (1h)
        const signedUrl = await StorageService.getSignedUrl(path, 3600)
        return NextResponse.json({ success: true, data: { url: signedUrl } })
    } catch (error: any) {
        console.error('[/docx]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao obter URL do DOCX' },
            { status: 500 }
        )
    }
}
