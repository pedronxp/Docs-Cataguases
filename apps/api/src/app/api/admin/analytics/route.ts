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
export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const role = (usuario as any).role || 'OPERADOR'
        
        const { searchParams } = new URL(req.url)
        const uiSecretariaId = searchParams.get('secretariaId') === 'all' ? undefined : searchParams.get('secretariaId') || undefined
        const uiSetorId = searchParams.get('setorId') === 'all' ? undefined : searchParams.get('setorId') || undefined

        const secretariaId = (usuario as any).secretariaId || uiSecretariaId
        const setorId = uiSetorId

        // Cache-Aside: chave única por role+secretaria+setor
        const cacheKey = CacheService.key('analytics', 'dashboard', role, secretariaId || 'all', setorId || 'all')
        const data = await CacheService.getOrSet(
            cacheKey,
            async () => {
                const result = await AnalyticsService.obterDashboardCompleto({ secretariaId, setorId, role })
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
