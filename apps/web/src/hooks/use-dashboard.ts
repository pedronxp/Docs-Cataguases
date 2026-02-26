import { useState, useEffect } from 'react'
import { feedService } from '@/services/feed.service'
import { portariaService } from '@/services/portaria.service'
import type { FeedAtividade, Portaria } from '@/types/domain'
import { STATUS_PORTARIA } from '@/types/domain'

export function useDashboard() {
    const [loading, setLoading] = useState(true)
    const [feed, setFeed] = useState<FeedAtividade[]>([])
    const [stats, setStats] = useState({
        rascunhos: 0,
        aguardandoRevisao: 0,
        publicadasMes: 0,
        assinaturasPendentes: 0
    })

    useEffect(() => {
        async function loadDashboardData() {
            setLoading(true)
            try {
                const [resFeed, resPortarias] = await Promise.all([
                    feedService.listarFeed(),
                    portariaService.listarPortarias({ pageSize: 100 })
                ])

                if (resFeed.success) {
                    setFeed(resFeed.data)
                }

                if (resPortarias.success) {
                    const docs = resPortarias.data.data
                    const agora = new Date()
                    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

                    setStats({
                        rascunhos: docs.filter((d: Portaria) => d.status === STATUS_PORTARIA.RASCUNHO).length,
                        aguardandoRevisao: docs.filter((d: Portaria) => d.status === STATUS_PORTARIA.PENDENTE).length,
                        publicadasMes: docs.filter((d: Portaria) =>
                            d.status === STATUS_PORTARIA.PUBLICADA &&
                            d.createdAt &&
                            new Date(d.createdAt) >= inicioMes
                        ).length,
                        assinaturasPendentes: docs.filter((d: Portaria) => d.status === STATUS_PORTARIA.APROVADA).length
                    })
                }
            } catch (error) {
                console.error('Erro ao carregar dashboard:', error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboardData()
    }, [])

    return {
        feed,
        stats,
        loading,
    }
}
