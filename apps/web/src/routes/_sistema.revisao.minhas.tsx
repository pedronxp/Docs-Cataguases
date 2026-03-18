import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    ClipboardCheck, Loader2, Inbox, CheckCircle2, XCircle, ArrowRightLeft, Eye,
    Building2, User, ChevronDown, ChevronUp,
} from 'lucide-react'
import { STATUS_PORTARIA, type Portaria, type Usuario } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_sistema/revisao/minhas')({
    component: MinhasRevisoesPage,
})

const STATUS_LABELS: Record<string, string> = {
    AGUARDANDO_ASSINATURA:  'Aprovada — Aguardando assinatura',
    PRONTO_PUBLICACAO:      'Pronto para publicação',
    PUBLICADA:              'Publicada',
    CORRECAO_NECESSARIA:    'Devolvida para correção',
    RASCUNHO:               'Revertida para rascunho',
}

function MinhasRevisoesPage() {
    const { usuario } = useAuthStore()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [portarias, setPortarias] = useState<Portaria[]>([])
    const [revisores, setRevisores] = useState<Pick<Usuario, 'id' | 'name'>[]>([])
    const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

    // Estado dos modais
    const [modalRejeitar, setModalRejeitar] = useState<Portaria | null>(null)
    const [modalTransferir, setModalTransferir] = useState<Portaria | null>(null)
    const [observacao, setObservacao] = useState('')
    const [revisorSelecionado, setRevisorSelecionado] = useState('')
    const [justificativa, setJustificativa] = useState('')
    const [salvando, setSalvando] = useState(false)

    useEffect(() => {
        carregar()
    }, [])

    const carregar = async () => {
        setLoading(true)
        const res = await portariaService.listarPortarias({ pageSize: 100 })
        if (res.success) {
            const minhas = res.data.data.filter((p) =>
                p.revisorAtualId === usuario?.id || (p as any).revisorAtual?.id === usuario?.id
            )
            setPortarias(minhas)
        }
        setLoading(false)
    }

    const carregarRevisores = async (secId?: string) => {
        try {
            const sid = secId || usuario?.secretariaId
            if (!sid) return setRevisores([])
            
            const res = await api.get('/api/revisores', {
                params: { secretariaId: sid }
            })
            const lista = (res.data.data || res.data || []) as Pick<Usuario, 'id' | 'name'>[]
            setRevisores(lista.filter((r) => r.id !== usuario?.id))
        } catch {
            setRevisores([])
        }
    }

    const emAndamento = portarias.filter((p) => p.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA)
    const concluidas = portarias.filter((p) =>
        p.status !== STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA && p.status !== STATUS_PORTARIA.EM_REVISAO_ABERTA
    )

    const aprovar = async (portariaId: string) => {
        setSalvando(true)
        const res = await portariaService.aprovarPortaria(portariaId)
        if (res.success) {
            toast({ title: 'Portaria aprovada!', description: 'Enviada para assinatura.' })
            await carregar()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSalvando(false)
    }

    const confirmarRejeitar = async () => {
        if (!modalRejeitar || !observacao.trim()) return
        setSalvando(true)
        const res = await portariaService.rejeitarPortaria(modalRejeitar.id, observacao)
        if (res.success) {
            toast({ title: 'Portaria devolvida', description: 'O operador foi notificado.' })
            setModalRejeitar(null)
            setObservacao('')
            await carregar()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSalvando(false)
    }

    const confirmarTransferir = async () => {
        if (!modalTransferir || !revisorSelecionado || !justificativa.trim()) return
        setSalvando(true)
        const res = await portariaService.transferirRevisao(modalTransferir.id, revisorSelecionado, justificativa)
        if (res.success) {
            toast({ title: 'Revisão transferida', description: 'O novo revisor foi notificado.' })
            setModalTransferir(null)
            setRevisorSelecionado('')
            setJustificativa('')
            await carregar()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSalvando(false)
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl mx-auto w-full">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ClipboardCheck className="text-primary h-4 w-4" />
                    </div>
                    Minhas Revisões
                </h1>
                <p className="text-sm text-slate-400 font-medium mt-0.5">
                    Portarias atribuídas a você para revisão.
                </p>
            </div>

            {/* Em andamento */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Em andamento ({emAndamento.length})
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                    </div>
                ) : emAndamento.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center py-14 gap-3 text-center px-8">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Inbox className="h-6 w-6 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-600 text-sm">Sem revisões em andamento</p>
                            <p className="text-xs text-slate-400 mt-0.5">Acesse a fila para aceitar novas revisões.</p>
                        </div>
                        <Button variant="outline" asChild size="sm" className="rounded-xl text-xs h-8 border-slate-200 font-semibold mt-1">
                            <Link to="/revisao/fila">Ver Fila de Revisão</Link>
                        </Button>
                    </div>
                ) : (
                    emAndamento.map((p, idx) => {
                        const autor = (p as any).criadoPor?.name || p.autor?.name
                        return (
                            <div
                                key={p.id}
                                className="bg-white border border-primary/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all animate-in fade-in duration-200"
                                style={{ animationDelay: `${idx * 40}ms` }}
                            >
                                <div className="flex flex-col gap-4">
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                                                Em revisão
                                            </Badge>
                                            {p.secretaria && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Building2 className="h-2.5 w-2.5" />
                                                    {p.secretaria.sigla || p.secretaria.nome}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-black text-slate-800 leading-tight mb-1.5">{p.titulo}</p>
                                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
                                            {autor && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {autor}
                                                </span>
                                            )}
                                            <span>
                                                Submetido {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 h-9 rounded-xl text-xs"
                                            asChild
                                        >
                                            <Link to="/administrativo/portarias/$id" params={{ id: p.id }}>
                                                <Eye className="mr-1.5 h-3.5 w-3.5" /> Ver Documento
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-semibold text-slate-600 border-slate-200 h-9 rounded-xl text-xs"
                                            onClick={() => { 
                                                setModalTransferir(p); 
                                                setRevisorSelecionado(''); 
                                                setJustificativa('');
                                                carregarRevisores(p.secretariaId);
                                            }}
                                        >
                                            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Transferir
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 h-9 rounded-xl text-xs"
                                            onClick={() => { setModalRejeitar(p); setObservacao('') }}
                                        >
                                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Devolver
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => aprovar(p.id)}
                                            disabled={salvando}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl text-xs shadow-sm shadow-emerald-200 ml-auto"
                                        >
                                            {salvando
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Aprovar</>
                                            }
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Concluídas */}
            {concluidas.length > 0 && (
                <div className="space-y-2">
                    <button
                        onClick={() => setMostrarConcluidas(!mostrarConcluidas)}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 hover:text-slate-600 transition-colors"
                    >
                        {mostrarConcluidas
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                        }
                        Concluídas ({concluidas.length})
                    </button>

                    {mostrarConcluidas && concluidas.map((p) => (
                        <div
                            key={p.id}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4 opacity-70 hover:opacity-90 transition-opacity"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-700 text-sm truncate">{p.titulo}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {STATUS_LABELS[p.status] ?? p.status.replace(/_/g, ' ')}
                                </p>
                            </div>
                            <Button size="sm" variant="ghost" asChild className="shrink-0 h-7 text-xs text-slate-400 hover:text-primary rounded-lg">
                                <Link to="/administrativo/portarias/$id" params={{ id: p.id }}>
                                    <Eye className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal — Rejeitar */}
            <Dialog open={!!modalRejeitar} onOpenChange={(open) => !open && setModalRejeitar(null)}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-slate-900">Devolver para Correção</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium truncate">
                                {modalRejeitar?.titulo}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700 text-sm">
                                Motivo da devolução <span className="text-rose-500">*</span>
                            </Label>
                            <Textarea
                                placeholder="Descreva o que precisa ser corrigido..."
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                rows={4}
                                className="resize-none rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalRejeitar(null)} disabled={salvando} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmarRejeitar}
                            disabled={salvando || !observacao.trim()}
                            className="font-bold rounded-xl"
                        >
                            {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                            Devolver
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal — Transferir */}
            <Dialog open={!!modalTransferir} onOpenChange={(open) => !open && setModalTransferir(null)}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-slate-900">Transferir Revisão</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium truncate">
                                {modalTransferir?.titulo}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700 text-sm">
                                Transferir para <span className="text-rose-500">*</span>
                            </Label>
                            <Select value={revisorSelecionado} onValueChange={setRevisorSelecionado}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Selecionar revisor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {revisores.length === 0 ? (
                                        <SelectItem value="__none__" disabled>Nenhum revisor disponível</SelectItem>
                                    ) : (
                                        revisores.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700 text-sm">
                                Justificativa <span className="text-rose-500">*</span>
                            </Label>
                            <Textarea
                                placeholder="Por que está transferindo esta revisão?"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                rows={3}
                                className="resize-none rounded-xl text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalTransferir(null)} disabled={salvando} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmarTransferir}
                            disabled={salvando || !revisorSelecionado || !justificativa.trim()}
                            className="font-bold rounded-xl"
                        >
                            {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ArrowRightLeft className="h-4 w-4 mr-1.5" />}
                            Confirmar Transferência
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
