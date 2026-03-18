import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUsuarios } from '@/hooks/use-usuarios'
import {
    ClipboardCheck, ArrowLeft, Clock, UserCheck, UserX,
    Loader2, Shield, Building2, Search, X, AlertTriangle,
    CheckCircle2, XCircle, Calendar
} from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import type { Usuario, RoleUsuario, Secretaria } from '@/types/domain'
import { atualizarUsuario } from '@/services/usuario.service'
import { listarSetores, type Setor } from '@/services/secretaria.service'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Can } from '@/lib/ability'

export const Route = createFileRoute('/_sistema/admin/fila-aprovacao' as any)({
    component: FilaAprovacaoPage,
})

const ROLES_APROVACAO: { value: RoleUsuario; label: string; descricao: string; requerSecretaria: boolean }[] = [
    { value: 'OPERADOR', label: 'Operador', descricao: 'Cria e edita portarias da sua secretaria', requerSecretaria: true },
    { value: 'REVISOR', label: 'Revisor', descricao: 'Revisa portarias antes da assinatura', requerSecretaria: true },
    { value: 'SECRETARIO', label: 'Secretário', descricao: 'Gerencia a secretaria e seus documentos', requerSecretaria: true },
    { value: 'PREFEITO', label: 'Prefeito', descricao: 'Assina documentos oficiais', requerSecretaria: false },
    { value: 'ADMIN_GERAL', label: 'Administrador Geral', descricao: 'Acesso total ao sistema', requerSecretaria: false },
]

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `há ${mins}min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `há ${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'ontem'
    return `há ${days} dias`
}

