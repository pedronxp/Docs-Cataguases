import CloudConvert from 'cloudconvert';
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
            const sdk = new CloudConvert(currentKey);

            try {
                const job = await sdk.jobs.create({
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
                });

                const finishedJob = await sdk.jobs.wait(job.id);
                const exportTask = finishedJob.tasks.find(t => t.operation === 'export/url' && t.status === 'finished');

                if (!exportTask || !exportTask.result?.files?.[0]?.url) {
                    throw new Error('Falha na exportação do PDF');
                }

                const res = await fetch(exportTask.result.files[0].url);
                if (!res.ok) throw new Error('Erro ao baixar PDF');

                const buffer = Buffer.from(await res.arrayBuffer());

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
