import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Activity, Loader2, Inbox, Clock, UserCheck, Search,
    RefreshCw, AlertCircle, ExternalLink, Building2, Calendar,
} from 'lucide-react'
import { STATUS_PORTARIA, type Portaria } from '@/types/domain'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_sistema/revisao/todas')({
    component: TodasRevisoesPage,
})

type AbaRevisao = 'abertas' | 'atribuidas' | 'todas'

function TodasRevisoesPage() {
    const { usuario } = useAuthStore()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [portarias, setPortarias] = useState<Portaria[]>([])
    const [busca, setBusca] = useState('')
    const [aba, setAba] = useState<AbaRevisao>('todas')

    // Somente admins devem acessar esta página
    const podeAcessar = usuario?.role === 'ADMIN_GERAL' || usuario?.role === 'PREFEITO' || usuario?.role === 'SECRETARIO'

    useEffect(() => {
        if (!podeAcessar) {
            navigate({ to: '/dashboard' })
            return
        }
        carregar()
    }, [])

    const carregar = async () => {
        setLoading(true)
        const res = await portariaService.listarPortarias({ pageSize: 200 })
        if (res.success) {
            const emRevisao = res.data.data.filter((p) =>
                p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA ||
                p.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA
            )
            setPortarias(emRevisao)
        }
        setLoading(false)
    }

    const abertas = portarias.filter(p => p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA)
    const atribuidas = portarias.filter(p => p.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA)

    const portariasFiltradas = portarias
        .filter(p => {
            if (aba === 'abertas') return p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA
            if (aba === 'atribuidas') return p.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA
            return true
        })
        .filter(p => {
            if (!busca.trim()) return true
            const q = busca.toLowerCase()
            return p.titulo.toLowerCase().includes(q) ||
                p.secretaria?.sigla?.toLowerCase().includes(q) ||
                p.secretaria?.nome?.toLowerCase().includes(q) ||
                (p as any).revisorAtual?.name?.toLowerCase().includes(q) ||
                (p as any).criadoPor?.name?.toLowerCase().includes(q)
        })

    function tempoEspera(updatedAt: string) {
        const diff = Date.now() - new Date(updatedAt).getTime()
        const horas = Math.floor(diff / 3_600_000)
        if (horas < 1) return 'Há menos de 1h'
        if (horas < 24) return `Há ${horas}h`
        const dias = Math.floor(horas / 24)
        return `Há ${dias} dia${dias > 1 ? 's' : ''}`
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-primary h-8 w-8" />
                        Revisões em Andamento
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Visão geral de todos os documentos atualmente no fluxo de revisão.
                    </p>
                </div>
                <Button
                    onClick={carregar}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="font-semibold gap-2 shrink-0"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Atualizar
                </Button>
            </div>

            {/* Sumário */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => setAba('todas')}
                    className={`p-4 rounded-xl border text-left transition-all ${aba === 'todas' ? 'border-primary/30 bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    <p className={`text-2xl font-black ${aba === 'todas' ? 'text-primary' : 'text-slate-900'}`}>
                        {portarias.length}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Total em revisão</p>
                </button>
                <button
                    onClick={() => setAba('abertas')}
                    className={`p-4 rounded-xl border text-left transition-all ${aba === 'abertas' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    <div className="flex items-center gap-2">
                        <p className={`text-2xl font-black ${aba === 'abertas' ? 'text-amber-700' : 'text-slate-900'}`}>
                            {abertas.length}
                        </p>
                        {abertas.length > 0 && (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Aguardando revisor</p>
                </button>
                <button
                    onClick={() => setAba('atribuidas')}
                    className={`p-4 rounded-xl border text-left transition-all ${aba === 'atribuidas' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                    <p className={`text-2xl font-black ${aba === 'atribuidas' ? 'text-blue-700' : 'text-slate-900'}`}>
                        {atribuidas.length}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Com revisor atribuído</p>
                </button>
            </div>

            {/* Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por título, secretaria, revisor ou autor..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="pl-9 h-10 bg-white border-slate-200"
                />
            </div>

            {/* Lista */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : portariasFiltradas.length === 0 ? (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <Inbox className="h-12 w-12" />
                        <p className="font-semibold text-base">
                            {busca ? 'Nenhum resultado para esta busca' : 'Nenhum documento em revisão no momento'}
                        </p>
                        {busca && (
                            <Button variant="ghost" size="sm" onClick={() => setBusca('')} className="text-xs">
                                Limpar busca
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2.5">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {portariasFiltradas.length} {portariasFiltradas.length === 1 ? 'documento' : 'documentos'}
                    </p>
                    {portariasFiltradas.map((p) => {
                        const semRevisor = p.status === STATUS_PORTARIA.EM_REVISAO_ABERTA && !p.revisorAtualId
                        const comRevisor = p.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA

                        return (
                            <Card key={p.id} className={`border shadow-sm hover:shadow-md transition-shadow ${semRevisor ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'}`}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    {/* Status visual */}
                                    <div className={`w-2 h-12 rounded-full shrink-0 ${semRevisor ? 'bg-amber-400' : 'bg-blue-400'}`} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            {semRevisor ? (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] shrink-0">
                                                    <Clock size={9} className="mr-1" /> Aguardando revisor
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[10px] shrink-0">
                                                    <UserCheck size={9} className="mr-1" /> Em revisão
                                                </Badge>
                                            )}
                                            {p.secretaria && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <Building2 size={9} /> {p.secretaria.sigla}
                                                </span>
                                            )}
                                        </div>

                                        <p className="font-bold text-slate-800 text-sm truncate">{p.titulo}</p>

                                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                                            <span className="text-[11px] text-slate-500">
                                                Autor: <span className="font-semibold text-slate-700">
                                                    {(p as any).criadoPor?.name || p.autor?.name || '—'}
                                                </span>
                                            </span>
                                            {comRevisor && (p as any).revisorAtual && (
                                                <span className="text-[11px] text-blue-600">
                                                    Revisor: <span className="font-semibold">
                                                        {(p as any).revisorAtual?.name || '—'}
                                                    </span>
                                                </span>
                                            )}
                                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                                <Calendar size={10} /> {tempoEspera(p.updatedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ação */}
                                    <Link
                                        to="/administrativo/portarias/revisao/$id"
                                        params={{ id: p.id }}
                                        className="shrink-0"
                                    >
                                        <Button variant="outline" size="sm" className="font-bold gap-1.5 text-xs">
                                            <ExternalLink className="h-3.5 w-3.5" /> Abrir
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
