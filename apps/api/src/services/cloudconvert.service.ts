import CloudConvert from 'cloudconvert';
import { ok, err, Result } from '@/lib/result';
import fs from 'fs';
import path from 'path';

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '');

export class CloudConvertService {
    /**
     * Converte um arquivo DOCX em HTML usando CloudConvert.
     * @param file Stream ou Buffer do arquivo
     * @param fileName Nome do arquivo original
     */
    static async extractToHtml(fileBuffer: Buffer, fileName: string): Promise<Result<string>> {
        try {
            if (!process.env.CLOUDCONVERT_API_KEY) {
                return err('Configuração do CloudConvert ausente no servidor.');
            }

            const job = await cloudConvert.jobs.create({
                tasks: {
                    'upload-my-file': {
                        operation: 'import/upload'
                    },
                    'convert-my-file': {
                        operation: 'convert',
                        input: 'upload-my-file',
                        output_format: 'html',
                        engine: 'office' // Usar o engine de office para melhor precisão em DOCX
                    },
                    'export-my-file': {
                        operation: 'export/url',
                        input: 'convert-my-file'
                    }
                }
            });

            const uploadTask = job.tasks.find(task => task.name === 'upload-my-file');

            if (!uploadTask) {
                return err('Erro ao criar tarefa de upload no CloudConvert.');
            }

            // Faz o upload do arquivo
            await cloudConvert.tasks.upload(uploadTask, Buffer.from(fileBuffer), fileName);

            // Aguarda a finalização do job
            const finishedJob = await cloudConvert.jobs.wait(job.id);

            const exportTask = finishedJob.tasks.find(task => task.operation === 'export/url' && task.status === 'finished');

            if (!exportTask || !exportTask.result?.files?.[0]?.url) {
                return err('Erro ao exportar resultado do CloudConvert.');
            }

            const url = exportTask.result.files[0].url;

            // Busca o conteúdo HTML da URL gerada
            const response = await fetch(url);
            if (!response.ok) {
                return err('Erro ao baixar o conteúdo HTML convertido.');
            }

            const htmlContent = await response.text();

            return ok(htmlContent);
        } catch (error: any) {
            console.error('Erro no CloudConvert Service:', error);
            return err(error.message || 'Erro inesperado no processamento do documento.');
        }
    }
}
