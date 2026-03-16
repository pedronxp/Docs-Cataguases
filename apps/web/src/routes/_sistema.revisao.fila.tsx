import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ClipboardList, Loader2, Inbox, Clock, UserCheck, Eye,
    RefreshCw, Building2, User, CalendarDays, ArrowRight,
} from 'lucide-react'
import { STATUS_PORTARIA, type Portaria } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_sistema/revisao/fila')({
    component: FilaRevisaoPage,
})

function FilaRevisaoPage() {
    const { usuario } = useAuthStore()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [aceitando, setAceitando] = useState<string | null>(null)
    const [portarias, setPortarias] = useState<Portaria[]>([])

    useEffect(() => {
        carregar()
    }, [])

    const carregar = async () => {
        setLoading(true)
        const res = await portariaService.listarPortarias({ pageSize: 100 })
        if (res.success) {
            const fila = res.data.data.filter((p) =>
                p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA && !p.revisorAtualId
            )
            // Ordena por data (mais antigo primeiro — mais urgente)
            fila.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
            setPortarias(fila)
        }
        setLoading(false)
    }

    const aceitar = async (portariaId: string) => {
        setAceitando(portariaId)
        const res = await portariaService.assumirRevisao(portariaId)
        if (res.success) {
            toast({ title: 'Revisão aceita!', description: 'A portaria foi atribuída a você.' })
            navigate({ to: '/revisao/minhas' })
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
            await carregar()
        }
        setAceitando(null)
    }

    // Calcula urgência pela data de submissão
    function getUrgencia(updatedAt: string) {
        const horas = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)
        if (horas > 48) return { label: 'Urgente', cls: 'bg-red-100 text-red-700 border-red-200' }
        if (horas > 24) return { label: 'Atenção', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
        return null
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-3xl mx-auto w-full">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="text-primary h-4 w-4" />
                        </div>
                        Fila de Revisão
                    </h1>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                        Portarias aguardando um revisor. O primeiro a aceitar fica responsável.
                    </p>
                </div>
                <Button
                    onClick={carregar}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="font-semibold h-9 rounded-xl border-slate-200 text-xs"
                >
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
            ) : portarias.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl">
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Inbox className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-700">Fila vazia</p>
                            <p className="text-sm text-slate-400 mt-1">Nenhuma portaria aguardando revisão no momento.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                        {portarias.length} {portarias.length === 1 ? 'documento aguardando' : 'documentos aguardando'}
                    </p>
                    {portarias.map((p, idx) => {
                        const urgencia = getUrgencia(p.updatedAt)
                        const autor = (p as any).criadoPor?.name || p.autor?.name

                        return (
                            <div
                                key={p.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all animate-in fade-in duration-200"
                                style={{ animationDelay: `${idx * 40}ms` }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Tags de topo */}
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">
                                                <Clock size={9} className="mr-1" /> Ag. Revisor
                                            </Badge>
                                            {urgencia && (
                                                <Badge className={`font-bold text-[10px] ${urgencia.cls}`}>
                                                    {urgencia.label}
                                                </Badge>
                                            )}
                                            {p.secretaria && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Building2 className="h-2.5 w-2.5" />
                                                    {p.secretaria.sigla || p.secretaria.nome}
                                                </span>
                                            )}
                                        </div>

                                        {/* Título */}
                                        <p className="font-black text-slate-800 leading-tight line-clamp-2 mb-1.5">
                                            {p.titulo}
                                        </p>

                                        {/* Meta */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {autor && (
                                                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <User className="h-3 w-3" />
                                                    {autor}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                <CalendarDays className="h-3 w-3" />
                                                Submetido {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 h-9 rounded-xl text-xs"
                                            asChild
                                        >
                                            <Link to="/administrativo/portarias/$id" params={{ id: p.id }}>
                                                <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                                            </Link>
                                        </Button>
                                        <Button
                                            onClick={() => aceitar(p.id)}
                                            disabled={aceitando === p.id}
                                            size="sm"
                                            className="bg-primary hover:bg-primary/90 font-bold h-9 rounded-xl text-xs px-4 shadow-sm shadow-primary/20"
                                        >
                                            {aceitando === p.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Aceitar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
