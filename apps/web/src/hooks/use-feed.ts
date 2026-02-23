import { useState, useEffect } from 'react'
import type { FeedAtividade } from '@/types/domain'
import { listarFeed } from '@/services/feed.service'

export function useFeed(secretariaId?: string) {
    const [feed, setFeed] = useState<FeedAtividade[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        listarFeed(secretariaId).then((result) => {
            if (cancelled) return
            if (result.success) setFeed(result.data)
            else setError(result.error)
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [secretariaId])

    return { feed, loading, error }
}
