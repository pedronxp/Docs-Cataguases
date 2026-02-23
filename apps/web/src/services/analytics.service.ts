import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export interface KpiMetrics {
    totalProduzido: number
    crescimentoPercentual: number
    taxaPublicacao: number
    acervoOficial: number
    orgaoMaisAtivo: { nome: string; quantidade: number }
}

export interface HistoricoItem {
    mes: string
    volume: number
}

export interface ChartData {
    kpis: KpiMetrics
    evolucaoMensal: HistoricoItem[]
    distribuicaoStatus: { status: string; count: number; fill: string }[]
    secretariasTop: { nome: string; count: number }[]
}

export interface AnalyticsFiltro {
    secretariaId?: string
    setorId?: string
}

export async function buscarDadosAnalytics(filtro?: AnalyticsFiltro): Promise<Result<ChartData>> {
    try {
        const response = await api.get('/api/admin/analytics', { params: filtro })
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao carregar dados de analytics')
    }
}

export const analyticsService = {
    buscarDadosAnalytics
}
