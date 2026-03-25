import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useContext } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    FileText, CheckCircle2, AlertCircle, UserPlus,
    ChevronLeft, PenTool, ShieldCheck, Download, AlertTriangle, Loader2,
    Clock, Eye, XCircle, FileSignature, Send, User, Building2,
    FolderOpen, Hash, CalendarDays, RefreshCw, Pencil, ScrollText, Lock, RotateCcw,
    TrendingUp, CheckCircle, Circle
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
import { HistoricoDocumentoModal } from '@/components/portarias/HistoricoDocumentoModal'

// ── Helpers para preview inline ──────────────────────────────────────────────

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

/**
 * Substitui variáveis {{CHAVE}} no HTML do modelo.
 * 1. Aplica os valores de formData (variáveis do usuário)
 * 2. Resolve variáveis SYS_* disponíveis no objeto da portaria (data, secretaria, número…)
 * 3. Aplica variáveis de sistema vindas do backend (sysVarsPreview: prefeito, secretários, etc.)
 * 4. Variáveis não resolvidas aparecem como marcadores cinzas visíveis — nunca em branco.
 */
function substituirVariaveis(html: string, formData: Record<string, any>, portaria?: any): string {
    let resultado = html

    // 1. Variáveis do usuário (formData)
    for (const [key, value] of Object.entries(formData)) {
        resultado = resultado.split(`{{${key}}}`).join(String(value ?? ''))
    }

    // 2. Variáveis de sistema derivadas do objeto portaria (data atual, secretaria, setor…)
    if (portaria) {
        const hoje = new Date()
        const sysVars: Record<string, string> = {
            SYS_DATA: hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            SYS_DATA_EXTENSO: `${hoje.getDate()}º de ${MESES_PT[hoje.getMonth()]} de ${hoje.getFullYear()}`,
            SYS_MES_ANO: `${MESES_PT[hoje.getMonth()]} de ${hoje.getFullYear()}`,
            SYS_NUMERO: portaria.numeroOficial || '______',
            SYS_CIDADE: 'Cataguases',
            SYS_SECRETARIA: portaria.secretaria?.nome || '',
            SYS_SECRETARIA_SIGLA: portaria.secretaria?.sigla || '',
            SYS_SETOR: (portaria as any).setor?.nome || '',
            SYS_SETOR_SIGLA: (portaria as any).setor?.sigla || '',
            SYS_AUTOR: (portaria as any).criadoPor?.name || '',
        }
        for (const [key, value] of Object.entries(sysVars)) {
            resultado = resultado.split(`{{${key}}}`).join(value)
        }
    }

    // 3. Variáveis de sistema vindas do backend (prefeito, secretários, etc.)
    const sysVarsPreview = (portaria as any)?.sysVarsPreview as Record<string, string> | undefined
    if (sysVarsPreview) {
        for (const [key, value] of Object.entries(sysVarsPreview)) {
            resultado = resultado.split(`{{${key}}}`).join(String(value ?? ''))
        }
    }

    // 4. Demais variáveis não resolvidas → marcador cinza visível (não remove)
    resultado = resultado.replace(/\{\{([^}]+)\}\}/g, (_, tag) =>
        `<span style="background:#f1f5f9;color:#94a3b8;border:1px dashed #cbd5e1;padding:1px 6px;border-radius:3px;font-size:0.8em;font-style:italic;">[${tag}]</span>`
    )

    return resultado
}

/** Retorna o nome do nomeado/servidor a partir do formData */
function getNomeado(formData: Record<string, any>): string | null {
    const CHAVES_PESSOA = ['NOMEADO', 'NOME', 'SERVIDOR', 'DESIGNADO', 'EXONERADO', 'CONTRATADO', 'INTERESSADO']
    return (
        CHAVES_PESSOA
            .map(k => formData[k] || formData[k.toLowerCase()])
            .find(v => v && String(v).trim() !== '') || null
    )
}

