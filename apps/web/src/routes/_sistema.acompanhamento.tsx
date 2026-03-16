import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Activity, Clock, CheckCircle2, AlertCircle, FileText,
  Eye, PenTool, Search, Loader2, User, LayoutGrid, List,
  ArrowRight, AlertTriangle, Flame, Timer, TrendingUp,
} from 'lucide-react'
import { STATUS_PORTARIA, type Portaria, type FeedAtividade } from '@/types/domain'

export const Route = createFileRoute('/_sistema/acompanhamento')({
  component: AcompanhamentoPage,
})

// Tempo limite em horas para considerar um documento "em alerta" ou "crítico"
const HORAS_ALERTA = 24   // amarelo
const HORAS_CRITICO = 72  // vermelho

const COLUNAS_PIPELINE = [
  {
    status: [STATUS_PORTARIA.RASCUNHO, STATUS_PORTARIA.CORRECAO_NECESSARIA, STATUS_PORTARIA.FALHA_PROCESSAMENTO, STATUS_PORTARIA.ERRO_GERACAO],
    label: 'Rascunho / Correção',
    cor: 'border-slate-300 bg-slate-50',
    corHeader: 'bg-slate-100 border-slate-200',
    badge: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: <FileText className="w-4 h-4 text-slate-500" />,
  },
  {
    status: [STATUS_PORTARIA.EM_REVISAO_ABERTA, STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA],
    label: 'Em Revisão',
    cor: 'border-amber-200 bg-amber-50/40',
    corHeader: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Clock className="w-4 h-4 text-amber-500" />,
  },
  {
    status: [STATUS_PORTARIA.AGUARDANDO_ASSINATURA],
    label: 'Aguardando Assinatura',
    cor: 'border-blue-200 bg-blue-50/40',
    corHeader: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <PenTool className="w-4 h-4 text-blue-500" />,
  },
  {
    status: [STATUS_PORTARIA.PRONTO_PUBLICACAO, STATUS_PORTARIA.PUBLICADA],
    label: 'Publicada',
    cor: 'border-emerald-200 bg-emerald-50/40',
    corHeader: 'bg-emerald-50 border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  },
]

function horasDesde(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / 3_600_000
}

function formatarTempo(horas: number): string {
  if (horas < 1) return 'há menos de 1h'
  if (horas < 24) return `há ${Math.floor(horas)}h`
  const dias = Math.floor(horas / 24)
  const h = Math.floor(horas % 24)
  return h > 0 ? `há ${dias}d ${h}h` : `há ${dias}d`
}

type NivelAlerta = 'normal' | 'alerta' | 'critico'
function nivelAlerta(portaria: Portaria): NivelAlerta {
  // Documentos já publicados ou prontos para publicação não precisam de alerta
  if ([STATUS_PORTARIA.PUBLICADA, STATUS_PORTARIA.PRONTO_PUBLICACAO].includes(portaria.status as any)) return 'normal'
  const horas = horasDesde(portaria.updatedAt)
  if (horas >= HORAS_CRITICO) return 'critico'
  if (horas >= HORAS_ALERTA) return 'alerta'
  return 'normal'
}

function AcompanhamentoPage() {
  const [loading, setLoading] = useState(true)
  const [portarias, setPortarias] = useState<Portaria[]>([])
  const [selectedPortaria, setSelectedPortaria] = useState<Portaria | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [visao, setVisao] = useState<'tabela' | 'pipeline'>('pipeline')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    const res = await portariaService.listarPortarias({ page: 1, pageSize: 200 })
    if (res.success) {
      setPortarias(res.data.data)
    }
    setLoading(false)
  }

  const abrirTimeline = async (id: string) => {
    setSheetOpen(true)
    setDetailsLoading(true)
    const res = await portariaService.buscarPortaria(id)
    if (res.success) {
      setSelectedPortaria(res.data)
    }
    setDetailsLoading(false)
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const ativas = portarias.filter(p => p.status !== STATUS_PORTARIA.PUBLICADA)
  const emRevisao = portarias.filter(p => [STATUS_PORTARIA.EM_REVISAO_ABERTA, STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA].includes(p.status as any)).length
  const aguardandoAssinatura = portarias.filter(p => p.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA).length
  const publicadas = portarias.filter(p => p.status === STATUS_PORTARIA.PUBLICADA).length
  const correcoes = portarias.filter(p => p.status === STATUS_PORTARIA.CORRECAO_NECESSARIA).length

  // ── Gargalos (documentos em alerta/crítico, excluindo publicados) ─────────
  const gargalos = useMemo(() =>
    ativas
      .filter(p => nivelAlerta(p) !== 'normal')
      .sort((a, b) => horasDesde(b.updatedAt) - horasDesde(a.updatedAt))
      .slice(0, 5),
    [ativas]
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-primary h-8 w-8" />
            Acompanhamento e Auditoria
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Visualize o fluxo dos documentos e identifique gargalos em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            <Button
              variant={visao === 'pipeline' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 font-semibold ${visao === 'pipeline' ? '' : 'text-slate-500'}`}
              onClick={() => setVisao('pipeline')}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" /> Pipeline
            </Button>
            <Button
              variant={visao === 'tabela' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 font-semibold ${visao === 'tabela' ? '' : 'text-slate-500'}`}
              onClick={() => setVisao('tabela')}
            >
              <List className="mr-1.5 h-4 w-4" /> Tabela
            </Button>
          </div>
          <Button onClick={carregarDados} variant="outline" className="font-semibold h-9" disabled={loading}>
            <Search className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* ── Métricas ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Em Revisão"
          value={emRevisao}
          desc="Aguardando aprovação"
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <MetricCard
          title="Aguardando Assinatura"
          value={aguardandoAssinatura}
          desc="Prontos para emissão"
          icon={<PenTool className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          title="Correção Necessária"
          value={correcoes}
          desc="Devolvidos para correção"
          icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          destaque={correcoes > 0}
        />
        <MetricCard
          title="Publicadas"
          value={publicadas}
          desc="Arquivadas definitivamente"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* ── Alerta de Gargalos ────────────────────────────────────────────── */}
      {!loading && gargalos.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="h-4 w-4 text-rose-500" />
              <p className="text-xs font-black text-rose-700 uppercase tracking-widest">
                Gargalos Detectados ({gargalos.length})
              </p>
              <span className="text-[10px] text-rose-500 font-medium">
                — documentos parados há mais de {HORAS_ALERTA}h
              </span>
            </div>
            <div className="space-y-2">
              {gargalos.map(p => {
                const nivel = nivelAlerta(p)
                const horas = horasDesde(p.updatedAt)
                const autor = (p as any).criadoPor?.name || p.autor?.name
                const revisor = p.revisorAtual?.name
                return (
                  <button
                    key={p.id}
                    onClick={() => abrirTimeline(p.id)}
                    className="w-full text-left flex items-center justify-between gap-3 bg-white rounded-lg border border-rose-100 px-3 py-2 hover:border-rose-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${nivel === 'critico' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      <span className="text-xs font-semibold text-slate-800 truncate">{p.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={p.status} />
                      {autor && (
                        <span className="text-[10px] text-slate-500 hidden sm:block truncate max-w-[100px]">
                          <span className="text-slate-400">por</span> {revisor || autor}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold whitespace-nowrap ${nivel === 'critico' ? 'text-rose-600' : 'text-amber-600'}`}>
                        <Timer className="inline w-3 h-3 mr-0.5" />{formatarTempo(horas)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-rose-400 transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visao === 'pipeline' ? (
        <PipelineView portarias={portarias} onAbrirTimeline={abrirTimeline} />
      ) : (
        <TabelaView portarias={portarias} onAbrirTimeline={abrirTimeline} />
      )}

      {/* ── Timeline side-sheet ───────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto sm:max-w-none border-l-slate-200">
          <SheetHeader className="pb-6 border-b border-slate-100">
            <SheetTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Activity className="text-primary w-5 h-5" />
              Timeline da Portaria
            </SheetTitle>
            <SheetDescription>
              {selectedPortaria?.titulo || 'Carregando detalhes...'}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p className="text-sm font-medium">Extraindo logs do sistema...</p>
              </div>
            ) : selectedPortaria ? (
              <div className="space-y-2">
                {/* ── Resumo da portaria ─────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Protocolo ID</p>
                    <p className="text-xs font-mono text-slate-700 mt-0.5 font-bold">#{selectedPortaria.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Atual</p>
                    <div className="mt-1"><StatusBadge status={selectedPortaria.status} /></div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Autor</p>
                    <p className="text-xs text-slate-700 mt-0.5 font-semibold">
                      {(selectedPortaria as any).criadoPor?.name || selectedPortaria.autor?.name || '—'}
                    </p>
                  </div>
                  {selectedPortaria.revisorAtual && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Revisor</p>
                      <p className="text-xs text-slate-700 mt-0.5 font-semibold">{selectedPortaria.revisorAtual.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tempo no Status</p>
                    <p className={`text-xs font-bold mt-0.5 ${
                      nivelAlerta(selectedPortaria) === 'critico' ? 'text-rose-600' :
                      nivelAlerta(selectedPortaria) === 'alerta' ? 'text-amber-600' :
                      'text-slate-700'
                    }`}>
                      {formatarTempo(horasDesde(selectedPortaria.updatedAt))}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 mt-2 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hash de Integridade</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedPortaria.hashIntegridade || 'Não assinado digitalmente'}</p>
                  </div>
                </div>

                {/* ── Timeline vertical ─────────────────────────────────── */}
                <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {selectedPortaria.feedAtividades && selectedPortaria.feedAtividades.length > 0 ? (
                    selectedPortaria.feedAtividades.map((log: FeedAtividade, index: number) => {
                      const isLatest = index === 0
                      return (
                        <div key={log.id} className="relative">
                          <div>
                            <div className={`absolute -ml-6 mt-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300'}`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {new Date(log.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                              <h3 className={`text-sm font-bold mt-1 ${isLatest ? 'text-slate-900' : 'text-slate-700'}`}>
                                {getLogTitle(log.tipoEvento)}
                              </h3>
                              <div className={`text-xs mt-1.5 p-3 rounded-md leading-relaxed ${isLatest ? 'bg-slate-50 border border-slate-200 text-slate-600 font-medium' : 'text-slate-500'}`}>
                                {log.mensagem}
                              </div>
                              {log.autor && (
                                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-semibold">
                                  <User className="w-3 h-3" /> {log.autor.name || 'Sistema'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-400 italic py-4">Nenhum evento registrado no histórico.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── PIPELINE VIEW ─────────────────────────────────────────────────────────────

function PipelineView({ portarias, onAbrirTimeline }: { portarias: Portaria[], onAbrirTimeline: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUNAS_PIPELINE.map((col) => {
        const itens = portarias.filter(p => (col.status as any[]).includes(p.status))
        const criticos = itens.filter(p => nivelAlerta(p) === 'critico').length
        const alertas = itens.filter(p => nivelAlerta(p) === 'alerta').length
        return (
          <div key={col.label} className={`rounded-xl border ${col.cor} flex flex-col min-h-[300px]`}>
            {/* Header da coluna */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl border-b ${col.corHeader}`}>
              <div className="flex items-center gap-2">
                {col.icon}
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{col.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {criticos > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-100 border border-rose-200 rounded-full px-1.5 py-0.5">
                    <Flame className="w-2.5 h-2.5" />{criticos}
                  </span>
                )}
                {alertas > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                    <Timer className="w-2.5 h-2.5" />{alertas}
                  </span>
                )}
                <Badge className={`${col.badge} font-bold text-xs h-5`}>{itens.length}</Badge>
              </div>
            </div>

            {/* Cards de portaria */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh]">
              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Vazio</p>
                </div>
              ) : (
                // Ordena: críticos primeiro, depois alertas, depois normais; dentro de cada grupo: mais antigo primeiro
                [...itens]
                  .sort((a, b) => {
                    const nivelOrd = { critico: 0, alerta: 1, normal: 2 }
                    const da = nivelOrd[nivelAlerta(a)]
                    const db = nivelOrd[nivelAlerta(b)]
                    if (da !== db) return da - db
                    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
                  })
                  .map(p => (
                    <PipelineCard key={p.id} portaria={p} onAbrirTimeline={onAbrirTimeline} />
                  ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PipelineCard({ portaria: p, onAbrirTimeline }: { portaria: Portaria, onAbrirTimeline: (id: string) => void }) {
  const autor = (p as any).criadoPor?.name || p.autor?.name
  const revisor = p.revisorAtual?.name
  const secretariaTitular = (p as any).secretaria?.titular?.name
  const sigla = p.secretaria?.sigla
  const nivel = nivelAlerta(p)
  const horas = horasDesde(p.updatedAt)

  const responsavelAssinatura: string | null =
    p.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA
      ? (secretariaTitular || (sigla ? `Titular da ${sigla}` : 'Secretário(a)'))
      : null

  const borderColor =
    nivel === 'critico' ? 'border-rose-300 bg-rose-50/30' :
    nivel === 'alerta'  ? 'border-amber-300 bg-amber-50/20' :
    'border-slate-200'

  return (
    <button
      onClick={() => onAbrirTimeline(p.id)}
      className={`w-full text-left bg-white rounded-lg border ${borderColor} p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-slate-800 line-clamp-2 flex-1 group-hover:text-primary transition-colors">
          {p.titulo}
        </p>
        <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
      </div>

      {/* Secretaria */}
      {sigla && (
        <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          {sigla}
        </span>
      )}

      {/* Número oficial */}
      {p.numeroOficial && (
        <p className="text-[10px] text-primary font-bold mb-2">Nº {p.numeroOficial}</p>
      )}

      {/* Pessoas envolvidas */}
      <div className="space-y-1 pt-2 border-t border-slate-100">
        {autor && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
            <User className="h-3 w-3 text-slate-400" />
            <span className="truncate"><span className="text-slate-400">Autor:</span> {autor}</span>
          </div>
        )}
        {revisor && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 font-semibold">
            <Eye className="h-3 w-3 text-amber-500" />
            <span className="truncate"><span className="text-amber-600">Revisor:</span> {revisor}</span>
          </div>
        )}
        {p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA && !revisor && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium italic">
            <Clock className="h-3 w-3" />
            Aguardando um revisor aceitar
          </div>
        )}
        {responsavelAssinatura && (
          <div className="flex items-center gap-1.5 text-[10px] text-blue-700 font-semibold">
            <PenTool className="h-3 w-3 text-blue-500" />
            <span className="truncate"><span className="text-blue-600">Assina:</span> {responsavelAssinatura}</span>
          </div>
        )}
      </div>

      {/* Tempo no status — com cor de alerta */}
      <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${
        nivel === 'critico' ? 'text-rose-500' :
        nivel === 'alerta'  ? 'text-amber-500' :
        'text-slate-400'
      }`}>
        <Timer className="h-3 w-3" />
        {formatarTempo(horas)}
        {nivel === 'critico' && <Flame className="h-3 w-3 ml-0.5" />}
      </div>
    </button>
  )
}

// ─── TABELA VIEW ───────────────────────────────────────────────────────────────

function TabelaView({ portarias, onAbrirTimeline }: { portarias: Portaria[], onAbrirTimeline: (id: string) => void }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[90px] font-bold text-slate-600">Protocolo</TableHead>
              <TableHead className="font-bold text-slate-600">Secretaria</TableHead>
              <TableHead className="font-bold text-slate-600">Documento</TableHead>
              <TableHead className="font-bold text-slate-600">Responsável</TableHead>
              <TableHead className="font-bold text-slate-600">Status Atual</TableHead>
              <TableHead className="font-bold text-slate-600">Tempo no Status</TableHead>
              <TableHead className="w-[110px] text-right font-bold text-slate-600">Histórico</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portarias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">Nenhum registro encontrado.</TableCell>
              </TableRow>
            ) : (
              portarias
                .slice()
                .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
                .map((p) => {
                  const autor = (p as any).criadoPor?.name || p.autor?.name
                  const revisor = p.revisorAtual?.name
                  const nivel = nivelAlerta(p)
                  const horas = horasDesde(p.updatedAt)
                  return (
                    <TableRow key={p.id} className={`hover:bg-slate-50 ${nivel === 'critico' ? 'bg-rose-50/30' : nivel === 'alerta' ? 'bg-amber-50/20' : ''}`}>
                      <TableCell className="font-mono text-xs text-slate-500">#{p.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="font-semibold text-sm text-slate-800">{p.secretaria?.sigla || p.secretariaId}</TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm text-slate-800 line-clamp-1">{p.titulo}</p>
                        {p.numeroOficial && <span className="text-[10px] text-primary font-bold">Nº {p.numeroOficial}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {autor && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <User className="h-3 w-3 text-slate-400" />
                              <span className="font-medium">{autor}</span>
                            </div>
                          )}
                          {revisor && (
                            <div className="flex items-center gap-1 text-xs text-amber-700">
                              <Eye className="h-3 w-3 text-amber-500" />
                              <span className="font-medium">{revisor}</span>
                            </div>
                          )}
                          {!autor && !revisor && <span className="text-xs text-slate-400">—</span>}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold flex items-center gap-1 ${
                          nivel === 'critico' ? 'text-rose-600' :
                          nivel === 'alerta'  ? 'text-amber-600' :
                          'text-slate-500'
                        }`}>
                          <Timer className="h-3 w-3" />
                          {formatarTempo(horas)}
                          {nivel === 'critico' && <Flame className="h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => onAbrirTimeline(p.id)} className="font-bold text-primary border-primary/20 hover:bg-primary/5">
                          <Eye className="mr-1.5 h-3.5 w-3.5" /> Timeline
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function MetricCard({ title, value, desc, icon, destaque = false }: {
  title: string; value: number; desc: string; icon: React.ReactNode; destaque?: boolean
}) {
  return (
    <Card className={`shadow-sm ${destaque && value > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'}`}>
      <CardContent className="p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</p>
          <p className={`text-3xl font-black tracking-tighter mt-1 ${destaque && value > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{desc}</p>
        </div>
        <div className={`p-3 rounded-full border ${destaque && value > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>{icon}</div>
      </CardContent>
    </Card>
  )
}

function getLogTitle(tipo: string) {
  switch (tipo) {
    case 'STATUS_CHANGED': return 'Mudança de Status'
    case 'REVISAO_ABERTA': return 'Portaria enviada para Revisão'
    case 'REVISAO_ATRIBUIDA': return 'Revisor Assumiu o Documento'
    case 'PORTARIA_APROVADA': return 'Portaria Aprovada'
    case 'PORTARIA_REJEITADA': return 'Portaria Devolvida para Correção'
    case 'ASSINATURA_DIGITAL': return 'Assinatura Digital Emitida'
    case 'ASSINATURA_MANUAL': return 'Assinatura Física Registrada'
    case 'ASSINATURA_DISPENSADA': return 'Fase de Assinatura Dispensada'
    case 'PUBLICACAO_JORNAL': return 'Portaria Publicada no Diário Oficial'
    default: return 'Atividade Registrada'
  }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case STATUS_PORTARIA.PUBLICADA:
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold"><CheckCircle2 size={11} className="mr-1" /> Publicada</Badge>
    case STATUS_PORTARIA.PRONTO_PUBLICACAO:
      return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold"><CheckCircle2 size={11} className="mr-1" /> Fila do Diário</Badge>
    case STATUS_PORTARIA.EM_REVISAO_ABERTA:
    case STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA:
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold"><Clock size={11} className="mr-1" /> Em Revisão</Badge>
    case STATUS_PORTARIA.AGUARDANDO_ASSINATURA:
      return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold"><PenTool size={11} className="mr-1" /> Falta Assinatura</Badge>
    case STATUS_PORTARIA.RASCUNHO:
      return <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold"><FileText size={11} className="mr-1" /> Rascunho</Badge>
    case STATUS_PORTARIA.CORRECAO_NECESSARIA:
      return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold"><AlertCircle size={11} className="mr-1" /> Correção Necessária</Badge>
    case STATUS_PORTARIA.FALHA_PROCESSAMENTO:
    case STATUS_PORTARIA.ERRO_GERACAO:
      return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold"><AlertTriangle size={11} className="mr-1" /> Falha</Badge>
    default:
      return <Badge variant="outline" className="font-bold text-slate-600 border-slate-200">{status}</Badge>
  }
}
