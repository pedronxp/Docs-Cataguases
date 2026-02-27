import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useContext } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    FileText, CheckCircle2, AlertCircle, UserPlus,
    ChevronLeft, PenTool, ShieldCheck, Download, AlertTriangle, Loader2,
    Clock, Eye, XCircle, FileSignature, Send
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
import { useAuthStore } from '@/store/auth.store'
import { AssinaturaModal } from '@/components/portarias/AssinaturaModal'

export const Route = createFileRoute('/_sistema/administrativo/portarias/$id')({
    component: PortariaDetalhesPage,
})

function PortariaDetalhesPage() {
    const { id } = Route.useParams()
    const { toast } = useToast()
    const ability = useContext(AbilityContext)
    const { usuario } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [observacaoRejeicao, setObservacaoRejeicao] = useState('')
    const [isAssinaturaModalOpen, setIsAssinaturaModalOpen] = useState(false)

    useEffect(() => {
        loadPortaria()
    }, [id])

    async function loadPortaria() {
        setLoading(true)
        const res = await portariaService.buscarPortaria(id)
        if (res.success) setPortaria(res.data)
        setLoading(false)
    }

    const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
        setActionLoading(true)
        const res = await actionFn()
        setActionLoading(false)
        if (res.success) {
            setPortaria(res.data)
            toast({ title: 'Sucesso', description: successMsg })
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    const handleEnviarRevisao = () => handleAction(() => portariaService.enviarParaRevisao(id), 'Portaria enviada para revisão.')
    const handleAssumirRevisao = () => handleAction(() => portariaService.assumirRevisao(id), 'Você assumiu a revisão desta portaria.')
    const handleAprovar = () => handleAction(() => portariaService.aprovarPortaria(id), 'Portaria aprovada para assinatura.')

    const handleRejeitar = () => {
        if (!observacaoRejeicao.trim()) {
            toast({ title: 'Atenção', description: 'Informe o motivo da rejeição.', variant: 'destructive' })
            return
        }
        handleAction(() => portariaService.rejeitarPortaria(id, observacaoRejeicao), 'Portaria devolvida para correção.')
    }

    const handleDownloadPdf = async () => {
        setActionLoading(true)
        const res = await portariaService.gerarPdf(id)
        setActionLoading(false)

        if (res.success) {
            window.open(res.data.url, '_blank')
            toast({ title: 'Sucesso', description: 'PDF pronto para download.' })
        } else {
            toast({
                title: 'Erro ao gerar PDF',
                description: res.error,
                variant: 'destructive'
            })
        }
    }

    if (loading) return <PortariaSkeleton />

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
    const isProntoPublicacao = portaria.status === STATUS_PORTARIA.PRONTO_PUBLICACAO
    const isAguardandoAssinatura = portaria.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA
    const isRevisaoAberta = portaria.status === STATUS_PORTARIA.EM_REVISAO_ABERTA
    const isRevisaoAtribuida = portaria.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA
    const isRascunhoOuCorrecao = portaria.status === STATUS_PORTARIA.RASCUNHO || portaria.status === STATUS_PORTARIA.CORRECAO_NECESSARIA

    const dadosLista = Object.entries(portaria.formData || {})
    const canSign = ability.can('assinar', 'Portaria')
    const canApprove = ability.can('aprovar', 'Portaria')
    const canEdit = ability.can('criar', 'Portaria')
    const isMyReview = portaria.revisorAtualId === usuario?.id

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
                            <div className="bg-white w-full max-w-[600px] shadow-xl border border-slate-200 p-14 space-y-8 flex flex-col relative">
                                {/* D'Água de Rascunho se não for publicada */}
                                {!isPublicada && !isProntoPublicacao && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none overflow-hidden">
                                        <div className="text-8xl font-black rotate-45 tracking-widest text-slate-900">RASCUNHO</div>
                                    </div>
                                )}

                                {/* Cabeçalho doc */}
                                <div className="flex flex-col items-center gap-3 text-center pb-6 border-b border-slate-100 relative z-10">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                        <ShieldCheck className="h-7 w-7 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estado de Minas Gerais</p>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Prefeitura Municipal de Cataguases</p>
                                    </div>
                                </div>

                                {/* Corpo */}
                                <div className="text-center space-y-3 relative z-10">
                                    <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                        Portaria nº {portaria.numeroOficial ?? '___/____'}
                                    </h1>
                                    <p className="text-xs text-slate-600 italic text-justify font-medium leading-relaxed">
                                        Dispõe sobre {portaria.titulo.toLowerCase()} e dá outras providências.
                                    </p>
                                </div>

                                <div className="text-xs text-slate-700 leading-relaxed space-y-3 text-justify font-medium relative z-10">
                                    <p>O PREFEITO MUNICIPAL DE CATAGUASES, no uso de suas atribuições legais e em conformidade com o Art. 68 da Lei Orgânica Municipal:</p>
                                    <p><strong>RESOLVE:</strong></p>
                                    <p><strong>Art. 1º</strong> {portaria.titulo} nos termos da legislação vigente.</p>
                                    {dadosLista.map(([chave, valor]) => (
                                        <p key={chave}><strong>{chave.replace(/_/g, ' ')}:</strong> {valor}</p>
                                    ))}
                                    <p><strong>Art. 2º</strong> Esta Portaria entra em vigor na data de sua publicação, revogando-se as disposições em contrário.</p>
                                </div>

                                {/* Assinatura */}
                                <div className="flex flex-col items-center gap-2 pt-10 border-t border-slate-100 mt-auto relative z-10">
                                    <div className="w-44 h-px bg-slate-400" />
                                    <p className="text-[10px] font-black text-slate-900 uppercase">Prefeito Municipal</p>
                                    <p className="text-[9px] text-slate-500 font-medium">
                                        Cataguases/MG, {isPublicada && portaria.dataPublicacao ? new Date(portaria.dataPublicacao).toLocaleDateString('pt-BR') : '__/__/____'}
                                    </p>
                                </div>

                                {/* Selos de Autenticidade (publicada) */}
                                {(isPublicada || isProntoPublicacao) && portaria.assinaturaStatus === 'ASSINADA_DIGITAL' && (
                                    <div className="pt-4 border-t border-emerald-100 bg-emerald-50 -mx-14 -mb-14 px-14 pb-6 mt-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded border border-emerald-200">
                                                <ShieldCheck size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Assinado Digitalmente</p>
                                                <p className="text-[8px] text-emerald-600 font-mono">{portaria.hashIntegridade ?? 'hash-gerado'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(isPublicada || isProntoPublicacao) && portaria.assinaturaStatus === 'DISPENSADA_COM_JUSTIFICATIVA' && (
                                    <div className="pt-4 border-t border-amber-100 bg-amber-50 -mx-14 -mb-14 px-14 pb-6 mt-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded border border-amber-200">
                                                <AlertTriangle size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-amber-800 uppercase tracking-wider">Assinatura Excepcional - Dispensada</p>
                                                <p className="text-[8px] text-amber-600 font-mono">Consulte a timeline para justificativa</p>
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

                    {/* ACTIONS: RASCUNHO -> ENVIAR PARA REVISÃO */}
                    {isRascunhoOuCorrecao && canEdit && (
                        <Card className="border-slate-300 bg-slate-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <FileText size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Rascunho Salvo</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    Quando terminar de elaborar, envie o documento para revisão do Secretário/Gestor.
                                </p>
                                {portaria.status === STATUS_PORTARIA.CORRECAO_NECESSARIA && (
                                    <div className="bg-red-50 p-3 rounded text-red-700 text-xs font-medium border border-red-100 mb-2">
                                        Atenção: A portaria foi devolvida anteriormente. Corrija nos dados e reenvie.
                                    </div>
                                )}
                                <Button
                                    onClick={handleEnviarRevisao}
                                    disabled={actionLoading}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold h-10 shadow-md"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Enviar para Revisão
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTIONS: EM_REVISAO_ABERTA -> ASSUMIR REVISÃO */}
                    {isRevisaoAberta && canApprove && (
                        <Card className="border-amber-200 bg-amber-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Revisão Pendente</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                    Este documento aguarda análise. Assuma a revisão para bloquear edições de parceiros.
                                </p>
                                <Button
                                    onClick={handleAssumirRevisao}
                                    disabled={actionLoading}
                                    variant="outline"
                                    className="w-full h-10 border-amber-300 text-amber-700 hover:bg-amber-100 font-bold bg-white"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Assumir Revisão
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTIONS: EM_REVISAO_ATRIBUIDA -> APROVAR/REJEITAR */}
                    {isRevisaoAtribuida && canApprove && isMyReview && (
                        <Card className="border-blue-200 bg-blue-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Eye size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Em Minha Revisão</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                    Revise o documento. Se estiver correto, aprove para coletar a assinatura do responsável.
                                </p>
                                <Button
                                    onClick={handleAprovar}
                                    disabled={actionLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-md"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    Aprovar Documento
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="w-full h-9 border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm">
                                            <XCircle className="mr-2 h-4 w-4" /> Devolver para Correção
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Devolver documento para o Operador</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                O documento voltará ao status de Rascunho. O autor será notificado de que deve realizar as edições solicitadas.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="py-2">
                                            <Textarea
                                                placeholder="Descreva o que está errado e o que deve ser corrigido..."
                                                value={observacaoRejeicao}
                                                onChange={e => setObservacaoRejeicao(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRejeitar} className="bg-red-600 hover:bg-red-700 text-white">
                                                Confirmar Devolução
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    )}

                    {/* Alerta se está atribuido pra outro revisor */}
                    {isRevisaoAtribuida && canApprove && !isMyReview && (
                        <div className="bg-slate-100 border border-slate-200 rounded p-3 text-xs text-slate-500 font-medium text-center">
                            Portaria sob revisão de outro usuário.
                        </div>
                    )}

                    {/* ACTIONS: AGUARDANDO_ASSINATURA -> ASSINAR */}
                    {isAguardandoAssinatura && canSign && (
                        <Card className="border-primary/30 bg-primary/5 shadow-lg ring-2 ring-primary/10">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-primary">
                                    <PenTool size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Assinatura Pendente</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    O documento foi aprovado. Proceda com a assinatura para encaminhá-lo ao Diário Oficial.
                                </p>
                                <Button
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-md shadow-primary/20"
                                    onClick={() => setIsAssinaturaModalOpen(true)}
                                >
                                    <FileSignature className="mr-2 h-4 w-4" /> Assinar Documento
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {isProntoPublicacao && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-sm text-emerald-800 font-medium text-center">
                            Assinado com sucesso! Aguardando o Jornalista emitir publicá-la e numerá-la.
                        </div>
                    )}
                </div>
            </div>

            <AssinaturaModal
                isOpen={isAssinaturaModalOpen}
                onOpenChange={setIsAssinaturaModalOpen}
                portariaId={id}
                onSigned={loadPortaria}
            />
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    if (!value) return null
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
        case STATUS_PORTARIA.PRONTO_PUBLICACAO:
            return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 font-bold"><CheckCircle2 size={11} className="mr-1" /> Aguardando Diário Oficial</Badge>
        case STATUS_PORTARIA.EM_REVISAO_ABERTA:
        case STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA:
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold"><Clock size={11} className="mr-1" /> Em Revisão</Badge>
        case STATUS_PORTARIA.AGUARDANDO_ASSINATURA:
            return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold"><PenTool size={11} className="mr-1" /> Aguardando Assinatura</Badge>
        case STATUS_PORTARIA.RASCUNHO:
            return <Badge variant="outline" className="text-slate-500 border-slate-300 font-bold"><FileText size={11} className="mr-1" /> Rascunho</Badge>
        case STATUS_PORTARIA.CORRECAO_NECESSARIA:
            return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold"><AlertCircle size={11} className="mr-1" /> Correção Necessária</Badge>
        default:
            return <Badge variant="outline" className="font-bold text-slate-600 border-slate-200">{status}</Badge>
    }
}

function PortariaSkeleton() {
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
