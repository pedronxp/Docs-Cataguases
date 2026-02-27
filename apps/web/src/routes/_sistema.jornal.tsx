import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useContext } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Newspaper, CheckCircle2, AlertCircle, Search, CalendarDays,
  FileSignature, PenTool, FileX2, Loader2, ArrowRight, ShieldCheck
} from 'lucide-react'
import { AbilityContext } from '@/lib/ability'
import api from '@/lib/api'
import { livroService } from '@/services/livro.service'
import type { LivrosNumeracao } from '@/types/domain'

export const Route = createFileRoute('/_sistema/jornal')({
  component: JornalPage,
})

interface FilaItem {
  id: string
  portariaId: string
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
    }
  }
}

function JornalPage() {
  const { toast } = useToast()
  const ability = useContext(AbilityContext)
  const [loading, setLoading] = useState(true)
  const [fila, setFila] = useState<FilaItem[]>([])
  const [livros, setLivros] = useState<LivrosNumeracao[]>([])
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<FilaItem | null>(null) // No Cataguases, o Jornal gerencia numeração.
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canPublish = ability.can('manage', 'LivrosNumeracao') || ability.can('publicar', 'Portaria')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [resFila, resLivros] = await Promise.all([
        api.get('/api/jornal'),
        livroService.listarLivros()
      ])

      if (resFila.data.success) setFila(resFila.data.data)
      if (resLivros.success) setLivros(resLivros.data)

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do Jornal.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmNumerar = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/jornal', { queueId: selectedItem.id })
      const json = res.data

      if (json.success) {
        toast({
          title: '✅ Sucesso!',
          description: `Documento numerado como ${json.data.numeroOficial} e publicado.`
        })
        setPublishModalOpen(false)
        carregarDados()
      } else {
        toast({ title: 'Erro', description: json.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha na comunicação.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderAssinaturaIcon = (status: string, justificativa: string | null) => {
    if (status === 'ASSINADA_DIGITAL') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1"><FileSignature size={12} /> Digital</Badge>
    if (status === 'ASSINADA_MANUAL') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 border-blue-200" title={justificativa || ''}><PenTool size={12} /> Manual</Badge>
    if (status === 'DISPENSADA_COM_JUSTIFICATIVA') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 border-amber-200" title={justificativa || ''}><FileX2 size={12} /> Dispensada</Badge>
    return <Badge variant="outline">Pendente</Badge>
  }

  const livroAtivo = livros.find(l => l.ativo)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 decoration-red-500 decoration-4">
            <Newspaper className="text-red-600 h-8 w-8" />
            🚨 DASHBOARD JORNAL - NUMERAÇÃO
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Controle final de oficialização e publicação de atos municipais.</p>
        </div>
        <Button onClick={carregarDados} variant="outline" className="font-bold border-slate-300 h-11" disabled={loading}>
          <Search className="mr-2 h-4 w-4" /> Sincronizar Fila
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card de Próxima Numeração */}
        <Card className="lg:col-span-2 border-red-200 bg-red-50/30 overflow-hidden shadow-lg shadow-red-500/5">
          <CardHeader className="bg-white border-b border-red-100 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                <ShieldCheck size={16} /> PRÓXIMA NUMERAÇÃO DISPONÍVEL
              </CardTitle>
              <Badge className="bg-red-600 text-white font-black">
                {livroAtivo ? livroAtivo.formato_base.replace('{N}', String(livroAtivo.proximo_numero).padStart(4, '0')) : 'CARREGANDO...'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-2xl font-black text-slate-900">
                  {fila.length} Portaria{fila.length !== 1 ? 's' : ''} Pendente{fila.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-slate-500 font-medium">Aguardando gatilho de numeração do Jornal.</p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Edição do Dia</p>
                <p className="text-lg font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Configuração do Livro */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Config Config Livro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase">Formato Ativo</span>
              <span className="text-sm font-mono font-bold text-slate-700 truncate">{livroAtivo?.formato_base || 'Geral'}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Inicia em</span>
                <p className="text-lg font-black text-slate-800">{livroAtivo?.numero_inicial || '0'}</p>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Próximo</span>
                <p className="text-lg font-black text-blue-600">{livroAtivo?.proximo_numero || '0'}</p>
              </div>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="link" className="p-0 h-auto text-blue-600 font-bold text-xs justify-start hover:no-underline"> Logs Completos CSV</Button>
              <Button variant="link" className="p-0 h-auto text-blue-600 font-bold text-xs justify-start hover:no-underline"> Editar Configurações</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px] font-bold text-slate-600">Entrada</TableHead>
                <TableHead className="font-bold text-slate-600">Secretaria</TableHead>
                <TableHead className="font-bold text-slate-600">Documento</TableHead>
                <TableHead className="w-[160px] font-bold text-slate-600">Status Assinatura</TableHead>
                <TableHead className="w-[140px] text-right font-bold text-slate-600">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm font-medium">Buscando documentos na fila...</p>
                  </TableCell>
                </TableRow>
              ) : fila.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-700">Tudo em dia!</p>
                      <p className="text-sm">Nenhuma portaria assinada aguardando numeração.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fila.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell>
                      <div className="flex items-center text-xs font-bold text-slate-600">
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-xs tracking-wider">{item.portaria.secretaria.sigla}</span>
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{item.portaria.secretaria.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-sm text-slate-900 group-hover:text-red-600 transition-colors">{item.portaria.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">#ID-{item.portariaId.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderAssinaturaIcon(item.portaria.assinaturaStatus, item.portaria.assinaturaJustificativa)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!canPublish}
                        className="bg-red-600 hover:bg-red-700 text-white font-black px-4 h-9 shadow-md shadow-red-500/20"
                        onClick={() => { setSelectedItem(item); setPublishModalOpen(true); }}
                      >
                        [NUMERAR] <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={publishModalOpen} onOpenChange={setPublishModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="font-black flex items-center gap-2 text-red-600">
              <ShieldCheck className="h-6 w-6" /> CONFIRMAR NUMERAÇÃO
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              O sistema irá alocar o próximo número oficial disponível no Livro Ativo e carimbar definitivamente este documento.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="mt-4 p-4 rounded-xl border-2 border-slate-100 bg-slate-50 space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento Alvo</p>
                <p className="text-sm font-bold text-slate-800 line-clamp-2">{selectedItem.portaria.titulo}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Próximo Número Estimado</span>
                  <span className="text-lg font-black text-red-600">
                    {livroAtivo ? livroAtivo.formato_base.replace('{N}', String(livroAtivo.proximo_numero).padStart(4, '0')) : '...'}
                  </span>
                </div>
                <Badge className="bg-blue-600/10 text-blue-600 border-blue-200 font-bold">ATÔMICO</Badge>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" className="font-bold border-slate-300" onClick={() => setPublishModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmNumerar}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white font-black px-8 shadow-lg shadow-red-500/20"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : '[NUMERAR AGORA]'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
