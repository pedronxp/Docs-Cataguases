import puppeteer from 'puppeteer'
import crypto from 'crypto'
import { Result, ok, err } from '@/lib/result'

export class PdfService {
    /**
     * Gera o hash SHA-256 de uma string de conteúdo.
     */
    static gerarHash(conteudo: string): string {
        return crypto
            .createHash('sha256')
            .update(conteudo)
            .digest('hex')
            .toUpperCase()
    }

    /**
     * Converte HTML em Buffer de PDF usando Puppeteer.
     */
    static async gerarPDF(html: string, numeroOficial: string, hash: string): Promise<Result<Buffer>> {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            })

            const page = await browser.newPage()

            // Define o conteúdo HTML
            await page.setContent(html, { waitUntil: 'networkidle0' })

            // Gera o PDF com as configurações oficiais
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '3cm',
                    bottom: '3cm',
                    left: '2.5cm',
                    right: '2.5cm'
                },
                displayHeaderFooter: true,
                headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
            PORTARIA OFICIAL - MUNICÍPIO DE CATAGUASES - Nº ${numeroOficial}
          </div>
        `,
                footerTemplate: `
          <div style="font-size: 8px; width: 100%; text-align: center; border-top: 1px solid #ddd; padding-top: 5px;">
            <div style="display: flex; justify-content: space-between; padding: 0 40px;">
              <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
              <span>Autenticidade: ${hash.substring(0, 16)}...</span>
            </div>
            <div style="margin-top: 5px;">Documento assinado digitalmente conforme MP nº 2.200-2/2001.</div>
          </div>
        `
            })

            return ok(Buffer.from(pdfBuffer))
        } catch (error) {
            console.error('Erro ao gerar PDF com Puppeteer:', error)
            return err('Falha ao processar o documento PDF. Tente novamente.')
        } finally {
            if (browser) await browser.close()
        }
    }
}
