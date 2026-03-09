import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Loader2, BookOpen, FileText, Building2, CalendarCheck } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'
import { buscarAcervo, obterEstatisticasAcervo } from '@/services/acervo.service'
import { listarSecretarias } from '@/services/secretaria.service'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { PastaSecretaria } from '@/components/features/acervo/PastaSecretaria'
import { AcervoTable } from '@/components/features/acervo/AcervoTable'
import { AcervoPagination } from '@/components/features/acervo/AcervoPagination'
import type { Portaria, Secretaria } from '@/types/domain'
import api from '@/lib/api'

export const Route = createFileRoute('/_sistema/acervo')({
  component: AcervoPage,
})

function gerarAnos() {
  const anoAtual = new Date().getFullYear()
  const anos: string[] = []
  for (let a = anoAtual; a >= 2022; a--) anos.push(String(a))
  return anos
}
const ANOS = gerarAnos()

// ─── Strip de estatísticas ─────────────────────────────────────────────────────

interface StatItemProps {
  icon: React.ReactNode
  valor: number | string
  label: string
  cor: string
  loading: boolean
}

function StatItem({ icon, valor, label, cor, loading }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 flex-1 px-5 py-3.5">
      <div className="p-2 rounded-md shrink-0" style={{ backgroundColor: `${cor}18` }}>
        <span style={{ color: cor }} className="flex">{icon}</span>
      </div>
      <div>
        {loading
          ? <div className="h-5 w-10 bg-slate-200 animate-pulse rounded mb-1" />
          : <p className="text-xl font-black text-slate-900 leading-none">{valor}</p>
        }
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatsStrip({ total, secretariasAtivas, publicadasEsteMes, loading }: {
  total: number; secretariasAtivas: number; publicadasEsteMes: number; loading: boolean
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex divide-x divide-slate-100 overflow-hidden">
      <StatItem
        icon={<FileText className="h-4 w-4" />}
        valor={total}
        label="documentos no acervo"
        cor="#1351B4"
        loading={loading}
      />
      <StatItem
        icon={<Building2 className="h-4 w-4" />}
        valor={secretariasAtivas}
        label="secretarias com documentos"
        cor="#475569"
        loading={loading}
      />
      <StatItem
        icon={<CalendarCheck className="h-4 w-4" />}
        valor={publicadasEsteMes}
        label="publicadas este mês"
        cor="#059669"
        loading={loading}
      />
    </div>
  )
}

// ─── Página ────────────────────────────────────────────────────────────────────

function AcervoPage() {
  const ability = useAbility(AbilityContext)
  const { usuario } = useAuthStore()

  const podeVerTodasSecretarias = ability.can('gerenciar', 'all') || ability.can('visualizar' as any, 'PortariaGlobal')
  const [secretariaAtivaId, setSecretariaAtivaId] = useState<string>(
    podeVerTodasSecretarias ? '' : (usuario?.secretariaId ?? '')
  )

  const [portarias, setPortarias] = useState<Portaria[]>([])
  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [contadores, setContadores] = useState<Record<string, number>>({})
  const [publicadasEsteMes, setPublicadasEsteMes] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState('')
  const [ano, setAno] = useState<string>(ANOS[0])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [exportando, setExportando] = useState(false)

  // Carrega sidebar + estatísticas
  useEffect(() => {
    if (!podeVerTodasSecretarias) { setLoadingStats(false); return }
    async function load() {
      setLoadingStats(true)
      const [resSecs, resStats] = await Promise.all([
        listarSecretarias(),
        obterEstatisticasAcervo()
      ])
      if (resSecs.success) setSecretarias(resSecs.data)
      if (resStats.success) {
        setContadores(resStats.data.porSecretaria)
        setPublicadasEsteMes(resStats.data.publicadasEsteMes)
      }
      setLoadingStats(false)
    }
    load()
  }, [podeVerTodasSecretarias])

  // Exporta CSV
  async function handleExportar() {
    setExportando(true)
    try {
      const params: Record<string, any> = {}
      if (busca.trim()) params.q = busca.trim()
      if (ano !== 'todos') params.ano = ano
      const secParam = podeVerTodasSecretarias ? (secretariaAtivaId || undefined) : usuario?.secretariaId
      if (secParam) params.secretariaId = secParam
      const response = await api.get('/api/acervo/export', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `acervo-portarias-${ano !== 'todos' ? ano : 'todos'}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch { /* 403 para não-admins */ } finally {
      setExportando(false)
    }
  }

  // Busca portarias
  const fetchAcervo = useCallback(async () => {
    setLoading(true)
    const anoParam = ano !== 'todos' ? Number(ano) : undefined
    const secParam = podeVerTodasSecretarias ? (secretariaAtivaId || undefined) : usuario?.secretariaId!
    const result = await buscarAcervo({
      secretariaId: secParam, busca: busca.trim(),
      ano: anoParam, page, pageSize: 15, status: 'PUBLICADA',
    })
    if (result.success) {
      setPortarias(result.data.data)
      setTotalPages(result.data.totalPages)
      setTotal(result.data.total)
    }
    setLoading(false)
  }, [busca, ano, page, secretariaAtivaId, podeVerTodasSecretarias, usuario])

  useEffect(() => {
    const t = setTimeout(() => fetchAcervo(), 300)
    return () => clearTimeout(t)
  }, [fetchAcervo])

  const secAtivaLabel = secretariaAtivaId
    ? (secretarias.find(s => s.id === secretariaAtivaId)?.sigla ?? '')
    : 'Todas as Secretarias'
  const secretariasAtivas = Object.values(contadores).filter(v => v > 0).length

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* Cabeçalho Gov.br */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[#1351B4]/10 rounded-md mt-0.5">
            <BookOpen className="h-5 w-5 text-[#1351B4]" />
          </div>
          <div className="border-l-4 border-[#1351B4] pl-4">
            <h2 className="text-2xl font-bold tracking-tight text-[#333333]">Acervo Documental</h2>
            <p className="text-sm text-slate-500 mt-0.5">Consulta e histórico de portarias publicadas.</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-[#1351B4]/30 text-[#1351B4] bg-blue-50 hover:bg-blue-100 font-semibold"
          onClick={handleExportar}
          disabled={exportando}
        >
          {exportando
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Download className="mr-2 h-4 w-4" />}
          Exportar CSV
        </Button>
      </div>

      {/* Strip de estatísticas */}
      {podeVerTodasSecretarias && (
        <StatsStrip
          total={total}
          secretariasAtivas={secretariasAtivas}
          publicadasEsteMes={publicadasEsteMes}
          loading={loadingStats}
        />
      )}

      {/* Layout principal */}
      <div className="flex gap-5 items-start">

        {/* Sidebar */}
        {podeVerTodasSecretarias && (
          <aside className="w-56 shrink-0">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secretarias</p>
              </div>
              <div className="py-1">
                <PastaSecretaria
                  secretaria={{ id: '', sigla: 'Todas', nome: 'Todas as Secretarias', cor: '' }}
                  ativa={secretariaAtivaId === ''}
                  totalDocs={Object.values(contadores).reduce((a, b) => a + b, 0)}
                  onClick={() => { setSecretariaAtivaId(''); setPage(1) }}
                />
                {secretarias.length > 0 && <div className="mx-3 my-1 border-t border-slate-100" />}
                {secretarias.map((sec) => (
                  <PastaSecretaria
                    key={sec.id}
                    secretaria={sec}
                    ativa={secretariaAtivaId === sec.id}
                    totalDocs={contadores[sec.id] ?? 0}
                    onClick={() => { setSecretariaAtivaId(sec.id); setPage(1) }}
                  />
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Filtros */}
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Buscar por título, número, servidor..."
                className="pl-10 bg-slate-50 border-slate-200 focus-visible:ring-[#1351B4] h-9 text-sm"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={ano} onValueChange={(v) => { setAno(v); setPage(1) }}>
              <SelectTrigger className="w-[120px] bg-slate-50 border-slate-200 h-9 text-sm font-medium text-slate-700 focus:ring-[#1351B4]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Linha de contexto */}
          {!loading && (
            <p className="text-[12px] text-slate-500 px-1">
              {total > 0
                ? <><span className="font-semibold text-slate-700">{total}</span> portaria{total !== 1 ? 's' : ''} em{' '}
                    <span className="font-semibold text-[#1351B4]">{secAtivaLabel}</span>
                    {ano !== 'todos' ? ` — ${ano}` : ''}</>
                : 'Nenhum resultado para os filtros selecionados.'
              }
            </p>
          )}

          {/* Tabela */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4"><DataTableSkeleton rows={6} columns={4} /></div>
              ) : (
                <>
                  <AcervoTable
                    portarias={portarias}
                    mostrarSecretaria={podeVerTodasSecretarias && secretariaAtivaId === ''}
                  />
                  <div className="border-t border-slate-100">
                    <AcervoPagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
