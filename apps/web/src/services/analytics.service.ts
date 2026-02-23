import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

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

export async function buscarDadosAnalytics(_filtro?: AnalyticsFiltro): Promise<Result<ChartData>> {
    await mockDelay(800)

    // No Ciclo 2, isso sera substituido por Prisma.groupBy
    return ok({
        kpis: {
            totalProduzido: 342,
            crescimentoPercentual: 12.5,
            taxaPublicacao: 84.2,
            acervoOficial: 288,
            orgaoMaisAtivo: { nome: 'Secretaria de RH', quantidade: 145 }
        },
        evolucaoMensal: [
            { mes: 'Jan', volume: 45 }, { mes: 'Fev', volume: 52 },
            { mes: 'Mar', volume: 38 }, { mes: 'Abr', volume: 65 },
            { mes: 'Mai', volume: 48 }, { mes: 'Jun', volume: 94 }
        ],
        distribuicaoStatus: [
            { status: 'Publicadas', count: 288, fill: '#10b981' }, // emerald-500
            { status: 'Processando', count: 12, fill: '#3b82f6' }, // blue-500
            { status: 'Rascunhos', count: 24, fill: '#64748b' },   // slate-500
            { status: 'Aguard. Assinatura', count: 18, fill: '#f59e0b' } // amber-500
        ],
        secretariasTop: [
            { nome: 'RH', count: 145 },
            { nome: 'Obras', count: 82 },
            { nome: 'Saúde', count: 64 },
            { nome: 'Educação', count: 51 }
        ]
    })
}