/** Monta o nome do arquivo para download do rascunho */
function montarNomeArquivoRascunho(modeloNome: string, formData: Record<string, any>): string {
    const nomeado = getNomeado(formData)
    const sufixo = nomeado ? ` - ${String(nomeado).trim()}` : ''
    return `Rascunho - ${modeloNome}${sufixo}.docx`.replace(/[<>:"/\\|?*]/g, '').trim()
}

export const Route = createFileRoute('/_sistema/administrativo/portarias/$id')({
    component: PortariaDetalhesPage,
})

function PortariaDetalhesPage() {
    const { id } = Route.useParams()
    const navigate = useNavigate()
    const { toast } = useToast()
    const ability = useContext(AbilityContext)
    const { usuario } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [observacaoRejeicao, setObservacaoRejeicao] = useState('')
    const [justificativaRollback, setJustificativaRollback] = useState('')
    const [isAssinaturaModalOpen, setIsAssinaturaModalOpen] = useState(false)
    const [isHistoricoOpen, setIsHistoricoOpen] = useState(false)
    const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null)
    // 'pdf' = iframe PDF direto | 'office' = DOCX via Office Online | null = HTML genérico
    const [viewerMode, setViewerMode] = useState<'pdf' | 'office' | null>(null)
    const [pdfLoadError, setPdfLoadError] = useState(false)

    useEffect(() => {
        loadPortaria()
    }, [id])

    // Polling quando o documento estiver em processamento assíncrono
    useEffect(() => {
        if (portaria?.status === STATUS_PORTARIA.PROCESSANDO) {
            const interval = setInterval(async () => {
                const res = await portariaService.buscarPortaria(id)
                if (res.success && res.data) {
                    if (res.data.status !== STATUS_PORTARIA.PROCESSANDO) {
                        // O status mudou (sucesso ou falha), recarrega a tela toda
                        loadPortaria()
                    }
                }
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [portaria?.status, id])

    async function loadPortaria() {
        setLoading(true)
        setPdfViewerUrl(null)
        setViewerMode(null)
        setPdfLoadError(false)
        const res = await portariaService.buscarPortaria(id)
        if (res.success) {
            setPortaria(res.data)
            const p = res.data as any
            if (p.pdfUrl) {
                // Usa URL assinada do Supabase retornada pelo backend (evita CORS/proxy/auth)
                const pdfUrl = p.pdfSignedUrl || `/api/portarias/${p.id}/stream?type=pdf`
                setPdfViewerUrl(pdfUrl)
                setViewerMode('pdf')
            } else if (p.docxRascunhoUrl) {
                // Tem DOCX mas não PDF → marca modo 'office' para mostrar card de download
                setViewerMode('office')
            } else if (p.status === 'RASCUNHO' && p.formData && Object.keys(p.formData as object).length > 0) {
                // RASCUNHO com formData preenchido → gera DOCX automaticamente em background
                portariaService.downloadDocx(p.id, false).then(r => {
                    if (r.success) {
                        setViewerMode('office')
                        // Recarrega portaria para mostrar docxRascunhoUrl atualizado
                        portariaService.buscarPortaria(p.id).then(r2 => {
                            if (r2.success) setPortaria(r2.data)
                        })
                    }
                })
            }
        }
        setLoading(false)
    }

    const handleAction = async (actionFn: () => Promise<any>, successMsg: string, redirectToList = false) => {
        setActionLoading(true)
        const res = await actionFn()
        if (res.success) {
            toast({ title: 'Sucesso', description: successMsg })
            if (redirectToList) {
                navigate({ to: '/administrativo/portarias' })
            } else {
                await loadPortaria()
            }
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setActionLoading(false)
    }

    const handleAssumirRevisao = () => handleAction(() => portariaService.solicitarRevisao(id), 'Revisão assumida. O documento foi bloqueado para edição.')
    const handleAprovar = () => handleAction(() => portariaService.aprovarPortaria(id), 'Portaria aprovada para assinatura.')

    const handleRejeitar = () => {
        if (!observacaoRejeicao.trim()) {
            toast({ title: 'Atenção', description: 'Informe o motivo da rejeição.', variant: 'destructive' })
            return
        }
        handleAction(() => portariaService.rejeitarPortaria(id, observacaoRejeicao), 'Portaria devolvida para correção.')
    }

    const handleDownloadPdf = async (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation()
            e.preventDefault()
        }
        try {
            // Usa URL assinada do Supabase (evita problemas de proxy/auth)
            const p = portaria as any
            const pdfUrl = p?.pdfSignedUrl || `/api/portarias/${id}/stream?type=pdf`
            const blob = await fetch(pdfUrl).then(r => r.blob())
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `portaria-${(portaria as any)?.numeroOficial?.replace('/', '-') || id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(blobUrl)
            toast({ title: 'Download iniciado', description: 'O PDF está sendo baixado.' })
        } catch {
            toast({ title: 'Erro ao baixar PDF', description: 'Tente novamente.', variant: 'destructive' })
        }
    }

    const handleRollbackRascunho = (justificativa?: string) =>
        handleAction(
            () => portariaService.rollbackRascunho(id, justificativa),
            'Documento revertido para rascunho. Você pode editá-lo livremente.'
        )

    const handleEnviarParaRevisao = async () => {
        setActionLoading(true)
        const res = await portariaService.submeterPortaria({ portariaId: id })
        if (res.success) {
            const rawRes = res as any
            if (rawRes.warning) {
                toast({
                    title: 'Enviado com aviso',
                    description: rawRes.warning,
                    variant: 'destructive'
                })
            } else {
                toast({ title: 'Enviado para revisão!', description: 'A portaria foi para a fila de revisão.' })
            }
            await loadPortaria()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setActionLoading(false)
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


    const canSign = ability.can('assinar', 'Portaria')
    const canApprove = ability.can('aprovar', 'Portaria')
    const canEdit = ability.can('criar', 'Portaria')
    const isMyReview = portaria.revisorAtualId === usuario?.id

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-6xl w-full">
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
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => setIsHistoricoOpen(true)}
                    >
                        <ScrollText className="mr-1.5 h-3.5 w-3.5" /> Ver Histórico
                    </Button>
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
                                {isPublicada ? 'PDF Oficial' : viewerMode === 'office' ? 'Rascunho Word' : viewerMode === 'pdf' ? 'PDF' : 'Sem documento'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0 bg-slate-100 min-h-[300px] sm:min-h-[500px] lg:min-h-[700px] flex flex-col">
                            {/* PDF: renderiza via proxy same-origin no iframe */}
                            {viewerMode === 'pdf' && pdfViewerUrl ? (
                                pdfLoadError ? (
                                    /* Fallback quando o PDF não carrega no iframe */
                                    <div className="flex flex-col items-center justify-center gap-5 min-h-[300px] sm:min-h-[500px] lg:min-h-[700px] text-center px-8">
                                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                            <AlertTriangle className="h-8 w-8 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Não foi possível exibir o PDF no navegador</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                                                Isso pode ocorrer por bloqueio do navegador ou arquivo corrompido.
                                                Tente baixar diretamente para visualizar.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 flex-wrap justify-center">
                                            <Button
                                                variant="outline"
                                                className="gap-2 font-semibold border-slate-200"
                                                onClick={handleDownloadPdf}
                                            >
                                                <Download size={14} /> Baixar PDF
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
                                                onClick={async () => {
                                                    setPdfLoadError(false)
                                                    // Recarrega a portaria para obter nova URL assinada
                                                    const refreshed = await portariaService.buscarPortaria(id)
                                                    if (refreshed.success) {
                                                        const rp = refreshed.data as any
                                                        setPdfViewerUrl(rp.pdfSignedUrl || `/api/portarias/${id}/stream?type=pdf&t=${Date.now()}`)
                                                    }
                                                }}
                                            >
                                                <RefreshCw size={14} /> Tentar novamente
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <iframe
                                        src={pdfViewerUrl}
                                        className="w-full flex-1 min-h-[300px] sm:min-h-[500px] lg:min-h-[700px] border-0"
                                        title="Visualização do Documento PDF"
                                        allow="fullscreen"
                                        onError={() => setPdfLoadError(true)}
                                        onLoad={(e) => {
                                            // Detecta se o iframe carregou um JSON de erro (não um PDF real)
                                            try {
                                                const doc = (e.target as HTMLIFrameElement).contentDocument
                                                if (doc && doc.contentType && !doc.contentType.includes('pdf')) {
                                                    setPdfLoadError(true)
                                                }
                                            } catch { /* cross-origin — ignora */ }
                                        }}
                                    />
                                )
                            ) : viewerMode === 'office' ? (
                                /* DOCX disponível: mostra preview HTML inline quando possível */
                                (() => {
                                    const conteudoHtml = (portaria as any).modelo?.conteudoHtml as string | undefined
                                    const formDataPortaria = ((portaria as any).formData || {}) as Record<string, any>
                                    const modeloNome = (portaria as any).modelo?.nome || 'Documento'
                                    const fileName = montarNomeArquivoRascunho(modeloNome, formDataPortaria)

                                    // Rascunho: sempre regenera o DOCX antes de baixar
                                    // (garante formData e template atuais — ?regenerar=true)
                                    // Usa a URL assinada do Supabase retornada pelo backend,
                                    // evitando problemas de CORS/proxy/auth com URLs relativas.
                                    const handleDownloadDocx = async (e?: React.MouseEvent) => {
                                        if (e) {
                                            e.stopPropagation()
                                            e.preventDefault()
                                        }
                                        try {
                                            const res = await portariaService.downloadDocx(id, true)
                                            if (!res.success) {
                                                toast({ title: 'Erro ao gerar DOCX', description: (res as any).error, variant: 'destructive' })
                                                return
                                            }
                                            // downloadDocx retorna { url: signedUrl } — URL assinada do Supabase Storage
                                            const signedUrl = (res as any).value?.url || (res as any).data?.url
                                            if (!signedUrl) {
                                                toast({ title: 'Erro', description: 'URL do documento não retornada pelo servidor.', variant: 'destructive' })
                                                return
                                            }
                                            // Faz fetch da URL assinada e força download com nome amigável
                                            const blob = await fetch(signedUrl).then(r => r.blob())
                                            const blobUrl = URL.createObjectURL(blob)
                                            const link = document.createElement('a')
                                            link.href = blobUrl
                                            link.download = fileName
                                            document.body.appendChild(link)
                                            link.click()
                                            document.body.removeChild(link)
                                            URL.revokeObjectURL(blobUrl)
                                        } catch {
                                            toast({ title: 'Erro ao baixar DOCX', description: 'Tente novamente.', variant: 'destructive' })
                                        }
                                    }

                                    if (conteudoHtml) {
                                        const htmlPreenchido = substituirVariaveis(conteudoHtml, formDataPortaria, portaria)
                                        return (
                                            <div className="flex flex-col h-full min-h-[700px]">
                                                {/* Barra superior com info + botão download */}
                                                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border-b border-blue-100 shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={14} className="text-blue-500" />
                                                        <span className="text-xs font-semibold text-blue-700">Pré-visualização do Rascunho</span>
                                                        <span className="text-[10px] text-blue-400 font-medium hidden sm:inline">— as variáveis do sistema serão aplicadas na versão final</span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 h-7 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
                                                        onClick={handleDownloadDocx}
                                                    >
                                                        <Download size={12} /> Baixar .docx
                                                    </Button>
                                                </div>
                                                {/* Conteúdo HTML do documento */}
                                                <div className="flex-1 overflow-auto bg-white">
                                                    <div
                                                        className="max-w-[800px] mx-auto my-8 px-12 py-10 shadow-sm border border-slate-100"
                                                        style={{ fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: '1.8', fontSize: '14px', color: '#1a1a1a', minHeight: '600px' }}
                                                        dangerouslySetInnerHTML={{ __html: htmlPreenchido }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    }

                                    // Fallback: sem conteúdo HTML → só botão de download
                                    return (
                                        <div className="flex flex-col items-center justify-center gap-5 min-h-[300px] sm:min-h-[500px] lg:min-h-[700px] text-center px-8">
                                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                                                <FileText className="h-8 w-8 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Rascunho Word disponível</p>
                                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                                    O documento está disponível para download.
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="gap-2 font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
                                                onClick={handleDownloadDocx}
                                            >
                                                <Download size={14} /> Baixar Rascunho (.docx)
                                            </Button>
                                        </div>
                                    )
                                })()
                            ) : (
                            /* Nenhum documento gerado */
                            <div className="flex flex-col items-center justify-center gap-4 min-h-[300px] sm:min-h-[500px] lg:min-h-[700px] text-center px-8">
                                {(isRevisaoAberta || isRevisaoAtribuida) ? (
                                    /* Em revisão mas sem arquivo — falha na geração */
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Documento não foi gerado</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                                                A portaria foi submetida mas houve uma falha na geração do arquivo — 
                                                possivelmente o modelo não possui um template configurado.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold"
                                            onClick={async () => {
                                                const res = await portariaService.gerarPdf(id)
                                                if (!res.success) {
                                                    toast({ title: 'Falha na regeneração', description: res.error || 'O modelo pode não ter template configurado.', variant: 'destructive' })
                                                } else if (res.data?.url) {
                                                    setPdfViewerUrl(`/api/portarias/${id}/stream?type=pdf`)
                                                    setViewerMode('pdf')
                                                    toast({ title: 'Documento regenerado', description: 'O arquivo foi gerado com sucesso.' })
                                                    loadPortaria()
                                                }
                                            }}
                                        >
                                            <RefreshCw size={14} /> Tentar Regenerar Documento
                                        </Button>
                                    </>
                                ) : (
                                    /* Rascunho — usuário precisa elaborar */
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                                            <FileText className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-600">Documento ainda não gerado</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                                Clique em "Elaborar Documento" para preencher os dados e gerar o rascunho.
                                            </p>
                                        </div>
                                        {(isPublicada || isProntoPublicacao) && portaria.assinaturaStatus === 'ASSINADA_DIGITAL' && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <ShieldCheck size={14} className="text-emerald-600" />
                                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Assinado Digitalmente</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-4">

                    {/* ── Resumo do Documento ─────────────────────────────── */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo do Documento</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-slate-100">

                            {/* Título */}
                            <div className="px-4 py-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Título</p>
                                <p className="text-sm font-bold text-slate-800 leading-snug">{portaria.titulo}</p>
                            </div>

                            {/* Grid 2 colunas: Secretaria + Setor */}
                            <div className="grid grid-cols-2 divide-x divide-slate-100">
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Building2 className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Secretaria</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 leading-snug">
                                        {portaria.secretaria?.sigla || portaria.secretaria?.nome || '—'}
                                    </p>
                                </div>
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <FolderOpen className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Setor</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 leading-snug">
                                        {(portaria as any).setor?.nome || '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Autor + Revisor */}
                            <div className="grid grid-cols-2 divide-x divide-slate-100">
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <User className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Autor</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 leading-snug">
                                        {(portaria as any).criadoPor?.name || portaria.autor?.name || '—'}
                                    </p>
                                </div>
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Eye className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Revisor</p>
                                    </div>
                                    <p className={`text-xs font-semibold leading-snug ${portaria.revisorAtual?.name ? 'text-amber-700' : 'text-slate-400 italic'}`}>
                                        {portaria.revisorAtual?.name || 'Não atribuído'}
                                    </p>
                                </div>
                            </div>

                            {/* Modelo */}
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FileText className="h-3 w-3 text-slate-400" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Modelo</p>
                                </div>
                                <p className="text-xs font-semibold text-slate-700">
                                    {(portaria as any).modelo?.nome || '—'}
                                </p>
                            </div>

                            {/* Número oficial — só se tiver */}
                            {portaria.numeroOficial && (
                                <div className="px-4 py-3 bg-primary/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Hash className="h-3 w-3 text-primary" />
                                        <p className="text-[10px] font-black text-primary/80 uppercase tracking-wider">Número Oficial</p>
                                    </div>
                                    <p className="text-sm font-black text-primary">{portaria.numeroOficial}</p>
                                </div>
                            )}

                            {/* Datas */}
                            <div className="grid grid-cols-2 divide-x divide-slate-100">
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <CalendarDays className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Criado em</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">
                                        {new Date(portaria.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </p>
                                </div>
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <RefreshCw className="h-3 w-3 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Atualizado</p>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700">
                                        {new Date(portaria.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Hash de integridade — só se assinado */}
                            {portaria.hashIntegridade && (
                                <div className="px-4 py-3 bg-emerald-50/60">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Hash de Integridade</p>
                                    </div>
                                    <p className="text-[9px] font-mono text-emerald-700 break-all leading-relaxed">{portaria.hashIntegridade}</p>
                                </div>
                            )}

                            {/* Progressão de Status */}
                            <StatusProgressTracker status={portaria.status} />

                            {/* SLA Indicator */}
                            <SlaIndicator status={portaria.status} updatedAt={portaria.updatedAt} />

                            {/* Protocolo interno */}
                            <div className="px-4 py-2 bg-slate-50">
                                <p className="text-[9px] text-slate-400 font-mono">
                                    ID: {id.toUpperCase()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ACTIONS: RASCUNHO → elaborar direto no sistema */}
                    {portaria.status === STATUS_PORTARIA.RASCUNHO && canEdit && (
                        <Card className="border-slate-300 bg-slate-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Pencil size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Documento em Elaboração</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    Revise os dados abaixo e quando estiver tudo certo, envie para revisão. Você também pode editar os dados antes de enviar.
                                </p>
                                {/* Botão primário: Enviar para Revisão */}
                                <Button
                                    onClick={handleEnviarParaRevisao}
                                    disabled={actionLoading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-md shadow-primary/20"
                                >
                                    {actionLoading
                                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                                        : <><Send className="mr-2 h-4 w-4" /> Enviar para Revisão</>
                                    }
                                </Button>
                                {/* Botão secundário: Editar Dados */}
                                <Button
                                    asChild
                                    variant="outline"
                                    className="w-full h-9 font-semibold border-slate-300 text-slate-600 hover:bg-slate-100 text-sm"
                                >
                                    <Link to="/administrativo/portarias/revisao/$id" params={{ id }}>
                                        <PenTool className="mr-2 h-4 w-4" /> Editar Dados
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTIONS: PROCESSANDO → aguardando geração assíncrona */}
                    {portaria.status === STATUS_PORTARIA.PROCESSANDO && (
                        <Card className="border-blue-300 bg-blue-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Loader2 size={16} className="animate-spin" />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Processando Documento</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                    O PDF oficial está sendo gerado em segundo plano. Por favor, aguarde alguns instantes. Esta página será atualizada automaticamente.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTIONS: CORRECAO_NECESSARIA → corrigir direto no sistema */}
                    {portaria.status === STATUS_PORTARIA.CORRECAO_NECESSARIA && canEdit && (
                        <Card className="border-rose-300 bg-rose-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-rose-700">
                                    <AlertCircle size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Correção Necessária</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-rose-700 font-medium leading-relaxed">
                                    O revisor devolveu este documento com observações. Edite os campos diretamente no sistema — o documento será regenerado automaticamente.
                                </p>
                                <Button
                                    asChild
                                    className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold h-10 shadow-md"
                                >
                                    <Link to="/administrativo/portarias/revisao/$id" params={{ id }}>
                                        <PenTool className="mr-2 h-4 w-4" /> Corrigir e Reenviar
                                    </Link>
                                </Button>

                                {/* Rollback para rascunho */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full h-9 border-rose-300 text-rose-600 hover:bg-rose-100 font-semibold text-xs bg-white"
                                        >
                                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Voltar para Rascunho
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Reverter para Rascunho?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                O documento voltará ao status <strong>Rascunho</strong>, removendo as marcações de correção pendente. Use esta opção se quiser reiniciar a edição do zero. Esta ação pode ser desfeita reenviando para revisão novamente.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="py-2">
                                            <Textarea
                                                placeholder="Motivo do retorno (opcional)..."
                                                value={justificativaRollback}
                                                onChange={e => setJustificativaRollback(e.target.value)}
                                                rows={2}
                                                className="text-xs"
                                            />
                                        </div>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleRollbackRascunho(justificativaRollback || undefined)}
                                                className="bg-slate-700 hover:bg-slate-800 text-white"
                                            >
                                                Confirmar Reversão
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
                                    Este documento aguarda análise. Solicite a revisão para ser atribuído como revisor e bloquear edições.
                                </p>
                                <Button
                                    onClick={handleAssumirRevisao}
                                    disabled={actionLoading}
                                    variant="outline"
                                    className="w-full h-10 border-amber-300 text-amber-700 hover:bg-amber-100 font-bold bg-white"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Solicitar Revisão
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

                    {/* Alerta para outro revisor (canApprove mas não é minha revisão) */}
                    {isRevisaoAtribuida && canApprove && !isMyReview && (
                        <div className="bg-slate-100 border border-slate-200 rounded p-3 text-xs text-slate-500 font-medium text-center">
                            Portaria sob revisão de outro revisor.
                        </div>
                    )}

                    {/* Aviso de bloqueio para o AUTOR do documento */}
                    {isRevisaoAtribuida && !canApprove && (
                        <Card className="border-blue-100 bg-blue-50/60 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Lock size={14} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">Documento em revisão</p>
                                        <p className="text-xs text-blue-600 font-medium mt-1 leading-relaxed">
                                            Este documento está sendo revisado por{' '}
                                            <span className="font-bold">
                                                {(portaria as any).revisorAtual?.name || 'um revisor'}
                                            </span>
                                            . A edição está bloqueada até o revisor concluir a análise.
                                        </p>
                                        <p className="text-[10px] text-blue-500 font-medium mt-2">
                                            Você será notificado quando a revisão for concluída.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* INFO: EM_REVISAO_ABERTA — autor vê mensagem de aguardando */}
                    {isRevisaoAberta && !canApprove && (
                        <Card className="border-amber-100 bg-amber-50/60 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock size={14} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-800">Aguardando Revisor</p>
                                        <p className="text-xs text-amber-600 font-medium mt-1 leading-relaxed">
                                            Seu documento foi enviado para revisão e está na fila esperando um revisor assumir a análise.
                                            Você será notificado quando a revisão iniciar.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* INFO: AGUARDANDO_ASSINATURA — não pode assinar → mensagem de aguardando */}
                    {isAguardandoAssinatura && !canSign && (
                        <Card className="border-primary/10 bg-primary/5 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <PenTool size={14} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Aguardando Assinatura</p>
                                        <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                                            O documento foi aprovado na revisão e aguarda a assinatura do responsável (Secretário ou Prefeito).
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTIONS: FALHA_PROCESSAMENTO → RETRY */}
                    {portaria.status === STATUS_PORTARIA.FALHA_PROCESSAMENTO && (
                        <Card className="border-red-300 bg-red-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-red-700">
                                    <AlertTriangle size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Falha no Processamento</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <p className="text-xs text-red-700 font-medium leading-relaxed">
                                    Ocorreu um erro ao processar o documento. Tente reprocessar para resolver o problema.
                                </p>
                                <Button
                                    onClick={() => handleAction(() => portariaService.tentarNovamente(id), 'Reprocessamento iniciado.')}
                                    disabled={actionLoading}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10 shadow-md"
                                >
                                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Tentar Novamente
                                </Button>
                            </CardContent>
                        </Card>
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
                        <Card className="border-emerald-300 bg-emerald-50 shadow-md">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <CheckCircle2 size={16} />
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">Pronto para Publicação</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {/* Badge de assinatura */}
                                <AssinaturaStatusInfo
                                    status={portaria.assinaturaStatus}
                                    justificativa={portaria.assinaturaJustificativa}
                                    comprovanteUrl={portaria.assinaturaComprovanteUrl}
                                />
                                <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                                    Publique para alocar o número oficial e registrar no Diário Oficial.
                                </p>
                                {ability.can('publicar', 'Portaria') && (
                                    <Button
                                        onClick={() => handleAction(() => portariaService.publicarPortaria(id), 'Portaria publicada com sucesso!', true)}
                                        disabled={actionLoading}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md"
                                    >
                                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Publicar Portaria
                                    </Button>
                                )}
                                {!ability.can('publicar', 'Portaria') && (
                                    <p className="text-xs text-emerald-600 font-medium text-center">
                                        Aguardando publicação pelo responsável.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <AssinaturaModal
                isOpen={isAssinaturaModalOpen}
                onOpenChange={setIsAssinaturaModalOpen}
                portariaId={id}
                onSigned={loadPortaria}
            />

            <HistoricoDocumentoModal
                portariaId={id}
                portariaTitulo={portaria.titulo}
                isOpen={isHistoricoOpen}
                onOpenChange={setIsHistoricoOpen}
            />
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

function AssinaturaStatusInfo({
    status,
    justificativa,
    comprovanteUrl
}: {
    status?: string
    justificativa?: string | null
    comprovanteUrl?: string | null
}) {
    if (!status || status === 'NAO_ASSINADA') return null

    if (status === 'ASSINADA_DIGITAL') {
        return (
            <div className="flex items-start gap-2 p-2.5 bg-emerald-100 border border-emerald-200 rounded-md">
                <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 font-medium">Assinada digitalmente</p>
            </div>
        )
    }

    if (status === 'ASSINADA_MANUAL') {
        return (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md space-y-1">
                <div className="flex items-center gap-1.5">
                    <PenTool size={13} className="text-amber-700 shrink-0" />
                    <p className="text-xs text-amber-800 font-bold">Assinatura manual registrada</p>
                </div>
                {justificativa && (
                    <p className="text-[11px] text-amber-700 leading-relaxed pl-4">{justificativa}</p>
                )}
                {comprovanteUrl && (
                    <p className="text-[10px] text-amber-600 pl-4 font-medium">✓ Comprovante digitalizado anexado</p>
                )}
            </div>
        )
    }

    if (status === 'DISPENSADA_COM_JUSTIFICATIVA') {
        return (
            <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-md space-y-1">
                <div className="flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-slate-600 shrink-0" />
                    <p className="text-xs text-slate-700 font-bold">Assinatura dispensada com justificativa</p>
                </div>
                {justificativa && (
                    <p className="text-[11px] text-slate-600 leading-relaxed pl-4">{justificativa}</p>
                )}
            </div>
        )
    }

    return null
}

// ─── SLA Visual ───────────────────────────────────────────────────────────────

const SLA_POR_STATUS: Record<string, { dias: number; label: string }> = {
    CORRECAO_NECESSARIA:    { dias: 3, label: 'p/ corrigir' },
    EM_REVISAO_ABERTA:      { dias: 2, label: 'p/ assumir revisão' },
    EM_REVISAO_ATRIBUIDA:   { dias: 4, label: 'p/ concluir revisão' },
    AGUARDANDO_ASSINATURA:  { dias: 2, label: 'p/ assinar' },
    PRONTO_PUBLICACAO:      { dias: 1, label: 'p/ publicar' },
}

function SlaIndicator({ status, updatedAt }: { status: string; updatedAt: string }) {
    const sla = SLA_POR_STATUS[status]
    if (!sla) return null

    const elapsed = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24) // dias
    const pct = Math.min(100, Math.round((elapsed / sla.dias) * 100))
    const restante = Math.max(0, sla.dias - elapsed)
    const atrasado = elapsed > sla.dias

    const cor = atrasado ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500'
    const textCor = atrasado ? 'text-red-600' : pct >= 75 ? 'text-amber-600' : 'text-emerald-600'

    return (
        <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SLA {sla.label}</p>
                </div>
                <p className={`text-[10px] font-black ${textCor}`}>
                    {atrasado
                        ? `${Math.round(elapsed - sla.dias)}d em atraso`
                        : restante < 1
                            ? `${Math.round(restante * 24)}h restantes`
                            : `${restante.toFixed(1)}d restantes`}
                </p>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${cor}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[9px] text-slate-400 mt-1">SLA: {sla.dias} dia{sla.dias > 1 ? 's' : ''} · {pct}% decorrido</p>
        </div>
    )
}

// ─── Progressão de Status (mini stepper) ──────────────────────────────────────

const FLUXO_ETAPAS = [
    { status: 'RASCUNHO',              label: 'Rascunho',       short: 'Rascunho' },
    { status: 'EM_REVISAO_ABERTA',     label: 'Enviado',        short: 'Enviado' },
    { status: 'EM_REVISAO_ATRIBUIDA',  label: 'Em Revisão',     short: 'Revisão' },
    { status: 'AGUARDANDO_ASSINATURA', label: 'Ag. Assinatura', short: 'Assinatura' },
    { status: 'PUBLICADA',             label: 'Publicado',      short: 'Publicado' },
]

// Mapeamento de correção/pronto para o índice correspondente no fluxo
const STATUS_ETAPA_IDX: Record<string, number> = {
    RASCUNHO: 0,
    CORRECAO_NECESSARIA: 1,       // volta à etapa 1 (como ENVIADO mas com erro)
    EM_REVISAO_ABERTA: 1,
    EM_REVISAO_ATRIBUIDA: 2,
    AGUARDANDO_ASSINATURA: 3,
    PRONTO_PUBLICACAO: 4,
    PUBLICADA: 4,
    FALHA_PROCESSAMENTO: 0,
}

function StatusProgressTracker({ status }: { status: string }) {
    const etapaAtual = STATUS_ETAPA_IDX[status] ?? 0
    const isCorrecao = status === 'CORRECAO_NECESSARIA'

    return (
        <div className="px-4 py-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Progresso do Fluxo
            </p>
            <div className="relative">
                {/* Linha de fundo */}
                <div className="absolute top-3 left-3 right-3 h-0.5 bg-slate-100" />
                {/* Linha de progresso */}
                <div
                    className="absolute top-3 left-3 h-0.5 bg-primary transition-all duration-700"
                    style={{ width: `calc(${(etapaAtual / (FLUXO_ETAPAS.length - 1)) * 100}% - ${etapaAtual === 0 ? '0px' : '12px'})` }}
                />
                <div className="relative flex justify-between">
                    {FLUXO_ETAPAS.map((etapa, idx) => {
                        const concluida = idx < etapaAtual
                        const atual = idx === etapaAtual
                        const pendente = idx > etapaAtual

                        return (
                            <div key={etapa.status} className="flex flex-col items-center gap-1.5 flex-1">
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all z-10 relative
                                        ${concluida ? 'bg-primary border-primary' : ''}
                                        ${atual && !isCorrecao ? 'bg-white border-primary ring-2 ring-primary/20' : ''}
                                        ${atual && isCorrecao && idx === 1 ? 'bg-white border-rose-500 ring-2 ring-rose-200' : ''}
                                        ${pendente ? 'bg-white border-slate-200' : ''}
                                    `}
                                >
                                    {concluida ? (
                                        <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />
                                    ) : atual && isCorrecao && idx === 1 ? (
                                        <AlertCircle className="w-3 h-3 text-rose-500" />
                                    ) : atual ? (
                                        <Circle className="w-2 h-2 text-primary fill-primary" />
                                    ) : (
                                        <Circle className="w-2 h-2 text-slate-300" />
                                    )}
                                </div>
                                <p className={`text-[9px] font-bold text-center leading-tight
                                    ${concluida ? 'text-primary' : ''}
                                    ${atual && !isCorrecao ? 'text-primary' : ''}
                                    ${atual && isCorrecao && idx === 1 ? 'text-rose-600' : ''}
                                    ${pendente ? 'text-slate-300' : ''}
                                `}>
                                    {etapa.short}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function PortariaSkeleton() {
    return (
        <div className="space-y-6 max-w-6xl">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8"><Skeleton className="h-[300px] sm:h-[500px] lg:h-[700px] rounded-lg" /></div>
                <div className="lg:col-span-4 space-y-4">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-48 rounded-lg" />
                </div>
            </div>
        </div>
    )
}
