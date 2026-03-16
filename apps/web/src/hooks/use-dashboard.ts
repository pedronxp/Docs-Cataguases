import { useState, useEffect, useCallback } from 'react'
import { feedService } from '@/services/feed.service'
import { portariaService } from '@/services/portaria.service'
import { buscarDadosAnalytics, type ChartData } from '@/services/analytics.service'
import type { FeedAtividade, Portaria } from '@/types/domain'
import { STATUS_PORTARIA } from '@/types/domain'

export interface DashboardStats {
    rascunhos: number
    aguardandoRevisao: number
    publicadasMes: number
    assinaturasPendentes: number
    totalDocumentos: number
    publicadasTotal: number
}

// Auto-refresh a cada 30s (mantém o dashboard atualizado em tempo real)
const DASHBOARD_REFRESH_MS = 30_000

export function useDashboard() {
    const [loading, setLoading] = useState(true)
    const [feed, setFeed] = useState<FeedAtividade[]>([])
    const [stats, setStats] = useState<DashboardStats>({
        rascunhos: 0,
        aguardandoRevisao: 0,
        publicadasMes: 0,
        assinaturasPendentes: 0,
        totalDocumentos: 0,
        publicadasTotal: 0,
    })
    const [chartData, setChartData] = useState<ChartData | null>(null)

    const loadDashboardData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const [resFeed, resPortarias, resAnalytics] = await Promise.all([
                feedService.listarFeed(undefined, true),
                portariaService.listarPortarias({ pageSize: 200 }),
                buscarDadosAnalytics().catch(() => ({ success: false, data: null } as any)),
            ])

            if (resFeed.success) {
                setFeed(resFeed.data)
            }

            if (resPortarias.success) {
                const docs = resPortarias.data.data as Portaria[]
                const agora = new Date()
                const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

                setStats({
                    // RASCUNHO ou CORRECAO_NECESSARIA → em elaboração
                    rascunhos: docs.filter(d =>
                        d.status === STATUS_PORTARIA.RASCUNHO ||
                        d.status === STATUS_PORTARIA.CORRECAO_NECESSARIA
                    ).length,
                    // Em revisão aberta ou atribuída
                    aguardandoRevisao: docs.filter(d =>
                        d.status === STATUS_PORTARIA.EM_REVISAO_ABERTA ||
                        d.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA
                    ).length,
                    // Publicadas no mês atual
                    publicadasMes: docs.filter(d =>
                        d.status === STATUS_PORTARIA.PUBLICADA &&
                        d.createdAt &&
                        new Date(d.createdAt) >= inicioMes
                    ).length,
                    // Aguardando assinatura ou pronto para publicação
                    assinaturasPendentes: docs.filter(d =>
                        d.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA ||
                        d.status === STATUS_PORTARIA.PRONTO_PUBLICACAO
                    ).length,
                    totalDocumentos: docs.length,
                    publicadasTotal: docs.filter(d => d.status === STATUS_PORTARIA.PUBLICADA).length,
                })
            }

            if (resAnalytics?.success && resAnalytics.data) {
                setChartData(resAnalytics.data)
            }
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error)
        } finally {
            if (!silent) setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadDashboardData()

        // Polling silencioso a cada 30s para manter dados atualizados
        const interval = setInterval(() => loadDashboardData(true), DASHBOARD_REFRESH_MS)
        return () => clearInterval(interval)
    }, [loadDashboardData])

    return {
        feed,
        stats,
        chartData,
        loading,
        refresh: () => loadDashboardData(false),
    }
}
