/**
 * DocxGeneratorService
 * Preenche templates .docx com variáveis usando docxtemplater + pizzip.
 *
 * Dependências (instalar na raiz de apps/api):
 *   npm install docxtemplater pizzip
 */

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import axios from 'axios'
import { StorageService } from './storage.service'

export class DocxGeneratorService {
    /**
     * Baixa um buffer de uma URL (HTTP/HTTPS) ou busca do Supabase Storage.
     */
    static async fetchTemplate(pathOrUrl: string): Promise<Buffer> {
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            const res = await axios.get(pathOrUrl, { responseType: 'arraybuffer', timeout: 30000 })
            return Buffer.from(res.data)
        }
        // Caminho relativo → URL assinada do Supabase
        const signedUrl = await StorageService.getSignedUrl(pathOrUrl, 300)
        const res = await axios.get(signedUrl, { responseType: 'arraybuffer', timeout: 30000 })
        return Buffer.from(res.data)
    }

    /**
     * Preenche um template .docx com os valores do formData.
     *
     * O template deve usar {{ VARIAVEL }} como placeholders no Word.
     * Docxtemplater é configurado com delimitadores duplos `{{ }}`.
     *
     * @param templateBuffer   Buffer do arquivo .docx template
     * @param variables        Objeto com chave → valor (ex: { NOMEADO: 'Pedro Paulo' })
     * @returns Buffer do .docx preenchido
     */
    static fillTemplate(templateBuffer: Buffer, variables: Record<string, any>): Buffer {
        const zip = new PizZip(templateBuffer)

        const doc = new Docxtemplater(zip, {
            // Usa {{ }} como delimitadores (padrão do sistema)
            delimiters: { start: '{{', end: '}}' },
            paragraphLoop: true,
            linebreaks: true,
        })

        // Normaliza valores: null/undefined → string vazia
        const normalized: Record<string, string> = {}
        for (const [key, value] of Object.entries(variables)) {
            normalized[key.trim()] = value != null ? String(value) : ''
        }

        try {
            doc.render(normalized)
        } catch (error: any) {
            // Docxtemplater lança erro com detalhes estruturados
            if (error.properties?.errors) {
                const messages = error.properties.errors
                    .map((e: any) => e.message || e.id)
                    .join('; ')
                throw new Error(`Erro ao preencher template DOCX: ${messages}`)
            }
            throw error
        }

        const filledBuffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        })

        return filledBuffer
    }

    /**
     * Pipeline completo: busca template → preenche → retorna buffer.
     */
    static async generate(
        templatePathOrUrl: string,
        variables: Record<string, any>
    ): Promise<Buffer> {
        const templateBuffer = await this.fetchTemplate(templatePathOrUrl)
        return this.fillTemplate(templateBuffer, variables)
    }
}
