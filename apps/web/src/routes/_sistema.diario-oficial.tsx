import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useContext, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Newspaper, RefreshCw, FileSignature, PenTool, FileX2,
  Loader2, BookOpen, CheckCircle2, Calendar, Hash,
  TrendingUp, ClipboardList, ChevronRight, AlertCircle,
  Search, Info, X, ArrowUpDown, Filter
} from 'lucide-react'
import { AbilityContext } from '@/lib/ability'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_sistema/diario-oficial')({
  component: JornalPage,
})

interface FilaItem {
  id: string
  portariaId: string
  tipoDocumento: string
  status: string
  numeroFinal: string | null
  createdAt: string
  portaria: {
    id: string
    titulo: string
    assinaturaStatus: string
    assinaturaJustificativa: string | null
    secretaria: {
      nome: string
      sigla: string
      cor: string
    }
  }
}

interface Metricas {
  pendentes: number
  publicadasHoje: number
  totalAno: number
  proximoNumero: string | null
}

type BatchStep = 'confirm' | 'processing' | 'done'

interface BatchResult {
  titulo: string
  numero?: string
  erro?: string
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

function AssinaturaInfo({ status, justificativa }: { status: string; justificativa: string | null }) {
  if (status === 'ASSINADA_DIGITAL')
    return <Badge variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50"><FileSignature size={11} /> Digital</Badge>
  if (status === 'ASSINADA_MANUAL')
    return <Badge variant="outline" className="gap-1.5 text-blue-700 border-blue-200 bg-blue-50"><PenTool size={11} /> Manual</Badge>
  if (status === 'DISPENSADA_COM_JUSTIFICATIVA')
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-200 bg-amber-50 cursor-default"><FileX2 size={11} /> Dispensada</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs"><p className="text-xs">{justificativa || 'Sem justificativa'}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  return <Badge variant="outline" className="gap-1.5 text-slate-500"><AlertCircle size={11} /> Pendente</Badge>
}

function MetricCard({ label, value, sub, icon: Icon, highlight, color }: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  highlight?: boolean
  color?: string
}) {
  const iconBg = color || 'bg-slate-100'
  const iconColor = color ? 'text-white' : 'text-slate-500'
  return (
    <Card className={cn(
      'border-slate-200 transition-all hover:shadow-sm',
      highlight && 'border-[#1351B4]/30 bg-[#1351B4]/5'
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={cn(
              'text-2xl font-bold truncate',
              highlight ? 'text-[#1351B4] font-mono text-lg' : 'text-slate-900'
            )}>{value}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
          <div className={cn('p-2.5 rounded-xl shrink-0 ml-3', color || 'bg-slate-100')}>
            <Icon className={cn('h-4 w-4', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type SortField = 'titulo' | 'secretaria' | 'entrada'
type SortDir = 'asc' | 'desc'

function JornalPage() {
  const { toast } = useToast()
  const ability = useContext(AbilityContext)
  const [loading, setLoading] = useState(true)
  const [fila, setFila] = useState<FilaItem[]>([])
  const [metricas, setMetricas] = useState<Metricas>({ pendentes: 0, publicadasHoje: 0, totalAno: 0, proximoNumero: null })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Filtros e busca
  const [busca, setBusca] = useState('')
  const [filtroSecretaria, setFiltroSecretaria] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('entrada')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    try { return localStorage.getItem('diario-info-dismissed') !== '1' } catch { return true }
  })

  // Individual
  const [confirmItem, setConfirmItem] = useState<FilaItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Batch
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchStep, setBatchStep] = useState<BatchStep>('confirm')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])

  const canPublish = ability.can('manage', 'LivrosNumeracao') || ability.can('publicar', 'Portaria')

  // Secretarias únicas para filtro
  const secretariasUnicas = useMemo(() => {
    const map = new Map<string, { sigla: string; nome: string; cor: string }>()
    fila.forEach(item => {
      const sec = item.portaria.secretaria
      if (sec.sigla && !map.has(sec.sigla)) map.set(sec.sigla, sec)
    })
    return Array.from(map.values()).sort((a, b) => a.sigla.localeCompare(b.sigla))
  }, [fila])

  // Fila filtrada e ordenada
  const filaFiltrada = useMemo(() => {
    let resultado = [...fila]

    // Filtro por busca
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      resultado = resultado.filter(item =>
        item.portaria.titulo.toLowerCase().includes(termo) ||
        item.portaria.secretaria.sigla.toLowerCase().includes(termo) ||
        item.portaria.secretaria.nome.toLowerCase().includes(termo) ||
        item.portariaId.toLowerCase().includes(termo)
      )
    }

    // Filtro por secretaria
    if (filtroSecretaria) {
      resultado = resultado.filter(item => item.portaria.secretaria.sigla === filtroSecretaria)
    }

    // Ordenação
    resultado.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'titulo':
          cmp = a.portaria.titulo.localeCompare(b.portaria.titulo)
          break
        case 'secretaria':
          cmp = (a.portaria.secretaria.sigla || '').localeCompare(b.portaria.secretaria.sigla || '')
          break
        case 'entrada':
        default:
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return resultado
  }, [fila, busca, filtroSecretaria, sortField, sortDir])

  const selectedCount = selectedItems.size
  const allSelected = filaFiltrada.length > 0 && filaFiltrada.every(i => selectedItems.has(i.id))

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const dismissInfoBanner = () => {
    setShowInfoBanner(false)
    try { localStorage.setItem('diario-info-dismissed', '1') } catch {}
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/jornal')
      if (res.data.success) {
        setFila(res.data.data.fila)
        setMetricas(res.data.data.metricas)
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar dados.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { carregarDados() }, [carregarDados])

  const toggleItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedItems(allSelected ? new Set() : new Set(filaFiltrada.map(i => i.id)))
  }

  const handleNumerar = async () => {
    if (!confirmItem) return
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/jornal', { queueId: confirmItem.id })
      if (res.data.success) {
        toast({ title: 'Publicado', description: `${res.data.data.numeroOficial} atribuído com sucesso.` })
        setConfirmItem(null)
        setSelectedItems(prev => { const n = new Set(prev); n.delete(confirmItem.id); return n })
        carregarDados()
      } else {
        toast({ title: 'Erro', description: res.data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha na comunicação.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBatchNumerar = async () => {
    const items = fila.filter(i => selectedItems.has(i.id))
    setBatchStep('processing')
    setBatchProgress(0)
    setBatchResults([])

    const results: BatchResult[] = []
    for (let i = 0; i < items.length; i++) {
      try {
        const res = await api.post('/api/jornal', { queueId: items[i].id })
        if (res.data.success) {
          results.push({ titulo: items[i].portaria.titulo, numero: res.data.data.numeroOficial })
        } else {
          results.push({ titulo: items[i].portaria.titulo, erro: res.data.error })
        }
      } catch {
        results.push({ titulo: items[i].portaria.titulo, erro: 'Falha de comunicação' })
      }
      setBatchProgress(i + 1)
      setBatchResults([...results])
    }

    setBatchStep('done')
    setSelectedItems(new Set())
    carregarDados()
  }

  const closeBatchModal = () => {
    setBatchModalOpen(false)
    setBatchStep('confirm')
    setBatchProgress(0)
    setBatchResults([])
  }

  const anoAtual = new Date().getFullYear()

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1351B4]/10">
              <Newspaper className="h-5 w-5 text-[#1351B4]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Diário Oficial</h1>
              <p className="text-sm text-slate-500 mt-0.5">Numeração e publicação oficial de atos municipais</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-slate-600">
            <Link to="/diario-oficial/guia"><BookOpen className="h-3.5 w-3.5" /> Guia</Link>
          </Button>
          <Button onClick={carregarDados} variant="outline" size="sm" disabled={loading} className="gap-1.5 text-slate-600">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Banner informativo */}
      {showInfoBanner && (
        <div className="relative flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
          <Info className="h-5 w-5 text-[#1351B4] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1351B4]">Como funciona o Diário Oficial?</p>
            <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
              Esta é a etapa final do fluxo documental. Documentos assinados entram na fila abaixo aguardando numeração oficial.
              Você pode numerar individualmente ou em lote — o sistema garante números sequenciais e sem duplicatas.
              Após numerado, o documento recebe status <strong>PUBLICADA</strong> e passa a fazer parte do registro oficial do município.
            </p>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
                <span className="w-5 h-5 rounded-full bg-[#1351B4] text-white flex items-center justify-center text-[9px] font-bold">1</span>
                Criação
              </div>
              <ChevronRight className="h-3 w-3 text-blue-300" />
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
                <span className="w-5 h-5 rounded-full bg-[#1351B4] text-white flex items-center justify-center text-[9px] font-bold">2</span>
                Revisão
              </div>
              <ChevronRight className="h-3 w-3 text-blue-300" />
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium">
                <span className="w-5 h-5 rounded-full bg-[#1351B4] text-white flex items-center justify-center text-[9px] font-bold">3</span>
                Assinatura
              </div>
              <ChevronRight className="h-3 w-3 text-blue-300" />
              <div className="flex items-center gap-1.5 text-[10px] text-white font-bold bg-[#1351B4] px-2 py-0.5 rounded-full">
                <span className="w-5 h-5 rounded-full bg-white text-[#1351B4] flex items-center justify-center text-[9px] font-bold">4</span>
                Publicação
              </div>
            </div>
          </div>
          <button
            onClick={dismissInfoBanner}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Na fila"
          value={metricas.pendentes}
          sub="Aguardando numeração"
          icon={ClipboardList}
          color={metricas.pendentes > 0 ? 'bg-amber-500' : 'bg-slate-100'}
        />
        <MetricCard
          label="Publicadas hoje"
          value={metricas.publicadasHoje}
          sub={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          icon={Calendar}
          color="bg-emerald-500"
        />
        <MetricCard
          label="Próximo número"
          value={metricas.proximoNumero ?? '—'}
          sub="Será atribuído na próxima numeração"
          icon={Hash}
          highlight
        />
        <MetricCard
          label={`Total ${anoAtual}`}
          value={metricas.totalAno}
          sub={`Publicados desde jan/${anoAtual}`}
          icon={TrendingUp}
          color="bg-[#1351B4]"
        />
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por título, secretaria ou ID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {secretariasUnicas.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setFiltroSecretaria(null)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                !filtroSecretaria ? 'bg-[#1351B4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              Todas
            </button>
            {secretariasUnicas.map(sec => (
              <button
                key={sec.sigla}
                onClick={() => setFiltroSecretaria(filtroSecretaria === sec.sigla ? null : sec.sigla)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                  filtroSecretaria === sec.sigla
                    ? 'text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
                style={filtroSecretaria === sec.sigla ? { backgroundColor: sec.cor || '#6366f1' } : undefined}
              >
                {sec.sigla}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      {(busca || filtroSecretaria) && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{filaFiltrada.length} de {fila.length} documentos</span>
          {(busca || filtroSecretaria) && (
            <button
              onClick={() => { setBusca(''); setFiltroSecretaria(null) }}
              className="text-[#1351B4] hover:underline font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-10 pl-4">
                  {filaFiltrada.length > 0 && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  )}
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  <button onClick={() => toggleSort('secretaria')} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                    Secretaria
                    <ArrowUpDown className={cn('h-3 w-3', sortField === 'secretaria' ? 'text-[#1351B4]' : 'text-slate-300')} />
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">
                  <button onClick={() => toggleSort('titulo')} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                    Documento
                    <ArrowUpDown className={cn('h-3 w-3', sortField === 'titulo' ? 'text-[#1351B4]' : 'text-slate-300')} />
                  </button>
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Assinatura</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">
                  <button onClick={() => toggleSort('entrada')} className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                    Entrada
                    <ArrowUpDown className={cn('h-3 w-3', sortField === 'entrada' ? 'text-[#1351B4]' : 'text-slate-300')} />
                  </button>
                </TableHead>
                <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide pr-4">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Carregando fila...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : fila.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-56 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="p-4 rounded-full bg-emerald-50">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">Nenhum documento na fila</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          Documentos assinados aparecem aqui automaticamente. Quando um documento é assinado pelo responsável, ele entra na fila para numeração oficial.
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs mt-1">
                        <Link to="/diario-oficial/guia"><BookOpen className="h-3.5 w-3.5" /> Ver guia completo</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filaFiltrada.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search className="h-5 w-5 text-slate-300" />
                      <p className="font-medium text-slate-600 text-sm">Nenhum resultado encontrado</p>
                      <p className="text-xs">Tente ajustar os filtros ou termos de busca.</p>
                      <button
                        onClick={() => { setBusca(''); setFiltroSecretaria(null) }}
                        className="text-xs text-[#1351B4] hover:underline font-medium mt-1"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filaFiltrada.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'transition-colors',
                      selectedItems.has(item.id) ? 'bg-slate-50' : 'hover:bg-slate-50/60'
                    )}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        aria-label={`Selecionar ${item.portaria.titulo}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center h-7 w-12 rounded text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: item.portaria.secretaria.cor || '#6366f1' }}
                        >
                          {item.portaria.secretaria.sigla}
                        </span>
                        <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[140px]">
                          {item.portaria.secretaria.nome}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm text-slate-900 line-clamp-1">{item.portaria.titulo}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.portariaId.slice(0, 8).toUpperCase()}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <AssinaturaInfo status={item.portaria.assinaturaStatus} justificativa={item.portaria.assinaturaJustificativa} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-slate-500 cursor-default">{formatRelativeTime(item.createdAt)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canPublish}
                        className="gap-1.5 text-slate-700 h-8 text-xs font-semibold"
                        onClick={() => setConfirmItem(item)}
                      >
                        Numerar <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Barra de ação em lote */}
      <div className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
        selectedCount > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl shadow-slate-900/30">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'documento selecionado' : 'documentos selecionados'}
          </span>
          <div className="w-px h-4 bg-slate-600" />
          <Button
            size="sm"
            disabled={!canPublish}
            className="bg-white text-slate-900 hover:bg-slate-100 font-semibold h-8 px-4 rounded-full text-xs"
            onClick={() => { setBatchStep('confirm'); setBatchModalOpen(true) }}
          >
            Numerar selecionadas ({selectedCount})
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0 rounded-full"
            onClick={() => setSelectedItems(new Set())}
          >
            ✕
          </Button>
        </div>
      </div>

      {/* Dialog: confirmar individual */}
      <Dialog open={!!confirmItem} onOpenChange={(o) => { if (!o && !isSubmitting) setConfirmItem(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-slate-900">Confirmar numeração</DialogTitle>
            <DialogDescription>
              O próximo número disponível será atribuído definitivamente a este documento.
            </DialogDescription>
          </DialogHeader>
          {confirmItem && (
            <div className="mt-2 p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Documento</p>
                <p className="text-sm font-medium text-slate-800 line-clamp-2">{confirmItem.portaria.titulo}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Número estimado</p>
                  <p className="text-base font-bold text-slate-900 font-mono">{metricas.proximoNumero ?? '...'}</p>
                </div>
                <Badge variant="secondary" className="text-xs">Operação atômica</Badge>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmItem(null)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleNumerar} disabled={isSubmitting} className="font-semibold">
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : 'Confirmar numeração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: lote */}
      <Dialog open={batchModalOpen} onOpenChange={(o) => { if (!o && batchStep !== 'processing') closeBatchModal() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold text-slate-900">
              {batchStep === 'confirm' && `Numerar ${selectedCount} documentos`}
              {batchStep === 'processing' && 'Processando...'}
              {batchStep === 'done' && 'Processamento concluído'}
            </DialogTitle>
            <DialogDescription>
              {batchStep === 'confirm' && 'Os números serão atribuídos sequencialmente, um por vez.'}
              {batchStep === 'processing' && `${batchProgress} de ${selectedCount} processados.`}
              {batchStep === 'done' && `${batchResults.filter(r => !r.erro).length} de ${batchResults.length} publicados com sucesso.`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
            {batchStep === 'confirm' && fila.filter(i => selectedItems.has(i.id)).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span
                  className="inline-flex items-center justify-center h-6 w-10 rounded text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: item.portaria.secretaria.cor || '#6366f1' }}
                >
                  {item.portaria.secretaria.sigla}
                </span>
                <p className="text-sm text-slate-700 line-clamp-1 flex-1">{item.portaria.titulo}</p>
              </div>
            ))}

            {batchStep === 'processing' && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(batchProgress / selectedCount) * 100}%` }}
                  />
                </div>
                {batchResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {r.erro
                      ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    }
                    <span className="text-slate-700 line-clamp-1 flex-1">{r.titulo}</span>
                    {r.numero && <span className="text-xs font-mono font-semibold text-slate-500 shrink-0">{r.numero}</span>}
                    {r.erro && <span className="text-xs text-red-500 shrink-0">{r.erro}</span>}
                  </div>
                ))}
              </div>
            )}

            {batchStep === 'done' && batchResults.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.erro
                  ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                }
                <span className="text-slate-700 line-clamp-1 flex-1">{r.titulo}</span>
                {r.numero && <span className="text-xs font-mono font-semibold text-slate-500 shrink-0">{r.numero}</span>}
                {r.erro && <span className="text-xs text-red-500 shrink-0">{r.erro}</span>}
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            {batchStep === 'confirm' && (
              <>
                <Button variant="outline" onClick={closeBatchModal}>Cancelar</Button>
                <Button onClick={handleBatchNumerar} className="font-semibold">
                  Confirmar ({selectedCount} documentos)
                </Button>
              </>
            )}
            {batchStep === 'processing' && (
              <Button disabled className="font-semibold">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processando...
              </Button>
            )}
            {batchStep === 'done' && (
              <Button onClick={closeBatchModal} className="font-semibold">Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
