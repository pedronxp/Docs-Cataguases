import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useDashboard } from '@/hooks/use-dashboard'
import { useState, useEffect } from 'react'


import { Button } from '@/components/ui/button'

import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog'
import { Can } from '@casl/react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    FileText, Clock, CheckCircle2, PenTool, LayoutDashboard,
    PlusCircle, Activity, BookOpen, X, Sparkles, ArrowRight,
    ClipboardList, TrendingUp, Building2, Newspaper, BarChart2,
    Send, Eye, Save, Download, Bot, UserCheck, AlertCircle,
    FileSignature, ScrollText, Loader2, ChevronRight,
    Bell, Megaphone, Trash2,
} from 'lucide-react'

import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotificationsStore } from '@/store/notifications.store'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/api'

const BANNER_KEY = 'docs_tutorial_banner_dismissed'

// ─── Tipos de evento → ícone/cor ─────────────────────────────────────────────
const EVENTO_ICON: Record<string, { icon: React.ReactNode; cor: string }> = {
    PORTARIA_CRIADA:     { icon: <FileText className="h-3.5 w-3.5" />, cor: 'bg-primary/10 text-primary' },
    PORTARIA_SUBMETIDA:  { icon: <Send className="h-3.5 w-3.5" />, cor: 'bg-amber-100 text-amber-700' },
    PORTARIA_PUBLICADA:  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, cor: 'bg-emerald-100 text-emerald-700' },
    REVISAO_ATRIBUIDA:   { icon: <UserCheck className="h-3.5 w-3.5" />, cor: 'bg-violet-100 text-violet-700' },
    FORMULARIO_SALVO:    { icon: <Save className="h-3.5 w-3.5" />, cor: 'bg-blue-100 text-blue-600' },
    DOCX_VISUALIZADO:    { icon: <Eye className="h-3.5 w-3.5" />, cor: 'bg-slate-100 text-slate-500' },
    DOCX_BAIXADO:        { icon: <Download className="h-3.5 w-3.5" />, cor: 'bg-slate-100 text-slate-600' },
    PDF_VISUALIZADO:     { icon: <Eye className="h-3.5 w-3.5" />, cor: 'bg-slate-100 text-slate-500' },
    ACAO_ASSISTENTE_IA:  { icon: <Bot className="h-3.5 w-3.5" />, cor: 'bg-violet-100 text-violet-600' },
    ASSINATURA_DIGITAL:  { icon: <FileSignature className="h-3.5 w-3.5" />, cor: 'bg-emerald-100 text-emerald-600' },
    PORTARIA_REJEITADA:  { icon: <AlertCircle className="h-3.5 w-3.5" />, cor: 'bg-rose-100 text-rose-600' },
    MODELO_CRIADO:       { icon: <FileText className="h-3.5 w-3.5" />, cor: 'bg-indigo-100 text-indigo-600' },
    MODELO_ATUALIZADO:   { icon: <FileText className="h-3.5 w-3.5" />, cor: 'bg-amber-100 text-amber-600' },
    SECRETARIA_CRIADA:   { icon: <Building2 className="h-3.5 w-3.5" />, cor: 'bg-teal-100 text-teal-600' },
    SETOR_CRIADO:        { icon: <Building2 className="h-3.5 w-3.5" />, cor: 'bg-cyan-100 text-cyan-600' },
    EXCLUSAO:            { icon: <AlertCircle className="h-3.5 w-3.5" />, cor: 'bg-red-100 text-red-600' },
    PORTARIA_ASSINADA:   { icon: <FileSignature className="h-3.5 w-3.5" />, cor: 'bg-emerald-100 text-emerald-700' },
}

function eventoConfig(tipo: string) {
    return EVENTO_ICON[tipo] ?? { icon: <Activity className="h-3.5 w-3.5" />, cor: 'bg-slate-100 text-slate-500' }
}

