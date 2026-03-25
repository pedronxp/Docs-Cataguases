import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/result'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export class AnalyticsService {
    /**
     * Obtém o dashboard completo para o frontend.
     */
    static async obterDashboardCompleto(params: {
        secretariaId?: string;
        setorId?: string;
        role: string;
    }) {
        const { secretariaId, setorId, role } = params
        const where: any = {}

        if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO' && secretariaId) {
            where.secretariaId = secretariaId
        } else if (secretariaId) {
            where.secretariaId = secretariaId
        }

        if (setorId) {
            where.setorId = setorId
        }

        try {
            // 1. KPIs básicos
            const total = await prisma.portaria.count({ where })
            const publicadas = await prisma.portaria.count({
                where: { ...where, status: 'PUBLICADA' }
            })

            // 2. Distribuição por Status
            const statusCounts = await prisma.portaria.groupBy({
                by: ['status'],
                where,
                _count: { id: true }
            })

            // 3. Top Secretarias (apenas para Admin/Prefeito)
            let secretariasTop: { nome: string; count: number }[] = []
            if (role === 'ADMIN_GERAL' || role === 'PREFEITO') {
                const topRes = await prisma.portaria.groupBy({
                    by: ['secretariaId'],
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                })

                const ids = topRes.map(r => r.secretariaId).filter(Boolean) as string[]
                const secs = await prisma.secretaria.findMany({
                    where: { id: { in: ids } },
                    select: { id: true, nome: true }
                })

                secretariasTop = topRes.map(r => ({
                    nome: secs.find(s => s.id === r.secretariaId)?.nome ?? 'Outros',
                    count: r._count.id
                }))
            }

            // 4. Evolução mensal — últimos 6 meses com dados reais
            const seisMesesAtras = new Date()
            seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5)
            seisMesesAtras.setDate(1)
            seisMesesAtras.setHours(0, 0, 0, 0)

            const historicoRecente = await prisma.portaria.findMany({
                where: { ...where, createdAt: { gte: seisMesesAtras } },
                select: { createdAt: true }
            })

            // Inicializar mapa com os 6 últimos meses (garante 0 quando sem dados)
            const evolucaoMap: Record<string, number> = {}
            for (let i = 5; i >= 0; i--) {
                const d = new Date()
                d.setMonth(d.getMonth() - i)
                evolucaoMap[MESES[d.getMonth()]] = 0
            }
            for (const p of historicoRecente) {
                const mes = MESES[new Date(p.createdAt).getMonth()]
                if (evolucaoMap[mes] !== undefined) evolucaoMap[mes]++
            }

            const evolucaoMensal = Object.entries(evolucaoMap).map(([mes, volume]) => ({
                mes,
                volume
            }))

            // 4b. Crescimento percentual real: compara mês atual vs mês anterior
            const agora = new Date()
            const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)
            const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
            const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)

            const [countMesAtual, countMesAnterior] = await Promise.all([
                prisma.portaria.count({
                    where: { ...where, createdAt: { gte: inicioMesAtual } }
                }),
                prisma.portaria.count({
                    where: { ...where, createdAt: { gte: inicioMesAnterior, lte: fimMesAnterior } }
                })
            ])

            let crescimentoPercentual = 0
            if (countMesAnterior > 0) {
                crescimentoPercentual = Math.round(((countMesAtual - countMesAnterior) / countMesAnterior) * 100)
            } else if (countMesAtual > 0) {
                crescimentoPercentual = 100 // Primeiro mês com dados
            }

            // 5. Órgão mais ativo derivado do top secretarias
            const orgaoMaisAtivo = secretariasTop[0]
                ? { nome: secretariasTop[0].nome, quantidade: secretariasTop[0].count }
                : { nome: '—', quantidade: 0 }

            return ok({
                kpis: {
                    totalProduzido: total,
                    crescimentoPercentual,
                    taxaPublicacao: total > 0 ? Math.round((publicadas / total) * 100) : 0,
                    acervoOficial: publicadas,
                    orgaoMaisAtivo
                },
                distribuicaoStatus: statusCounts.map(s => ({
                    status: s.status,
                    count: s._count.id,
                    fill: this.getColorForStatus(s.status)
                })),
                secretariasTop,
                evolucaoMensal
            })
        } catch (error) {
            console.error('Erro ao obter dashboard completo:', error)
            return err('Falha ao processar dados analíticos.')
        }
    }

    private static getColorForStatus(status: string) {
        const colors: Record<string, string> = {
            RASCUNHO: '#94a3b8',
            EM_REVISAO_ABERTA: '#60a5fa',
            EM_REVISAO_ATRIBUIDA: '#3b82f6',
            CORRECAO_NECESSARIA: '#f59e0b',
            AGUARDANDO_ASSINATURA: '#8b5cf6',
            PRONTO_PUBLICACAO: '#06b6d4',
            PUBLICADA: '#10b981',
            FALHA_PROCESSAMENTO: '#f87171'
        }
        return colors[status] ?? '#cbd5e1'
    }

    /**
     * Obtém dados para gráficos de linha (documentos ao longo do tempo).
     */
    static async obterSeriesTemporais(params: {
        secretariaId?: string;
        dias?: number;
    }) {
        const { secretariaId, dias = 30 } = params
        const dataCorte = new Date()
        dataCorte.setDate(dataCorte.getDate() - dias)

        try {
            const portarias = await prisma.portaria.findMany({
                where: {
                    ...(secretariaId ? { secretariaId } : {}),
                    createdAt: { gte: dataCorte }
                },
                select: { createdAt: true },
                orderBy: { createdAt: 'asc' }
            })

            const serieAgrupada = portarias.reduce((acc: Record<string, number>, p) => {
                const dia = new Date(p.createdAt).toISOString().split('T')[0]
                acc[dia] = (acc[dia] ?? 0) + 1
                return acc
            }, {})

            const dataFormatada = Object.entries(serieAgrupada).map(([data, quantidade]) => ({
                data,
                quantidade
            }))

            return ok(dataFormatada)
        } catch (error) {
            console.error('Erro ao obter séries temporais:', error)
            return err('Falha ao gerar dados do gráfico.')
        }
    }

    // ── DASHBOARD ANALYTICS AVANÇADO ────────────────────────────────────────

    /**
     * Dashboard avançado com métricas detalhadas:
     * - Tempo médio de tramitação
     * - Taxa de rejeição
     * - Top 10 usuários mais produtivos
     * - Documentos por dia da semana
     * - Heatmap por hora do dia
     * - Distribuição por secretaria com cores
     * - Evolução diária (30 dias)
     * - Pipeline/funil de status
     */
    static async obterDashboardAvancado(params: {
        secretariaId?: string;
        setorId?: string;
        role: string;
        periodo?: number;
    }) {
        const { secretariaId, setorId, role, periodo = 90 } = params
        const where: any = {}
        const isAdmin = role === 'ADMIN_GERAL' || role === 'PREFEITO'

        if (!isAdmin && secretariaId) {
            where.secretariaId = secretariaId
        } else if (secretariaId) {
            where.secretariaId = secretariaId
        }

        if (setorId) {
            where.setorId = setorId
        }

        const dataCorte = new Date()
        dataCorte.setDate(dataCorte.getDate() - periodo)

        try {
            // 1. Tempo médio de tramitação (criação → publicação)
            const publicadasRecentes = await prisma.portaria.findMany({
                where: {
                    ...where,
                    status: 'PUBLICADA',
                    dataPublicacao: { not: null },
                    createdAt: { gte: dataCorte },
                },
                select: { createdAt: true, dataPublicacao: true }
            })

            let tempoMedioTramitacaoHoras = 0
            if (publicadasRecentes.length > 0) {
                const tempoTotal = publicadasRecentes.reduce((acc, p) => {
                    if (p.dataPublicacao) {
                        return acc + (new Date(p.dataPublicacao).getTime() - new Date(p.createdAt).getTime())
                    }
                    return acc
                }, 0)
                tempoMedioTramitacaoHoras = Math.round(tempoTotal / publicadasRecentes.length / (1000 * 60 * 60))
            }

            // 2. Taxa de rejeição
            const totalRevisadas = await prisma.feedAtividade.count({
                where: {
                    tipoEvento: { in: ['PORTARIA_APROVADA', 'PORTARIA_REJEITADA', 'WORKFLOW_APROVAR_REVISAO', 'WORKFLOW_SOLICITAR_CORRECAO'] },
                    createdAt: { gte: dataCorte },
                    ...(secretariaId && !isAdmin ? { secretariaId } : {})
                }
            })
            const totalRejeitadas = await prisma.feedAtividade.count({
                where: {
                    tipoEvento: { in: ['PORTARIA_REJEITADA', 'WORKFLOW_SOLICITAR_CORRECAO'] },
                    createdAt: { gte: dataCorte },
                    ...(secretariaId && !isAdmin ? { secretariaId } : {})
                }
            })
            const taxaRejeicao = totalRevisadas > 0 ? Math.round((totalRejeitadas / totalRevisadas) * 100) : 0

            // 3. Top 10 usuários mais produtivos
            const topUsuarios = await prisma.portaria.groupBy({
                by: ['criadoPorId'],
                where: { ...where, createdAt: { gte: dataCorte } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10
            })

            const userIds = topUsuarios.map(u => u.criadoPorId)
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, role: true }
            })

            const rankingUsuarios = topUsuarios.map(u => ({
                nome: users.find(usr => usr.id === u.criadoPorId)?.name || 'Desconhecido',
                role: users.find(usr => usr.id === u.criadoPorId)?.role || '',
                documentos: u._count.id,
            }))

            // 4. Documentos por dia da semana
            const recentes = await prisma.portaria.findMany({
                where: { ...where, createdAt: { gte: dataCorte } },
                select: { createdAt: true }
            })

            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
            const porDiaSemana = diasSemana.map((dia, i) => ({
                dia,
                quantidade: recentes.filter(p => new Date(p.createdAt).getDay() === i).length
            }))

            // 5. Documentos por hora do dia
            const porHora = Array.from({ length: 24 }, (_, h) => ({
                hora: `${h.toString().padStart(2, '0')}h`,
                quantidade: recentes.filter(p => new Date(p.createdAt).getHours() === h).length
            }))

            // 6. Distribuição por secretaria com cores
            let distribuicaoSecretarias: { nome: string; sigla: string; cor: string; total: number; publicadas: number }[] = []
            if (isAdmin) {
                const secAll = await prisma.secretaria.findMany({
                    where: { ativo: true },
                    select: { id: true, nome: true, sigla: true, cor: true }
                })

                const porSecretaria = await prisma.portaria.groupBy({
                    by: ['secretariaId', 'status'],
                    where: { createdAt: { gte: dataCorte } },
                    _count: { id: true }
                })

                distribuicaoSecretarias = secAll.map(sec => {
                    const itens = porSecretaria.filter(p => p.secretariaId === sec.id)
                    const totalSec = itens.reduce((a, b) => a + b._count.id, 0)
                    const pubSec = itens.filter(p => p.status === 'PUBLICADA').reduce((a, b) => a + b._count.id, 0)
                    return { nome: sec.nome, sigla: sec.sigla, cor: sec.cor, total: totalSec, publicadas: pubSec }
                }).filter(s => s.total > 0).sort((a, b) => b.total - a.total)
            }

            // 7. Evolução diária (últimos 30 dias)
            const evolucaoDiaria: { data: string; criados: number; publicados: number }[] = []
            for (let i = 29; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dStr = d.toISOString().split('T')[0]
                evolucaoDiaria.push({
                    data: dStr,
                    criados: recentes.filter(p => new Date(p.createdAt).toISOString().split('T')[0] === dStr).length,
                    publicados: publicadasRecentes.filter(p => p.dataPublicacao && new Date(p.dataPublicacao).toISOString().split('T')[0] === dStr).length,
                })
            }

            // 8. Pipeline/funil
            const statusOrder = ['RASCUNHO', 'EM_REVISAO_ABERTA', 'EM_REVISAO_ATRIBUIDA', 'AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO', 'PUBLICADA']
            const statusLabels: Record<string, string> = {
                RASCUNHO: 'Rascunho', EM_REVISAO_ABERTA: 'Aguardando Revisor', EM_REVISAO_ATRIBUIDA: 'Em Revisão',
                AGUARDANDO_ASSINATURA: 'Aguardando Assinatura', PRONTO_PUBLICACAO: 'Pronto Publicação', PUBLICADA: 'Publicada',
            }

            const allStatusCounts = await prisma.portaria.groupBy({
                by: ['status'], where, _count: { id: true }
            })

            const pipeline = statusOrder.map(status => ({
                status,
                label: statusLabels[status] || status,
                quantidade: allStatusCounts.find(s => s.status === status)?._count.id || 0,
                cor: this.getColorForStatus(status),
            }))

            return ok({
                tempoMedioTramitacaoHoras,
                taxaRejeicao,
                rankingUsuarios,
                porDiaSemana,
                porHora,
                distribuicaoSecretarias,
                evolucaoDiaria,
                pipeline,
                periodo,
            })
        } catch (error) {
            console.error('Erro ao obter dashboard avançado:', error)
            return err('Falha ao processar métricas avançadas.')
        }
    }
}
