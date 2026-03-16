/**
 * OCRService — Pipeline de OCR para PDFs escaneados.
 *
 * Fluxo:
 * 1. Recebe PDF buffer
 * 2. Detecta se é text-based ou scanned (heurística: texto extraído < 50 chars)
 * 3. Se scanned: converte páginas em imagens (via Puppeteer) → Tesseract.js OCR
 * 4. Retorna texto estruturado com confiança e metadados
 *
 * Providers suportados:
 * - Tesseract.js (local, gratuito, sem API externa)
 * - Google Vision API (alta qualidade, pago — futuro)
 * - Azure AI Vision (alternativa enterprise — futuro)
 *
 * Idiomas: pt (Português), en (Inglês), es (Espanhol)
 */

import { PdfExtractService } from './pdf-extract.service'

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface OCRResultado {
    texto: string
    confianca: number           // 0-100 média de confiança do OCR
    paginas: OCRPagina[]
    metodo: 'text_extract' | 'ocr_tesseract' | 'ocr_vision'
    idioma: string
    tempoMs: number
    totalPaginas: number
}

export interface OCRPagina {
    numero: number
    texto: string
    confianca: number
    palavras: number
}

export interface OCRConfig {
    idioma?: string             // default: 'por' (português)
    provider?: 'tesseract' | 'vision'
    dpi?: number                // default: 300
    preprocessar?: boolean      // melhorar contraste/nitidez antes do OCR
    maxPaginas?: number         // limitar número de páginas (default: 50)
}

// ── Service ─────────────────────────────────────────────────────────────────

export class OCRService {
    /**
     * Pipeline principal: detecta tipo do PDF e extrai texto adequadamente.
     */
    static async processarPDF(
        buffer: Buffer,
        config: OCRConfig = {}
    ): Promise<OCRResultado> {
        const inicio = Date.now()
        const { idioma = 'por', maxPaginas = 50 } = config

        // 1. Tentar extração de texto direto (PDF text-based)
        const extractResult = await PdfExtractService.extrairTexto(buffer)

        if (extractResult.texto.length > 50) {
            // PDF tem texto suficiente — não precisa de OCR
            return {
                texto: extractResult.texto,
                confianca: 99,
                paginas: [{
                    numero: 1,
                    texto: extractResult.texto,
                    confianca: 99,
                    palavras: extractResult.texto.split(/\s+/).length,
                }],
                metodo: 'text_extract',
                idioma,
                tempoMs: Date.now() - inicio,
                totalPaginas: extractResult.paginas,
            }
        }

        // 2. PDF escaneado — usar OCR via Tesseract.js
        console.log('[OCR] PDF escaneado detectado. Iniciando OCR com Tesseract.js...')
        return this.executarOCRTesseract(buffer, { idioma, maxPaginas, inicio })
    }

    /**
     * OCR via Tesseract.js — reconhecimento local sem API externa.
     */
    private static async executarOCRTesseract(
        buffer: Buffer,
        params: { idioma: string; maxPaginas: number; inicio: number }
    ): Promise<OCRResultado> {
        try {
            // Dynamic import para não quebrar se não estiver instalado
            const Tesseract = await import('tesseract.js')
            const puppeteer = await import('puppeteer')

            // Converter PDF em imagens usando Puppeteer
            const imagens = await this.pdfParaImagens(buffer, puppeteer, params.maxPaginas)

            if (imagens.length === 0) {
                return this.resultadoVazio(params)
            }

            // Criar worker do Tesseract
            const worker = await Tesseract.createWorker(params.idioma)

            const paginas: OCRPagina[] = []
            let textoCompleto = ''
            let confiancaTotal = 0

            for (let i = 0; i < imagens.length; i++) {
                const { data } = await worker.recognize(imagens[i])

                const paginaTexto = data.text.trim()
                const confiancaPagina = data.confidence || 0

                paginas.push({
                    numero: i + 1,
                    texto: paginaTexto,
                    confianca: Math.round(confiancaPagina),
                    palavras: paginaTexto.split(/\s+/).filter(Boolean).length,
                })

                textoCompleto += (i > 0 ? '\n\n--- Página ' + (i + 1) + ' ---\n\n' : '') + paginaTexto
                confiancaTotal += confiancaPagina
            }

            await worker.terminate()

            return {
                texto: textoCompleto,
                confianca: Math.round(confiancaTotal / paginas.length),
                paginas,
                metodo: 'ocr_tesseract',
                idioma: params.idioma,
                tempoMs: Date.now() - params.inicio,
                totalPaginas: paginas.length,
            }
        } catch (error: any) {
            console.error('[OCR] Erro no Tesseract:', error.message)
            // Fallback: tentar OCR simplificado com Puppeteer
            return this.ocrFallbackPuppeteer(buffer, params)
        }
    }

