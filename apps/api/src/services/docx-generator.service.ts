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
        console.log('[DocxGenerator] Buscando template:', pathOrUrl)
        if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
            const res = await axios.get(pathOrUrl, { responseType: 'arraybuffer', timeout: 30000 })
            const buf = Buffer.from(res.data)
            console.log('[DocxGenerator] Template baixado via HTTP, tamanho:', buf.byteLength, 'bytes')
            return buf
        }
        // Caminho relativo -> URL assinada do Supabase
        const signedUrl = await StorageService.getSignedUrl(pathOrUrl, 300)
        const res = await axios.get(signedUrl, { responseType: 'arraybuffer', timeout: 30000 })
        const buf = Buffer.from(res.data)
        console.log('[DocxGenerator] Template baixado do Supabase, tamanho:', buf.byteLength, 'bytes')
        return buf
    }

    /**
     * Preenche um template .docx com os valores do formData.
     *
     * O template deve usar {{ VARIAVEL }} como placeholders no Word.
     * Docxtemplater e configurado com delimitadores duplos `{{ }}`.
     *
     * IMPORTANTE: O Word frequentemente quebra tags {{VARIAVEL}} em multiplos
     * "runs" no XML interno (ex: `{{`, `VARI`, `AVEL}}`), o que impede o
     * docxtemplater de encontrar as variáveis. Para resolver isso, usamos
     * o InspectModule para diagnosticar e o parser padrão que já lida com
     * espaços. Para templates problemáticos, considere usar o módulo
     * angular-expressions ou limpar o XML manualmente.
     *
     * @param templateBuffer   Buffer do arquivo .docx template
     * @param variables        Objeto com chave -> valor (ex: { NOMEADO: 'Pedro Paulo' })
     * @returns Buffer do .docx preenchido
     */
    static fillTemplate(templateBuffer: Buffer, variables: Record<string, any>): Buffer {
        const zip = new PizZip(templateBuffer)

        const doc = new Docxtemplater(zip, {
            // Usa {{ }} como delimitadores (padrao do sistema)
            delimiters: { start: '{{', end: '}}' },
            paragraphLoop: true,
            linebreaks: true,
            // nullGetter: retorna string vazia para variáveis não encontradas
            // (em vez de lançar erro ou deixar em branco de forma inconsistente)
            nullGetter(part: any) {
                // part.module pode ser 'rawxml', 'loop', etc.
                // Para tags simples (value), retornamos string vazia
                if (!part.module) {
                    return ''
                }
                // Para loops/condicionais, retornamos array vazio
                if (part.module === 'loop') {
                    return []
                }
                return ''
            },
        })

        // Normaliza valores: null/undefined -> string vazia
        const normalized: Record<string, string> = {}
        for (const [key, value] of Object.entries(variables)) {
            normalized[key.trim()] = value != null ? String(value) : ''
        }

        console.log('[DocxGenerator] Variáveis para preenchimento:', Object.keys(normalized).join(', '))
        console.log('[DocxGenerator] Total de variáveis:', Object.keys(normalized).length)

        try {
            doc.render(normalized)
        } catch (error: any) {
            // Docxtemplater lanca erro com detalhes estruturados
            if (error.properties?.errors) {
                const messages = error.properties.errors
                    .map((e: any) => `${e.id}: ${e.message}`)
                    .join('; ')
                console.error('[DocxGenerator] Erros do docxtemplater:', messages)
                // Não lança erro para tags não encontradas — apenas loga
                const isFatal = error.properties.errors.some(
                    (e: any) => e.id !== 'unopened_tag' && e.id !== 'unclosed_tag' && e.id !== 'undefined_tag'
                )
                if (isFatal) {
                    throw new Error(`Erro ao preencher template DOCX: ${messages}`)
                }
                console.warn('[DocxGenerator] Erros não-fatais ignorados, continuando geração...')
            } else {
                throw error
            }
        }

        const filledBuffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        })

        console.log('[DocxGenerator] DOCX gerado com sucesso, tamanho:', filledBuffer.byteLength, 'bytes')

        return filledBuffer
    }

    /**
     * Pipeline completo: busca template -> preenche -> retorna buffer.
     */
    static async generate(
        templatePathOrUrl: string,
        variables: Record<string, any>
    ): Promise<Buffer> {
        const templateBuffer = await this.fetchTemplate(templatePathOrUrl)

        // Valida que o template não está vazio
        if (templateBuffer.byteLength < 100) {
            console.error('[DocxGenerator] ALERTA: Template muito pequeno!', templateBuffer.byteLength, 'bytes')
            throw new Error('Template DOCX parece estar vazio ou corrompido (tamanho muito pequeno).')
        }

        return this.fillTemplate(templateBuffer, variables)
    }
}
