import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useContext } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileText, CheckCircle2, AlertCircle,
    ChevronLeft, FileDown, PenTool, ShieldCheck, Download, AlertTriangle, Loader2,
    Clock, Eye, XCircle
} from 'lucide-react'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Portaria } from '@/types/domain'
import { STATUS_PORTARIA } from '@/types/domain'
import { AbilityContext } from '@/lib/ability'

export const Route = createFileRoute('/_sistema/administrativo/portarias/$id')({
    component: PortariaDetalhesPage,
})

function PortariaDetalhesPage() {
    const { id } = Route.useParams()
    const { toast } = useToast()
    const ability = useContext(AbilityContext)
    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const res = await portariaService.buscarPortaria(id)
            if (res.success) setPortaria(res.data)
            setLoading(false)
        }
        load()
    }, [id])

    const handleAprovar = async () => {
        setActionLoading(true)
        const res = await portariaService.aprovarPortaria(id)
        setActionLoading(false)
        if (res.success) {
            setPortaria(res.data)
            toast({ title: '✅ Portaria aprovada!', description: 'O documento foi enviado para assinatura.' })
        }
    }

    const handleRejeitar = async () => {
        setActionLoading(true)
        const res = await portariaService.rejeitarPortaria(id)
        setActionLoading(false)
        if (res.success) {
            setPortaria(res.data)
            toast({ title: 'Portaria rejeitada', description: 'O documento voltou para rascunho para correção.' })
        }
    }

    const handleAssinar = async () => {
        setActionLoading(true)
        const res = await portariaService.assinarPortaria(id)
        setActionLoading(false)
        if (res.success) {
            setPortaria(res.data)
            toast({ title: '🖊️ Assinado e Publicado!', description: `Portaria ${res.data.numeroOficial} publicada com sucesso.` })
        }
    }

    const handleDownloadPdf = () => {
        toast({ title: 'Simulando download...', description: 'Em produção, o PDF oficial seria baixado do storage.' })
    }

    if (loading) {
        return (
            <div className="space-y-6 max-w-6xl">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8"><Skeleton className="h-[700px] rounded-lg" /></div>
                    <div className="lg:col-span-4 space-y-4">
                        <Skeleton className="h-64 rounded-lg" />
                        <Skeleton className="h-48 rounded-lg" />
                    </div>
                </div>
            </div>
        )
    }

    if (!portaria) {
        return (
            <div className="flex flex-col items-center gap-4 py-24 text-slate-400">
                <AlertTriangle size={40} className="opacity-30" />
                <p className="font-semibold text-slate-600">Portaria não encontrada</p>
                <Button variant="outline" asChild><Link to="/administrativo/portarias">Voltar à lista</Link></Button>
            </div>
        )
    }

    const isPublicada = portaria.status === STATUS_PORTARIA.PUBLICADA
    const isPendente = portaria.status === STATUS_PORTARIA.PENDENTE
    const isAprovada = portaria.status === STATUS_PORTARIA.APROVADA
    const dadosLista = Object.entries(portaria.dadosFormulario || {})
    const canSign = ability.can('assinar', 'Portaria')
    const canApprove = ability.can('aprovar', 'Portaria')

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-6xl">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" asChild className="text-slate-500 hover:text-primary font-semibold -ml-2 h-9">
                        <Link to="/administrativo/portarias"><ChevronLeft className="mr-1 h-4 w-4" /> Lista</Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                Portaria {portaria.numeroOficial || '(sem número)'}
                            </h2>
                            <StatusBadge status={portaria.status} />
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                            Criado em {new Date(portaria.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isPublicada && (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-5 shadow-md shadow-emerald-200 text-sm"
                            onClick={handleDownloadPdf}
                        >
                            <Download size={16} className="mr-2" /> Baixar PDF Oficial
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Visualizador de Documento */}
                <div className="lg:col-span-8">
                    <Card className="border-slate-200 shadow-md overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-slate-400" />
                                <span className="text-sm font-bold text-slate-700">Visualização do Documento</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-400 border-slate-200">
                                {isPublicada ? 'PDF Oficial' : 'Pré-visualização'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-6 flex items-start justify-center bg-slate-100 min-h-[700px]">
                            {/* Mock documento A4 */}
                            <div className="bg-white w-full max-w-[600px] shadow-xl border border-slate-200 p-14 space-y-8 flex flex-col">
                                {/* Cabeçalho doc */}
                                <div className="flex flex-col items-center gap-3 text-center pb-6 border-b border-slate-100">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                        <ShieldCheck className="h-7 w-7 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado de Minas Gerais</p>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Prefeitura Municipal de Cataguases</p>
                                    </div>
                                </div>

                                {/* Corpo */}
                                <div className="text-center space-y-3">
                                    <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                        Portaria nº {portaria.numeroOficial ?? '___/____'}
                                    </h1>
                                    <p className="text-xs text-slate-600 italic text-justify font-medium leading-relaxed">
                                        Dispõe sobre {portaria.titulo.toLowerCase()} e dá outras providências.
                                    </p>
                                </div>

                                <div className="text-xs text-slate-700 leading-relaxed space-y-3 text-justify font-medium">
                                    <p>O PREFEITO MUNICIPAL DE CATAGUASES, no uso de suas atribuições legais e em conformidade com o Art. 68 da Lei Orgânica Municipal:</p>
                                    <p><strong>RESOLVE:</strong></p>
                                    <p><strong>Art. 1º</strong> {portaria.titulo} nos termos da legislação vigente.</p>
                                    {dadosLista.map(([chave, valor]) => (
                                        <p key={chave}><strong>{chave.replace(/_/g, ' ')}:</strong> {valor}</p>
                                    ))}
                                    <p><strong>Art. 2º</strong> Esta Portaria entra em vigor na data de sua publicação, revogando-se as disposições em contrário.</p>
                                </div>

                                {/* Assinatura */}
                                <div className="flex flex-col items-center gap-2 pt-10 border-t border-slate-100 mt-auto">
                                    <div className="w-44 h-px bg-slate-400" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase">Prefeito Municipal</p>
                                    <p className="text-[9px] text-slate-500 font-medium">
                                        Cataguases/MG, {new Date(portaria.updatedAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>

                                {/* Selo de Autenticidade (publicada) */}
                                {isPublicada && (
                                    <div className="pt-4 border-t border-emerald-100 bg-emerald-50 -mx-14 -mb-14 px-14 pb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded border border-emerald-200">
                                                <ShieldCheck size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Assinado Digitalmente</p>
                                                <p className="text-[8px] text-emerald-600 font-mono">{portaria.hashAssinatura ?? 'hash-pendente'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Informações do Registro */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                            <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">Informações</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <InfoRow label="Protocolo" value={`#${id.substring(0, 8).toUpperCase()}`} />
                            <InfoRow label="Modelo" value={portaria.modeloId} />
                            <InfoRow label="Secretaria" value={portaria.secretariaId} />
                            <InfoRow label="Registro" value={new Date(portaria.createdAt).toLocaleDateString('pt-BR')} />
                            {portaria.numeroOficial && (
                                <InfoRow label="Número Oficial" value={portaria.numeroOficial} />
                            )}
                        </CardContent>
                    </Card>

                    {/* Dados do Formulário */}
                    {dadosLista.length > 0 && (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                                <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">Dados Preenchidos</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 divide-y divide-slate-100">
                                {dadosLista.map(([chave, valor]) => (
                                    <div key={chave} className="px-4 py-2.5">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{chave.replace(/_/g, ' ')}</p>
                                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{valor}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Card de Ação — PENDENTE (Revisor aprova/rejeita) */}
                    {isPendente && canApprove && (
                        <Card className="border-amber-200 bg-amber-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Aguardando Revisão</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                    Revise o documento e aprove para envio à assinatura ou rejeite para correção.
                                </p>
                                <Button
                                    onClick={handleAprovar}
                                    disabled={actionLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-10 shadow-md shadow-primary/20"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Aprovar Documento
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full h-9 border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm">
                                            <XCircle className="mr-2 h-4 w-4" /> Solicitar Correção
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Rejeitar documento?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                O documento voltará ao status de Rascunho para o operador realizar as correções necessárias.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRejeitar} className="bg-red-600 hover:bg-red-700 text-white">
                                                Confirmar Rejeição
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}

                    {/* Card de Ação — APROVADA (Prefeito assina) */}
                    {isAprovada && canSign && (
                        <Card className="border-primary/30 bg-primary/5 shadow-lg ring-2 ring-primary/10">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <PenTool size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Assinatura Pendente</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    Este documento foi aprovado. Ao assinar, ele será convertido em PDF oficial e publicado no acervo.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-md shadow-primary/20">
                                            <PenTool className="mr-2 h-4 w-4" /> Assinar e Publicar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar assinatura digital?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Ao confirmar, o documento será publicado oficialmente com a sua assinatura digital e um hash único de autenticidade. Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleAssinar} disabled={actionLoading}>
                                                {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Confirmar e Publicar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}

                    {/* Arquivo */}
                    {portaria.pdfUrl && (
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors" onClick={handleDownloadPdf}>
                            <div className="p-2 bg-slate-100 text-slate-500 rounded">
                                <FileDown size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">portaria-{portaria.numeroOficial?.replace('/', '-') ?? id}.pdf</p>
                                <p className="text-[10px] text-slate-400 font-medium">PDF Oficial</p>
                            </div>
                            <Download size={14} className="text-slate-400 shrink-0" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 mt-0.5">{label}</span>
            <span className="text-xs font-semibold text-slate-700 text-right break-all">{value}</span>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case STATUS_PORTARIA.PUBLICADA:
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold"><CheckCircle2 size={11} className="mr-1" /> Publicada</Badge>
        case STATUS_PORTARIA.PENDENTE:
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold"><Clock size={11} className="mr-1" /> Aguardando Revisão</Badge>
        case STATUS_PORTARIA.APROVADA:
            return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold"><PenTool size={11} className="mr-1" /> Aguardando Assinatura</Badge>
        case STATUS_PORTARIA.RASCUNHO:
            return <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold"><FileText size={11} className="mr-1" /> Rascunho</Badge>
        default:
            return <Badge variant="outline" className="font-bold text-rose-600 border-rose-200">{status}</Badge>
    }
}
