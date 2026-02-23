import CloudConvert from 'cloudconvert'
import fs from 'fs'

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY || '')

export class DocxService {
    /**
     * Converte um DOCX hospedado em uma URL para HTML usando CloudConvert
     */
    static async convertToHtml(docxUrl: string): Promise<string> {
        if (!process.env.CLOUDCONVERT_API_KEY) {
            throw new Error('CLOUDCONVERT_API_KEY não configurada nas variáveis de ambiente.')
        }

        try {
            const job = await cloudConvert.jobs.create({
                tasks: {
                    'import-my-file': {
                        operation: 'import/url',
                        url: docxUrl
                    },
                    'convert-my-file': {
                        operation: 'convert',
                        input: 'import-my-file',
                        output_format: 'html',
                        engine: 'office'
                    },
                    'export-my-file': {
                        operation: 'export/url',
                        input: 'convert-my-file'
                    }
                }
            })

            const finishedJob = await cloudConvert.jobs.wait(job.id)
            const exportTask = finishedJob.tasks.find((task: any) => task.name === 'export-my-file')

            if (exportTask?.result?.files?.[0]?.url) {
                const htmlUrl = exportTask.result.files[0].url
                const response = await fetch(htmlUrl)
                return await response.text()
            }

            throw new Error('Falha ao exportar HTML do CloudConvert')
        } catch (error) {
            console.error('Erro no CloudConvert:', error)
            throw error
        }
    }
}
