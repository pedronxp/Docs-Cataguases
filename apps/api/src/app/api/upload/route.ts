import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload
 *
 * Endpoint genérico de upload — armazena arquivos no Supabase Storage
 * na pasta "uploads/" e retorna o path real no bucket.
 *
 * Para uploads específicos (templates de modelo, PDFs assinados),
 * use os endpoints dedicados:
 *   - POST /api/admin/modelos/upload-template  → templates DOCX
 *   - POST /api/portarias/[id]/upload-assinado → PDFs assinados
 */
export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
        }

        // Limite de 20MB
        const MAX_SIZE = 20 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'Arquivo excede o limite de 20MB' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const nomeSeguro = StorageService.sanitizePath(file.name)
        const path = `uploads/${Date.now()}_${nomeSeguro}`

        await StorageService.uploadBuffer(path, buffer, file.type || 'application/octet-stream')

        return NextResponse.json({
            success: true,
            data: {
                path,        // Caminho real no bucket Supabase Storage
                url: path,   // Compatibilidade com código legado
                name: file.name,
                size: file.size,
                type: file.type
            }
        })
    } catch (error: any) {
        console.error('[/api/upload]', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
}
