import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useState, useEffect, useMemo } from 'react'
import {
    BarChart, Bar, AreaChart, Area, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Navigate } from '@tanstack/react-router'
import {
    Clock, TrendingDown, Users, Calendar, BarChart3, Activity,
    Building2, Target, ArrowUpRight, ArrowDownRight, Timer, AlertTriangle,
    RotateCcw, CheckCircle2, FileWarning, Inbox, Send, Scale, Hourglass
} from 'lucide-react'
import api from '@/lib/api'
import { Can } from '@/lib/ability'

export const Route = createFileRoute('/_sistema/admin/analytics-avancado')({
    component: AnalyticsAvancadoPage,
})

interface AvancadoData {
    tempoMedioTramitacaoHoras: number
    taxaRejeicao: number
    rankingUsuarios: { nome: string; role: string; documentos: number }[]
    porDiaSemana: { dia: string; quantidade: number }[]
    porHora: { hora: string; quantidade: number }[]
    distribuicaoSecretarias: { nome: string; sigla: string; cor: string; total: number; publicadas: number }[]
    evolucaoDiaria: { data: string; criados: number; publicados: number }[]
    pipeline: { status: string; label: string; quantidade: number; cor: string }[]
    slaEtapas: {
        status: string
        label: string
        slaHoras: number
        total: number
        atrasados: number
        percentualAtraso: number
        idadeMediaHoras: number
        maisAntigo: { id: string; titulo: string; horas: number; secretaria: string } | null
    }[]
    retrabalho: {
        firstPassYield: number
        taxaRetrabalho: number
        mediaDevolucoes: number
        totalDevolucoes: number
        documentosComRetrabalho: number
        modelos: { nome: string; devolucoes: number; documentos: number }[]
        secretarias: { nome: string; devolucoes: number; documentos: number }[]
    }
    produtividadeFluxo: {
        entradasPeriodo: number
        saidasPeriodo: number
        saldoPeriodo: number
        taxaConclusao: number
        backlogAberto: number
        idadeMediaBacklogDias: number
        porStatus: {
            status: string
            label: string
            total: number
            percentualBacklog: number
            idadeMediaDias: number
            idadeMaximaDias: number
            maisAntigo: { id: string; titulo: string; idadeDias: number; horasNaEtapa: number; secretaria: string } | null
        }[]
    }
    periodo: number
}

