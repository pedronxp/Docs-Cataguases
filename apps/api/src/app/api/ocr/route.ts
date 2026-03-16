import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { OCRService } from '@/services/ocr.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ocr
 * Processa um PDF com OCR (extração de texto de PDFs escaneados).
 *
 * Body: FormData com campo 'file' (PDF) e opcionais 'idioma', 'maxPaginas'.
 * Retorna: texto extraído, confiança, metadados.
 */
export async function POST(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'Arquivo PDF não enviado. Use o campo "file".' }, { status: 400 })
        }

        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
        }

        // Limitar tamanho (50MB)
        const MAX_SIZE = 50 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json({
                error: `Arquivo muito grande (${Math.round(file.size / 1024 / 1024)}MB). Máximo: 50MB.`
            }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const idioma = (formData.get('idioma') as string) || 'por'
        const maxPaginas = parseInt(formData.get('maxPaginas') as string) || 50

        // Processar OCR
        const resultado = await OCRService.processarPDF(buffer, {
            idioma,
            maxPaginas,
        })

        return NextResponse.json({
            success: true,
            data: {
                texto: resultado.texto,
                confianca: resultado.confianca,
                metodo: resultado.metodo,
                idioma: resultado.idioma,
                tempoMs: resultado.tempoMs,
                totalPaginas: resultado.totalPaginas,
                totalPalavras: resultado.texto.split(/\s+/).filter(Boolean).length,
                paginas: resultado.paginas.map(p => ({
                    numero: p.numero,
                    palavras: p.palavras,
                    confianca: p.confianca,
                    preview: p.texto.substring(0, 200) + (p.texto.length > 200 ? '...' : ''),
                })),
            }
        })
    } catch (error: any) {
        console.error('[OCR API] Erro:', error)
        return NextResponse.json({
            error: 'Erro interno ao processar OCR',
            detalhes: error.message
        }, { status: 500 })
    }
}

/**
 * GET /api/ocr/check
 * Verifica se o serviço de OCR está disponível.
 */
export async function GET() {
    try {
        let tesseractDisponivel = false
        try {
            await import('tesseract.js')
            tesseractDisponivel = true
        } catch {}

        return NextResponse.json({
            success: true,
            data: {
                status: 'online',
                providers: {
                    tesseract: tesseractDisponivel,
                    puppeteerFallback: true,
                },
                idiomasSuportados: ['por', 'eng', 'spa'],
                maxTamanhoMB: 50,
                maxPaginas: 50,
            }
        })
    } catch (error) {
        return NextResponse.json({ error: 'Serviço OCR indisponível' }, { status: 500 })
    }
}
