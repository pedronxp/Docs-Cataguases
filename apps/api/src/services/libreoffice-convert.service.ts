import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { ok, err, Result } from '@/lib/result'
import { DocxHeaderService } from './docx-header.service'

/**
 * Converte DOCX → HTML localmente usando LibreOffice headless.
 *
 * Vantagens sobre CloudConvert para geração de preview:
 * - Inclui cabeçalho e rodapé do documento (onde fica o brasão)
 * - Converte imagens EMF/WMF → PNG automaticamente (browsers não exibem EMF)
 * - Sem limite de API, sem custo, sem latência de rede
 * - Imagens são embutidas como data URIs base64 no HTML retornado
 */
export class LibreOfficeConvertService {

    /**
     * Converte um buffer DOCX em HTML completo com imagens embutidas.
     * Retorna HTML pronto para renderizar no browser (sem referências externas).
     */
    static async convertDocxToHtml(buffer: Buffer, fileName: string): Promise<Result<string>> {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-docx-'))

        try {
            // Garante nome de arquivo seguro
            const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
            const inputPath = path.join(tmpDir, safeName)
            const outDir = path.join(tmpDir, 'html_out')
            fs.mkdirSync(outDir, { recursive: true })

            // Salva o DOCX no disco temporário
            fs.writeFileSync(inputPath, buffer)

            console.log(`[LibreOffice] Convertendo ${safeName} para HTML...`)

            // HOME isolado por conversão: evita conflito de perfil quando múltiplas
            // conversões rodam em paralelo (LibreOffice trava o perfil ~/.config/libreoffice)
            const loHome = path.join(tmpDir, 'lo_home')
            fs.mkdirSync(loHome, { recursive: true })

            // Localiza o executável do LibreOffice (considera instalações padrão)
            const soffice = ['/usr/bin/soffice', '/usr/local/bin/soffice', '/opt/libreoffice/program/soffice', 'soffice']
                .find(p => { try { fs.accessSync(p, fs.constants.X_OK); return true } catch { return false } })
                ?? 'soffice'

            console.log(`[LibreOffice] Usando executável: ${soffice}`)

            // Pré-cria o diretório de perfil para garantir que o LibreOffice possa escrever
            const loProfile = path.join(loHome, '.config', 'libreoffice')
            fs.mkdirSync(loProfile, { recursive: true })

            // spawnSync: não lança exceção em falha — permite capturar exit code e output
            const loResult = spawnSync(
                soffice,
                [
                    '--headless',
                    '--norestore',
                    '--nofirststartwizard',
                    '--nolockcheck',
                    '--convert-to', 'html',
                    '--outdir', outDir,
                    inputPath,
                ],
                {
                    timeout: 90_000,
                    env: {
                        ...process.env,
                        HOME: loHome,
                        DISPLAY: '',          // força modo headless sem X11
                        SAL_USE_VCLPLUGIN: 'svp', // plugin sem display para LibreOffice
                    },
                }
            )

            // Captura diagnóstico independente de sucesso ou falha
            const loStdout = loResult.stdout?.toString?.() || ''
            const loStderr = loResult.stderr?.toString?.() || ''
            if (loStdout) console.log('[LibreOffice] stdout:', loStdout.slice(0, 400))
            if (loStderr) console.warn('[LibreOffice] stderr:', loStderr.slice(0, 400))

            if (loResult.status !== 0 || loResult.error) {
                const errMsg = loResult.error?.message || `exit code ${loResult.status}`
                console.error(`[LibreOffice] Falha na conversão: ${errMsg}`)
                throw new Error(`LibreOffice retornou erro: ${errMsg}`)
            }

            // Localiza o arquivo HTML gerado
            const outFiles = fs.readdirSync(outDir)
            const htmlFileName = outFiles.find(f => /\.(html|htm)$/i.test(f))

            if (!htmlFileName) {
                const listedFiles = outFiles.join(', ') || '(vazio)'
                console.error(`[LibreOffice] Arquivos gerados: ${listedFiles}`)
                throw new Error(`LibreOffice não gerou arquivo HTML. Arquivos encontrados: ${listedFiles}`)
            }

            let html = fs.readFileSync(path.join(outDir, htmlFileName), 'utf-8')

            console.log(`[LibreOffice] HTML gerado: ${htmlFileName} (${html.length} bytes)`)

            // Identificar arquivos de imagem na pasta de saída
            const imageFiles = outFiles.filter(f => !/\.(html|htm)$/i.test(f))
            console.log(`[LibreOffice] Imagens exportadas: ${imageFiles.length} arquivo(s) — ${imageFiles.join(', ')}`)

            const MIME_MAP: Record<string, string> = {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                bmp: 'image/bmp',
                webp: 'image/webp',
                svg: 'image/svg+xml',
            }

            // Para cada imagem: ler, converter para base64, substituir no HTML
            for (const imgFile of imageFiles) {
                const imgPath = path.join(outDir, imgFile)

                try {
                    const imgBuffer = fs.readFileSync(imgPath)
                    const ext = imgFile.split('.').pop()?.toLowerCase() || 'png'
                    const mimeType = MIME_MAP[ext] || 'image/png'
                    const dataUri = `data:${mimeType};base64,${imgBuffer.toString('base64')}`

                    // Substituir todas as ocorrências do nome do arquivo no HTML
                    // LibreOffice gera src="filename.png" ou src="./filename.png"
                    const escapedName = imgFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const beforeCount = (html.match(new RegExp(escapedName, 'g')) || []).length

                    html = html.replace(new RegExp(`(src=["'][^"']*?)${escapedName}`, 'gi'), `$1${dataUri}`)

                    console.log(`[LibreOffice] Imagem "${imgFile}" — ${beforeCount} ocorrência(s) no src substituída(s)`)
                } catch (imgErr) {
                    console.warn(`[LibreOffice] Não foi possível processar imagem ${imgFile}:`, imgErr)
                }
            }

            // Corrigir quaisquer src relativos restantes que ficaram sem substituição
            // (fallback: oculta a imagem para não mostrar ícone quebrado no preview)
            html = html.replace(/<img([^>]+)src=["'](?!data:)[^"']*["']([^>]*)>/gi, (match, before, after) => {
                // Extrai o src original para preservar no data-src (debug)
                const srcMatch = match.match(/src=["']([^"']+)["']/i)
                const originalSrc = srcMatch ? srcMatch[1] : ''
                console.warn(`[LibreOffice] src relativo não resolvido, ocultando img: ${originalSrc.substring(0, 60)}`)
                return `<img${before}src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" data-src-original="${originalSrc}" style="display:none"${after}>`
            })


            // ── Injetar cabeçalho do documento (brasão + texto) ─────────────────
            // O filtro HTML do LibreOffice não inclui cabeçalhos de página.
            // Extraímos diretamente do ZIP do DOCX e injetamos no topo do HTML.
            try {
                const headerHtml = await DocxHeaderService.extractHeaderHtml(buffer)
                if (headerHtml) {
                    // Injeta logo após a tag <body> (ou no topo se não houver <body>)
                    if (/<body[^>]*>/i.test(html)) {
                        html = html.replace(/(<body[^>]*>)/i, `$1\n${headerHtml}`)
                    } else {
                        html = headerHtml + '\n' + html
                    }
                    console.log('[LibreOffice] Cabeçalho (brasão) injetado no HTML.')
                } else {
                    console.log('[LibreOffice] Documento sem cabeçalho identificável.')
                }
            } catch (hdrErr: any) {
                // Falha na extração do cabeçalho não deve bloquear o resultado
                console.warn('[LibreOffice] Erro ao injetar cabeçalho (não crítico):', hdrErr?.message)
            }

            return ok(html)

        } catch (error: any) {
            console.error('[LibreOffice] Erro na conversão:', error?.message || error)
            return err(`Erro na conversão LibreOffice: ${error?.message || 'Erro desconhecido'}`)
        } finally {
            // Limpar arquivos temporários sempre
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true })
            } catch {
                // ignora erros de limpeza
            }
        }
    }
}


