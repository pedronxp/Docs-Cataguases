import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useContext, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  TrendingUp, ClipboardList, ChevronRight, AlertCircle
} from 'lucide-react'
import { AbilityContext } from '@/lib/ability'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_sistema/jornal')({
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

function MetricCard({ label, value, sub, icon: Icon, highlight }: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  highlight?: boolean
}) {
  return (
    <Card className={cn('border-slate-200', highlight && 'border-slate-300 bg-slate-50')}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
            <p className={cn('text-2xl font-bold truncate', highlight ? 'text-slate-900 font-mono text-lg' : 'text-slate-900')}>{value}</p>
            <p className="text-xs text-slate-400">{sub}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 shrink-0 ml-3">
            <Icon className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function JornalPage() {
  const { toast } = useToast()
  const ability = useContext(AbilityContext)
  const [loading, setLoading] = useState(true)
  const [fila, setFila] = useState<FilaItem[]>([])
  const [metricas, setMetricas] = useState<Metricas>({ pendentes: 0, publicadasHoje: 0, totalAno: 0, proximoNumero: null })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Individual
  const [confirmItem, setConfirmItem] = useState<FilaItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Batch
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchStep, setBatchStep] = useState<BatchStep>('confirm')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])

  const canPublish = ability.can('manage', 'LivrosNumeracao') || ability.can('publicar', 'Portaria')
  const selectedCount = selectedItems.size
  const allSelected = fila.length > 0 && selectedItems.size === fila.length

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
    setSelectedItems(allSelected ? new Set() : new Set(fila.map(i => i.id)))
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
            <Newspaper className="h-5 w-5 text-slate-600" />
            <h1 className="text-xl font-semibold text-slate-900">Publicação Oficial</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 ml-7">Oficialização e numeração de atos municipais.</p>
        </div>
        <div className="flex items-center gap-2 ml-7 sm:ml-0">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-slate-600">
            <Link to="/jornal/guia"><BookOpen className="h-3.5 w-3.5" /> Guia</Link>
          </Button>
          <Button onClick={carregarDados} variant="outline" size="sm" disabled={loading} className="gap-1.5 text-slate-600">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pendentes"
          value={metricas.pendentes}
          sub="Aguardando numeração"
          icon={ClipboardList}
        />
        <MetricCard
          label="Publicadas hoje"
          value={metricas.publicadasHoje}
          sub={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          icon={Calendar}
        />
        <MetricCard
          label="Próximo número"
          value={metricas.proximoNumero ?? '—'}
          sub="A ser atribuído na próxima ação"
          icon={Hash}
          highlight
        />
        <MetricCard
          label={`Total em ${anoAtual}`}
          value={metricas.totalAno}
          sub={`Desde jan/${anoAtual}`}
          icon={TrendingUp}
        />
      </div>

      {/* Tabela */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-10 pl-4">
                  {fila.length > 0 && (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todos"
                    />
                  )}
                </TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Secretaria</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Documento</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Assinatura</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Entrada</TableHead>
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
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="p-3 rounded-full bg-slate-100">
                        <CheckCircle2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600 text-sm">Fila vazia</p>
                      <p className="text-xs">Nenhum documento aguardando numeração.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fila.map((item) => (
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