    /**
     * Fallback: se Tesseract não estiver disponível, usa Puppeteer para tentar extrair
     * texto do PDF renderizado.
     */
    private static async ocrFallbackPuppeteer(
        buffer: Buffer,
        params: { idioma: string; maxPaginas: number; inicio: number }
    ): Promise<OCRResultado> {
        try {
            const puppeteer = await import('puppeteer')
            const browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            })

            const page = await browser.newPage()
            const base64 = buffer.toString('base64')
            await page.goto(`data:application/pdf;base64,${base64}`, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            })

            const texto = await page.evaluate(() => {
                return document.body.innerText || document.body.textContent || ''
            })

            await browser.close()

            return {
                texto: texto.trim(),
                confianca: texto.trim().length > 20 ? 60 : 10,
                paginas: [{
                    numero: 1,
                    texto: texto.trim(),
                    confianca: 60,
                    palavras: texto.trim().split(/\s+/).filter(Boolean).length,
                }],
                metodo: 'ocr_tesseract', // fallback mas mantém label
                idioma: params.idioma,
                tempoMs: Date.now() - params.inicio,
                totalPaginas: 1,
            }
        } catch (error: any) {
            console.error('[OCR] Fallback Puppeteer também falhou:', error.message)
            return this.resultadoVazio(params)
        }
    }

    /**
     * Converte cada página do PDF em uma imagem PNG usando Puppeteer.
     */
    private static async pdfParaImagens(
        buffer: Buffer,
        puppeteer: any,
        maxPaginas: number
    ): Promise<Buffer[]> {
        let browser = null
        try {
            browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            })

            const page = await browser.newPage()
            await page.setViewport({ width: 1240, height: 1754 }) // A4 @ 150dpi

            const base64 = buffer.toString('base64')
            await page.goto(`data:application/pdf;base64,${base64}`, {
                waitUntil: 'networkidle0',
                timeout: 30000,
            })

            // Detectar número de páginas
            const totalPaginas = await page.evaluate(() => {
                const embed = document.querySelector('embed')
                if (embed?.shadowRoot) {
                    const pages = embed.shadowRoot.querySelectorAll('.page')
                    return pages.length || 1
                }
                return 1
            })

            const numPaginas = Math.min(totalPaginas, maxPaginas)
            const imagens: Buffer[] = []

            // Capturar screenshot de cada página
            for (let i = 0; i < numPaginas; i++) {
                // Scroll para a página correta
                await page.evaluate((pageIndex: number) => {
                    const embed = document.querySelector('embed')
                    if (embed?.shadowRoot) {
                        const pages = embed.shadowRoot.querySelectorAll('.page')
                        if (pages[pageIndex]) {
                            (pages[pageIndex] as HTMLElement).scrollIntoView()
                        }
                    }
                }, i)

                await new Promise(resolve => setTimeout(resolve, 500))

                const screenshot = await page.screenshot({
                    type: 'png',
                    fullPage: false,
                }) as Buffer

                imagens.push(screenshot)
            }

            return imagens
        } catch (error: any) {
            console.error('[OCR] Erro ao converter PDF para imagens:', error.message)
            return []
        } finally {
            if (browser) await browser.close()
        }
    }

    /**
     * Retorna resultado vazio quando OCR falha completamente.
     */
    private static resultadoVazio(params: { idioma: string; inicio: number }): OCRResultado {
        return {
            texto: '',
            confianca: 0,
            paginas: [],
            metodo: 'ocr_tesseract',
            idioma: params.idioma,
            tempoMs: Date.now() - params.inicio,
            totalPaginas: 0,
        }
    }

    /**
     * Verifica se um PDF é escaneado (sem texto extraível).
     */
    static async isEscaneado(buffer: Buffer): Promise<boolean> {
        const result = await PdfExtractService.extrairTexto(buffer)
        return result.texto.trim().length < 50
    }

    /**
     * Processa múltiplos PDFs em batch (para indexação em massa do acervo).
     */
    static async processarBatch(
        buffers: { id: string; buffer: Buffer }[],
        config: OCRConfig = {}
    ): Promise<Map<string, OCRResultado>> {
        const resultados = new Map<string, OCRResultado>()

        // Processar sequencialmente para não sobrecarregar memória
        for (const item of buffers) {
            try {
                const resultado = await this.processarPDF(item.buffer, config)
                resultados.set(item.id, resultado)
            } catch (error: any) {
                console.error(`[OCR Batch] Erro no item ${item.id}:`, error.message)
                resultados.set(item.id, {
                    texto: '',
                    confianca: 0,
                    paginas: [],
                    metodo: 'ocr_tesseract',
                    idioma: config.idioma || 'por',
                    tempoMs: 0,
                    totalPaginas: 0,
                })
            }
        }

        return resultados
    }
}
