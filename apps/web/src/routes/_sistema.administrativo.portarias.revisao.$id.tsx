import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    FileText, CheckCircle2, AlertCircle,
    ChevronLeft, Clock, Send, Loader2, X, AlertTriangle,
    Save, Eye, FileDown, Pencil, ScrollText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Portaria, ModeloVariavel } from '@/types/domain'
import { listarSecretarias, type Secretaria } from '@/services/secretaria.service'
import { HistoricoDocumentoModal } from '@/components/portarias/HistoricoDocumentoModal'

export const Route = createFileRoute('/_sistema/administrativo/portarias/revisao/$id')({
    component: PortariaRevisaoPage,
})

// ─── Componente de campo editável por tipo ────────────────────────────────────

function CampoEditavel({
    variavel,
    valor,
    onChange,
    disabled,
    secretarias = [],
}: {
    variavel: ModeloVariavel
    valor: string
    onChange: (val: string) => void
    disabled: boolean
    secretarias?: Secretaria[]
}) {
    const base = 'bg-white border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm font-medium text-slate-800'

    // Campo Secretaria: Select especial carregado do sistema
    if (variavel.chave.toUpperCase() === 'SECRETARIA' && secretarias.length > 0) {
        return (
            <Select value={valor} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className={base}>
                    <SelectValue placeholder="Selecione a secretaria..." />
                </SelectTrigger>
                <SelectContent>
                    {secretarias.map(s => (
                        <SelectItem key={s.id} value={s.nome}>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
                                {s.nome} <span className="text-slate-400 text-xs">({s.sigla})</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    if (variavel.tipo === 'textarea') {
        return (
            <Textarea
                value={valor}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder={variavel.descricao || `Insira ${variavel.label.toLowerCase()}...`}
                rows={4}
                className={`${base} resize-none`}
            />
        )
    }

    if (variavel.tipo === 'select' && variavel.opcoes?.length > 0) {
        return (
            <Select value={valor} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className={base}>
                    <SelectValue placeholder={`Selecione ${variavel.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {variavel.opcoes.map(op => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )
    }

    if (variavel.tipo === 'data' || variavel.tipo === 'data_extenso') {
        // Tenta converter valor existente para formato de data
        let dateVal = valor
        if (valor && !valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // pode estar em "dd/mm/yyyy" → converte
            const parts = valor.split('/')
            if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        return (
            <Input
                type="date"
                value={dateVal}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className={base}
            />
        )
    }

    if (variavel.tipo === 'numero') {
        return (
            <Input
                type="number"
                value={valor}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder="0"
                className={base}
            />
        )
    }

    // Default: texto, cpf, moeda, assinatura (texto livre)
    return (
        <Input
            type="text"
            value={valor}
            onChange={e => onChange(e.target.value)}
            disabled={disabled || variavel.tipo === 'assinatura'}
            placeholder={variavel.tipo === 'assinatura' ? 'Preenchido automaticamente' : (variavel.descricao || '')}
            className={`${base} ${variavel.tipo === 'assinatura' ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
    )
}

// ─── Página principal ─────────────────────────────────────────────────────────

function PortariaRevisaoPage() {
    const { id } = Route.useParams()
    const { toast } = useToast()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [variaveis, setVariaveis] = useState<ModeloVariavel[]>([])

    // Estado dos campos editáveis — inicializado com portaria.formData
    const [formValues, setFormValues] = useState<Record<string, string>>({})
    const [hasChanges, setHasChanges] = useState(false)

    const [saving, setSaving] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [isHistoricoOpen, setIsHistoricoOpen] = useState(false)
    const [secretariasLista, setSecretariasLista] = useState<Secretaria[]>([])

    useEffect(() => {
        load()
        listarSecretarias().then(r => { if (r.success) setSecretariasLista(r.data) })
    }, [id])

    async function load() {
        setLoading(true)
        const res = await portariaService.obterPortaria(id)
        if (res.success) {
            const p = res.data
            setPortaria(p)
            const vars = (p as any).modelo?.variaveis as ModeloVariavel[] ?? []
            setVariaveis(vars)
            // Inicializa os campos com os valores já salvos
            const initial: Record<string, string> = {}
            for (const v of vars) {
                initial[v.chave] = String(p.formData?.[v.chave] ?? '')
            }
            setFormValues(initial)
            setHasChanges(false)
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setLoading(false)
    }

    const handleFieldChange = (chave: string, valor: string) => {
        setFormValues(prev => ({ ...prev, [chave]: valor }))
        setHasChanges(true)
    }

    /** Salva o formData no servidor e regenera o DOCX */
    const handleSalvar = async () => {
        if (!portaria) return
        setSaving(true)
        const res = await portariaService.atualizarFormData(portaria.id, formValues)
        if (res.success) {
            setPortaria(res.data)
            setHasChanges(false)
            toast({ title: 'Salvo!', description: 'Dados atualizados. O documento será regenerado.' })
            // Regenera o DOCX em background
            portariaService.downloadDocx(portaria.id, true).then(r => {
                if (r.success) setPreviewUrl(r.data.url)
            })
        } else {
            toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
        }
        setSaving(false)
    }

    /** Salva (se houver mudanças) e submete para revisão */
    const handleSubmeter = async () => {
        if (!portaria) return
        setSubmitting(true)

        // Se há mudanças não salvas, salva antes de submeter
        if (hasChanges) {
            const saveRes = await portariaService.atualizarFormData(portaria.id, formValues)
            if (!saveRes.success) {
                toast({ title: 'Erro ao salvar dados', description: saveRes.error, variant: 'destructive' })
                setSubmitting(false)
                return
            }
        }

        const res = await portariaService.submeterPortaria({ portariaId: portaria.id })
        if (res.success) {
            const rawRes = res as any
            if (rawRes.warning) {
                toast({
                    title: 'Submetido com aviso',
                    description: rawRes.warning,
                    variant: 'destructive'
                })
            } else {
                toast({ title: 'Documento submetido!', description: 'Portaria enviada para revisão com sucesso.' })
            }
            navigate({ to: '/administrativo/portarias/$id', params: { id: portaria.id } })
        } else {
            toast({ title: 'Erro ao submeter', description: res.error, variant: 'destructive' })
            setSubmitting(false)
        }
    }

    const handleCarregarPreview = async () => {
        if (!portaria) return
        setPreviewLoading(true)
        // Garante que o DOCX está gerado/atualizado no servidor
        const res = await portariaService.downloadDocx(portaria.id, hasChanges)
        if (res.success) {
            // Marca prévia como pronta — mostramos os campos preenchidos
            setPreviewUrl('ready')
        } else {
            const isSemTemplate = res.error?.includes('template') || res.error?.includes('Template')
            toast({
                title: isSemTemplate ? 'Modelo sem template DOCX' : 'Erro ao gerar prévia',
                description: isSemTemplate
                    ? 'Este modelo ainda não tem um arquivo Word (.docx) configurado. Contate o administrador para adicionar o template ao modelo.'
                    : res.error,
                variant: 'destructive'
            })
        }
        setPreviewLoading(false)
    }

    const handleDownload = () => {
        // Usa o endpoint de proxy same-origin — evita popup blocker, funciona com <a download>
        const link = document.createElement('a')
        link.href = `/api/portarias/${id}/stream?type=docx`
        link.download = `portaria-rascunho.docx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Grupos de variáveis para organizar por seção (campo `grupo`)
    const grupos = useMemo(() => {
        const map = new Map<string, ModeloVariavel[]>()
        for (const v of variaveis) {
            if (v.tipo === 'assinatura') continue // pula campos de assinatura
            const g = v.grupo || 'Dados do Documento'
            if (!map.has(g)) map.set(g, [])
            map.get(g)!.push(v)
        }
        return map
    }, [variaveis])

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl animate-pulse">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-64 rounded-lg" />
                        <Skeleton className="h-48 rounded-lg" />
                    </div>
                    <Skeleton className="h-80 rounded-lg" />
                </div>
            </div>
        )
    }

    if (!portaria) {
        return (
            <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
                <AlertTriangle size={40} className="opacity-30" />
                <p className="font-semibold text-slate-600">Portaria não encontrada</p>
                <Button variant="outline" asChild><Link to="/administrativo/portarias">Voltar à lista</Link></Button>
            </div>
        )
    }

    const isEditavel = ['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)
    const isCorrecao = portaria.status === 'CORRECAO_NECESSARIA'

    return (
        <div className="space-y-5 animate-in fade-in duration-500 max-w-5xl">

            {/* ── Cabeçalho ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" asChild className="text-slate-500 hover:text-primary font-semibold -ml-2 h-9">
                        <Link to="/administrativo/portarias/$id" params={{ id }}>
                            <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-slate-400" />
                            <h2 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[320px]">
                                {portaria.titulo}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Modelo: {(portaria as any).modelo?.nome || '—'} · Secretaria: {portaria.secretaria?.sigla || '—'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs font-semibold text-slate-500 hover:text-primary hover:bg-primary/5"
                        onClick={() => setIsHistoricoOpen(true)}
                    >
                        <ScrollText className="mr-1.5 h-3.5 w-3.5" /> Histórico
                    </Button>
                    <StatusBadgeRevisao status={portaria.status} />
                    {hasChanges && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 font-semibold text-xs animate-pulse">
                            Alterações não salvas
                        </Badge>
                    )}
                </div>
            </div>

            {/* ── Aviso de correção ─────────────────────────────────────── */}
            {isCorrecao && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-rose-700">Correção necessária</p>
                        <p className="text-xs text-rose-600 font-medium mt-0.5">
                            O revisor devolveu este documento. Corrija os campos abaixo e clique em "Submeter para Revisão".
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Formulário de edição (2/3) ─────────────────────── */}
                <div className="lg:col-span-2 space-y-4">

                    {grupos.size === 0 ? (
                        <Card className="border-slate-200">
                            <CardContent className="py-12 text-center text-slate-400">
                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">Nenhum campo de preenchimento encontrado neste modelo.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        Array.from(grupos.entries()).map(([grupo, campos]) => (
                            <Card key={grupo} className="border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 px-5 py-3">
                                    <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        {grupo}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4">
                                    {campos.map(v => (
                                        <div key={v.chave} className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                {v.label}
                                                {v.obrigatorio && (
                                                    <span className="text-rose-500 text-[10px]">*</span>
                                                )}
                                            </Label>
                                            {v.descricao && (
                                                <p className="text-[10px] text-slate-400 font-medium -mt-0.5">{v.descricao}</p>
                                            )}
                                            <CampoEditavel
                                                variavel={v}
                                                valor={formValues[v.chave] ?? ''}
                                                onChange={val => handleFieldChange(v.chave, val)}
                                                disabled={!isEditavel || submitting || saving}
                                                secretarias={secretariasLista}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))
                    )}

                    {/* Não editável */}
                    {!isEditavel && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                            <p className="text-sm font-medium text-blue-700">
                                Documento em revisão — campos bloqueados para edição.
                            </p>
                        </div>
                    )}

                    {/* Prévia do documento — exibe os campos preenchidos */}
                    {previewUrl === 'ready' && (
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye size={14} className="text-slate-400" />
                                    <span className="text-xs font-bold text-slate-600">Prévia dos Dados Preenchidos</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-slate-400 hover:text-slate-600"
                                    onClick={() => setPreviewUrl(null)}
                                >
                                    <X className="h-3 w-3 mr-1" /> Fechar
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium flex items-center gap-2">
                                    <FileText size={14} className="shrink-0" />
                                    Documento gerado com sucesso. Use o botão "Baixar .docx" para visualizar o layout completo com o template oficial.
                                </div>
                                <div className="space-y-2">
                                    {variaveis.filter(v => v.tipo !== 'assinatura').map(v => (
                                        <div key={v.chave} className="flex gap-3 py-1.5 border-b border-slate-100 last:border-0">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide min-w-[140px] shrink-0">{v.label}</span>
                                            <span className="text-xs text-slate-800 font-medium break-words">
                                                {formValues[v.chave] || <span className="italic text-slate-400">— não preenchido —</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full text-xs font-semibold gap-2"
                                        onClick={handleDownload}
                                    >
                                        <FileDown className="h-3.5 w-3.5" /> Abrir documento no Word para conferir layout
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Sidebar de ações (1/3) ─────────────────────────── */}
                <div className="space-y-4">

                    {/* Card de ações principais */}
                    {isEditavel ? (
                        <Card className={`border-2 shadow-md ${isCorrecao ? 'border-rose-200' : 'border-primary/20'}`}>
                            <CardHeader className={`px-5 py-4 border-b ${isCorrecao ? 'border-rose-100 bg-rose-50/60' : 'border-slate-100 bg-slate-50/60'}`}>
                                <CardTitle className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    {isCorrecao ? 'Corrigir e Reenviar' : 'Elaborar Documento'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-3">
                                {/* Salvar rascunho */}
                                <Button
                                    onClick={handleSalvar}
                                    disabled={!hasChanges || saving || submitting}
                                    variant="outline"
                                    className="w-full h-10 font-bold border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    {saving
                                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                        : <><Save className="mr-2 h-4 w-4" /> Salvar Rascunho</>
                                    }
                                </Button>

                                {/* Submeter */}
                                <Button
                                    onClick={handleSubmeter}
                                    disabled={submitting || saving}
                                    className={`w-full h-11 font-bold shadow-md ${isCorrecao
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                    }`}
                                >
                                    {submitting
                                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submetendo...</>
                                        : <><Send className="mr-2 h-4 w-4" /> Submeter para Revisão</>
                                    }
                                </Button>

                                {hasChanges && (
                                    <p className="text-[10px] text-amber-600 font-medium text-center leading-tight">
                                        ⚠ Ao submeter, as alterações serão salvas automaticamente.
                                    </p>
                                )}
                                {!hasChanges && (
                                    <p className="text-[10px] text-slate-400 font-medium text-center leading-tight">
                                        O documento será gerado e enviado para revisão.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-blue-200 bg-blue-50 shadow-sm">
                            <CardContent className="p-5 flex flex-col items-center gap-3 py-8 text-center">
                                <Clock className="h-8 w-8 text-blue-500" />
                                <p className="text-sm font-bold text-blue-700">Em Revisão</p>
                                <p className="text-xs text-blue-500 font-medium">O documento está sendo revisado.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate({ to: '/administrativo/portarias/$id', params: { id } })}
                                    className="border-blue-200 text-blue-600 hover:bg-blue-100"
                                >
                                    Ver detalhes
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Prévia + download */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="px-4 py-3 border-b border-slate-100">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documento Gerado</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <Button
                                variant="outline"
                                className="w-full h-9 text-xs font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                                onClick={handleCarregarPreview}
                                disabled={previewLoading}
                            >
                                {previewLoading
                                    ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...</>
                                    : <><Eye className="mr-2 h-3.5 w-3.5" /> Visualizar Rascunho</>
                                }
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-9 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                                onClick={handleDownload}
                            >
                                <FileDown className="mr-2 h-3.5 w-3.5" /> Baixar .docx
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Cancelar */}
                    {isEditavel && (
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold h-9"
                            onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar?')) {
                                    navigate({ to: '/administrativo/portarias' })
                                }
                            }}
                        >
                            <X className="mr-2 h-3 w-3" /> Cancelar esta Portaria
                        </Button>
                    )}
                </div>
            </div>

            <HistoricoDocumentoModal
                portariaId={id}
                portariaTitulo={portaria.titulo}
                isOpen={isHistoricoOpen}
                onOpenChange={setIsHistoricoOpen}
            />
        </div>
    )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadgeRevisao({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
        RASCUNHO: {
            label: 'Em Elaboração',
            className: 'bg-slate-100 text-slate-600 border-slate-300',
            icon: <Pencil className="mr-1.5 h-3 w-3" />,
        },
        CORRECAO_NECESSARIA: {
            label: 'Correção Necessária',
            className: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: <AlertCircle className="mr-1.5 h-3 w-3" />,
        },
        EM_REVISAO_ABERTA: {
            label: 'Em Revisão',
            className: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: <Clock className="mr-1.5 h-3 w-3" />,
        },
        EM_REVISAO_ATRIBUIDA: {
            label: 'Em Revisão',
            className: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: <Clock className="mr-1.5 h-3 w-3" />,
        },
        AGUARDANDO_ASSINATURA: {
            label: 'Aguardando Assinatura',
            className: 'bg-primary/10 text-primary border-primary/20',
            icon: <CheckCircle2 className="mr-1.5 h-3 w-3" />,
        },
    }
    const c = config[status] ?? config.RASCUNHO
    return (
        <Badge variant="outline" className={`${c.className} h-8 px-3 font-semibold flex items-center`}>
            {c.icon}{c.label}
        </Badge>
    )
}
