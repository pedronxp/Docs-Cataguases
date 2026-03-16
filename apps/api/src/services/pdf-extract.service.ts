import puppeteer from 'puppeteer'

export interface PdfExtractResult {
    texto: string
    paginas: number
    metadata: {
        titulo?: string
        autor?: string
        criador?: string
        produtor?: string
    }
}

export class PdfExtractService {
    /**
     * Extrai texto de um PDF usando Puppeteer (Chrome headless).
     * Suporta PDFs text-based. Para scanned PDFs, retorna texto vazio.
     */
    static async extrairTexto(buffer: Buffer): Promise<PdfExtractResult> {
        // Abordagem 1: Parse direto dos text streams do PDF
        const textoRaw = this.parseTextStreams(buffer)
        const metadata = this.parseMetadata(buffer)

        if (textoRaw.trim().length > 50) {
            // PDF tem texto suficiente via parse direto
            const paginas = this.countPages(buffer)
            return {
                texto: textoRaw.trim(),
                paginas,
                metadata,
            }
        }

        // Abordagem 2: Usar Puppeteer para renderizar e extrair
        return this.extrairComPuppeteer(buffer, metadata)
    }

    /**
     * Parse básico de text streams de um PDF.
     * Extrai conteúdo entre BT...ET (Begin Text / End Text) operators.
     */
    private static parseTextStreams(buffer: Buffer): string {
        const content = buffer.toString('latin1')
        const textParts: string[] = []

        // Extrair strings entre parênteses nos text objects
        const textObjRegex = /BT\s([\s\S]*?)ET/g
        let match: RegExpExecArray | null

        while ((match = textObjRegex.exec(content)) !== null) {
            const block = match[1]
            // Extrair strings literais (...)
            const stringRegex = /\(([^)]*)\)/g
            let strMatch: RegExpExecArray | null
            while ((strMatch = stringRegex.exec(block)) !== null) {
                const decoded = this.decodePdfString(strMatch[1])
                if (decoded.trim()) {
                    textParts.push(decoded)
                }
            }
            // Extrair hex strings <...>
            const hexRegex = /<([0-9A-Fa-f]+)>/g
            let hexMatch: RegExpExecArray | null
            while ((hexMatch = hexRegex.exec(block)) !== null) {
                const decoded = this.decodeHexString(hexMatch[1])
                if (decoded.trim()) {
                    textParts.push(decoded)
                }
            }
        }

        return textParts.join(' ').replace(/\s+/g, ' ')
    }

    /**
     * Decodifica escape sequences do PDF.
     */
    private static decodePdfString(s: string): string {
        return s
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\([()])/g, '$1')
            .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    }

    /**
     * Decodifica hex string do PDF.
     */
    private static decodeHexString(hex: string): string {
        let result = ''
        for (let i = 0; i < hex.length; i += 2) {
            const charCode = parseInt(hex.substr(i, 2), 16)
            if (charCode > 31) result += String.fromCharCode(charCode)
        }
        return result
    }

    /**
     * Conta páginas do PDF procurando por /Type /Page.
     */
    private static countPages(buffer: Buffer): number {
        const content = buffer.toString('latin1')
        const matches = content.match(/\/Type\s*\/Page[^s]/g)
        return matches ? matches.length : 1
    }

    /**
     * Extrai metadata do PDF (título, autor, etc).
     */
    private static parseMetadata(buffer: Buffer): PdfExtractResult['metadata'] {
        const content = buffer.toString('latin1')
        const meta: PdfExtractResult['metadata'] = {}

        const titleMatch = content.match(/\/Title\s*\(([^)]+)\)/)
        if (titleMatch) meta.titulo = this.decodePdfString(titleMatch[1])

        const authorMatch = content.match(/\/Author\s*\(([^)]+)\)/)
        if (authorMatch) meta.autor = this.decodePdfString(authorMatch[1])

        const creatorMatch = content.match(/\/Creator\s*\(([^)]+)\)/)
        if (creatorMatch) meta.criador = this.decodePdfString(creatorMatch[1])

        const producerMatch = content.match(/\/Producer\s*\(([^)]+)\)/)
        if (producerMatch) meta.produtor = this.decodePdfString(producerMatch[1])

        return meta
    }

    /**
     * Usa Puppeteer para renderizar o PDF e extrair texto via JS.
     */
    private static async extrairComPuppeteer(
        buffer: Buffer,
        metadata: PdfExtractResult['metadata']
    ): Promise<PdfExtractResult> {
        let browser = null
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            })
            const page = await browser.newPage()

            // Converter buffer para data URL
            const base64 = buffer.toString('base64')
            const dataUrl = `data:application/pdf;base64,${base64}`

            // Navegar para o PDF (Chrome renderiza PDFs nativamente)
            await page.goto(dataUrl, { waitUntil: 'networkidle0', timeout: 30000 })

            // Extrair texto do PDF viewer do Chrome
            const result = await page.evaluate(() => {
                // Chrome's PDF viewer embeds text in shadow DOM
                const embed = document.querySelector('embed')
                if (embed && embed.shadowRoot) {
                    const viewer = embed.shadowRoot.querySelector('#viewer')
                    if (viewer) {
                        return {
                            texto: viewer.textContent || '',
                            paginas: viewer.querySelectorAll('.page').length || 1,
                        }
                    }
                }
                // Fallback: get all text from body
                return {
                    texto: document.body.innerText || document.body.textContent || '',
                    paginas: 1,
                }
            })

            return {
                texto: result.texto.trim(),
                paginas: result.paginas,
                metadata,
            }
        } catch (error) {
            console.error('[PdfExtract] Erro no Puppeteer:', error)
            return {
                texto: '',
                paginas: 0,
                metadata,
            }
        } finally {
            if (browser) await browser.close()
        }
    }

    /**
     * Extrai tabelas básicas do PDF (heurística por alinhamento de texto).
     */
    static extrairTabelas(texto: string): string[][] {
        const linhas = texto.split('\n').filter(l => l.trim())
        const tabelas: string[][] = []

        for (const linha of linhas) {
            // Heurística: linhas com múltiplos espaços consecutivos (>= 3)
            // indicam colunas tabulares
            if (/\s{3,}/.test(linha)) {
                const colunas = linha.split(/\s{3,}/).map(c => c.trim()).filter(Boolean)
                if (colunas.length >= 2) {
                    tabelas.push(colunas)
                }
            }
        }

        return tabelas
    }
}
