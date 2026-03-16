import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { PdfExtractService } from '@/services/pdf-extract.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/pdf/extract
 *
 * Extrai texto, metadata e tabelas de um arquivo PDF.
 * Aceita upload via FormData (campo "file") ou URL do Supabase Storage (campo "url").
 *
 * Retorna:
 * {
 *   success: true,
 *   data: {
 *     texto: string,
 *     paginas: number,
 *     metadata: { titulo?, autor?, criador?, produtor? },
 *     tabelas: string[][],
 *     resumo: string (primeiros 500 chars)
 *   }
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        let buffer: Buffer

        const contentType = req.headers.get('content-type') || ''

        if (contentType.includes('multipart/form-data')) {
            // Upload direto do arquivo PDF
            const formData = await req.formData()
            const file = formData.get('file') as File | null

            if (!file) {
                return NextResponse.json(
                    { success: false, error: 'Campo "file" é obrigatório' },
                    { status: 400 }
                )
            }

            if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
                return NextResponse.json(
                    { success: false, error: 'Apenas arquivos PDF são aceitos' },
                    { status: 400 }
                )
            }

            // Limite de 50MB
            const MAX_SIZE = 50 * 1024 * 1024
            if (file.size > MAX_SIZE) {
                return NextResponse.json(
                    { success: false, error: 'Arquivo excede o limite de 50MB' },
                    { status: 400 }
                )
            }

            buffer = Buffer.from(await file.arrayBuffer())
        } else if (contentType.includes('application/json')) {
            // URL do Supabase Storage ou base64
            const body = await req.json()

            if (body.base64) {
                buffer = Buffer.from(body.base64, 'base64')
            } else if (body.url) {
                // Buscar PDF de URL remota
                const res = await fetch(body.url, { signal: AbortSignal.timeout(30000) })
                if (!res.ok) {
                    return NextResponse.json(
                        { success: false, error: 'Não foi possível baixar o PDF da URL fornecida' },
                        { status: 400 }
                    )
                }
                buffer = Buffer.from(await res.arrayBuffer())
            } else {
                return NextResponse.json(
                    { success: false, error: 'Envie "file" via FormData, ou "url"/"base64" via JSON' },
                    { status: 400 }
                )
            }
        } else {
            return NextResponse.json(
                { success: false, error: 'Content-Type deve ser multipart/form-data ou application/json' },
                { status: 400 }
            )
        }

        // Verificar se é realmente um PDF (magic bytes)
        if (buffer.length < 5 || buffer.toString('ascii', 0, 5) !== '%PDF-') {
            return NextResponse.json(
                { success: false, error: 'O arquivo enviado não é um PDF válido' },
                { status: 400 }
            )
        }

        // Extrair texto e metadata
        const resultado = await PdfExtractService.extrairTexto(buffer)

        // Extrair tabelas do texto
        const tabelas = PdfExtractService.extrairTabelas(resultado.texto)

        // Gerar resumo (primeiros 500 caracteres limpos)
        const resumo = resultado.texto
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 500)

        return NextResponse.json({
            success: true,
            data: {
                texto: resultado.texto,
                paginas: resultado.paginas,
                metadata: resultado.metadata,
                tabelas,
                resumo: resumo || '(Nenhum texto extraído — PDF pode ser escaneado/imagem)',
                tamanhoBytes: buffer.length,
            }
        })
    } catch (error: any) {
        console.error('[/api/pdf/extract] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao processar extração do PDF' },
            { status: 500 }
        )
    }
}
