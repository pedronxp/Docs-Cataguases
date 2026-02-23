import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { buscarDadosAnalytics, type ChartData } from '@/services/analytics.service'
import { TrendingUp, FileText, CheckCircle2, Building2 } from 'lucide-react'
import { CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Area, AreaChart, Pie, PieChart, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listarSecretarias, type Secretaria } from '@/services/secretaria.service'

export const Route = createFileRoute('/_sistema/admin/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [secretarias, setSecretarias] = useState<Secretaria[]>([])

  // UI Filters State
  const [filtroSecretaria, setFiltroSecretaria] = useState<string>('all')
  const [filtroSetor, setFiltroSetor] = useState<string>('all')

  useEffect(() => {
    async function loadSecretarias() {
      const result = await listarSecretarias()
      if (result.success) setSecretarias(result.data)
    }
    loadSecretarias()
  }, [])

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      const result = await buscarDadosAnalytics({
        secretariaId: filtroSecretaria,
        setorId: filtroSetor
      })
      if (result.success) {
        setData(result.data)
      }
      setLoading(false)
    }
    fetchAnalytics()
  }, [filtroSecretaria, filtroSetor])

  if (loading || !data) {
    return <div className="p-8 text-slate-500 animate-pulse">Carregando métricas e gráficos...</div>
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Painel de Desempenho</h2>
          <p className="text-sm text-slate-500">Métricas e acompanhamento do volume de documentos institucionais gerados.</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filtroSecretaria} onValueChange={(val) => { setFiltroSecretaria(val); setFiltroSetor('all') }}>
            <SelectTrigger className="w-[200px] h-9 text-sm bg-white">
              <SelectValue placeholder="Todas as Secretarias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Secretarias</SelectItem>
              {secretarias.map(sec => (
                <SelectItem key={sec.id} value={sec.id}>{sec.sigla}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroSetor} onValueChange={setFiltroSetor} disabled={filtroSecretaria === 'all'}>
            <SelectTrigger className="w-[180px] h-9 text-sm bg-white">
              <SelectValue placeholder="Todos os Setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Setores</SelectItem>
              <SelectItem value="setor-1">Gabinete</SelectItem>
              <SelectItem value="setor-2">Administrativo</SelectItem>
              <SelectItem value="setor-3">Financeiro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Produzido</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.kpis.totalProduzido}</div>
            <p className="text-xs text-slate-500 mt-1">
              +{data.kpis.crescimentoPercentual}% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Taxa de Publicação</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.kpis.taxaPublicacao}%</div>
            <p className="text-xs text-slate-500 mt-1">Das portarias geradas são publicadas</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Acervo Oficial</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-[#1351B4]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.kpis.acervoOficial}</div>
            <p className="text-xs text-slate-500 mt-1">Documentos finalizados e assinados</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Órgão Mais Ativo</CardTitle>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-indigo-900">{data.kpis.orgaoMaisAtivo.nome}</div>
            <p className="text-xs text-indigo-600/80 mt-1">{data.kpis.orgaoMaisAtivo.quantidade} documentos esse ano</p>
          </CardContent>
        </Card>
      </div>

      {/* Graficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Evolução Histórica (Area Chart) */}
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Volume de Portarias (Últimos 6 meses)</CardTitle>
            <CardDescription>Acompanhamento mensal da produtividade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.evolucaoMensal} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1351B4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1351B4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#1351B4" strokeWidth={2} fillOpacity={1} fill="url(#colorValor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Relativo (Pie Chart) */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Status do Acervo Atual</CardTitle>
            <CardDescription>Distribuição dos documentos vivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.distribuicaoStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {data.distribuicaoStatus.map((_entry, index) => {
                      const colors = ['#10b981', '#3b82f6', '#94a3b8', '#f59e0b']
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {data.distribuicaoStatus.map((s, i) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-slate-500', 'bg-amber-500']
                return (
                  <div key={s.status} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`}></span>
                      <span className="text-slate-600">{s.status}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{s.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
