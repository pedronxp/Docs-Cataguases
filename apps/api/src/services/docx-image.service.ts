import PizZip from 'pizzip'

/**
 * Serviço para extrair imagens embutidas em arquivos DOCX (ZIP) e injetá-las
 * como data URIs base64 no HTML gerado pelo CloudConvert.
 *
 * Problema raiz: CloudConvert (LibreOffice) converte DOCX → HTML referenciando
 * imagens como arquivos separados ("Pictures/image1.png"). Como recebemos apenas
 * o HTML e não os arquivos de imagem, o brasão e demais imagens ficam quebrados.
 *
 * Solução: extrair as imagens do próprio DOCX (que é um ZIP) e substituir
 * as referências no HTML por data URIs base64 inline.
 */
export class DocxImageService {

    /**
     * Extrai todas as imagens do diretório word/media/ do DOCX.
     * Retorna um mapa: { 'image1.png': 'data:image/png;base64,...' }
     *
     * IMPORTANTE: EMF/WMF são ignorados pois browsers não os exibem.
     * Esses formatos devem ser convertidos pelo CloudConvert (LibreOffice).
     */
    static extractImages(docxBuffer: Buffer): Map<string, string> {
        const imageMap = new Map<string, string>()

        // Formatos suportados por browsers — EMF/WMF são EXCLUÍDOS intencionalmente
        const BROWSER_SUPPORTED_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'])

        try {
            const zip = new PizZip(docxBuffer)

            const MIME_MAP: Record<string, string> = {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                bmp: 'image/bmp',
                webp: 'image/webp',
                svg: 'image/svg+xml',
            }

            // Iterar sobre todos os arquivos no ZIP
            Object.keys(zip.files).forEach(zipPath => {
                // Imagens ficam em word/media/ dentro do DOCX
                if (!zipPath.startsWith('word/media/')) return

                const file = zip.files[zipPath]
                if (file.dir) return

                const filename = zipPath.split('/').pop()!
                const ext = filename.split('.').pop()?.toLowerCase() || ''

                // Ignorar EMF/WMF — browsers não exibem esses formatos.
                // O CloudConvert (LibreOffice) já converte para PNG durante a exportação HTML.
                if (!BROWSER_SUPPORTED_EXTS.has(ext)) {
                    console.log(`[DocxImageService] Ignorando formato não suportado por browser: ${filename}`)
                    return
                }

                try {
                    const binaryContent = file.asBinary()
                    const buffer = Buffer.from(binaryContent, 'binary')
                    const base64 = buffer.toString('base64')

                    const mimeType = MIME_MAP[ext] || 'image/png'

                    imageMap.set(filename, `data:${mimeType};base64,${base64}`)

                    console.log(`[DocxImageService] Extraída imagem: ${filename} (${buffer.length} bytes)`)
                } catch (e) {
                    console.warn(`[DocxImageService] Não foi possível extrair ${zipPath}:`, e)
                }
            })

        } catch (e) {
            console.error('[DocxImageService] Erro ao abrir DOCX como ZIP:', e)
        }

        return imageMap
    }

    /**
     * Injeta as imagens extraídas no HTML do CloudConvert.
     *
     * O CloudConvert (LibreOffice) gera HTML com src apontando para caminhos relativos
     * como "Pictures/image1.png" ou apenas "image1.png". Este método substitui esses
     * src por data URIs base64 para que as imagens apareçam inline.
     */
    static injectImagesIntoHtml(html: string, imageMap: Map<string, string>): string {
        if (imageMap.size === 0) return html

        // Ordena imagens para fallback sequencial
        const imageList = Array.from(imageMap.entries()) // [[filename, dataUri], ...]
        let sequentialIndex = 0

        // Substituir src de todas as tags <img>
        const result = html.replace(/<img([^>]*?)src=["']([^"']*)["']([^>]*?)>/gi, (match, before, src, after) => {
            // NUNCA sobrescrever imagens que já estão embutidas como data URI
            // (o CloudConvert já fez a conversão corretamente, inclusive de EMF→PNG)
            if (src.startsWith('data:')) {
                return match
            }

            // Tenta pelo nome do arquivo no src
            const srcBasename = src.split('/').pop()?.split('?')[0] || ''

            // 1) Busca exata pelo basename
            if (imageMap.has(srcBasename)) {
                const dataUri = imageMap.get(srcBasename)!
                return `<img${before}src="${dataUri}"${after}>`
            }

            // 2) Busca parcial: src contém parte do nome de alguma imagem conhecida
            for (const [filename, dataUri] of imageList) {
                const filenameNoExt = filename.replace(/\.[^.]+$/, '')
                if (src.includes(filenameNoExt) || filename.includes(srcBasename)) {
                    return `<img${before}src="${dataUri}"${after}>`
                }
            }

            // 3) Fallback sequencial: atribui imagens em ordem de aparecimento
            if (sequentialIndex < imageList.length) {
                const dataUri = imageList[sequentialIndex][1]
                sequentialIndex++
                return `<img${before}src="${dataUri}"${after}>`
            }

            // Sem match — mantém original
            return match
        })

        const totalImgs = (html.match(/<img/gi) || []).length
        console.log(`[DocxImageService] ${imageMap.size} imagens disponíveis, ${totalImgs} tags <img> processadas`)

        return result
    }

    /**
     * Pipeline completo: dado o buffer do DOCX e o HTML gerado pelo CloudConvert,
     * retorna o HTML com todas as imagens embutidas como base64.
     */
    static processHtml(docxBuffer: Buffer, cloudConvertHtml: string): string {
        const imageMap = this.extractImages(docxBuffer)

        if (imageMap.size === 0) {
            console.log('[DocxImageService] Nenhuma imagem encontrada no DOCX.')
            return cloudConvertHtml
        }

        return this.injectImagesIntoHtml(cloudConvertHtml, imageMap)
    }
}
