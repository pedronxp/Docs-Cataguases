import { useState, useEffect } from 'react'
import type { ModeloDocumento } from '@/types/domain'
import { listarModelos, buscarModelo } from '@/services/modelo.service'

export function useModelos() {
    const [modelos, setModelos] = useState<ModeloDocumento[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        listarModelos().then((result) => {
            if (cancelled) return
            if (result.success) setModelos(result.data)
            else setError(result.error)
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [])

    return { modelos, loading, error }
}

export function useModelo(id: string) {
    const [modelo, setModelo] = useState<ModeloDocumento | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return
        let cancelled = false
        setLoading(true)
        buscarModelo(id).then((result) => {
            if (cancelled) return
            if (result.success) setModelo(result.data)
            else setError(result.error)
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [id])

    return { modelo, loading, error }
}
