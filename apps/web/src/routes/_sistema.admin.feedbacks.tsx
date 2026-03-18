import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    MessageSquareWarning, RefreshCw, Bug, Lightbulb, HelpCircle,
    ChevronDown, ChevronUp, Loader2, User,
    CalendarDays, Flag,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_sistema/admin/feedbacks')({
    component: AdminFeedbacksPage,
})

type Feedback = {
    id: string
    tipo: 'BUG' | 'SUGESTAO' | 'DUVIDA'
    titulo: string
    descricao: string
    prioridade: 'BAIXA' | 'MEDIA' | 'ALTA'
    status: 'ABERTO' | 'EM_ANALISE' | 'RESOLVIDO'
    criadoEm: string
    atualizadoEm: string
    user: { name?: string; username: string; email?: string }
    resposta?: string
}

const TIPO_CONFIG = {
    BUG: { label: 'Bug', icon: Bug, cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    SUGESTAO: { label: 'Sugestão', icon: Lightbulb, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    DUVIDA: { label: 'Dúvida', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
}

const STATUS_CONFIG = {
    ABERTO: { label: 'Aberto', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    EM_ANALISE: { label: 'Em Análise', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    RESOLVIDO: { label: 'Resolvido', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

const PRIORIDADE_CONFIG = {
    BAIXA: { label: 'Baixa', cls: 'text-slate-500' },
    MEDIA: { label: 'Média', cls: 'text-amber-600' },
    ALTA: { label: 'Alta', cls: 'text-red-600' },
}

export default function AdminFeedbacksPage() {
    const { toast } = useToast()
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [tipoFilter, setTipoFilter] = useState<string>('all')
    const [expanded, setExpanded] = useState<string | null>(null)
    const [modalFeedback, setModalFeedback] = useState<Feedback | null>(null)
    const [resposta, setResposta] = useState('')
    const [novoStatus, setNovoStatus] = useState<string>('')
    const [salvando, setSalvando] = useState(false)

    const carregar = async () => {
        setLoading(true)
        try {
            const res = await api.get('/api/feedback')
            setFeedbacks(res.data.data || [])
        } catch {
            toast({ title: 'Erro', description: 'Não foi possível carregar os feedbacks.', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { carregar() }, [])

    const filtrados = feedbacks.filter(f => {
        if (statusFilter !== 'all' && f.status !== statusFilter) return false
        if (tipoFilter !== 'all' && f.tipo !== tipoFilter) return false
        return true
    })

    const abrirModal = (f: Feedback) => {
        setModalFeedback(f)
        setResposta((f as any).resposta || '')
        setNovoStatus(f.status)
    }

    const salvarResposta = async () => {
        if (!modalFeedback) return
        setSalvando(true)
        try {
            await api.patch(`/api/feedback/${modalFeedback.id}`, { status: novoStatus, resposta })
            toast({ title: 'Atualizado!', description: 'O feedback foi respondido e o status atualizado.' })
            setModalFeedback(null)
            carregar()
        } catch {
            toast({ title: 'Erro', description: 'Não foi possível salvar a resposta.', variant: 'destructive' })
        } finally {
            setSalvando(false)
        }
    }

    const contadores = {
        total: feedbacks.length,
        abertos: feedbacks.filter(f => f.status === 'ABERTO').length,
        bugs: feedbacks.filter(f => f.tipo === 'BUG').length,
        resolvidos: feedbacks.filter(f => f.status === 'RESOLVIDO').length,
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MessageSquareWarning className="text-primary h-4 w-4" />
                        </div>
                        Gerenciar Feedbacks
                    </h1>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                        Visualize, responda e gerencie os feedbacks dos usuários.
                    </p>
                </div>
                <Button onClick={carregar} variant="outline" size="sm" disabled={loading}
                    className="font-semibold h-9 rounded-xl border-slate-200 text-xs">
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: contadores.total, cls: 'text-slate-900' },
                    { label: 'Abertos', value: contadores.abertos, cls: 'text-amber-600' },
                    { label: 'Bugs', value: contadores.bugs, cls: 'text-rose-600' },
                    { label: 'Resolvidos', value: contadores.resolvidos, cls: 'text-emerald-600' },
                ].map(c => (
                    <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                        <p className={`text-3xl font-black mt-1 ${c.cls}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44 h-9 text-sm rounded-xl bg-white border-slate-200">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="ABERTO">Aberto</SelectItem>
                        <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger className="w-44 h-9 text-sm rounded-xl bg-white border-slate-200">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        <SelectItem value="BUG">Bug</SelectItem>
                        <SelectItem value="SUGESTAO">Sugestão</SelectItem>
                        <SelectItem value="DUVIDA">Dúvida</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Lista de feedbacks */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filtrados.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl py-20 text-center">
                    <MessageSquareWarning className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="font-bold text-slate-600">Nenhum feedback encontrado</p>
                    <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtrados.map(f => {
                        const tipoConf = TIPO_CONFIG[f.tipo]
                        const statusConf = STATUS_CONFIG[f.status]
                        const priorConf = PRIORIDADE_CONFIG[f.prioridade]
                        const isExpanded = expanded === f.id

                        return (
                            <div key={f.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                                <button
                                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors"
                                    onClick={() => setExpanded(isExpanded ? null : f.id)}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tipoConf.cls} border`}>
                                        <tipoConf.icon size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <Badge className={`${tipoConf.cls} font-bold text-[10px] border`}>{tipoConf.label}</Badge>
                                            <Badge className={`${statusConf.cls} font-bold text-[10px] border`}>{statusConf.label}</Badge>
                                            <span className={`flex items-center gap-1 text-[10px] font-bold ${priorConf.cls}`}>
                                                <Flag size={8} /> {priorConf.label}
                                            </span>
                                        </div>
                                        <p className="font-bold text-sm text-slate-800 line-clamp-1">{f.titulo}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <User size={9} /> {f.user?.name || f.user?.username}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <CalendarDays size={9} /> {formatDistanceToNow(new Date(f.criadoEm), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={e => { e.stopPropagation(); abrirModal(f) }}
                                            className="bg-primary hover:bg-primary/90 text-white font-bold h-7 px-3 rounded-lg text-[11px] shadow-sm shadow-primary/20"
                                        >
                                            Responder
                                        </Button>
                                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 mt-0">
                                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{f.descricao}</p>
                                        {(f as any).resposta && (
                                            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Resposta do Admin</p>
                                                <p className="text-sm text-emerald-800">{(f as any).resposta}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal de resposta */}
            <Dialog open={!!modalFeedback} onOpenChange={open => !open && setModalFeedback(null)}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Responder Feedback</DialogTitle>
                    </DialogHeader>
                    {modalFeedback && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <p className="font-bold text-sm text-slate-800">{modalFeedback.titulo}</p>
                                <p className="text-xs text-slate-500 mt-1">{modalFeedback.descricao}</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Atualizar Status</label>
                                <Select value={novoStatus} onValueChange={setNovoStatus}>
                                    <SelectTrigger className="rounded-xl h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ABERTO">Aberto</SelectItem>
                                        <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                                        <SelectItem value="RESOLVIDO">Resolvido</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Sua Resposta</label>
                                <Textarea
                                    placeholder="Escreva uma resposta para o usuário..."
                                    value={resposta}
                                    onChange={e => setResposta(e.target.value)}
                                    className="rounded-xl min-h-[100px] text-sm resize-none"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalFeedback(null)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button onClick={salvarResposta} disabled={salvando}
                            className="bg-primary hover:bg-primary/90 font-bold rounded-xl">
                            {salvando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Resposta'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
