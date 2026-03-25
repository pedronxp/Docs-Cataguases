import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { AnalyticsService } from '@/services/analytics.service'
import { CacheService, CACHE_TTL, CACHE_TAGS } from '@/services/cache.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics-avancado
 * Dashboard analytics avançado com métricas detalhadas.
 * Cache de 60s para reduzir carga no banco.
 */
export async function GET(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const role = (usuario as any).role || 'OPERADOR'

        const url = new URL(request.url)
        const periodo = parseInt(url.searchParams.get('periodo') || '90')
        const uiSecretariaId = url.searchParams.get('secretariaId') === 'all' ? undefined : url.searchParams.get('secretariaId') || undefined
        const uiSetorId = url.searchParams.get('setorId') === 'all' ? undefined : url.searchParams.get('setorId') || undefined

        const secretariaId = (usuario as any).secretariaId || uiSecretariaId
        const setorId = uiSetorId

        // Cache-Aside
        const cacheKey = CacheService.key('analytics', 'avancado', role, secretariaId || 'all', setorId || 'all', String(periodo))
        const data = await CacheService.getOrSet(
            cacheKey,
            async () => {
                const result = await AnalyticsService.obterDashboardAvancado({ secretariaId, setorId, role, periodo })
                if (!result.ok) throw new Error(result.error)
                return result.value
            },
            CACHE_TTL.ANALYTICS_DASHBOARD,
            [CACHE_TAGS.ANALYTICS, CACHE_TAGS.PORTARIAS]
        )

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Erro no Analytics Avançado:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
