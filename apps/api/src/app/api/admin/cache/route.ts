import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { CacheService } from '@/services/cache.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cache
 * Retorna estatísticas do cache (apenas ADMIN_GERAL).
 */
export async function GET() {
    try {
        const usuario = await getAuthUser()
        if (!usuario || (usuario as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const stats = await CacheService.getStats()
        const hitRate = stats.hits + stats.misses > 0
            ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100)
            : 0

        return NextResponse.json({
            success: true,
            data: {
                ...stats,
                hitRate,
                hitRateLabel: `${hitRate}%`,
            }
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao obter stats do cache' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/cache
 * Limpa todo o cache ou por tag/pattern.
 * Body: { tag?: string, pattern?: string }
 */
export async function DELETE(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario || (usuario as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json().catch(() => ({}))

        if (body.tag) {
            const count = await CacheService.invalidateByTag(body.tag)
            return NextResponse.json({ success: true, message: `${count} entradas invalidadas por tag "${body.tag}"` })
        }

        if (body.pattern) {
            const count = await CacheService.invalidateByPattern(body.pattern)
            return NextResponse.json({ success: true, message: `${count} entradas invalidadas por padrão "${body.pattern}"` })
        }

        // Flush completo
        await CacheService.flush()
        return NextResponse.json({ success: true, message: 'Cache completamente limpo' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao limpar cache' }, { status: 500 })
    }
}
