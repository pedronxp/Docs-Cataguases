import prisma from '@/lib/prisma'

export class CompilerService {
    /**
     * Compila o HTML final de uma portaria injetando as variáveis no template.
     */
    static async compilarPortaria(portariaId: string): Promise<string> {
        const portaria = await prisma.portaria.findUnique({
            where: { id: portariaId },
            include: {
                modelo: {
                    include: { variaveis: true }
                }
            }
        })

        if (!portaria) throw new Error('Portaria não encontrada')

        const dados = portaria.dadosFormulario as Record<string, string>
        let html = this.getBaseTemplate()

        // 1. Substituir variáveis do modelo
        for (const [chave, valor] of Object.entries(dados)) {
            const regex = new RegExp(`{{${chave}}}`, 'g')
            html = html.replace(regex, valor || '—')
        }

        // 2. Substituir metadados da portaria
        html = html.replace(/{{numeroOficial}}/g, portaria.numeroOficial || 'S/N')
        html = html.replace(/{{dataExtenso}}/g, this.getDataExtenso(new Date()))

        return html
    }

    private static getBaseTemplate(): string {
        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        line-height: 1.6;
                        color: #000;
                        margin: 0;
                        padding: 0;
                    }
                    .brasao {
                        display: block;
                        margin: 0 auto 10px;
                        width: 80px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .titulo {
                        font-size: 16pt;
                        font-weight: bold;
                        text-align: center;
                        text-transform: uppercase;
                        margin-bottom: 20px;
                    }
                    .ementa {
                        margin-left: 50%;
                        margin-bottom: 40px;
                        text-align: justify;
                        font-style: italic;
                    }
                    .conteudo {
                        text-align: justify;
                        text-indent: 2cm;
                        margin-bottom: 40px;
                    }
                    .assinatura {
                        margin-top: 60px;
                        text-align: center;
                    }
                    .line {
                        width: 250px;
                        border-top: 1px solid #000;
                        margin: 0 auto 5px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="https://hmzaegzgfyupiitfaagc.supabase.co/storage/v1/object/public/assets/brasao-cataguases.png" class="brasao" />
                    <strong>ESTADO DE MINAS GERAIS</strong><br>
                    <strong>PREFEITURA MUNICIPAL DE CATAGUASES</strong>
                </div>

                <div class="titulo">
                    PORTARIA Nº {{numeroOficial}}
                </div>

                <div class="ementa">
                    {{ementa}}
                </div>

                <div class="conteudo">
                    {{conteudo}}
                </div>

                <div class="assinatura">
                    <div class="line"></div>
                    <strong>JOSÉ HENRIQUE TIGRE</strong><br>
                    Prefeito Municipal de Cataguases
                </div>

                <div style="font-size: 10px; margin-top: 100px; border-top: 1px solid #eee; padding-top: 10px; color: #666;">
                    Documento gerado automaticamente pelo sistema Doc's Cataguases em {{dataExtenso}}.
                </div>
            </body>
            </html>
        `
    }

    private static getDataExtenso(data: Date): string {
        return data.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }
}
