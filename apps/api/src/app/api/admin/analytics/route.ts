import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { AnalyticsService } from '@/services/analytics.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/analytics
 * Retorna métricas agregadas para o dashboard administrativo.
 */
export async function GET() {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Apenas ADMIN_GERAL, PREFEITO e SECRETARIO costumam ver analytics
        // mas o service já filtra pelo secretariaId se necessário
        const result = await AnalyticsService.obterDashboardCompleto({
            secretariaId: (usuario as any).secretariaId || undefined,
            role: (usuario as any).role || 'OPERADOR'
        })

        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        console.error('Erro no Analytics endpoint:', error)
        return NextResponse.json({ error: 'Erro interno ao recuperar métricas' }, { status: 500 })
    }
}
