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

                if (!exportTask || !exportTask.result?.files?.[0]?.url) {
                    throw new Error('Erro ao exportar resultado');
                }

                const url = exportTask.result.files[0].url;

                // Usando axios para maior controle de timeout e evitar erros do fetch nativo (undici)
                const response = await axios.get(url, {
                    responseType: 'text',
                    timeout: 30000 // 30 segundos de timeout
                });

                if (response.status !== 200) throw new Error('Erro ao baixar HTML convertido');

                const htmlContent = response.data;

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

                if (isPaymentRequired && attempts < availableKeys.length - 1) {
                    console.warn(`[CloudConvert] Chave ${actualKeyIndex} esgotada (402). Rotacionando...`);
                    currentIndex++;
                    attempts++;
                    continue; // Tenta o próximo loop
                }

                console.error('[CloudConvert Service] Erro fatal:', error);
                return err(error.message || 'Erro inesperado no CloudConvert');
            }
        }

        return err('Todas as chaves CloudConvert disponíveis estão esgotadas (Erro 402).');
    }
}
