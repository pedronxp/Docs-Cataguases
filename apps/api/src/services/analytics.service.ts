import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

export class AnalyticsService {
    /**
     * Obtém o dashboard completo para o frontend.
     */
    static async obterDashboardCompleto(params: {
        secretariaId?: string;
        role: string;
    }) {
        const { secretariaId, role } = params
        const where: any = {}

        if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO' && secretariaId) {
            where.secretariaId = secretariaId
        }

        try {
            // 1. KPIs
            const total = await prisma.portaria.count({ where })
            const publicadas = await prisma.portaria.count({
                where: { ...where, status: 'PUBLICADA' }
            })

            // 2. Distribuição por Status
            const statusCounts = await prisma.portaria.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            })

            // 3. Top Secretarias (Se for Admin)
            let secretariasTop: any[] = []
            if (role === 'ADMIN_GERAL' || role === 'PREFEITO') {
                const topRes = await prisma.portaria.groupBy({
                    by: ['secretariaId'],
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                })

                // Buscar nomes das secretarias
                const ids = topRes.map(r => r.secretariaId).filter(Boolean) as string[]
                const secs = await prisma.secretaria.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, nome: true }
                })

                secretariasTop = topRes.map(r => ({
                    nome: secs.find(s => s.id === r.secretariaId)?.nome || 'Outros',
                    count: r._count.id
                }))
            }

            /*
            const seisMesesAtras = new Date()
            seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)

            const historico = await prisma.portaria.findMany({
                where: {
                    ...where,
                    // createdAt: { gte: seisMesesAtras }
                },
                // select: { createdAt: true }
            })
            */
            const historico: any[] = []

            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
            const evolucaoMap = historico.reduce((acc: any, p) => {
                const mes = meses[p.createdAt.getMonth()]
                acc[mes] = (acc[mes] || 0) + 1
                return acc
            }, {})

            const evolucaoMensal = Object.entries(evolucaoMap).map(([mes, volume]) => ({
                mes,
                volume: volume as number
            }))

            return ok({
                kpis: {
                    totalProduzido: total,
                    crescimentoPercentual: 12, // Mock por enquanto ou calcular
                    taxaPublicacao: total > 0 ? Math.round((publicadas / total) * 100) : 0,
                    acervoOficial: publicadas
                },
                distribuicaoStatus: statusCounts.map(s => ({
                    status: s.status,
                    count: s._count.id,
                    fill: this.getColorForStatus(s.status)
                })),
                secretariasTop,
                evolucaoMensal
            })
        } catch (error) {
            console.error('Erro ao obter dashboard completo:', error)
            return err('Falha ao processar dados analíticos.')
        }
    }

    private static getColorForStatus(status: string) {
        const colors: any = {
            'RASCUNHO': '#94a3b8',
            'PROCESSANDO': '#60a5fa',
            'PENDENTE': '#fbbf24',
            'APROVADA': '#34d399',
            'PUBLICADA': '#10b981',
            'REJEITADA': '#f87171'
        }
        return colors[status] || '#cbd5e1'
    }

    /**
     * Obtém dados para gráficos de linha (documentos ao longo do tempo).
     */
    static async obterSeriesTemporais(params: {
        secretariaId?: string;
        dias?: number;
    }) {
        const { secretariaId, dias = 30 } = params
        const dataCorte = new Date()
        dataCorte.setDate(dataCorte.getDate() - dias)

        try {
            const portarias = await prisma.portaria.findMany({
                where: {
                    secretariaId: secretariaId || undefined,
                    // createdAt: { gte: dataCorte }
                },
                // select: { createdAt: true },
                // orderBy: { createdAt: 'asc' }
            })

            const serieAgrupada: any = {}
            /*
            const serieAgrupada = portarias.reduce((acc: any, p) => {
                const dia = p.createdAt.toISOString().split('T')[0]
                acc[dia] = (acc[dia] || 0) + 1
                return acc
            }, {})
            */

            const dataFormatada = Object.entries(serieAgrupada).map(([data, quant]) => ({
                data,
                quantidade: quant
            }))

            return ok(dataFormatada)
        } catch (error) {
            console.error('Erro ao obter séries temporais:', error)
            return err('Falha ao gerar dados do gráfico.')
        }
    }
}