function FilaAprovacaoPage() {
    const { toast } = useToast()
    const { usuarios, loading, refetch } = useUsuarios()
    const [busca, setBusca] = useState('')

    // Aprovação modal
    const [modalAprovar, setModalAprovar] = useState<Usuario | null>(null)
    const [roleSelecionada, setRoleSelecionada] = useState<RoleUsuario>('OPERADOR')
    const [secretariaSelecionada, setSecretariaSelecionada] = useState('')
    const [setorSelecionado, setSetorSelecionado] = useState('')
    const [aprovando, setAprovando] = useState(false)
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [carregandoSetores, setCarregandoSetores] = useState(false)

    // Rejeição modal
    const [modalRejeitar, setModalRejeitar] = useState<Usuario | null>(null)
    const [motivoRejeicao, setMotivoRejeicao] = useState('')
    const [rejeitando, setRejeitando] = useState(false)

    useEffect(() => {
        api.get('/api/admin/config/secretarias')
            .then((res) => setSecretarias(res.data.data || res.data || []))
            .catch(() => { })
    }, [])

    useEffect(() => {
        if (!secretariaSelecionada) { setSetores([]); setSetorSelecionado(''); return }
        setCarregandoSetores(true)
        listarSetores(secretariaSelecionada)
            .then((res) => { if (res.success) setSetores(res.data) })
            .catch(() => setSetores([]))
            .finally(() => setCarregandoSetores(false))
    }, [secretariaSelecionada])

    const pendentes = useMemo(() => {
        let lista = usuarios.filter(u => u.role === 'PENDENTE' && u.ativo !== false)
        if (busca.trim()) {
            const q = busca.toLowerCase()
            lista = lista.filter(u =>
                u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            )
        }
        return lista.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }, [usuarios, busca])

    const requerSecretaria = ROLES_APROVACAO.find(r => r.value === roleSelecionada)?.requerSecretaria ?? true

    const abrirModalAprovar = (u: Usuario) => {
        setModalAprovar(u)
        setRoleSelecionada('OPERADOR')
        setSecretariaSelecionada('')
        setSetorSelecionado('')
        setSetores([])
    }

    const confirmarAprovacao = async () => {
        if (!modalAprovar) return
        if (requerSecretaria && !secretariaSelecionada) {
            toast({ title: 'Atenção', description: 'Selecione a secretaria do usuário.', variant: 'destructive' })
            return
        }
        setAprovando(true)
        const res = await atualizarUsuario(modalAprovar.id, {
            role: roleSelecionada,
            secretariaId: requerSecretaria ? secretariaSelecionada : null,
            setorId: requerSecretaria && setorSelecionado ? setorSelecionado : null,
            ativo: true,
        })
        if (res.success) {
            toast({ title: 'Acesso liberado!', description: `${modalAprovar.name} agora é ${ROLES_APROVACAO.find(r => r.value === roleSelecionada)?.label}.` })
            setModalAprovar(null)
            refetch()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setAprovando(false)
    }

    const confirmarRejeicao = async () => {
        if (!modalRejeitar) return
        setRejeitando(true)
        try {
            const res = await atualizarUsuario(modalRejeitar.id, {
                ativo: false,
                role: 'PENDENTE' as RoleUsuario,
            } as any)
            if (res.success) {
                toast({ title: 'Solicitação recusada', description: `O acesso de ${modalRejeitar.name} foi recusado.` })
                setModalRejeitar(null)
                setMotivoRejeicao('')
                refetch()
            } else {
                toast({ title: 'Erro', description: res.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: 'Erro', description: 'Falha ao recusar a solicitação.', variant: 'destructive' })
        }
        setRejeitando(false)
    }
    return (
        <Can I="gerenciar" a="Usuario" passThrough>
            {(allowed) => {
                if (!allowed) {
                    return <Navigate to="/dashboard" replace />
                }

                return (
                    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                        <Link to="/admin/usuarios"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                        <ClipboardCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold text-slate-900">Fila de Aprovação</h1>
                            {pendentes.length > 0 && (
                                <Badge className="bg-amber-500 text-white font-bold text-xs px-2 py-0 rounded-full">
                                    {pendentes.length}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Novos usuários aguardando liberação de acesso ao sistema</p>
                    </div>
                </div>
            </div>

            {/* Info banner */}
            {pendentes.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">
                            {pendentes.length} {pendentes.length === 1 ? 'usuário aguarda' : 'usuários aguardam'} aprovação
                        </p>
                        <p className="text-xs text-amber-700/80 mt-0.5">
                            Defina o nível de acesso e a secretaria de cada servidor para liberar o uso do sistema.
                            Usuários recusados receberão uma mensagem ao tentar fazer login.
                        </p>
                    </div>
                </div>
            )}

            {/* Busca */}
            {pendentes.length > 3 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="pl-9 h-9 text-sm border-slate-200"
                    />
                    {busca && (
                        <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Lista */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm">Carregando...</span>
                </div>
            ) : pendentes.length === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="py-16">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                            <div className="p-4 rounded-full bg-emerald-50">
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            </div>
                            <p className="font-semibold text-slate-700 text-sm">Nenhuma solicitação pendente</p>
                            <p className="text-xs text-slate-400 max-w-sm text-center">
                                Quando novos usuários se registrarem no sistema, eles aparecerão aqui para que você defina o nível de acesso.
                            </p>
                            <Button asChild variant="outline" size="sm" className="mt-2 gap-1.5 text-xs">
                                <Link to="/admin/usuarios"><ArrowLeft className="h-3.5 w-3.5" /> Voltar para Usuários</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {pendentes.map(usuario => (
                        <Card key={usuario.id} className="border-slate-200 hover:border-slate-300 transition-colors overflow-hidden">
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-5">
                                    {/* Avatar */}
                                    <Avatar className="h-12 w-12 shrink-0">
                                        <AvatarFallback className="bg-amber-100 text-amber-700 text-sm font-bold">
                                            {getInitials(usuario.name)}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-slate-800">{usuario.name}</p>
                                        <p className="text-sm text-slate-400">{usuario.email}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                                            <Clock className="h-3 w-3" />
                                                            {formatRelativeTime(usuario.createdAt)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Registrado em {formatDate(usuario.createdAt)}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {usuario.secretaria && (
                                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Building2 className="h-3 w-3" />
                                                    {usuario.secretaria.nome}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs font-semibold"
                                            onClick={() => { setModalRejeitar(usuario); setMotivoRejeicao('') }}
                                        >
                                            <XCircle className="h-3.5 w-3.5" />
                                            Recusar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-9 gap-1.5 bg-[#1351B4] hover:bg-[#0c326f] text-white text-xs font-semibold"
                                            onClick={() => abrirModalAprovar(usuario)}
                                        >
                                            <UserCheck className="h-3.5 w-3.5" />
                                            Liberar Acesso
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ─── Modal: Liberar Acesso ──────────────────────────────────────── */}
            <Dialog open={!!modalAprovar} onOpenChange={(open) => !open && setModalAprovar(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-semibold text-slate-900 flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-[#1351B4]" />
                            Liberar Acesso
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Defina o nível de acesso de <strong className="text-slate-700">{modalAprovar?.name}</strong> no sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Role */}
                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-700 text-sm">
                                Nível de acesso <span className="text-red-500">*</span>
                            </Label>
                            <div className="grid grid-cols-1 gap-2">
                                {ROLES_APROVACAO.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => { setRoleSelecionada(r.value); setSecretariaSelecionada(''); setSetorSelecionado(''); setSetores([]) }}
                                        className={cn(
                                            'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                                            roleSelecionada === r.value
                                                ? 'border-[#1351B4] bg-blue-50/50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                                            roleSelecionada === r.value ? 'border-[#1351B4]' : 'border-slate-300'
                                        )}>
                                            {roleSelecionada === r.value && (
                                                <div className="w-2 h-2 rounded-full bg-[#1351B4]" />
                                            )}
                                        </div>
                                        <div>
                                            <p className={cn(
                                                'text-sm font-semibold',
                                                roleSelecionada === r.value ? 'text-[#1351B4]' : 'text-slate-700'
                                            )}>
                                                {r.label}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">{r.descricao}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Secretaria */}
                        {requerSecretaria && (
                            <div className="space-y-1.5">
                                <Label className="font-semibold text-slate-700 text-sm">
                                    Secretaria <span className="text-red-500">*</span>
                                </Label>
                                <Select value={secretariaSelecionada} onValueChange={setSecretariaSelecionada}>
                                    <SelectTrigger className="h-9 border-slate-200">
                                        <SelectValue placeholder="Selecionar secretaria..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {secretarias.length === 0
                                            ? <SelectItem value="__none__" disabled>Carregando...</SelectItem>
                                            : secretarias.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.sigla} — {s.nome}
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Setor */}
                        {requerSecretaria && secretariaSelecionada && (
                            <div className="space-y-1.5">
                                <Label className="font-semibold text-slate-700 text-sm">
                                    Setor <span className="text-slate-400 font-normal">(opcional)</span>
                                </Label>
                                <Select value={setorSelecionado} onValueChange={setSetorSelecionado} disabled={carregandoSetores}>
                                    <SelectTrigger className="h-9 border-slate-200">
                                        <SelectValue placeholder={carregandoSetores ? 'Carregando...' : 'Selecionar setor...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {setores.length === 0 && !carregandoSetores && (
                                            <SelectItem value="__none__" disabled>Nenhum setor cadastrado</SelectItem>
                                        )}
                                        {setores.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.nome} {s.sigla ? `(${s.sigla})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setModalAprovar(null)} disabled={aprovando} className="border-slate-200">
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmarAprovacao}
                            disabled={aprovando || (requerSecretaria && !secretariaSelecionada)}
                            className="bg-[#1351B4] hover:bg-[#0c326f] text-white font-semibold"
                        >
                            {aprovando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Liberar Acesso'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Modal: Recusar Acesso ──────────────────────────────────────── */}
            <Dialog open={!!modalRejeitar} onOpenChange={(open) => !open && setModalRejeitar(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-semibold text-slate-900 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            Recusar Solicitação
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Ao recusar, <strong className="text-slate-700">{modalRejeitar?.name}</strong> verá uma
                            mensagem informando que o acesso foi negado ao tentar fazer login.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="p-3 rounded-lg border border-red-200 bg-red-50/50">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-red-100 text-red-700 text-xs font-bold">
                                        {modalRejeitar ? getInitials(modalRejeitar.name) : ''}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{modalRejeitar?.name}</p>
                                    <p className="text-xs text-slate-400">{modalRejeitar?.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="font-semibold text-slate-700 text-sm">
                                Motivo <span className="text-slate-400 font-normal">(opcional)</span>
                            </Label>
                            <Textarea
                                placeholder="Ex: Usuário não pertence à prefeitura municipal..."
                                value={motivoRejeicao}
                                onChange={(e) => setMotivoRejeicao(e.target.value)}
                                className="resize-none h-20 text-sm border-slate-200"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setModalRejeitar(null)} disabled={rejeitando} className="border-slate-200">
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmarRejeicao}
                            disabled={rejeitando}
                            className="font-semibold"
                        >
                            {rejeitando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Recusa'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
                )
            }}
        </Can>
    )
}
