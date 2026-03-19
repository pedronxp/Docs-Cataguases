import { useEffect, useState } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { portariaService } from '@/services/portaria.service'
import type { FeedAtividade } from '@/types/domain'
import {
    FileText, CheckCircle2, AlertCircle, Send, PenTool,
    Eye, Download, Save, Clock, Trash2, UserCheck,
    RefreshCw, Bot, FileSignature, XCircle,
    ArrowRightLeft, ScrollText,
} from 'lucide-react'

// ─── Configuração visual por tipo de evento ──────────────────────────────────

interface EventoConfig {
    label: string
    icon: React.ReactNode
    cor: string       // classe de cor do ícone/borda
    bg: string        // classe de fundo do ícone
    badgeCor: string  // classe do badge
}

const CONFIG_EVENTO: Record<string, EventoConfig> = {
    // Ciclo de vida
    PORTARIA_CRIADA: {
        label: 'Documento criado',
        icon: <FileText className="h-3.5 w-3.5" />,
        cor: 'text-primary', bg: 'bg-primary/10', badgeCor: 'bg-primary/10 text-primary border-primary/20',
    },
    PORTARIA_SUBMETIDA: {
        label: 'Enviado para revisão',
        icon: <Send className="h-3.5 w-3.5" />,
        cor: 'text-amber-600', bg: 'bg-amber-50', badgeCor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    PORTARIA_APROVADA: {
        label: 'Aprovado na revisão',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cor: 'text-emerald-600', bg: 'bg-emerald-50', badgeCor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    PORTARIA_REJEITADA: {
        label: 'Devolvido para correção',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        cor: 'text-rose-600', bg: 'bg-rose-50', badgeCor: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    PORTARIA_PUBLICADA: {
        label: 'Publicado',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cor: 'text-emerald-700', bg: 'bg-emerald-100', badgeCor: 'bg-emerald-200 text-emerald-800 border-emerald-300',
    },
    PORTARIA_FALHA: {
        label: 'Falha no processamento',
        icon: <XCircle className="h-3.5 w-3.5" />,
        cor: 'text-red-600', bg: 'bg-red-50', badgeCor: 'bg-red-100 text-red-700 border-red-200',
    },
    PORTARIA_RETRY: {
        label: 'Reprocessado',
        icon: <RefreshCw className="h-3.5 w-3.5" />,
        cor: 'text-slate-600', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    // Revisão
    REVISAO_ATRIBUIDA: {
        label: 'Revisão atribuída',
        icon: <UserCheck className="h-3.5 w-3.5" />,
        cor: 'text-violet-600', bg: 'bg-violet-50', badgeCor: 'bg-violet-100 text-violet-700 border-violet-200',
    },
    DOCUMENTO_DEVOLVIDO_AUTOR: {
        label: 'Devolvido ao autor',
        icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
        cor: 'text-orange-600', bg: 'bg-orange-50', badgeCor: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    MUDANCA_STATUS_SOLICITAR_REVISAO: {
        label: 'Solicitou revisão',
        icon: <Send className="h-3.5 w-3.5" />,
        cor: 'text-amber-600', bg: 'bg-amber-50', badgeCor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    MUDANCA_STATUS_ASSUMIR_REVISAO: {
        label: 'Assumiu a revisão',
        icon: <UserCheck className="h-3.5 w-3.5" />,
        cor: 'text-violet-600', bg: 'bg-violet-50', badgeCor: 'bg-violet-100 text-violet-700 border-violet-200',
    },
    MUDANCA_STATUS_APROVAR_REVISAO: {
        label: 'Revisão aprovada',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cor: 'text-emerald-600', bg: 'bg-emerald-50', badgeCor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    MUDANCA_STATUS_REJEITAR_REVISAO: {
        label: 'Revisão rejeitada',
        icon: <XCircle className="h-3.5 w-3.5" />,
        cor: 'text-rose-600', bg: 'bg-rose-50', badgeCor: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    MUDANCA_STATUS_TRANSFERIR_REVISAO: {
        label: 'Revisão transferida',
        icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
        cor: 'text-orange-600', bg: 'bg-orange-50', badgeCor: 'bg-orange-100 text-orange-700 border-orange-200',
    },
    // Assinaturas
    ASSINATURA_DIGITAL: {
        label: 'Assinado digitalmente',
        icon: <FileSignature className="h-3.5 w-3.5" />,
        cor: 'text-emerald-600', bg: 'bg-emerald-50', badgeCor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    ASSINATURA_MANUAL: {
        label: 'Assinado manualmente',
        icon: <PenTool className="h-3.5 w-3.5" />,
        cor: 'text-amber-600', bg: 'bg-amber-50', badgeCor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    ASSINATURA_DISPENSADA: {
        label: 'Assinatura dispensada',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        cor: 'text-slate-500', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    // Rastreamento do documento
    FORMULARIO_SALVO: {
        label: 'Rascunho salvo',
        icon: <Save className="h-3.5 w-3.5" />,
        cor: 'text-blue-500', bg: 'bg-blue-50', badgeCor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    DOCX_VISUALIZADO: {
        label: 'Documento visualizado',
        icon: <Eye className="h-3.5 w-3.5" />,
        cor: 'text-slate-500', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    DOCX_BAIXADO: {
        label: 'Documento baixado',
        icon: <Download className="h-3.5 w-3.5" />,
        cor: 'text-slate-600', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    PDF_VISUALIZADO: {
        label: 'PDF visualizado',
        icon: <Eye className="h-3.5 w-3.5" />,
        cor: 'text-slate-500', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-600 border-slate-200',
    },
    // Exclusão
    EXCLUSAO: {
        label: 'Excluído',
        icon: <Trash2 className="h-3.5 w-3.5" />,
        cor: 'text-red-600', bg: 'bg-red-50', badgeCor: 'bg-red-100 text-red-700 border-red-200',
    },
    // IA
    ACAO_ASSISTENTE_IA: {
        label: 'Ação do assistente IA',
        icon: <Bot className="h-3.5 w-3.5" />,
        cor: 'text-violet-500', bg: 'bg-violet-50', badgeCor: 'bg-violet-100 text-violet-700 border-violet-200',
    },
}

const CONFIG_PADRAO: EventoConfig = {
    label: 'Evento',
    icon: <Clock className="h-3.5 w-3.5" />,
    cor: 'text-slate-400', bg: 'bg-slate-100', badgeCor: 'bg-slate-100 text-slate-600 border-slate-200',
}

function getConfig(tipo: string): EventoConfig {
    return CONFIG_EVENTO[tipo] ?? CONFIG_PADRAO
}

// ─── Formata data/hora em pt-BR ──────────────────────────────────────────────

function formatarData(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface HistoricoDocumentoModalProps {
    portariaId: string
    portariaTitulo?: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function HistoricoDocumentoModal({
    portariaId,
    portariaTitulo,
    isOpen,
    onOpenChange,
}: HistoricoDocumentoModalProps) {
    const [eventos, setEventos] = useState<FeedAtividade[]>([])
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        setErro(null)
        portariaService.buscarHistorico(portariaId).then(res => {
            if (res.success) setEventos(res.data)
            else setErro(res.error)
            setLoading(false)
        })
    }, [isOpen, portariaId])

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-primary" />
                        <DialogTitle className="text-sm font-black text-slate-900 tracking-tight">
                            Histórico do Documento
                        </DialogTitle>
                    </div>
                    {portariaTitulo && (
                        <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                            {portariaTitulo}
                        </p>
                    )}
                </DialogHeader>

                {/* Corpo com scroll */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {loading && (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && erro && (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <AlertCircle className="h-8 w-8 text-rose-300" />
                            <p className="text-sm text-rose-600 font-medium">{erro}</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setLoading(true)
                                    setErro(null)
                                    portariaService.buscarHistorico(portariaId).then(res => {
                                        if (res.success) setEventos(res.data)
                                        else setErro(res.error)
                                        setLoading(false)
                                    })
                                }}
                            >
                                <RefreshCw className="h-3 w-3 mr-1.5" /> Tentar novamente
                            </Button>
                        </div>
                    )}

                    {!loading && !erro && eventos.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-10 text-center">
                            <Clock className="h-8 w-8 text-slate-200" />
                            <p className="text-sm text-slate-400 font-medium">Nenhum evento registrado ainda.</p>
                        </div>
                    )}

                    {!loading && !erro && eventos.length > 0 && (
                        <div className="relative">
                            {/* Linha vertical da timeline */}
                            <div className="absolute left-[13px] top-0 bottom-0 w-px bg-slate-100" />

                            <div className="space-y-5">
                                {eventos.map((ev, idx) => {
                                    const cfg = getConfig(ev.tipoEvento)
                                    const isUltimo = idx === eventos.length - 1
                                    return (
                                        <div key={ev.id} className="flex gap-3 relative">
                                            {/* Ícone na timeline */}
                                            <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center z-10 border border-white shadow-sm ${cfg.bg} ${cfg.cor}`}>
                                                {cfg.icon}
                                            </div>

                                            {/* Conteúdo */}
                                            <div className={`flex-1 pb-1 ${!isUltimo ? 'border-b border-slate-50' : ''}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-0.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-bold px-1.5 py-0 h-4 ${cfg.badgeCor}`}
                                                        >
                                                            {cfg.label}
                                                        </Badge>
                                                        <p className="text-xs text-slate-600 font-medium leading-snug">
                                                            {ev.mensagem}
                                                        </p>
                                                        {/* Metadados relevantes */}
                                                        {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                                            <MetadataEvento metadata={ev.metadata} tipo={ev.tipoEvento} />
                                                        )}
                                                    </div>
                                                    <time className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0 mt-0.5">
                                                        {formatarData(ev.createdAt)}
                                                    </time>
                                                </div>
                                                {ev.autor && (
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Por <span className="font-semibold text-slate-500">{ev.autor.name || (ev.autor as any).username || '—'}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Indicador de fim */}
                            <div className="flex gap-3 mt-5 relative">
                                <div className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center z-10 bg-slate-100 text-slate-300">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 flex items-center">
                                    <p className="text-[10px] text-slate-300 font-medium">
                                        {eventos.length} evento{eventos.length !== 1 ? 's' : ''} registrado{eventos.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé */}
                <div className="px-6 py-3 border-t border-slate-100 shrink-0 flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => onOpenChange(false)}
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ─── Exibe metadados relevantes do evento ─────────────────────────────────────

function MetadataEvento({ metadata, tipo }: { metadata: Record<string, string>; tipo: string }) {
    const items: string[] = []

    if (tipo === 'FORMULARIO_SALVO' && metadata.campos) {
        items.push(`Campos: ${metadata.campos}`)
    }
    if (tipo === 'DOCX_BAIXADO' && metadata.acao) {
        items.push(metadata.acao === 'regenerar' ? 'Regenerado com alterações' : 'Primeira geração')
    }
    if (metadata.observacao) {
        items.push(metadata.observacao)
    }
    if (metadata.motivo) {
        items.push(`Motivo: ${metadata.motivo}`)
    }

    if (items.length === 0) return null

    return (
        <div className="mt-0.5 space-y-0.5">
            {items.map((item, i) => (
                <p key={i} className="text-[10px] text-slate-400 italic leading-snug">{item}</p>
            ))}
        </div>
    )
}
