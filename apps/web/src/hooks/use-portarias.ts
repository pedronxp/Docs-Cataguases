import { useState, useEffect, useCallback } from 'react'
import { portariaService } from '@/services/portaria.service'
import type { Portaria, StatusPortaria } from '@/types/domain'

interface PortariaFilters {
    busca?: string
    status?: StatusPortaria
    secretariaId?: string
}

// Auto-refresh a cada 15s para listas de portarias (revisão, fila, etc.)
const PORTARIAS_REFRESH_MS = 15_000

export function usePortarias(initialFilters: PortariaFilters = {}) {
    const [loading, setLoading] = useState(true)
    const [portarias, setPortarias] = useState<Portaria[]>([])
    const [filters, setFilters] = useState<PortariaFilters>(initialFilters)

    const fetchPortarias = useCallback(async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const result = await portariaService.listarPortarias({
                ...filters,
                pageSize: 50
            })
            if (result.success) {
                setPortarias(result.data.data)
            }
        } catch (error) {
            console.error('Erro ao buscar portarias:', error)
        } finally {
            if (!silent) setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        fetchPortarias()

        // Polling silencioso a cada 15s para detectar mudanças de status em tempo real
        const interval = setInterval(() => fetchPortarias(true), PORTARIAS_REFRESH_MS)
        return () => clearInterval(interval)
    }, [fetchPortarias])

    const updateFilters = (newFilters: Partial<PortariaFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }))
    }

    return {
        portarias,
        loading,
        filters,
        updateFilters,
        refresh: () => fetchPortarias(false),
    }
}
