import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'
import { RateLimitService, rateLimitHeaders } from '@/services/rate-limit.service'

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

        // ── Rate Limiting: 20 uploads/hora por usuário ────────────────────────
        const rl = await RateLimitService.check('PDF_UPLOAD', usuario.id)
        if (!rl.allowed) {
            const minutos = Math.ceil(rl.retryAfter / 60)
            return NextResponse.json(
                { error: `Limite de uploads atingido (${rl.max} por hora). Tente novamente em ${minutos} minuto${minutos !== 1 ? 's' : ''}.` },
                { status: 429, headers: rateLimitHeaders(rl) }
            )
        }

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

        // SEGURANÇA: validação de tipo de arquivo por MIME e extensão.
        // SVG com JS embutido, HTML e executáveis são vetores de ataque — bloqueados explicitamente.
        const ALLOWED_MIME_TYPES = new Set([
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword',                                                        // .doc
            'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        ])
        const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'gif', 'webp'])

        const declaredMime = file.type?.toLowerCase() || ''
        const ext = file.name.split('.').pop()?.toLowerCase() || ''

        if (!ALLOWED_MIME_TYPES.has(declaredMime) || !ALLOWED_EXTENSIONS.has(ext)) {
            return NextResponse.json({
                error: 'Tipo de arquivo não permitido. Use PDF, DOCX, PNG, JPG ou WebP.'
            }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Validação de magic bytes — verifica os primeiros bytes do conteúdo real,
        // não apenas o MIME declarado pelo cliente (que pode ser falsificado).
        const isPdf  = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 // %PDF
        const isDocx = buffer[0] === 0x50 && buffer[1] === 0x4B // PK (ZIP)
        const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
        const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8
        const isGif  = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46
        const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50

        const magicBytesOk = isPdf || isDocx || isPng || isJpeg || isGif || isWebp
        if (!magicBytesOk) {
            return NextResponse.json({
                error: 'Conteúdo do arquivo não corresponde ao tipo declarado.'
            }, { status: 400 })
        }
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
