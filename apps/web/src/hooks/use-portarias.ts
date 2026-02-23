import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import type { Portaria, StatusPortaria } from '@/types/domain'

interface PortariaFilters {
    busca?: string
    status?: StatusPortaria
    secretariaId?: string
}

export function usePortarias(initialFilters: PortariaFilters = {}) {
    const [loading, setLoading] = useState(true)
    const [portarias, setPortarias] = useState<Portaria[]>([])
    const [filters, setFilters] = useState<PortariaFilters>(initialFilters)

    const fetchPortarias = async () => {
        setLoading(true)
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
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPortarias()
    }, [filters])

    const updateFilters = (newFilters: Partial<PortariaFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }))
    }

    return {
        portarias,
        loading,
        filters,
        updateFilters,
        refresh: fetchPortarias
    }
}
