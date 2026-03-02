import prisma from '@/lib/prisma'
import PDFDocument from 'pdfkit'

export interface ExportParams {
    formato: 'csv' | 'pdf' | 'pdf-analitico' | 'json'
    periodo: string
}

interface DadosPublicacao {
    numero: string | null | undefined
    titulo: string
    secretaria: string
    dataPublicacao: string | undefined
}

export class JornalExportService {
    static async gerarRelatorio({ formato, periodo }: ExportParams) {
        const dados = await this.buscarDados(periodo)

        switch (formato) {
            case 'csv':
                return this.gerarCSV(dados)
            case 'json':
                return this.gerarJSON(dados)
            case 'pdf':
                return this.gerarPDF(dados, periodo)
            case 'pdf-analitico':
                return this.gerarPDFAnalitico(dados, periodo)
            default:
                throw new Error(`Formato ${formato} não suportado`)
        }
    }

    private static async buscarDados(periodo: string): Promise<DadosPublicacao[]> {
        const agora = new Date()
        let dataInicio: Date

        switch (periodo) {
            case 'hoje':
                dataInicio = new Date(agora)
                dataInicio.setHours(0, 0, 0, 0)
                break
            case 'semana':
                dataInicio = new Date(agora)
                dataInicio.setDate(agora.getDate() - 7)
                break
            case 'mes-atual':
                dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
                break
            case 'ano-atual':
                dataInicio = new Date(agora.getFullYear(), 0, 1)
                break
            default:
                dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
        }

        const publicacoes = await prisma.portaria.findMany({
            where: {
                status: 'PUBLICADA',
                dataPublicacao: { gte: dataInicio }
            },
            include: { secretaria: true },
            orderBy: { dataPublicacao: 'desc' }
        })

        return publicacoes.map(p => ({
            numero: p.numeroOficial,
            titulo: p.titulo,
            secretaria: p.secretaria.nome,
            dataPublicacao: p.dataPublicacao?.toLocaleDateString('pt-BR')
        }))
    }

