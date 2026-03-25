import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export interface SidebarCounts {
    filaRevisao: number
    minhasRevisoes: number
    aguardandoAssinatura: number
    notificacoesNaoLidas: number
    portariasCorrecao: number
    filaAprovacao: number
}

const EMPTY: SidebarCounts = {
    filaRevisao: 0,
    minhasRevisoes: 0,
    aguardandoAssinatura: 0,
    notificacoesNaoLidas: 0,
    portariasCorrecao: 0,
    filaAprovacao: 0,
}

// Polling a cada 15s para atualizar badges sem depender só do SSE
const POLL_INTERVAL_MS = 15_000

/**
 * Hook que busca contagens para os badges da sidebar.
 * Faz polling automático a cada 15s e recarrega quando o usuário
 * torna-se autenticado.
 */
export function useSidebarCounts() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const [counts, setCounts] = useState<SidebarCounts>(EMPTY)

    const fetchCounts = useCallback(async () => {
        if (!useAuthStore.getState().isAuthenticated) return
        try {
            const res = await api.get('/api/sidebar-counts')
            if (res.data?.success && res.data?.data) {
                setCounts(res.data.data as SidebarCounts)
            }
        } catch {
            // falha silenciosa — não interrompe a UI
        }
    }, [])

    useEffect(() => {
        if (!isAuthenticated) {
            setCounts(EMPTY)
            return
        }

        fetchCounts()
        const interval = setInterval(fetchCounts, POLL_INTERVAL_MS)

        // Escuta eventos globais para atualizar instantaneamente
        const handleForceRefresh = () => fetchCounts()
        window.addEventListener('portaria-changed', handleForceRefresh)

        return () => {
            clearInterval(interval)
            window.removeEventListener('portaria-changed', handleForceRefresh)
        }
    }, [isAuthenticated, fetchCounts])

    return { counts, refresh: fetchCounts }
}
