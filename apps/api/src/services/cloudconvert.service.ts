import axios from 'axios';
import { ok, err, Result } from '@/lib/result';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

// Forçar resolução IPv4 antes de IPv6 para evitar ConnectTimeoutError no Node 18+ (undici/fetch)
dns.setDefaultResultOrder('ipv4first');

export class CloudConvertService {
    /**
     * Busca todas as chaves configuradas no .env.
     */
    private static async getKeys(): Promise<string[]> {
        const keys: string[] = [];

        // Chave principal
        if (process.env.CLOUDCONVERT_API_KEY) {
            keys.push(process.env.CLOUDCONVERT_API_KEY);
        }

        // Chaves numeradas: _1, _2, _3...
        // Note: se o usuário pulou um número (ex: tem _1 e _3), esse loop para no primeiro erro.
        // Vamos ser mais robustos e olhar todas as chaves que começam com o prefixo.
        const allEnv = process.env;
        const suffixes = Object.keys(allEnv)
            .filter(k => k.startsWith('CLOUDCONVERT_API_KEY_'))
            .map(k => parseInt(k.split('_').pop() || '0', 10))
            .sort((a, b) => a - b);

        for (const s of suffixes) {
            const val = allEnv[`CLOUDCONVERT_API_KEY_${s}`];
            if (val) keys.push(val);
        }

        return keys;
    }

    /**
     * Salva o índice da chave ativa no arquivo .env para persistência.
     */
    private static async persistActiveIndex(index: number) {
        try {
            const envPath = path.resolve(process.cwd(), '.env');
            if (!fs.existsSync(envPath)) return;

            const content = fs.readFileSync(envPath, 'utf8');
            const lines = content.split('\n');
            let found = false;

            const newLine = `CLOUDCONVERT_CURRENT_KEY_INDEX=${index}`;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('CLOUDCONVERT_CURRENT_KEY_INDEX=')) {
                    lines[i] = newLine;
                    found = true;
                    break;
                }
            }

            if (!found) {
                lines.push(newLine);
            }

