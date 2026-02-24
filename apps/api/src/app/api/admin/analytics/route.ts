import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { AnalyticsService } from '@/services/analytics.service'

export async function GET(request: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const user = usuario as any
        const ability = buildAbility(user)

        // Apenas roles de gestão podem ver o dashboard detalhado
        const podemVerDashboard = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'GESTOR_SETOR']
        if (!podemVerDashboard.includes(user.role as string)) {
            return NextResponse.json({ success: false, error: 'Sem permissão para acessar analytics.' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const incluirSeries = searchParams.get('series') === 'true'

        // Métricas baseadas no escopo
        const metricasResult = await AnalyticsService.obterMetricasGerais({
            secretariaId: user.secretariaId as string | undefined,
            role: user.role as string
        })

        if (!metricasResult.ok) {
            return NextResponse.json({ success: false, error: metricasResult.error }, { status: 500 })
        }

        const data: any = { ...metricasResult.value }

        if (incluirSeries) {
            const seriesResult = await AnalyticsService.obterSeriesTemporais({
                secretariaId: user.secretariaId as string | undefined,
                dias: 30
            })
            if (seriesResult.ok) {
                data.series = seriesResult.value
            }
        }

        return NextResponse.json({
            success: true,
            data
        })
    } catch (error) {
        console.error('Erro no endpoint de analytics:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao carregar analytics.' }, { status: 500 })
    }
}
