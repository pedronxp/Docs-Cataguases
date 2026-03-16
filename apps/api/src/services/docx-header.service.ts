import PizZip from 'pizzip'
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'

/**
 * Extrai o cabeçalho de um arquivo DOCX e retorna como bloco HTML.
 *
 * Problema raiz: o LibreOffice `--convert-to html` converte apenas o corpo do
 * documento — cabeçalhos de página (onde fica o brasão) são ignorados.
 *
 * Solução: ler o DOCX como ZIP, localizar word/headerN.xml, resolver os
 * relacionamentos de imagem via word/_rels/headerN.xml.rels, extrair os
 * arquivos de mídia e tentar converter EMF/WMF para PNG.
 *
 * Conversão EMF→PNG: tenta LibreOffice → ImageMagick → skip (só texto).
 */
export class DocxHeaderService {

    /**
     * Retorna um bloco HTML representando o cabeçalho do documento DOCX.
     * Inclui imagens (brasão) convertidas para PNG e texto do cabeçalho.
     */
    static async extractHeaderHtml(docxBuffer: Buffer): Promise<string> {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-hdr-'))

        try {
            const zip = new PizZip(docxBuffer)

            // ── 1. Localizar arquivo XML do cabeçalho via document.xml.rels ────
            const docRelsFile = zip.files['word/_rels/document.xml.rels']
            if (!docRelsFile) {
                console.warn('[DocxHeaderService] word/_rels/document.xml.rels não encontrado')
                return ''
            }

            const docRels = docRelsFile.asText()

            // Extrai todos os targets de relacionamentos do tipo header
            // Suporta qualquer ordem de atributos no XML
            const headerTargets = this.findRelationshipTargets(docRels, 'header')

            if (headerTargets.length === 0) {
                console.warn('[DocxHeaderService] Nenhum cabeçalho encontrado no documento')
                return ''
            }

            // Ordena targets: prioriza o 'default' header (sem 'first' no nome),
            // pois header1.xml costuma ser o default e headerFirst.xml é para primeira página.
            // Ordena por: sem 'first' no nome primeiro, depois por número natural.
            const sortedTargets = [...headerTargets].sort((a, b) => {
                const aFirst = /first/i.test(a) ? 1 : 0
                const bFirst = /first/i.test(b) ? 1 : 0
                if (aFirst !== bFirst) return aFirst - bFirst
                return a.localeCompare(b, undefined, { numeric: true })
            })

            // Usa o primeiro cabeçalho na ordem de prioridade
            const headerTarget = sortedTargets[0] // ex: "header1.xml" (default)
            const headerXmlPath = `word/${headerTarget}`

            const headerXmlFile = zip.files[headerXmlPath]
            if (!headerXmlFile) {
                // Fallback: try all detected header targets
                let foundHtml = ''
                for (const target of headerTargets.slice(1)) {
                    const fallbackFile = zip.files[`word/${target}`]
                    if (fallbackFile) {
                        foundHtml = await this.processHeaderXml(
                            fallbackFile.asText(), target, zip, tmpDir
                        )
                        if (foundHtml) break
                    }
                }
                return foundHtml
            }

            const headerXml = headerXmlFile.asText()

            // ── 2. Process the header XML ──────────────────────────────────────
            const result = await this.processHeaderXml(headerXml, headerTarget, zip, tmpDir)

            return result

        } catch (e: any) {
            console.warn('[DocxHeaderService] Erro:', e?.message || e)
            return ''
        } finally {
            try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* silencioso */ }
        }
    }

    // ── Helpers de parsing XML ─────────────────────────────────────────────────

    /**
     * Encontra Targets de relacionamentos pelo tipo (ex: "header", "image").
     * Suporta qualquer ordem de atributos no XML.
     */
    private static findRelationshipTargets(relsXml: string, typeKeyword: string): string[] {
        const results: string[] = []
        // Encontra todas as tags <Relationship ...> ou <Relationship .../>
        // Usa [^>]* para capturar TODOS os atributos (não para no '/' de URLs como Type="http://...")
        const relTags = relsXml.match(/<Relationship[^>]*>/gi) || []

        for (const tag of relTags) {
            // Verifica se contém o tipo desejado
            const typeMatch = tag.match(/Type="([^"]+)"/i)
            if (!typeMatch || !typeMatch[1].toLowerCase().includes(`/${typeKeyword.toLowerCase()}`)) continue

            // Extrai o Target
            const targetMatch = tag.match(/Target="([^"]+)"/i)
            if (targetMatch) results.push(targetMatch[1])
        }

        return results
    }

    /**
     * Encontra o Target de um relacionamento específico por Id.
     */
    private static findRelTarget(relsXml: string, rId: string): string | null {
        // Usa [^>]* para capturar TODOS os atributos sem parar no '/' de URLs
        const relTags = relsXml.match(/<Relationship[^>]*>/gi) || []

        for (const tag of relTags) {
            const idMatch = tag.match(/Id="([^"]+)"/i)
            if (!idMatch || idMatch[1] !== rId) continue

            const targetMatch = tag.match(/Target="([^"]+)"/i)
            return targetMatch ? targetMatch[1] : null
        }

        return null
    }

    /**
     * Extrai todos os rId de referências de imagem no XML do cabeçalho.
     * Handles: r:embed, r:link
     */
    private static findBlipEmbeds(headerXml: string): string[] {
        const results: string[] = []
        // <a:blip r:embed="rId1"/> — padrão OOXML para imagens
        const matches = headerXml.matchAll(/r:embed="(rId[^"]+)"/gi)
        for (const m of matches) results.push(m[1])
        // Também: r:id="rId..." em outros contextos
        const matches2 = headerXml.matchAll(/r:id="(rId[^"]+)"/gi)
        for (const m of matches2) {
            if (!results.includes(m[1])) results.push(m[1])
        }
        return results
    }

    /**
     * Processa um XML de cabeçalho OOXML: extrai imagens e texto, monta HTML.
     * Reutilizado pelo caminho principal e pelo fallback de múltiplos cabeçalhos.
     */
    private static async processHeaderXml(
        headerXml: string,
        headerTarget: string,
        zip: PizZip,
        tmpDir: string
    ): Promise<string> {
        // ── 1. Encontrar referências de imagem no XML do cabeçalho ─────────
        const blipRids = this.findBlipEmbeds(headerXml)

        // ── 2. Resolver caminhos de imagem via rels do cabeçalho ──────────
        const imageDataUris: string[] = []

        if (blipRids.length > 0) {
            const headerRelsPath = `word/_rels/${headerTarget}.rels`
            const headerRelsFile = zip.files[headerRelsPath]

            if (headerRelsFile) {
                const headerRels = headerRelsFile.asText()

                for (const rId of blipRids) {
                    const mediaTarget = this.findRelTarget(headerRels, rId)
                    if (!mediaTarget) continue

                    // Normaliza: "../media/image1.emf" → "word/media/image1.emf"
                    const mediaPath = mediaTarget.startsWith('media/')
                        ? `word/${mediaTarget}`
                        : mediaTarget.startsWith('../')
                        ? `word/${mediaTarget.slice(3)}`
                        : `word/media/${path.basename(mediaTarget)}`

                    const mediaFile = zip.files[mediaPath]
                    if (!mediaFile) {
                        console.warn(`[DocxHeaderService] Media não encontrado: ${mediaPath}`)
                        continue
                    }

                    const ext = mediaPath.split('.').pop()?.toLowerCase() || ''
                    const imgBuffer = Buffer.from(mediaFile.asBinary(), 'binary')

                    let dataUri: string | null = null

                    const mimeMap: Record<string, string> = {
                        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                        gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
                    }

                    if (ext === 'emf' || ext === 'wmf') {
                        // Tenta converter com LibreOffice → ImageMagick
                        dataUri = await this.vectorToPng(imgBuffer, ext, tmpDir)
                        // Se conversão falhou, procura PNG/JPG alternativo no DOCX
                        if (!dataUri) {
                            dataUri = this.findAlternateImage(zip)
                        }
                    } else if (mimeMap[ext]) {
                        dataUri = `data:${mimeMap[ext]};base64,${imgBuffer.toString('base64')}`
                        console.log(`[DocxHeaderService] Imagem ${ext.toUpperCase()} extraída diretamente`)
                    }

                    if (dataUri) imageDataUris.push(dataUri)
                }
            }
        }

        // ── 3. Se não encontrou imagem via rels, tenta busca alternativa ──
        if (imageDataUris.length === 0) {
            const alt = this.findAlternateImage(zip)
            if (alt) imageDataUris.push(alt)
        }

        // ── 4. Extrair texto do cabeçalho (elementos <w:t>) ───────────────
        const headerText = this.extractHeaderText(headerXml)

        // ── 5. Montar HTML do cabeçalho ───────────────────────────────────
        if (imageDataUris.length === 0 && !headerText) {
            console.warn('[DocxHeaderService] Cabeçalho sem imagem nem texto')
            return ''
        }

        const imgHtml = imageDataUris
            .map(src => `<img src="${src}" alt="Brasão" style="max-height:90px;max-width:280px;display:block;margin:0 auto 6px;" />`)
            .join('')

        const textHtml = headerText
            ? `<p style="text-align:center;font-weight:bold;font-size:13px;margin:4px 0 0;color:#1a1a1a;letter-spacing:0.5px;">${headerText}</p>`
            : ''

        console.log(`[DocxHeaderService] OK: ${imageDataUris.length} img(s), texto="${headerText.slice(0, 60)}"`)

        return `<div class="doc-header" style="text-align:center;padding:18px 0 14px;margin-bottom:20px;border-bottom:2px solid #333;">
${imgHtml}
${textHtml}
</div>`
    }

    /**
     * Extrai texto visível do cabeçalho a partir dos elementos <w:t>.
     * Preserva espaços de elementos com xml:space="preserve".
     */
    private static extractHeaderText(headerXml: string): string {
        const matches = headerXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gi)
        const parts: string[] = []
        for (const m of matches) {
            // Do NOT trim here: xml:space="preserve" elements may have significant spaces
            if (m[1].length > 0) parts.push(m[1])
        }
        // Only trim the final joined string to remove leading/trailing whitespace
        return parts.join('').replace(/\s+/g, ' ').trim()
    }

    // ── Busca de imagem alternativa ─────────────────────────────────────────

    /**
     * Quando a conversão EMF→PNG falha, busca imagens PNG/JPG alternativas
     * no diretório word/media/ do DOCX.
     *
     * Muitos DOCX criados pelo Microsoft Office incluem versões PNG/JPG
     * ao lado dos EMF. Também procura imagens que parecem ser brasões
     * (imagens com dimensões razoáveis, não ícones pequenos).
     */
    private static findAlternateImage(zip: PizZip): string | null {
        const mimeMap: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
        }
        const supportedExts = new Set(Object.keys(mimeMap))

        // Buscar TODAS as imagens PNG/JPG em word/media/
        let bestImage: { dataUri: string; size: number } | null = null

        for (const zipPath of Object.keys(zip.files)) {
            if (!zipPath.startsWith('word/media/')) continue
            const file = zip.files[zipPath]
            if (file.dir) continue

            const ext = zipPath.split('.').pop()?.toLowerCase() || ''
            if (!supportedExts.has(ext)) continue

            try {
                const imgBuffer = Buffer.from(file.asBinary(), 'binary')

                // Escolhe a maior imagem PNG/JPG encontrada
                // (brasões são geralmente a maior imagem no cabeçalho)
                if (!bestImage || imgBuffer.length > bestImage.size) {
                    bestImage = {
                        dataUri: `data:${mimeMap[ext]};base64,${imgBuffer.toString('base64')}`,
                        size: imgBuffer.length,
                    }
                }
            } catch {
                // ignora erros de extração
            }
        }

        if (bestImage) {
            console.log(`[DocxHeaderService] Imagem alternativa encontrada (${bestImage.size} bytes)`)
            return bestImage.dataUri
        }

        console.warn('[DocxHeaderService] Nenhuma imagem alternativa encontrada no DOCX')
        return null
    }

    // ── Conversão de imagens vetoriais ────────────────────────────────────────

    /**
     * Converte EMF ou WMF para PNG data URI.
     * Tenta: 1) LibreOffice  2) ImageMagick  3) null (skip gracioso)
     */
    private static async vectorToPng(
        imgBuffer: Buffer,
        ext: string,
        baseTmpDir: string
    ): Promise<string | null> {
        const subDir = path.join(baseTmpDir, `vec_${Date.now()}`)
        fs.mkdirSync(subDir, { recursive: true })

        const inputPath = path.join(subDir, `image.${ext}`)
        const outDir = path.join(subDir, 'out')
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(inputPath, imgBuffer)

        // Tenta 1: LibreOffice
        const result1 = this.tryLibreOfficePng(inputPath, outDir, subDir)
        if (result1) return result1

        // Tenta 2: ImageMagick
        const result2 = this.tryImageMagickPng(inputPath, outDir)
        if (result2) return result2

        console.warn(`[DocxHeaderService] Não foi possível converter ${ext.toUpperCase()}→PNG (LibreOffice e ImageMagick falharam)`)
        return null
    }

    private static tryLibreOfficePng(inputPath: string, outDir: string, subDir: string): string | null {
        const loHome = path.join(subDir, 'lo_home')
        fs.mkdirSync(loHome, { recursive: true })

        const soffice = ['/usr/bin/soffice', '/usr/local/bin/soffice', 'soffice']
            .find(p => {
                try { fs.accessSync(p, fs.constants.X_OK); return true } catch { return false }
            }) ?? 'soffice'

        const result = spawnSync(
            soffice,
            ['--headless', '--norestore', '--convert-to', 'png', '--outdir', outDir, inputPath],
            { timeout: 30_000, env: { ...process.env, HOME: loHome } }
        )

        if (result.status !== 0) return null

        const pngFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.png'))
        if (pngFiles.length === 0) return null

        const pngBuffer = fs.readFileSync(path.join(outDir, pngFiles[0]))
        console.log(`[DocxHeaderService] LibreOffice EMF→PNG OK (${pngBuffer.length} bytes)`)
        return `data:image/png;base64,${pngBuffer.toString('base64')}`
    }

    private static tryImageMagickPng(inputPath: string, outDir: string): string | null {
        const outputPath = path.join(outDir, 'image_im.png')

        const result = spawnSync(
            'convert',
            ['-background', 'white', '-flatten', inputPath, outputPath],
            { timeout: 15_000 }
        )

        if (result.status !== 0) return null
        if (!fs.existsSync(outputPath)) return null

        const pngBuffer = fs.readFileSync(outputPath)
        console.log(`[DocxHeaderService] ImageMagick EMF→PNG OK (${pngBuffer.length} bytes)`)
        return `data:image/png;base64,${pngBuffer.toString('base64')}`
    }
}
