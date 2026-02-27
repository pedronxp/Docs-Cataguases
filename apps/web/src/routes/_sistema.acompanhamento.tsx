import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useContext } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Activity, Clock, CheckCircle2, AlertCircle, FileText,
  Eye, ShieldCheck, PenTool, Search, Loader2, User, Hash
} from 'lucide-react'
import { AbilityContext } from '@/lib/ability'
import { STATUS_PORTARIA, type Portaria, type FeedAtividade } from '@/types/domain'

export const Route = createFileRoute('/_sistema/acompanhamento')({
  component: AcompanhamentoPage,
})

function AcompanhamentoPage() {
  const ability = useContext(AbilityContext)
  const [loading, setLoading] = useState(true)
  const [portarias, setPortarias] = useState<Portaria[]>([])
  const [selectedPortaria, setSelectedPortaria] = useState<Portaria | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    const res = await portariaService.listarPortarias({ page: 1, pageSize: 50 })
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

  // Métricas
  const emRevisao = portarias.filter(p => [STATUS_PORTARIA.EM_REVISAO_ABERTA, STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA].includes(p.status as any)).length
  const aguardandoAssinatura = portarias.filter(p => p.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA).length
  const publicadas = portarias.filter(p => p.status === STATUS_PORTARIA.PUBLICADA).length

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-primary h-8 w-8" />
            Acompanhamento e Auditoria
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Linha do tempo e histórico completo de transições dos documentos.</p>
        </div>
        <Button onClick={carregarDados} variant="outline" className="font-semibold" disabled={loading}>
          <Search className="mr-2 h-4 w-4" /> Atualizar Painel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Em Revisão" value={emRevisao} desc="Aguardando aprovação das secretarias" icon={<Clock className="w-5 h-5 text-amber-500" />} />
        <MetricCard title="Aguardando Assinatura" value={aguardandoAssinatura} desc="Prontas para emissão final" icon={<PenTool className="w-5 h-5 text-blue-500" />} />
        <MetricCard title="Publicadas / Diário" value={publicadas} desc="Arquivadas definitivamente" icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[100px] font-bold text-slate-600">Protocolo</TableHead>
                <TableHead className="font-bold text-slate-600">Secretaria</TableHead>
                <TableHead className="font-bold text-slate-600">Documento</TableHead>
                <TableHead className="font-bold text-slate-600">Status O Atual</TableHead>
                <TableHead className="w-[120px] text-right font-bold text-slate-600">Histórico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : portarias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">Nenhum registro encontrado.</TableCell>
                </TableRow>
              ) : (
                portarias.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono text-xs text-slate-500">#{p.id.substring(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="font-semibold text-sm text-slate-800">{p.secretaria?.sigla || p.secretariaId}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm text-slate-800 line-clamp-1">{p.titulo}</p>
                      {p.numeroOficial && <span className="text-[10px] text-primary font-bold">Nº {p.numeroOficial}</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => abrirTimeline(p.id)} className="font-bold text-primary border-primary/20 hover:bg-primary/5">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Timeline
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

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
                <div className="grid grid-cols-2 gap-3 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Protocolo ID</p>
                    <p className="text-xs font-mono text-slate-700 mt-0.5 font-bold">#{selectedPortaria.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Atual</p>
                    <div className="mt-1"><StatusBadge status={selectedPortaria.status} /></div>
                  </div>
                  <div className="col-span-2 pt-2 mt-2 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hash de Integridade</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedPortaria.hashIntegridade || 'Não assinado digitalmente'}</p>
                  </div>
                </div>

                <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 antes:to-transparent">
                  {selectedPortaria.feedAtividades && selectedPortaria.feedAtividades.length > 0 ? (
                    selectedPortaria.feedAtividades.map((log: FeedAtividade, index: number) => {
                      const isLatest = index === 0;
                      return (
                        <div key={log.id} className="relative">
                          <div className="md:flex items-center justify-between w-full">
                            <div className="order-1">
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

function MetricCard({ title, value, desc, icon }: { title: string, value: number, desc: string, icon: React.ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter mt-1">{value}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{desc}</p>
        </div>
        <div className="p-3 rounded-full bg-slate-50 border border-slate-100">{icon}</div>
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
    default:
      return <Badge variant="outline" className="font-bold text-slate-600 border-slate-200">{status}</Badge>
  }
}
