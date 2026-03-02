import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
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
    ClipboardCheck, Loader2, Inbox, CheckCircle2, XCircle, ArrowRightLeft,
} from 'lucide-react'
import { STATUS_PORTARIA, type Portaria, type Usuario } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

export const Route = createFileRoute('/_sistema/revisao/minhas')({
    component: MinhasRevisoesPage,
})

function MinhasRevisoesPage() {
    const { usuario } = useAuthStore()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [portarias, setPortarias] = useState<Portaria[]>([])
    const [revisores, setRevisores] = useState<Pick<Usuario, 'id' | 'name'>[]>([])

    // Estado dos modais
    const [modalRejeitar, setModalRejeitar] = useState<Portaria | null>(null)
    const [modalTransferir, setModalTransferir] = useState<Portaria | null>(null)
    const [observacao, setObservacao] = useState('')
    const [revisorSelecionado, setRevisorSelecionado] = useState('')
    const [justificativa, setJustificativa] = useState('')
    const [salvando, setSalvando] = useState(false)

    useEffect(() => {
        carregar()
        carregarRevisores()
    }, [])

    const carregar = async () => {
        setLoading(true)
        const res = await portariaService.listarPortarias({ pageSize: 100 })
        if (res.success) {
            const minhas = res.data.data.filter(
                (p) => p.revisorAtualId === usuario?.id
            )
            setPortarias(minhas)
        }
        setLoading(false)
    }

    const carregarRevisores = async () => {
        try {
            const res = await api.get('/api/revisores', {
                params: { secretariaId: usuario?.secretariaId }
            })
            const lista = (res.data.data || res.data || []) as Pick<Usuario, 'id' | 'name'>[]
            setRevisores(lista.filter((r) => r.id !== usuario?.id))
        } catch {
            // silencia erro — a lista fica vazia, o campo de transferência fica desabilitado
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
            toast({ title: 'Portaria aprovada!', description: 'Enviada ao secretário para aprovação final.' })
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
            toast({ title: 'Portaria devolvida', description: 'O operador foi notificado para corrigir.' })
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
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <ClipboardCheck className="text-primary h-8 w-8" />
                    Minhas Revisões
                </h1>
                <p className="text-slate-500 mt-1 font-medium">
                    Portarias atribuídas a você para revisão.
                </p>
            </div>

            {/* Em andamento */}
            <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Em andamento ({emAndamento.length})
                </p>
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : emAndamento.length === 0 ? (
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                            <Inbox className="h-8 w-8" />
                            <p className="font-semibold text-sm">Nenhuma revisão em andamento</p>
                        </CardContent>
                    </Card>
                ) : (
                    emAndamento.map((p) => (
                        <Card key={p.id} className="border-slate-200 shadow-sm">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]">
                                                Em revisão
                                            </Badge>
                                            {p.secretaria && (
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {p.secretaria.sigla}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-bold text-slate-800 truncate">{p.titulo}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Por: <span className="font-semibold">{p.autor?.name || 'Operador'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-bold text-slate-600 border-slate-300"
                                            onClick={() => { setModalTransferir(p); setRevisorSelecionado(''); setJustificativa('') }}
                                        >
                                            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Transferir
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                                            onClick={() => { setModalRejeitar(p); setObservacao('') }}
                                        >
                                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Rejeitar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="font-bold"
                                            onClick={() => aprovar(p.id)}
                                            disabled={salvando}
                                        >
                                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Aprovar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Concluídas */}
            {concluidas.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Concluídas ({concluidas.length})
                    </p>
                    {concluidas.map((p) => (
                        <Card key={p.id} className="border-slate-100 bg-slate-50/50 shadow-none opacity-70">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm truncate">{p.titulo}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{p.secretaria?.sigla}</p>
                                </div>
                                <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold shrink-0">
                                    {p.status.replace(/_/g, ' ')}
                                </Badge>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal — Rejeitar */}
            <Dialog open={!!modalRejeitar} onOpenChange={(open) => !open && setModalRejeitar(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-black text-slate-900">Devolver para Correção</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600 font-medium truncate">
                            {modalRejeitar?.titulo}
                        </p>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Motivo da devolução <span className="text-rose-500">*</span></Label>
                            <Textarea
                                placeholder="Descreva o que precisa ser corrigido..."
                                value={observacao}
                                onChange={(e) => setObservacao(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalRejeitar(null)} disabled={salvando}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmarRejeitar}
                            disabled={salvando || !observacao.trim()}
                            className="font-bold"
                        >
                            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Devolver'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal — Transferir */}
            <Dialog open={!!modalTransferir} onOpenChange={(open) => !open && setModalTransferir(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-black text-slate-900">Transferir Revisão</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-slate-600 font-medium truncate">
                            {modalTransferir?.titulo}
                        </p>
                        <div className="space-y-1.5">
                            <Label className="font-bold text-slate-700">Transferir para <span className="text-rose-500">*</span></Label>
                            <Select value={revisorSelecionado} onValueChange={setRevisorSelecionado}>
                                <SelectTrigger>
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
                            <Label className="font-bold text-slate-700">Justificativa <span className="text-rose-500">*</span></Label>
                            <Textarea
                                placeholder="Por que está transferindo esta revisão?"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalTransferir(null)} disabled={salvando}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmarTransferir}
                            disabled={salvando || !revisorSelecionado || !justificativa.trim()}
                            className="font-bold"
                        >
                            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Transferência'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