    private static gerarCSV(dados: DadosPublicacao[]) {
        const cabecalho = 'Número;Título;Secretaria;Data de Publicação\n'
        const linhas = dados
            .map(d => [
                d.numero ?? '',
                `"${(d.titulo ?? '').replace(/"/g, '""')}"`,
                `"${(d.secretaria ?? '').replace(/"/g, '""')}"`,
                d.dataPublicacao ?? ''
            ].join(';'))
            .join('\n')

        const csv = cabecalho + linhas
        const buffer = Buffer.from('\uFEFF' + csv, 'utf-8') // BOM para Excel

        return {
            buffer,
            filename: `relatorio-jornal-${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv; charset=utf-8'
        }
    }

    private static gerarJSON(dados: DadosPublicacao[]) {
        const payload = {
            geradoEm: new Date().toISOString(),
            total: dados.length,
            publicacoes: dados
        }
        const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8')

        return {
            buffer,
            filename: `relatorio-jornal-${new Date().toISOString().split('T')[0]}.json`,
            mimeType: 'application/json'
        }
    }

    private static async gerarPDF(dados: DadosPublicacao[], periodo: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            const doc = new PDFDocument({ size: 'A4', margin: 50 })

            doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            doc.on('end', () => resolve({
                buffer: Buffer.concat(chunks),
                filename: `relatorio-jornal-${new Date().toISOString().split('T')[0]}.pdf`,
                mimeType: 'application/pdf'
            }))
            doc.on('error', reject)

            // Cabeçalho
            doc
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('Relatório de Publicações', { align: 'center' })
                .fontSize(11)
                .font('Helvetica')
                .text(`Município de Cataguases — Diário Oficial`, { align: 'center' })
                .moveDown(0.5)
                .fontSize(10)
                .fillColor('#64748b')
                .text(`Período: ${this.periodoLabel(periodo)}`, { align: 'center' })
                .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
                .fillColor('#000000')
                .moveDown(1)

            // Linha separadora
            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0').moveDown(0.5)

            // Total
            doc
                .fontSize(10)
                .font('Helvetica-Bold')
                .text(`Total de publicações: ${dados.length}`)
                .moveDown(0.8)

            // Cabeçalho da tabela
            const tableTop = doc.y
            doc
                .fontSize(9)
                .font('Helvetica-Bold')
                .fillColor('#334155')
                .text('Número', 50, tableTop, { width: 100 })
                .text('Título', 155, tableTop, { width: 220 })
                .text('Secretaria', 380, tableTop, { width: 110 })
                .text('Data', 495, tableTop, { width: 60 })
                .fillColor('#000000')
                .moveDown(0.5)

            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cbd5e1')

            // Linhas da tabela
            dados.forEach((d, i) => {
                const y = doc.y + 4
                const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff'

                doc.rect(50, y - 2, 495, 18).fill(bg).fillColor('#000000')
                doc
                    .fontSize(8)
                    .font('Helvetica')
                    .text(d.numero ?? '—', 50, y, { width: 100 })
                    .text(d.titulo, 155, y, { width: 220 })
                    .text(d.secretaria, 380, y, { width: 110 })
                    .text(d.dataPublicacao ?? '—', 495, y, { width: 60 })

                // Nova página se necessário
                if (doc.y > 740 && i < dados.length - 1) {
                    doc.addPage()
                }
            })

            // Rodapé
            doc
                .moveDown(2)
                .fontSize(8)
                .fillColor('#94a3b8')
                .text('Documento gerado automaticamente pelo Sistema de Gestão de Portarias — Prefeitura de Cataguases', {
                    align: 'center'
                })

            doc.end()
        })
    }

    private static async gerarPDFAnalitico(dados: DadosPublicacao[], periodo: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
        // Agrupa por secretaria
        const porSecretaria: Record<string, number> = {}
        dados.forEach(d => {
            porSecretaria[d.secretaria] = (porSecretaria[d.secretaria] || 0) + 1
        })

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            const doc = new PDFDocument({ size: 'A4', margin: 50 })

            doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            doc.on('end', () => resolve({
                buffer: Buffer.concat(chunks),
                filename: `relatorio-analitico-${new Date().toISOString().split('T')[0]}.pdf`,
                mimeType: 'application/pdf'
            }))
            doc.on('error', reject)

            // Cabeçalho
            doc
                .fontSize(18)
                .font('Helvetica-Bold')
                .text('Relatório Analítico — Diário Oficial', { align: 'center' })
                .fontSize(11)
                .font('Helvetica')
                .text(`Município de Cataguases`, { align: 'center' })
                .moveDown(0.5)
                .fontSize(10)
                .fillColor('#64748b')
                .text(`Período: ${this.periodoLabel(periodo)}`, { align: 'center' })
                .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
                .fillColor('#000000')
                .moveDown(1)

            doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e2e8f0').moveDown(1)

            // Sumário executivo
            doc
                .fontSize(13)
                .font('Helvetica-Bold')
                .text('Sumário Executivo')
                .moveDown(0.5)
                .fontSize(10)
                .font('Helvetica')
                .text(`• Total de publicações no período: ${dados.length}`)
                .text(`• Secretarias envolvidas: ${Object.keys(porSecretaria).length}`)
                .moveDown(1)

            // Distribuição por secretaria
            doc
                .fontSize(13)
                .font('Helvetica-Bold')
                .text('Distribuição por Secretaria')
                .moveDown(0.5)

            Object.entries(porSecretaria)
                .sort(([, a], [, b]) => b - a)
                .forEach(([secretaria, count]) => {
                    const pct = ((count / dados.length) * 100).toFixed(1)
                    doc
                        .fontSize(10)
                        .font('Helvetica')
                        .text(`${secretaria}`, 50, doc.y, { width: 300 })
                        .text(`${count} publicação(ões)`, 355, doc.y - 12, { width: 120 })
                        .text(`${pct}%`, 480, doc.y - 12, { width: 60, align: 'right' })
                        .fillColor('#6366f1')
                        .rect(50, doc.y + 2, Math.max(4, (count / dados.length) * 300), 8).fill()
                        .fillColor('#000000')
                        .moveDown(1.2)
                })

            doc.end()
        })
    }

    private static periodoLabel(periodo: string): string {
        const labels: Record<string, string> = {
            'hoje': 'Hoje',
            'semana': 'Últimos 7 dias',
            'mes-atual': 'Mês atual',
            'ano-atual': 'Ano atual'
        }
        return labels[periodo] ?? periodo
    }
}
