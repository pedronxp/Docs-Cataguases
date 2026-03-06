import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useContext, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Newspaper, RefreshCw, BookOpen,
  TrendingUp, ClipboardList, Hash, Calendar,
  Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { AbilityContext } from '@/lib/ability'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { useJornalQueue } from '@/hooks/use-jornal-queue'
import { VirtualizedQueueTable } from '@/components/jornal/virtualized-queue-table'
import { MetricCard } from '@/components/jornal/metrics-cards'
import { ExportButton } from '@/components/jornal/export-button'
import { DocumentPreviewDialog } from '@/components/jornal/document-preview-dialog'
import { DocumentTypeFilter } from '@/components/jornal/document-type-filter'

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

type BatchStep = 'confirm' | 'processing' | 'done'

interface BatchResult {
  titulo: string
  numero?: string
  erro?: string
}

function JornalPage() {
  const { toast } = useToast()
  const ability = useContext(AbilityContext)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // Individual confirm
  const [confirmItem, setConfirmItem] = useState<FilaItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Batch
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchStep, setBatchStep] = useState<BatchStep>('confirm')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])

  const canPublish = ability.can('manage', 'LivrosNumeracao') || ability.can('publicar', 'Portaria')
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS')

  // Hook com paginação e filtro de tipo
  const {
    fila,
    total,
    metricas,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useJornalQueue({ limit: 50, tipo: tipoFiltro })

  const selectedCount = selectedItems.size
  const allSelected = fila.length > 0 && selectedItems.size === fila.length

  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedItems(allSelected ? new Set() : new Set(fila.map(i => i.id)))
  }, [allSelected, fila])

  const handleNumerar = async () => {
    if (!confirmItem) return
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/jornal', { queueId: confirmItem.id })
      if (res.data.success) {
        toast({ title: 'Publicado', description: `${res.data.data.numeroOficial} atribuído com sucesso.` })
        setConfirmItem(null)
        setSelectedItems(prev => { const n = new Set(prev); n.delete(confirmItem.id); return n })
        refetch()
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
    refetch()
  }

  const closeBatchModal = () => {
    setBatchModalOpen(false)
    setBatchStep('confirm')
    setBatchProgress(0)
    setBatchResults([])
  }

  const anoAtual = new Date().getFullYear()
  const pendentes = metricas?.pendentes ?? total
  const publicadasHoje = metricas?.publicadasHoje ?? 0
  const totalAno = metricas?.totalAno ?? 0
  const proximoNumero = metricas?.proximoNumero ?? null

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
          <ExportButton />
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-1.5 text-slate-600"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Pendentes" value={pendentes} sub="Aguardando numeração" icon={ClipboardList} />
        <MetricCard
          label="Publicadas hoje"
          value={publicadasHoje}
          sub={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
          icon={Calendar}
        />
        <MetricCard
          label="Próximo número"
          value={proximoNumero ?? '—'}
          sub="A ser atribuído na próxima ação"
          icon={Hash}
          highlight
        />
        <MetricCard
          label={`Total em ${anoAtual}`}
          value={totalAno}
          sub={`Desde jan/${anoAtual}`}
          icon={TrendingUp}
        />
      </div>

      {/* Filtro de tipo de documento */}
      <div className="flex items-center justify-between gap-4">
        <DocumentTypeFilter
          selected={tipoFiltro as any}
          total={total}
          counts={metricas?.porTipo}
          onChange={(tipo) => {
            setTipoFiltro(tipo)
            setSelectedItems(new Set())
          }}
        />
        {total > 0 && (
          <span className="text-xs text-slate-400 shrink-0">{total} documento{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabela */}
      <Card className="border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando fila...</span>
          </div>
        ) : (
          <VirtualizedQueueTable
            fila={fila}
            selectedItems={selectedItems}
            canPublish={canPublish}
            fetchNextPage={fetchNextPage}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onSelectItem={toggleItem}
            onSelectAll={toggleAll}
            allSelected={allSelected}
            onNumerar={setConfirmItem}
          />
        )}
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

      {/* Dialog: confirmar individual com preview */}
      {confirmItem && (
        <DocumentPreviewDialog
          item={confirmItem}
          proximoNumero={proximoNumero}
          isSubmitting={isSubmitting}
          onConfirm={handleNumerar}
          onCancel={() => setConfirmItem(null)}
        />
      )}

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

            {(batchStep === 'processing' || batchStep === 'done') && (
              <div className="space-y-2">
                {batchStep === 'processing' && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(batchProgress / selectedCount) * 100}%` }}
                    />
                  </div>
                )}
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
