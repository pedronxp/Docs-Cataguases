import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, FileText, Download, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Portaria } from '@/types/domain'

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; className: string }> = {
    PUBLICADA:             { label: 'Publicada',          className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PRONTO_PUBLICACAO:     { label: 'Pronto p/ Publicar', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    AGUARDANDO_ASSINATURA: { label: 'Ag. Assinatura',     className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    EM_REVISAO_ATRIBUIDA:  { label: 'Em Revisão',         className: 'bg-purple-50 text-purple-700 border-purple-200' },
    EM_REVISAO_ABERTA:     { label: 'Em Revisão',         className: 'bg-purple-50 text-purple-700 border-purple-200' },
    CORRECAO_NECESSARIA:   { label: 'Em Correção',        className: 'bg-orange-50 text-orange-700 border-orange-200' },
    RASCUNHO:              { label: 'Rascunho',           className: 'bg-slate-50 text-slate-500 border-slate-200' },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status] ?? { label: status, className: 'bg-slate-50 text-slate-500 border-slate-200' }
    return (
        <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0 shrink-0 ${cfg.className}`}>
            {cfg.label}
        </Badge>
    )
}

// ─── Mini avatar com inicial ────────────────────────────────────────────────────

function MiniAvatar({ name, color }: { name: string; color: string }) {
    return (
        <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white text-[10px] font-black shrink-0"
            style={{ backgroundColor: color }}
            title={name}
        >
            {name.charAt(0).toUpperCase()}
        </span>
    )
}

// ─── Cadeia de atores do fluxo ─────────────────────────────────────────────────

interface Ator { nome: string | null; papel: string; cor: string }

function CadeiaAtores({ atores }: { atores: Ator[] }) {
    return (
        <div className="flex items-center gap-2 flex-wrap mt-2.5">
            {atores.map((ator, idx) => (
                <span key={ator.papel} className="flex items-center gap-2">
                    {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                    <span className="flex items-center gap-1.5">
                        {ator.nome
                            ? <MiniAvatar name={ator.nome} color={ator.cor} />
                            : <span className="h-5 w-5 rounded-full bg-slate-100 border border-dashed border-slate-300 inline-flex shrink-0" />
                        }
                        <span className="flex flex-col leading-none gap-0.5">
                            <span className="text-[11px] text-slate-700 font-semibold">
                                {ator.nome ?? '—'}
                            </span>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wide font-bold">
                                {ator.papel}
                            </span>
                        </span>
                    </span>
                </span>
            ))}
        </div>
    )
}

// ─── Formatação de data por extenso ────────────────────────────────────────────

function formatarData(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric'
    })
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface Props {
    portarias: Portaria[]
    mostrarSecretaria: boolean
}

// ─── Componente principal ───────────────────────────────────────────────────────

export function AcervoTable({ portarias, mostrarSecretaria }: Props) {
    if (portarias.length === 0) {
        return (
            <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-700">Nenhum documento encontrado</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">
                    Tente alterar os termos de busca ou a secretaria selecionada.
                </p>
            </div>
        )
    }

    return (
        <div className="divide-y divide-slate-100">
            {portarias.map((item) => {
                const cor      = item.secretaria?.cor ?? '#1351B4'
                const criador  = item.criadoPor?.name  ?? item.autor?.name ?? null
                const revisor  = item.revisorAtual?.name ?? null
                const assinou  = item.assinadoPor?.name  ?? null
                const dataRef  = item.dataPublicacao ?? item.updatedAt

                const atores: Ator[] = [
                    { nome: criador, papel: 'Criador', cor: '#475569' },
                    { nome: revisor, papel: 'Revisor', cor: '#7c3aed' },
                    { nome: assinou, papel: 'Assinou', cor: '#059669' },
                ]

                return (
                    <div
                        key={item.id}
                        className="flex items-start gap-4 px-5 py-4 hover:bg-blue-50/30 transition-colors group"
                    >
                        {/* Ícone do documento com cor da secretaria */}
                        <div
                            className="mt-0.5 p-2 rounded-md shrink-0 shadow-sm"
                            style={{ backgroundColor: `${cor}18`, border: `1px solid ${cor}30` }}
                        >
                            <FileText className="h-4 w-4" style={{ color: cor }} />
                        </div>

                        {/* Corpo da linha */}
                        <div className="flex-1 min-w-0">
                            {/* Linha 1: número oficial + data */}
                            <div className="flex items-start justify-between gap-3">
                                <span className="font-bold text-slate-900 text-sm leading-tight">
                                    {item.numeroOficial
                                        ? `Portaria Nº ${item.numeroOficial}`
                                        : item.titulo
                                    }
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium shrink-0 mt-0.5">
                                    {formatarData(dataRef)}
                                </span>
                            </div>

                            {/* Linha 2: título + status badge */}
                            <div className="flex items-center justify-between gap-3 mt-0.5">
                                <p
                                    className="text-xs text-slate-500 leading-snug line-clamp-1"
                                    title={item.titulo}
                                >
                                    {item.numeroOficial ? item.titulo : ''}
                                </p>
                                <StatusBadge status={item.status} />
                            </div>

                            {/* Linha 3: modelo + secretaria (tags) */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {item.modelo?.nome && (
                                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {item.modelo.nome}
                                    </span>
                                )}
                                {mostrarSecretaria && item.secretaria?.sigla && (
                                    <span
                                        className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                                        style={{ backgroundColor: `${cor}15`, color: cor }}
                                    >
                                        {item.secretaria.sigla}
                                    </span>
                                )}
                            </div>

                            {/* Linha 4: cadeia de atores */}
                            <CadeiaAtores atores={atores} />
                        </div>

                        {/* Ações — aparecem no hover */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold text-[#1351B4] border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                asChild
                            >
                                <Link to="/administrativo/portarias/$id" params={{ id: item.id }}>
                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                    Detalhes
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-[#1351B4] hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Baixar PDF"
                                disabled={!item.pdfUrl}
                            >
                                <Download className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
