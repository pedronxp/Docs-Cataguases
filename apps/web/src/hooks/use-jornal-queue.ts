import { useInfiniteQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface JornalQueueOptions {
    limit?: number
    tipo?: string
}

export function useJornalQueue(options: JornalQueueOptions = {}) {
    const { limit = 50, tipo } = options

    const query = useInfiniteQuery({
        queryKey: ['jornal', 'fila', { limit, tipo }],
        queryFn: async ({ pageParam }: { pageParam?: string }) => {
            const params = new URLSearchParams()
            if (pageParam) params.set('cursor', pageParam)
            params.set('limit', limit.toString())
            if (tipo && tipo !== 'TODOS') params.set('tipo', tipo)

            const res = await api.get(`/api/jornal?${params}`)
            const data = res.data.data

            return {
                fila: data.fila ?? [],
                pagination: data.pagination ?? { nextCursor: null, hasMore: false, total: 0 },
                metricas: data.metricas ?? null
            }
        },
        getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
        initialPageParam: undefined as string | undefined,
    })

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = query

    const fila = data?.pages.flatMap(page => page.fila) ?? []
    const total = data?.pages[0]?.pagination?.total ?? 0
    const metricas = data?.pages[0]?.metricas ?? null

    return {
        fila,
        total,
        metricas,
        isLoading,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    }
}
