import axios from 'axios';
import { ok, err, Result } from '@/lib/result';
import fs from 'fs';
import path from 'path';

export class PdfService {
    /**
     * Busca todas as chaves configuradas no .env. (Reaproveitado do CloudConvertService)
     */
    private static async getKeys(): Promise<string[]> {
        const keys: string[] = [];
        if (process.env.CLOUDCONVERT_API_KEY) keys.push(process.env.CLOUDCONVERT_API_KEY);

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
            if (!found) lines.push(newLine);
            fs.writeFileSync(envPath, lines.join('\n'));
            process.env.CLOUDCONVERT_CURRENT_KEY_INDEX = String(index);
        } catch (error) {
            console.error('[PdfService] Erro ao persistir índice:', error);
        }
    }

    /**
     * Converte um buffer DOCX para PDF usando CloudConvert com rotação de chaves.
     * O PDF resultante preserva toda a formatação, imagens e estilos do Word.
     */
    static async docxToPdf(docxBuffer: Buffer): Promise<Result<Buffer>> {
        const availableKeys = await this.getKeys();
        if (availableKeys.length === 0) return err('Nenhuma chave CloudConvert configurada.');

        let currentIndex = parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10);
        let attempts = 0;

        while (attempts < availableKeys.length) {
            const actualKeyIndex = currentIndex % availableKeys.length;
            const currentKey = availableKeys[actualKeyIndex];
            try {
                // 1. Importa o DOCX como base64
                const base64 = docxBuffer.toString('base64');
                const jobRes = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                    tasks: {
                        'import-docx': {
                            operation: 'import/base64',
                            file: base64,
                            filename: 'documento.docx'
                        },
                        'convert-pdf': {
                            operation: 'convert',
                            input: 'import-docx',
                            output_format: 'pdf',
                            engine: 'office'  // LibreOffice — fidelidade máxima ao Word
                        },
                        'export-pdf': {
                            operation: 'export/url',
                            input: 'convert-pdf'
                        }
                    }
                }, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 30000
                });

                const job = jobRes.data.data;

                const waitRes = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}/wait`, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 120000
                });

                const finishedJob = waitRes.data.data;
                const exportTask = finishedJob.tasks.find((t: any) => t.operation === 'export/url' && t.status === 'finished');

                if (!exportTask || !exportTask.result?.files?.[0]?.url) {
                    throw new Error('Falha na exportação do PDF a partir do DOCX');
                }

                const res = await axios.get(exportTask.result.files[0].url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                if (res.status !== 200) throw new Error('Erro ao baixar PDF convertido');

                const buffer = Buffer.from(res.data);

                if (actualKeyIndex !== parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10)) {
                    await this.persistActiveIndex(actualKeyIndex);
                }

                return ok(buffer);

            } catch (error: any) {
                const is402 = error.message?.includes('402') || error.response?.status === 402;
                if (is402 && attempts < availableKeys.length - 1) {
                    currentIndex++;
                    attempts++;
                    continue;
                }
                return err(error.message || 'Erro na conversão DOCX→PDF');
            }
        }
        return err('Todas as chaves esgotadas.');
    }

    /**
     * Converte HTML para PDF usando CloudConvert com rotação de chaves.
     */
    static async htmlToPdf(html: string): Promise<Result<Buffer>> {
        const availableKeys = await this.getKeys();
        if (availableKeys.length === 0) return err('Nenhuma chave CloudConvert configurada.');

        let currentIndex = parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10);
        let attempts = 0;

        while (attempts < availableKeys.length) {
            const actualKeyIndex = currentIndex % availableKeys.length;
            const currentKey = availableKeys[actualKeyIndex];
            try {
                const jobRes = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                    tasks: {
                        'import-html': {
                            operation: 'import/raw',
                            file: html,
                            filename: 'input.html'
                        },
                        'convert-pdf': {
                            operation: 'convert',
                            input: 'import-html',
                            output_format: 'pdf',
                            engine: 'chrome', // Melhor para HTML moderno
                            wait_until: 'network_idle'
                        },
                        'export-pdf': {
                            operation: 'export/url',
                            input: 'convert-pdf'
                        }
                    }
                }, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 30000
                });

                const job = jobRes.data.data;

                const waitRes = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}/wait`, {
                    headers: { 'Authorization': `Bearer ${currentKey}` },
                    timeout: 120000
                });

                const finishedJob = waitRes.data.data;
                const exportTask = finishedJob.tasks.find((t: any) => t.operation === 'export/url' && t.status === 'finished');

                if (!exportTask || !exportTask.result?.files?.[0]?.url) {
                    throw new Error('Falha na exportação do PDF');
                }

                const res = await axios.get(exportTask.result.files[0].url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                if (res.status !== 200) throw new Error('Erro ao baixar PDF');

                const buffer = Buffer.from(res.data);

                if (actualKeyIndex !== parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10)) {
                    await this.persistActiveIndex(actualKeyIndex);
                }

                return ok(buffer);

            } catch (error: any) {
                const is402 = error.message?.includes('402') || error.response?.status === 402;
                if (is402 && attempts < availableKeys.length - 1) {
                    currentIndex++;
                    attempts++;
                    continue;
                }
                return err(error.message || 'Erro na conversão para PDF');
            }
        }
        return err('Todas as chaves esgotadas.');
    }
}