// ─── Cores para gráfico de pizza ─────────────────────────────────────────────
const STATUS_CORES: Record<string, string> = {
    RASCUNHO: '#94a3b8',
    CORRECAO_NECESSARIA: '#f43f5e',
    EM_REVISAO_ABERTA: '#f59e0b',
    EM_REVISAO_ATRIBUIDA: '#f97316',
    AGUARDANDO_ASSINATURA: '#6366f1',
    PRONTO_PUBLICACAO: '#10b981',
    PUBLICADA: '#22c55e',
    FALHA_PROCESSAMENTO: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    CORRECAO_NECESSARIA: 'Correção',
    EM_REVISAO_ABERTA: 'Em Revisão',
    EM_REVISAO_ATRIBUIDA: 'Revisão Atribuída',
    AGUARDANDO_ASSINATURA: 'Ag. Assinatura',
    PRONTO_PUBLICACAO: 'Pronto p/ Pub.',
    PUBLICADA: 'Publicada',
    FALHA_PROCESSAMENTO: 'Falha',
}

// ─── Banners ──────────────────────────────────────────────────────────────────

function WelcomeBanner() {
    const usuario = useAuthStore(s => s.usuario)
    const [visivel, setVisivel] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(BANNER_KEY)
        if (!dismissed) setVisivel(true)
    }, [])

    function dispensar() {
        localStorage.setItem(BANNER_KEY, '1')
        setVisivel(false)
    }

    if (!visivel) return null
    const primeiroNome = usuario?.name?.split(' ')[0] ?? 'Servidor'

    return (
        <div className="relative bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border border-primary/20 px-5 py-4 flex items-start justify-between gap-4 rounded-xl overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-l-xl" />
            <div className="flex items-start gap-3 pl-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900">
                        Bem-vindo ao Doc's Cataguases, {primeiroNome}!
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        É a sua primeira vez aqui? Leia o guia do sistema para entender como funciona o fluxo de portarias.
                    </p>
                    <Link
                        to="/tutorial"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-2"
                        onClick={dispensar}
                    >
                        Abrir guia do sistema <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>
            <button onClick={dispensar} className="shrink-0 text-slate-400 hover:text-slate-600 mt-0.5 transition-colors" title="Dispensar">
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

function ModeloBanner() {
    const navigate = useNavigate()
    const { notificacoes } = useNotificationsStore()
    const naoLidasModelo = notificacoes.filter(
        n => !n.lida && (n.tipoEvento === 'MODELO_CRIADO' || n.tipoEvento === 'MODELO_ATUALIZADO')
    )
    if (naoLidasModelo.length === 0) return null
    const isNovo = naoLidasModelo[0].tipoEvento === 'MODELO_CRIADO'
    function dispensar() {
        useNotificationsStore.setState(state => ({
            notificacoes: state.notificacoes.map(n =>
                n.tipoEvento === 'MODELO_CRIADO' || n.tipoEvento === 'MODELO_ATUALIZADO' ? { ...n, lida: true } : n
            ),
            naoLidas: Math.max(0, state.naoLidas - naoLidasModelo.length),
        }))
    }
    return (
        <div className={`relative border px-5 py-4 flex items-start justify-between gap-4 animate-in slide-in-from-top-2 duration-300 rounded-xl overflow-hidden ${isNovo ? 'bg-indigo-50/60 border-indigo-200' : 'bg-amber-50/60 border-amber-200'}`}>
            <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${isNovo ? 'bg-indigo-500' : 'bg-amber-500'}`} />
            <div className="flex items-start gap-3 pl-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isNovo ? 'bg-indigo-100' : 'bg-amber-100'}`}>
                    <Sparkles className={`h-4 w-4 ${isNovo ? 'text-indigo-600' : 'text-amber-600'}`} />
                </div>
                <div>
                    <p className={`text-sm font-bold ${isNovo ? 'text-indigo-900' : 'text-amber-900'}`}>
                        {naoLidasModelo.length > 1
                            ? `${naoLidasModelo.length} atualizações de modelos de documento`
                            : naoLidasModelo[0].mensagem}
                    </p>
                    <button
                        onClick={() => { dispensar(); navigate({ to: '/admin/modelos' }) }}
                        className={`inline-flex items-center gap-1 text-xs font-bold hover:underline mt-1 ${isNovo ? 'text-indigo-600' : 'text-amber-700'}`}
                    >
                        Ver modelos <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </div>
            <button onClick={dispensar} className="shrink-0 text-slate-400 hover:text-slate-600 mt-0.5 transition-colors">
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

// ─── Avisos do Sistema ────────────────────────────────────────────────────────

type Aviso = {
    id: string
    titulo: string
    mensagem: string
    tipo: 'INFO' | 'AVISO' | 'NOVIDADE'
    criadoEm: string
    expiresAt?: string | null
}

const AVISO_CONFIG = {
    INFO: { cls: 'bg-blue-50 border-blue-200', bar: 'bg-blue-500', titleCls: 'text-blue-900', textCls: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', icon: <Bell className="h-4 w-4 text-blue-500" />, label: 'Informação' },
    AVISO: { cls: 'bg-amber-50 border-amber-200', bar: 'bg-amber-500', titleCls: 'text-amber-900', textCls: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="h-4 w-4 text-amber-500" />, label: 'Atenção' },
    NOVIDADE: { cls: 'bg-emerald-50 border-emerald-200', bar: 'bg-emerald-500', titleCls: 'text-emerald-900', textCls: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: <Sparkles className="h-4 w-4 text-emerald-500" />, label: 'Novidade' },
}

function AvisosSection({ isAdmin }: { isAdmin: boolean }) {
    const [avisos, setAvisos] = useState<Aviso[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [titulo, setTitulo] = useState('')
    const [mensagem, setMensagem] = useState('')
    const [tipo, setTipo] = useState<'INFO' | 'AVISO' | 'NOVIDADE'>('NOVIDADE')
    const [expiresAt, setExpiresAt] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [dismissed, setDismissed] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('avisos_dismissed') || '[]') } catch { return [] }
    })

    const carregar = async () => {
        try {
            const res = await api.get('/api/avisos')
            setAvisos(res.data?.data || [])
        } catch { /* silencioso */ }
        finally { setLoading(false) }
    }

    useEffect(() => { carregar() }, [])

    const dispensar = (id: string) => {
        const next = [...dismissed, id]
        setDismissed(next)
        try { localStorage.setItem('avisos_dismissed', JSON.stringify(next)) } catch { /* noop */ }
    }

    const excluir = async (id: string) => {
        await api.delete(`/api/avisos/${id}`)
        carregar()
    }

    const salvar = async () => {
        if (!titulo || !mensagem) return
        setSalvando(true)
        try {
            await api.post('/api/avisos', { titulo, mensagem, tipo, expiresAt: expiresAt || null })
            setModalOpen(false)
            setTitulo('')
            setMensagem('')
            setExpiresAt('')
            setTipo('NOVIDADE')
            carregar()
        } finally { setSalvando(false) }
    }

    const visiveis = avisos.filter(a => !dismissed.includes(a.id))

    if (!isAdmin && visiveis.length === 0 && !loading) return null

    return (
        <div className="space-y-2">
            {/* Card visível a todos com avisos ativos */}
            {visiveis.map(aviso => {
                const conf = AVISO_CONFIG[aviso.tipo] ?? AVISO_CONFIG.INFO
                return (
                    <div key={aviso.id} className={`relative border px-5 py-4 flex items-start justify-between gap-4 rounded-xl overflow-hidden ${conf.cls}`}>
                        <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${conf.bar}`} />
                        <div className="flex items-start gap-3 pl-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/60">
                                {conf.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <p className={`text-sm font-bold ${conf.titleCls}`}>{aviso.titulo}</p>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${conf.badge}`}>{conf.label}</span>
                                </div>
                                <p className={`text-xs leading-relaxed ${conf.textCls}`}>{aviso.mensagem}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {formatDistanceToNow(new Date(aviso.criadoEm), { addSuffix: true, locale: ptBR })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {isAdmin && (
                                <button onClick={() => excluir(aviso.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Excluir aviso">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                            <button onClick={() => dispensar(aviso.id)} className="text-slate-300 hover:text-slate-500 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )
            })}

            {/* Botão de postar novo aviso (somente admin) */}
            {isAdmin && (
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all">
                            <Megaphone className="h-3.5 w-3.5" />
                            Postar aviso para todos os usuários
                        </button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-primary" /> Novo Aviso do Sistema
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Tipo</label>
                                <Select value={tipo} onValueChange={v => setTipo(v as any)}>
                                    <SelectTrigger className="rounded-xl h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NOVIDADE">✨ Novidade / Nova Função</SelectItem>
                                        <SelectItem value="INFO">ℹ️ Informação</SelectItem>
                                        <SelectItem value="AVISO">⚠️ Atenção / Manutenção</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Título</label>
                                <Input
                                    placeholder="Ex: Nova funcionalidade de assinatura digital"
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Mensagem</label>
                                <Textarea
                                    placeholder="Descreva a atualização ou aviso..."
                                    value={mensagem}
                                    onChange={e => setMensagem(e.target.value)}
                                    className="rounded-xl min-h-[80px] resize-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Expira em <span className="text-slate-400 font-normal">(opcional)</span></label>
                                <Input
                                    type="datetime-local"
                                    value={expiresAt}
                                    onChange={e => setExpiresAt(e.target.value)}
                                    className="rounded-xl text-sm"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button onClick={salvar} disabled={salvando || !titulo || !mensagem}
                                className="bg-primary hover:bg-primary/90 font-bold rounded-xl">
                                {salvando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Postando...</> : <><Megaphone className="mr-2 h-4 w-4" /> Publicar Aviso</>}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, description, icon, iconBg, valueCls }: {
    title: string
    value: number
    description: string
    icon: React.ReactNode
    iconBg: string
    valueCls?: string
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    {icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-right leading-tight max-w-[80px] text-right">
                    {title}
                </span>
            </div>
            <div className={`text-3xl font-black leading-none mb-1.5 ${valueCls ?? 'text-slate-900'}`}>
                {value}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                {description}
            </p>
        </div>
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export const Route = createFileRoute('/_sistema/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    const { stats, feed, chartData, loading } = useDashboard()
    const ability = useAbility(AbilityContext)
    const { usuario } = useAuthStore()
    const isAdmin = ability.can('manage', 'all')
    const isRevisor = ability.can('claim', 'Revisao')

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                        <Skeleton className="h-7 w-48 rounded-xl" />
                        <Skeleton className="h-4 w-72 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <div className="grid gap-4 lg:grid-cols-7">
                    <Skeleton className="col-span-4 h-72 rounded-2xl" />
                    <Skeleton className="col-span-3 h-72 rounded-2xl" />
                </div>
            </div>
        )
    }

    // Dados para o gráfico de pizza (status)
    const pieData = chartData?.distribuicaoStatus?.map(s => ({
        name: STATUS_LABELS[s.status] ?? s.status,
        value: s.count,
        fill: STATUS_CORES[s.status] ?? '#94a3b8',
    })) ?? []

    // Dados para o gráfico de área (evolução mensal)
    const areaData = chartData?.evolucaoMensal ?? []

    const primeiroNome = usuario?.name?.split(' ')[0] ?? 'Servidor'

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            <WelcomeBanner />
            <ModeloBanner />
            <AvisosSection isAdmin={isAdmin} />

            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-1">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                        Olá, {primeiroNome} 👋
                    </h2>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                        Aqui está o panorama atual dos documentos do sistema.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button variant="outline" asChild className="h-9 text-xs font-semibold border-slate-200 rounded-xl">
                            <Link to="/admin/analytics">
                                <BarChart2 className="mr-1.5 h-3.5 w-3.5" /> Análise Detalhada
                            </Link>
                        </Button>
                    )}
                    <Can I="criar" a="Portaria" ability={ability}>
                        <Button asChild className="bg-primary hover:bg-primary/90 h-9 px-4 rounded-xl shadow-md shadow-primary/20 font-bold text-xs">
                            <Link to="/administrativo/portarias/novo">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Nova Portaria
                            </Link>
                        </Button>
                    </Can>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Em Elaboração"
                    value={stats.rascunhos}
                    description="Rascunhos e correções"
                    icon={<PenTool className="h-5 w-5 text-slate-500" />}
                    iconBg="bg-slate-100"
                />
                <KpiCard
                    title="Aguardando Revisão"
                    value={stats.aguardandoRevisao}
                    description="Em fila de análise"
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    iconBg="bg-amber-50 border border-amber-100"
                    valueCls={stats.aguardandoRevisao > 0 ? 'text-amber-600' : 'text-slate-900'}
                />
                <KpiCard
                    title="Publicadas no Mês"
                    value={stats.publicadasMes}
                    description={`Total: ${stats.publicadasTotal} publicadas`}
                    icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                    iconBg="bg-emerald-50 border border-emerald-100"
                    valueCls="text-emerald-600"
                />
                <KpiCard
                    title="Pendentes Assinatura"
                    value={stats.assinaturasPendentes}
                    description="Aguardando confirmação"
                    icon={<FileSignature className="h-5 w-5 text-primary" />}
                    iconBg="bg-primary/8 border border-primary/15"
                    valueCls={stats.assinaturasPendentes > 0 ? 'text-primary' : 'text-slate-900'}
                />
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 lg:grid-cols-7">
                {/* Área: evolução mensal */}
                <div className="col-span-7 lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-50">
                        <div>
                            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Produção por Mês
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Portarias criadas nos últimos meses</p>
                        </div>
                    </div>
                    <div className="p-5">
                        {areaData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1351b4" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#1351b4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: 'none',
                                            borderRadius: '10px',
                                            color: '#f8fafc',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '8px 12px',
                                        }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                                        itemStyle={{ color: '#7dd3fc' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="volume"
                                        name="Portarias"
                                        stroke="#1351b4"
                                        strokeWidth={2}
                                        fill="url(#colorVolume)"
                                        dot={{ fill: '#1351b4', r: 3, strokeWidth: 0 }}
                                        activeDot={{ r: 5, fill: '#1351b4', strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                                <TrendingUp className="h-8 w-8 text-slate-200" />
                                <p className="text-sm text-slate-400 font-medium">Dados insuficientes para o gráfico.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pizza: distribuição por status */}
                <div className="col-span-7 lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-slate-50">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Distribuição por Status
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Portarias por estágio atual</p>
                    </div>
                    <div className="p-5 flex items-center justify-center">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={`cell-${i}`} fill={entry.fill} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: 'none',
                                            borderRadius: '10px',
                                            color: '#f8fafc',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '8px 12px',
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 700 }}
                                        formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                                <Activity className="h-8 w-8 text-slate-200" />
                                <p className="text-sm text-slate-400 font-medium">Nenhum dado disponível.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feed de Atividade + Ações Rápidas */}
            <div className="grid gap-4 lg:grid-cols-7">
                {/* Feed */}
                <div className="col-span-7 lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <ScrollText className="h-4 w-4 text-primary" />
                                Feed de Atividades
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Ações recentes nos documentos do sistema.</p>
                        </div>
                    </div>
                    <ScrollArea className="h-[320px]">
                        {feed.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center px-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-sm text-slate-400 font-medium">Nenhuma atividade recente.</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {feed.map((ev, idx) => {
                                    const cfg = eventoConfig(ev.tipoEvento)
                                    return (
                                        <div
                                            key={ev.id}
                                            className="relative flex items-start gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors animate-in slide-in-from-left duration-200"
                                            style={{ animationDelay: `${idx * 25}ms` }}
                                        >
                                            {/* Linha vertical da timeline */}
                                            {idx < feed.length - 1 && (
                                                <div className="absolute left-[30px] top-10 bottom-0 w-px bg-slate-100" />
                                            )}
                                            <div className={`relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${cfg.cor}`}>
                                                {cfg.icon}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-xs font-bold text-slate-800 leading-tight">
                                                        {ev.autor?.name || 'Sistema'}
                                                    </p>
                                                    <time className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0">
                                                        {ev.createdAt
                                                            ? formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true, locale: ptBR })
                                                            : 'agora'}
                                                    </time>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                                    {ev.mensagem}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Ações Rápidas */}
                <div className="col-span-7 lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-slate-100">
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                            Ações Rápidas
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Acesse as áreas mais utilizadas.</p>
                    </div>
                    <div className="p-4 space-y-1.5">
                        <Can I="criar" a="Portaria" ability={ability}>
                            <QuickLink
                                to="/administrativo/portarias/novo"
                                label="Nova Portaria"
                                description="Criar um novo documento oficial"
                                icon={<PlusCircle className="h-4 w-4" />}
                                iconBg="bg-primary/8 text-primary"
                            />
                        </Can>
                        <Can I="ler" a="Portaria" ability={ability}>
                            <QuickLink
                                to="/administrativo/portarias"
                                label="Minhas Portarias"
                                description="Consultar e gerenciar documentos"
                                icon={<FileText className="h-4 w-4" />}
                                iconBg="bg-slate-100 text-slate-500"
                            />
                        </Can>
                        {isRevisor && (
                            <QuickLink
                                to="/revisao/fila"
                                label="Fila de Revisão"
                                description={`${stats.aguardandoRevisao} documento${stats.aguardandoRevisao !== 1 ? 's' : ''} aguardando`}
                                icon={<ClipboardList className="h-4 w-4" />}
                                iconBg="bg-amber-50 text-amber-600"
                                badge={stats.aguardandoRevisao > 0 ? stats.aguardandoRevisao : undefined}
                                badgeCls="bg-amber-500"
                            />
                        )}
                        <Can I="ler" a="Portaria" ability={ability}>
                            <QuickLink
                                to="/diario-oficial"
                                label="Diário Oficial"
                                description="Documentos publicados oficialmente"
                                icon={<Newspaper className="h-4 w-4" />}
                                iconBg="bg-emerald-50 text-emerald-600"
                            />
                        </Can>
                        <Can I="ler" a="Portaria" ability={ability}>
                            <QuickLink
                                to="/acervo"
                                label="Portal de Publicações"
                                description="Acervo público de portarias"
                                icon={<Building2 className="h-4 w-4" />}
                                iconBg="bg-slate-100 text-slate-500"
                            />
                        </Can>
                        {isAdmin && (
                            <QuickLink
                                to="/admin/analytics"
                                label="Painel Analytics"
                                description="Métricas detalhadas do sistema"
                                icon={<BarChart2 className="h-4 w-4" />}
                                iconBg="bg-violet-50 text-violet-600"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function QuickLink({ to, label, description, icon, iconBg, badge, badgeCls }: {
    to: string
    label: string
    description: string
    icon: React.ReactNode
    iconBg: string
    badge?: number
    badgeCls?: string
}) {
    return (
        <Link
            to={to as any}
            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
        >
            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${iconBg}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors leading-tight">
                    {label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">{description}</p>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className={`shrink-0 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${badgeCls ?? 'bg-primary'}`}>
                    {badge}
                </span>
            )}
            <ChevronRight className="shrink-0 h-3.5 w-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </Link>
    )
}