            fs.writeFileSync(envPath, lines.join('\n'));
            process.env.CLOUDCONVERT_CURRENT_KEY_INDEX = String(index);
            console.log(`[CloudConvert] Índice de chave atualizado para: ${index}`);
        } catch (error) {
            console.error('[CloudConvert] Erro ao persistir índice:', error);
        }
    }

    /**
     * Converte um arquivo DOCX em HTML usando CloudConvert com rotação automática de chaves.
     */
    static async extractToHtml(fileBuffer: Buffer, fileName: string): Promise<Result<string>> {
        const availableKeys = await this.getKeys();
        if (availableKeys.length === 0) {
            return err('Nenhuma chave CloudConvert configurada no servidor.');
        }

        let currentIndex = parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10);
        let attempts = 0;

        // Tenta rodar o loop até passar pelas chaves disponíveis
        while (attempts < availableKeys.length) {
            // Garante que o índice está dentro do range
            const actualKeyIndex = currentIndex % availableKeys.length;
            const currentKey = availableKeys[actualKeyIndex];

            console.log(`[CloudConvert] Tentando conversão com chave índice ${actualKeyIndex}...`);

            try {
                const jobRes = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                    tasks: {
                        'upload-my-file': {
                            operation: 'import/upload'
                        },
                        'convert-my-file': {
                            operation: 'convert',
                            input: 'upload-my-file',
                            output_format: 'html',
                            engine: 'office'
                        },
                        'export-my-file': {
                            operation: 'export/url',
                            input: 'convert-my-file'
                        }
                    }
                }, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 30000
                });

                const job = jobRes.data.data;

                const uploadTask = job.tasks.find((task: any) => task.name === 'upload-my-file');
                if (!uploadTask || !uploadTask.result?.form) throw new Error('Falha ao criar task de upload');

                const { url: uploadUrl, parameters } = uploadTask.result.form;
                const formData = new FormData();
                for (const [key, value] of Object.entries(parameters)) {
                    formData.append(key, value as string);
                }

                // Node.js 18+ FormData. fileBuffer is passed as Uint8Array to satisfy BlobPart interface
                const blob = new Blob([new Uint8Array(fileBuffer)]);
                formData.append('file', blob, fileName);

                await axios.post(uploadUrl, formData, {
                    timeout: 60000
                });

                const waitRes = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}/wait`, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 120000
                });

                const finishedJob = waitRes.data.data;
                const exportTask = finishedJob.tasks.find((task: any) => task.operation === 'export/url' && task.status === 'finished');

                if (!exportTask || !exportTask.result?.files?.length) {
                    throw new Error('Erro ao exportar resultado: nenhum arquivo retornado pelo CloudConvert');
                }

                const exportedFiles: Array<{ filename: string; url: string }> = exportTask.result.files;

                // Identificar o arquivo HTML e os arquivos de imagem
                const htmlFile = exportedFiles.find(f => f.filename.endsWith('.html') || f.filename.endsWith('.htm'))
                    ?? exportedFiles[0];
                const imageFiles = exportedFiles.filter(f => f.filename !== htmlFile.filename);

                // Baixar o HTML principal
                const htmlResponse = await axios.get(htmlFile.url, {
                    responseType: 'text',
                    timeout: 30000
                });

                if (htmlResponse.status !== 200) throw new Error('Erro ao baixar HTML convertido');
                let htmlContent: string = htmlResponse.data;

                // Baixar cada imagem exportada e embutir como base64 no HTML
                if (imageFiles.length > 0) {
                    console.log(`[CloudConvert] Baixando ${imageFiles.length} imagem(ns) exportada(s)...`);

                    const MIME_MAP: Record<string, string> = {
                        png: 'image/png',
                        jpg: 'image/jpeg',
                        jpeg: 'image/jpeg',
                        gif: 'image/gif',
                        bmp: 'image/bmp',
                        webp: 'image/webp',
                        svg: 'image/svg+xml',
                        tiff: 'image/tiff',
                        tif: 'image/tiff',
                    };

                    // Baixar todas as imagens em paralelo
                    const imageDownloads = await Promise.allSettled(
                        imageFiles.map(async (imgFile) => {
                            const imgRes = await axios.get(imgFile.url, {
                                responseType: 'arraybuffer',
                                timeout: 30000
                            });
                            const ext = imgFile.filename.split('.').pop()?.toLowerCase() || 'png';
                            const mimeType = MIME_MAP[ext] || 'image/png';
                            const base64 = Buffer.from(imgRes.data).toString('base64');
                            return {
                                filename: imgFile.filename,
                                dataUri: `data:${mimeType};base64,${base64}`
                            };
                        })
                    );

                    // Substituir referências no HTML pelos data URIs
                    for (const result of imageDownloads) {
                        if (result.status !== 'fulfilled') continue;
                        const { filename, dataUri } = result.value;

                        // Substituição case-insensitive pelo nome exato do arquivo
                        // ex: src="Pictures/image1.png" → src="data:image/png;base64,..."
                        const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const imgRegex = new RegExp(
                            `(<img[^>]+src=["'])([^"']*(?:Pictures/|media/)?${escapedName})(["'][^>]*>)`,
                            'gi'
                        );
                        const replaced = htmlContent.replace(imgRegex, `$1${dataUri}$3`);

                        if (replaced !== htmlContent) {
                            htmlContent = replaced;
                            console.log(`[CloudConvert] Imagem injetada: ${filename}`);
                        } else {
                            // Fallback: substituir por src parcial que contenha o nome sem extensão
                            const nameNoExt = filename.replace(/\.[^.]+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const fallbackRegex = new RegExp(
                                `(<img[^>]+src=["'])([^"']*${nameNoExt}[^"']*)(["'][^>]*>)`,
                                'gi'
                            );
                            htmlContent = htmlContent.replace(fallbackRegex, `$1${dataUri}$3`);
                            console.log(`[CloudConvert] Imagem injetada (fallback parcial): ${filename}`);
                        }
                    }
                } else {
                    console.log('[CloudConvert] Nenhuma imagem extra exportada pelo CloudConvert.');
                }

                // Se mudamos de chave, persiste a nova
                if (actualKeyIndex !== parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10)) {
                    await this.persistActiveIndex(actualKeyIndex);
                }

                return ok(htmlContent);

            } catch (error: any) {
                // Checa se é erro de pagamento/limite (402)
                const isPaymentRequired =
                    error.message?.includes('402') ||
                    error.response?.status === 402 ||
                    (error.cause?.status === 402);

                if (isPaymentRequired) {
                    if (attempts < availableKeys.length - 1) {
                        console.warn(`[CloudConvert] Chave ${actualKeyIndex} esgotada (402). Rotacionando...`);
                        currentIndex++;
                        attempts++;
                        continue; // Tenta o próximo loop
                    }
                    // Todas as chaves estão esgotadas
                    console.error('[CloudConvert Service] Todas as chaves esgotadas (402).');
                    return err('Serviço de conversão de documentos temporariamente indisponível. Tente novamente mais tarde.');
                }

                console.error('[CloudConvert Service] Erro fatal:', error);
                return err('Não foi possível converter o documento. Verifique o formato do arquivo e tente novamente.');
            }
        }

        return err('Todas as chaves CloudConvert disponíveis estão esgotadas (Erro 402).');
    }
}
