import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

export class AnalyticsService {
    /**
     * Obtém as métricas principais do sistema de forma agregada.
     */
    static async obterMetricasGerais(params: {
        secretariaId?: string;
        role: string;
    }) {
        const { secretariaId, role } = params
        const where: any = {}

        if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO' && secretariaId) {
            where.secretariaId = secretariaId
        }

        try {
            // 1. Contagem por Status
            const statusCounts = await prisma.portaria.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            })

            // 2. Total de Documentos
            const totalDocumentos = await prisma.portaria.count({ where })

            // 3. Usuários na Fila (Apenas Admin)
            let usuariosPendentes = 0
            if (role === 'ADMIN_GERAL') {
                usuariosPendentes = await prisma.user.count({
                    where: { role: 'PENDENTE' }
                })
            }

            // 4. Últimas 24h
            const umDiaAtras = new Date()
            umDiaAtras.setDate(umDiaAtras.getDate() - 1)
            const novosDocumentos24h = await prisma.portaria.count({
                where: {
                    ...where,
                    createdAt: { gte: umDiaAtras }
                }
            })

            return ok({
                metricas: {
                    total: totalDocumentos,
                    porStatus: statusCounts.map(s => ({
                        status: s.status,
                        quantidade: s._count.id
                    })),
                    usuariosPendentes,
                    novos24h: novosDocumentos24h
                }
            })
        } catch (error) {
            console.error('Erro ao obter métricas:', error)
            return err('Falha ao processar dados analíticos.')
        }
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
                    createdAt: { gte: dataCorte }
                },
                select: { createdAt: true },
                orderBy: { createdAt: 'asc' }
            })

            // Agrupa por dia
            const serieAgrupada = portarias.reduce((acc: any, p) => {
                const dia = p.createdAt.toISOString().split('T')[0]
                acc[dia] = (acc[dia] || 0) + 1
                return acc
            }, {})

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
