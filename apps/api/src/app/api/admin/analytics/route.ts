import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { AnalyticsService } from '@/services/analytics.service'
import { CacheService, CACHE_TTL, CACHE_TAGS } from '@/services/cache.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Retorna métricas agregadas para o dashboard administrativo.
 * Cache-Aside com TTL de 60s por role+secretaria.
 */
export async function GET() {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const role = (usuario as any).role || 'OPERADOR'
        const secretariaId = (usuario as any).secretariaId || undefined

        // Cache-Aside: chave única por role+secretaria
        const cacheKey = CacheService.key('analytics', 'dashboard', role, secretariaId)
        const data = await CacheService.getOrSet(
            cacheKey,
            async () => {
                const result = await AnalyticsService.obterDashboardCompleto({ secretariaId, role })
                if (!result.ok) throw new Error(result.error)
                return result.value
            },
            CACHE_TTL.ANALYTICS_DASHBOARD,
            [CACHE_TAGS.ANALYTICS, CACHE_TAGS.PORTARIAS]
        )

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        console.error('Erro no Analytics endpoint:', error)
        return NextResponse.json({ error: error.message || 'Erro interno ao recuperar métricas' }, { status: 500 })
    }
}
