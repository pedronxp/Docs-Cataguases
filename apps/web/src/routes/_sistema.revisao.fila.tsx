import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Loader2, Inbox, Clock, UserCheck } from 'lucide-react'
import { STATUS_PORTARIA, type Portaria } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'

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
            const fila = res.data.data.filter(
                (p) => p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA && !p.revisorAtualId
            )
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ClipboardList className="text-primary h-8 w-8" />
                        Fila de Revisão
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Portarias aguardando um revisor. O primeiro a aceitar fica responsável.
                    </p>
                </div>
                <Button onClick={carregar} variant="outline" size="sm" disabled={loading} className="font-semibold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : portarias.length === 0 ? (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <Inbox className="h-12 w-12" />
                        <p className="font-semibold text-base">Nenhuma portaria aguardando revisão</p>
                        <p className="text-sm">A fila está vazia por enquanto.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {portarias.length} {portarias.length === 1 ? 'documento aguardando' : 'documentos aguardando'}
                    </p>
                    {portarias.map((p) => (
                        <Card key={p.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px]">
                                            <Clock size={10} className="mr-1" /> Aguardando revisão
                                        </Badge>
                                        {p.secretaria && (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {p.secretaria.sigla}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-bold text-slate-800 truncate">{p.titulo}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-xs text-slate-500">
                                            Por: <span className="font-semibold">{p.autor?.name || 'Operador'}</span>
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(p.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => aceitar(p.id)}
                                    disabled={aceitando === p.id}
                                    className="font-bold shrink-0"
                                    size="sm"
                                >
                                    {aceitando === p.id
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <><UserCheck className="mr-2 h-4 w-4" /> Aceitar</>
                                    }
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