const CORES_GRAFICO = ['#1351B4', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f87171', '#ec4899', '#6366f1']

function AnalyticsAvancadoPage() {
    const [data, setData] = useState<AvancadoData | null>(null)
    const [loading, setLoading] = useState(true)
    const [periodo, setPeriodo] = useState('90')

    useEffect(() => {
        async function fetchData() {
            setLoading(true)
            try {
                const response = await api.get('/api/admin/analytics-avancado', { params: { periodo } })
                if (response.data.success) setData(response.data.data)
            } catch (err) {
                console.error('Erro ao carregar analytics avançado:', err)
            }
            setLoading(false)
        }
        fetchData()
    }, [periodo])

    const tempoFormatado = useMemo(() => {
        if (!data) return '—'
        const h = data.tempoMedioTramitacaoHoras
        if (h < 24) return `${h}h`
        const dias = Math.floor(h / 24)
        const horas = h % 24
        return `${dias}d ${horas}h`
    }, [data])

    if (loading || !data) {
        return (
            <div className="p-8 space-y-4">
                <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-lg animate-pulse" />)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map(i => <div key={i} className="h-80 bg-slate-200 rounded-lg animate-pulse" />)}
                </div>
            </div>
        )
    }

    const totalPipeline = data.pipeline.reduce((a, b) => a + b.quantidade, 0)
    const totalAtrasados = data.slaEtapas.reduce((total, etapa) => total + etapa.atrasados, 0)
    const etapasComAtraso = data.slaEtapas.filter(etapa => etapa.atrasados > 0).length
    const saldoFluxo = data.produtividadeFluxo.saldoPeriodo
    const saldoFluxoLabel = saldoFluxo > 0 ? `+${saldoFluxo}` : String(saldoFluxo)

    return (
        <Can I="manage" a="all" passThrough>
            {(allowed) => {
                if (!allowed) {
                    return <Navigate to="/dashboard" replace />
                }

                return (
                    <div className="space-y-6 max-w-7xl">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700">
                            <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Analytics Avançado</h2>
                            <p className="text-sm text-slate-500">Métricas detalhadas de produtividade e desempenho</p>
                        </div>
                    </div>
                </div>
                <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger className="w-[180px] h-9 text-sm bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30">Últimos 30 dias</SelectItem>
                        <SelectItem value="60">Últimos 60 dias</SelectItem>
                        <SelectItem value="90">Últimos 90 dias</SelectItem>
                        <SelectItem value="180">Últimos 6 meses</SelectItem>
                        <SelectItem value="365">Último ano</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPIs Avançados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50/50">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Tempo Médio Tramitação</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{tempoFormatado}</p>
                                <p className="text-xs text-slate-500 mt-1">Da criação à publicação</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-100">
                                <Timer className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Taxa de Rejeição</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.taxaRejeicao}%</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {data.taxaRejeicao > 20
                                        ? <ArrowUpRight className="h-3 w-3 text-red-500" />
                                        : <ArrowDownRight className="h-3 w-3 text-green-500" />
                                    }
                                    <p className="text-xs text-slate-500">
                                        {data.taxaRejeicao > 20 ? 'Acima do ideal' : 'Dentro do esperado'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-100">
                                <TrendingDown className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total no Pipeline</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{totalPipeline}</p>
                                <p className="text-xs text-slate-500 mt-1">Documentos em tramitação</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-100">
                                <Activity className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">SLA em Atraso</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{totalAtrasados}</p>
                                <p className="text-xs text-slate-500 mt-1">{etapasComAtraso} etapas com pendencia</p>
                            </div>
                            <div className={`p-3 rounded-xl ${totalAtrasados > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                <AlertTriangle className={`h-5 w-5 ${totalAtrasados > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Entradas no Periodo</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.produtividadeFluxo.entradasPeriodo}</p>
                                <p className="text-xs text-slate-500 mt-1">Documentos criados</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-100">
                                <Inbox className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Saidas Publicadas</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.produtividadeFluxo.saidasPeriodo}</p>
                                <p className="text-xs text-slate-500 mt-1">Publicadas no periodo</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-100">
                                <Send className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Saldo da Fila</p>
                                <p className={`text-2xl font-bold mt-1 ${saldoFluxo > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{saldoFluxoLabel}</p>
                                <p className="text-xs text-slate-500 mt-1">{data.produtividadeFluxo.backlogAberto} documentos abertos</p>
                            </div>
                            <div className={`p-3 rounded-xl ${saldoFluxo > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                                <Scale className={`h-5 w-5 ${saldoFluxo > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Idade Media Backlog</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.produtividadeFluxo.idadeMediaBacklogDias}d</p>
                                <p className="text-xs text-slate-500 mt-1">{data.produtividadeFluxo.taxaConclusao}% de conclusao</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-100">
                                <Hourglass className="h-5 w-5 text-slate-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Hourglass className="h-4 w-4 text-slate-600" />
                        Envelhecimento do Backlog
                    </CardTitle>
                    <CardDescription>Distribuicao dos documentos abertos por status e idade desde a criacao</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <th className="py-2 pr-4 font-semibold">Status</th>
                                    <th className="py-2 px-4 font-semibold text-right">Total</th>
                                    <th className="py-2 px-4 font-semibold text-right">Backlog</th>
                                    <th className="py-2 px-4 font-semibold text-right">Media</th>
                                    <th className="py-2 px-4 font-semibold text-right">Maxima</th>
                                    <th className="py-2 pl-4 font-semibold">Mais antigo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.produtividadeFluxo.porStatus.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">Nenhum documento aberto</td>
                                    </tr>
                                ) : data.produtividadeFluxo.porStatus.map((item) => (
                                    <tr key={item.status} className="border-b border-slate-100 last:border-0">
                                        <td className="py-3 pr-4">
                                            <div className="font-medium text-slate-700">{item.label}</div>
                                            <div className="text-xs text-slate-400">{item.status}</div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{item.total}</td>
                                        <td className="py-3 px-4 text-right text-slate-600">{item.percentualBacklog}%</td>
                                        <td className="py-3 px-4 text-right text-slate-600">{item.idadeMediaDias}d</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-bold ${item.idadeMaximaDias >= 7 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                                                {item.idadeMaximaDias}d
                                            </span>
                                        </td>
                                        <td className="py-3 pl-4">
                                            {item.maisAntigo ? (
                                                <div>
                                                    <div className="max-w-[280px] truncate font-medium text-slate-700">{item.maisAntigo.titulo}</div>
                                                    <div className="text-xs text-slate-400">{item.maisAntigo.secretaria} - {item.maisAntigo.horasNaEtapa}h na etapa</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">Sem documentos</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Evolução Diária + Pipeline */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        SLA por Etapa
                    </CardTitle>
                    <CardDescription>Documentos abertos acima do prazo operacional definido para cada fase</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                                    <th className="py-2 pr-4 font-semibold">Etapa</th>
                                    <th className="py-2 px-4 font-semibold text-right">SLA</th>
                                    <th className="py-2 px-4 font-semibold text-right">Total</th>
                                    <th className="py-2 px-4 font-semibold text-right">Atrasados</th>
                                    <th className="py-2 px-4 font-semibold text-right">Media</th>
                                    <th className="py-2 pl-4 font-semibold">Mais antigo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.slaEtapas.map((etapa) => (
                                    <tr key={etapa.status} className="border-b border-slate-100 last:border-0">
                                        <td className="py-3 pr-4">
                                            <div className="font-medium text-slate-700">{etapa.label}</div>
                                            <div className="text-xs text-slate-400">{etapa.status}</div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-600">{etapa.slaHoras}h</td>
                                        <td className="py-3 px-4 text-right font-semibold text-slate-800">{etapa.total}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`inline-flex min-w-10 justify-center rounded-full px-2 py-1 text-xs font-bold ${etapa.atrasados > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                {etapa.atrasados}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-600">{etapa.idadeMediaHoras}h</td>
                                        <td className="py-3 pl-4">
                                            {etapa.maisAntigo ? (
                                                <div>
                                                    <div className="max-w-[260px] truncate font-medium text-slate-700">{etapa.maisAntigo.titulo}</div>
                                                    <div className="text-xs text-slate-400">{etapa.maisAntigo.secretaria} - {etapa.maisAntigo.horas}h na etapa</div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">Sem documentos</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">First Pass Yield</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.retrabalho.firstPassYield}%</p>
                                <p className="text-xs text-slate-500 mt-1">Aprovadas sem devolucao</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-100">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Taxa de Retrabalho</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.retrabalho.taxaRetrabalho}%</p>
                                <p className="text-xs text-slate-500 mt-1">{data.retrabalho.documentosComRetrabalho} documentos com devolucao</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-100">
                                <RotateCcw className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Media de Devolucoes</p>
                                <p className="text-2xl font-bold text-slate-800 mt-1">{data.retrabalho.mediaDevolucoes}</p>
                                <p className="text-xs text-slate-500 mt-1">{data.retrabalho.totalDevolucoes} devolucoes no periodo</p>
                            </div>
                            <div className="p-3 rounded-xl bg-red-100">
                                <FileWarning className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileWarning className="h-4 w-4 text-red-600" />
                            Modelos com Mais Correcoes
                        </CardTitle>
                        <CardDescription>Modelos que concentraram devolucoes no periodo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.retrabalho.modelos.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Nenhuma devolucao no periodo</p>
                        ) : (
                            <div className="space-y-3">
                                {data.retrabalho.modelos.map((item) => (
                                    <div key={item.nome} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-700">{item.nome}</p>
                                            <p className="text-xs text-slate-400">{item.documentos} documentos afetados</p>
                                        </div>
                                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{item.devolucoes}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            Secretarias com Mais Correcoes
                        </CardTitle>
                        <CardDescription>Orgaos que concentraram devolucoes no periodo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.retrabalho.secretarias.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Nenhuma devolucao no periodo</p>
                        ) : (
                            <div className="space-y-3">
                                {data.retrabalho.secretarias.map((item) => (
                                    <div key={item.nome} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{item.nome}</p>
                                            <p className="text-xs text-slate-400">{item.documentos} documentos afetados</p>
                                        </div>
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{item.devolucoes}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            Evolução Diária (30 dias)
                        </CardTitle>
                        <CardDescription>Documentos criados vs publicados por dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.evolucaoDiaria} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradCriados" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradPublicados" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="data"
                                        axisLine={false} tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                                        interval={4}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={30} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(v) => `Data: ${v}`}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="criados" name="Criados" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradCriados)" />
                                    <Area type="monotone" dataKey="publicados" name="Publicados" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradPublicados)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Pipeline / Funil */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-600" />
                            Pipeline de Status
                        </CardTitle>
                        <CardDescription>Funil de tramitação atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.pipeline.map((item) => {
                                const maxQtd = Math.max(...data.pipeline.map(p => p.quantidade), 1)
                                const pct = Math.round((item.quantidade / maxQtd) * 100)
                                return (
                                    <div key={item.status}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-slate-600">{item.label}</span>
                                            <span className="text-xs font-bold text-slate-800">{item.quantidade}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: item.cor }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dia da Semana + Hora do Dia */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-600" />
                            Produção por Dia da Semana
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.porDiaSemana} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={30} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="quantidade" name="Documentos" radius={[6, 6, 0, 0]}>
                                        {data.porDiaSemana.map((_, i) => (
                                            <Cell key={i} fill={i === 0 || i === 6 ? '#cbd5e1' : '#1351B4'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Clock className="h-4 w-4 text-cyan-600" />
                            Atividade por Hora do Dia
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.porHora} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="hora"
                                        axisLine={false} tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        interval={2}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={30} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="quantidade" name="Documentos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Secretarias + Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribuição por Secretaria */}
                {data.distribuicaoSecretarias.length > 0 && (
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-emerald-600" />
                                Produção por Secretaria
                            </CardTitle>
                            <CardDescription>Total e publicadas no período</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {data.distribuicaoSecretarias.slice(0, 8).map((sec) => (
                                    <div key={sec.sigla} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: sec.cor }}>
                                            {sec.sigla.substring(0, 3)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{sec.nome}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.round((sec.total / Math.max(...data.distribuicaoSecretarias.map(s => s.total), 1)) * 100)}%`,
                                                            backgroundColor: sec.cor,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 w-12 text-right">{sec.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Ranking de Usuários */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-600" />
                            Top 10 Servidores Mais Produtivos
                        </CardTitle>
                        <CardDescription>Ranking por volume de documentos criados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.rankingUsuarios.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">Nenhum dado disponível no período</p>
                        ) : (
                            <div className="space-y-2">
                                {data.rankingUsuarios.map((user, i) => {
                                    const maxDocs = data.rankingUsuarios[0]?.documentos || 1
                                    const pct = Math.round((user.documentos / maxDocs) * 100)
                                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="w-6 text-center text-sm font-bold text-slate-400">
                                                {medal || `${i + 1}.`}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-700 truncate">{user.nome}</span>
                                                    <span className="text-xs font-bold text-slate-600 ml-2">{user.documentos}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${pct}%`, backgroundColor: CORES_GRAFICO[i % CORES_GRAFICO.length] }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
                )
            }}
        </Can>
    )
}
