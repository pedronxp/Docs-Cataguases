/**
 * Página de Treinamento da IA — Doc's Cataguases
 * Rota: /admin/ia
 * Acesso: ADMIN_GERAL
 *
 * Permite criar, editar, reordenar e ativar/desativar prompts de treinamento
 * que são injetados dinamicamente no system prompt de TODAS as LLMs.
 */
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
    Brain, Plus, Trash2, Power, PowerOff, Save, Eye, EyeOff,
    ChevronUp, ChevronDown, AlertTriangle, CheckCircle2, RefreshCw,
    BookOpen, MessageSquare, FileText, Settings2, Sparkles, GripVertical,
    Info, Copy, ToggleLeft, ToggleRight,
} from 'lucide-react'

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000'
const apiUrl = (p: string) => `${API_BASE}${p}`

export const Route = createFileRoute('/_sistema/admin/ia')({
    component: TreinamentoIAPage,
})

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Categoria = 'SISTEMA' | 'PORTARIA' | 'REVISAO' | 'CHAT_GERAL' | 'MODELO' | 'CUSTOM'

interface LlmPrompt {
    id: string
    nome: string
    categoria: Categoria
    conteudo: string
    ativo: boolean
    ordem: number
    criadoEm: string
    atualizadoEm: string
    criadoPor?: { id: string; name: string } | null
}

// ── Configs de categoria ──────────────────────────────────────────────────────
const CATEGORIA_CONFIG: Record<Categoria, { label: string; icon: React.ReactNode; cor: string; desc: string }> = {
    SISTEMA: {
        label: 'Sistema',
        icon: <Settings2 className="h-3.5 w-3.5" />,
        cor: 'bg-blue-100 text-blue-700 border-blue-200',
        desc: 'Injetado em TODAS as conversas. Define comportamento base do assistente.',
    },
    PORTARIA: {
        label: 'Portaria',
        icon: <FileText className="h-3.5 w-3.5" />,
        cor: 'bg-purple-100 text-purple-700 border-purple-200',
        desc: 'Injetado em análise/revisão de documentos. Regras de portarias.',
    },
    REVISAO: {
        label: 'Revisão',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cor: 'bg-amber-100 text-amber-700 border-amber-200',
        desc: 'Injetado no fluxo de revisão de documentos.',
    },
    CHAT_GERAL: {
        label: 'Chat Geral',
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        cor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        desc: 'Injetado no chat do assistente flutuante.',
    },
    MODELO: {
        label: 'Modelo',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        cor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        desc: 'Injetado durante criação/edição de modelos de documento.',
    },
    CUSTOM: {
        label: 'Custom',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        cor: 'bg-rose-100 text-rose-700 border-rose-200',
        desc: 'Prompt personalizado. Injetado em todas as conversas.',
    },
}

// ── Badge de categoria ─────────────────────────────────────────────────────────
function CategoriaBadge({ categoria }: { categoria: Categoria }) {
    const cfg = CATEGORIA_CONFIG[categoria]
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.cor}`}>
            {cfg.icon}{cfg.label}
        </span>
    )
}

// ── Card de prompt ─────────────────────────────────────────────────────────────
function PromptCard({
    prompt,
    onToggle,
    onDelete,
    onEdit,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
    loading,
}: {
    prompt: LlmPrompt
    onToggle: (id: string, ativo: boolean) => void
    onDelete: (id: string, nome: string) => void
    onEdit: (prompt: LlmPrompt) => void
    onMoveUp: (id: string) => void
    onMoveDown: (id: string) => void
    isFirst: boolean
    isLast: boolean
    loading: boolean
}) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className={`group rounded-xl border transition-all duration-200 ${
            prompt.ativo
                ? 'border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-primary/30'
                : 'border-slate-100 bg-slate-50/50 opacity-60'
        }`}>
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Ordem / drag handle */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                        onClick={() => onMoveUp(prompt.id)}
                        disabled={isFirst || loading}
                        className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronUp className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold text-center w-5">{prompt.ordem}</span>
                    <button
                        onClick={() => onMoveDown(prompt.id)}
                        disabled={isLast || loading}
                        className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronDown className="h-3 w-3" />
                    </button>
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${prompt.ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {prompt.nome}
                        </span>
                        <CategoriaBadge categoria={prompt.categoria} />
                        {!prompt.ativo && (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded-full">desativado</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {prompt.conteudo.slice(0, 90)}{prompt.conteudo.length > 90 ? '…' : ''}
                    </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                        title={expanded ? 'Recolher' : 'Ver conteúdo completo'}
                    >
                        {expanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                        onClick={() => onEdit(prompt)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
                        title="Editar"
                    >
                        <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => onToggle(prompt.id, !prompt.ativo)}
                        disabled={loading}
                        className={`p-1.5 rounded-lg transition-all ${
                            prompt.ativo
                                ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title={prompt.ativo ? 'Desativar' : 'Ativar'}
                    >
                        {prompt.ativo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onDelete(prompt.id, prompt.nome)}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Excluir"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Conteúdo expandido */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-100 mt-0">
                    <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <p className="text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {prompt.conteudo}
                        </p>
                    </div>
                    {prompt.criadoPor && (
                        <p className="text-[10px] text-slate-400 mt-2">
                            Criado por: {prompt.criadoPor.name} · {new Date(prompt.criadoEm).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Modal de criação/edição ────────────────────────────────────────────────────
function PromptModal({
    prompt,
    onSave,
    onClose,
    loading,
}: {
    prompt: LlmPrompt | null
    onSave: (data: Partial<LlmPrompt>) => void
    onClose: () => void
    loading: boolean
}) {
    const [nome, setNome] = useState(prompt?.nome ?? '')
    const [categoria, setCategoria] = useState<Categoria>(prompt?.categoria ?? 'CUSTOM')
    const [conteudo, setConteudo] = useState(prompt?.conteudo ?? '')
    const [ordem, setOrdem] = useState(prompt?.ordem ?? 0)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!nome.trim() || !conteudo.trim()) return
        onSave({ nome: nome.trim(), categoria, conteudo: conteudo.trim(), ordem })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">
                        {prompt ? 'Editar Prompt' : 'Novo Prompt de Treinamento'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Este prompt será injetado no sistema de IA conforme a categoria selecionada.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <Label htmlFor="nome" className="text-sm font-semibold text-slate-700">Nome do Prompt</Label>
                        <Input
                            id="nome"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            placeholder="Ex: Instruções de Revisão Técnica"
                            className="mt-1"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-sm font-semibold text-slate-700">Categoria</Label>
                            <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                {cfg.icon}
                                                <span>{cfg.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-slate-500 mt-1">{CATEGORIA_CONFIG[categoria].desc}</p>
                        </div>
                        <div>
                            <Label htmlFor="ordem" className="text-sm font-semibold text-slate-700">Ordem de Injeção</Label>
                            <Input
                                id="ordem"
                                type="number"
                                min={0}
                                value={ordem}
                                onChange={e => setOrdem(parseInt(e.target.value) || 0)}
                                className="mt-1"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">Menor número = injetado primeiro</p>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="conteudo" className="text-sm font-semibold text-slate-700">Conteúdo do Prompt</Label>
                        <Textarea
                            id="conteudo"
                            value={conteudo}
                            onChange={e => setConteudo(e.target.value)}
                            placeholder="Escreva as instruções que a IA deve seguir. Seja específico e claro. Ex: Sempre que o usuário perguntar sobre prazos de revisão, informe que o prazo padrão é 48 horas úteis conforme a política da prefeitura..."
                            className="mt-1 min-h-[180px] font-mono text-sm"
                            required
                        />
                        <p className="text-[11px] text-slate-400 mt-1 text-right">{conteudo.length} caracteres</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading || !nome.trim() || !conteudo.trim()}
                            className="flex-1"
                        >
                            {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            {prompt ? 'Salvar Alterações' : 'Criar Prompt'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ── Página Principal ───────────────────────────────────────────────────────────
function TreinamentoIAPage() {
    const { toast } = useToast()
    const [prompts, setPrompts] = useState<LlmPrompt[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingPrompt, setEditingPrompt] = useState<LlmPrompt | null>(null)
    const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')
    const [showPreview, setShowPreview] = useState(false)

    const fetchPrompts = useCallback(async () => {
        setRefreshing(true)
        try {
            const res = await fetch(apiUrl('/api/admin/ia/prompts'), { credentials: 'include' })
            const data = await res.json()
            if (data.success) setPrompts(data.data)
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro ao carregar prompts' })
        } finally {
            setRefreshing(false)
        }
    }, [toast])

    useEffect(() => { fetchPrompts() }, [fetchPrompts])

    const handleSave = async (formData: Partial<LlmPrompt>) => {
        setLoading(true)
        try {
            const url = editingPrompt
                ? apiUrl(`/api/admin/ia/prompts/${editingPrompt.id}`)
                : apiUrl('/api/admin/ia/prompts')
            const method = editingPrompt ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)

            toast({
                title: editingPrompt ? 'Prompt atualizado' : 'Prompt criado',
                description: `"${formData.nome}" foi salvo com sucesso.`,
            })
            setModalOpen(false)
            setEditingPrompt(null)
            await fetchPrompts()
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro', description: e.message })
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (id: string, ativo: boolean) => {
        try {
            const res = await fetch(apiUrl(`/api/admin/ia/prompts/${id}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ativo }),
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, ativo } : p))
            toast({ title: ativo ? 'Prompt ativado' : 'Prompt desativado' })
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro', description: e.message })
        }
    }

    const handleDelete = async (id: string, nome: string) => {
        if (!confirm(`Excluir o prompt "${nome}"? Esta ação não pode ser desfeita.`)) return
        try {
            const res = await fetch(apiUrl(`/api/admin/ia/prompts/${id}`), {
                method: 'DELETE',
                credentials: 'include',
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            setPrompts(prev => prev.filter(p => p.id !== id))
            toast({ title: 'Prompt excluído', description: `"${nome}" foi removido.` })
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Erro', description: e.message })
        }
    }

    const handleMoveUp = async (id: string) => {
        const idx = prompts.findIndex(p => p.id === id)
        if (idx <= 0) return
        const prev = prompts[idx - 1]
        const curr = prompts[idx]
        // Troca as ordens
        await Promise.all([
            fetch(apiUrl(`/api/admin/ia/prompts/${curr.id}`), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ ordem: prev.ordem }),
            }),
            fetch(apiUrl(`/api/admin/ia/prompts/${prev.id}`), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ ordem: curr.ordem }),
            }),
        ])
        await fetchPrompts()
    }

    const handleMoveDown = async (id: string) => {
        const idx = prompts.findIndex(p => p.id === id)
        if (idx >= prompts.length - 1) return
        const next = prompts[idx + 1]
        const curr = prompts[idx]
        await Promise.all([
            fetch(apiUrl(`/api/admin/ia/prompts/${curr.id}`), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ ordem: next.ordem }),
            }),
            fetch(apiUrl(`/api/admin/ia/prompts/${next.id}`), {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ ordem: curr.ordem }),
            }),
        ])
        await fetchPrompts()
    }

    const promptsFiltrados = filtroCategoria === 'TODOS'
        ? prompts
        : prompts.filter(p => p.categoria === filtroCategoria)

    const promptsAtivos = prompts.filter(p => p.ativo)
    const promptsInativos = prompts.filter(p => !p.ativo)

    // Preview do system prompt completo montado
    const systemPromptPreview = promptsAtivos
        .map(p => `\n\n[${p.categoria} — ${p.nome}]\n${p.conteudo}`)
        .join('')

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Brain className="h-5 w-5 text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800">Treinamento da IA</h1>
                    </div>
                    <p className="text-sm text-slate-500 ml-11.5">
                        Gerencie os prompts personalizados injetados em todas as conversas do assistente.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchPrompts} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button onClick={() => { setEditingPrompt(null); setModalOpen(true) }}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Novo Prompt
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total de Prompts', value: prompts.length, icon: <Brain className="h-4 w-4" />, cor: 'text-violet-600 bg-violet-50' },
                    { label: 'Ativos', value: promptsAtivos.length, icon: <CheckCircle2 className="h-4 w-4" />, cor: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Inativos', value: promptsInativos.length, icon: <PowerOff className="h-4 w-4" />, cor: 'text-slate-500 bg-slate-100' },
                    { label: 'Caracteres totais', value: promptsAtivos.reduce((s, p) => s + p.conteudo.length, 0).toLocaleString('pt-BR'), icon: <FileText className="h-4 w-4" />, cor: 'text-blue-600 bg-blue-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className={`w-8 h-8 rounded-lg ${stat.cor} flex items-center justify-center mb-2`}>
                            {stat.icon}
                        </div>
                        <p className="text-xl font-black text-slate-800">{stat.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
                <Info className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                <div className="text-sm text-violet-700">
                    <strong>Como funciona:</strong> Cada prompt ativo é injetado automaticamente no início de cada conversa com a IA,
                    conforme sua categoria. Prompts de categoria <strong>SISTEMA</strong> e <strong>CUSTOM</strong> são injetados em todas as conversas.
                    <strong> CHAT_GERAL</strong> é injetado no assistente flutuante.
                    <strong> PORTARIA/REVISAO/MODELO</strong> são injetados em fluxos específicos.
                    A ordem determina a prioridade (menor = primeiro).
                </div>
            </div>

            {/* Exemplos de prompts pré-definidos */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-800">Exemplos de Prompts — Clique para usar como base</h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        {
                            nome: 'Formatação de Portarias',
                            categoria: 'PORTARIA' as Categoria,
                            conteudo: 'Ao gerar ou revisar portarias, sempre use a seguinte estrutura: 1) Cabeçalho com "PREFEITURA MUNICIPAL DE CATAGUASES" e "ESTADO DE MINAS GERAIS"; 2) A palavra "PORTARIA" centralizada; 3) "CONSIDERANDO" para cada justificativa; 4) "RESOLVE:" seguido dos artigos; 5) Local, data e assinatura. Use linguagem jurídica formal e impessoal.',
                        },
                        {
                            nome: 'Tom de Conversa do Chat',
                            categoria: 'CHAT_GERAL' as Categoria,
                            conteudo: 'Responda sempre em português brasileiro formal, mas acessível. Seja conciso e direto. Quando não souber algo, diga claramente. Refira-se ao sistema como "Doc\'s Cataguases". Nunca invente dados como CPFs, nomes de servidores ou números de portaria.',
                        },
                        {
                            nome: 'Regras de Revisão',
                            categoria: 'REVISAO' as Categoria,
                            conteudo: 'Ao revisar documentos, verifique: 1) Ortografia e gramática; 2) Conformidade com modelos aprovados; 3) Dados completos (nomes, CPFs, datas); 4) Referências legais corretas; 5) Assinatura adequada. O prazo padrão de revisão é 48 horas úteis.',
                        },
                        {
                            nome: 'Instruções de Modelo',
                            categoria: 'MODELO' as Categoria,
                            conteudo: 'Ao auxiliar na criação de modelos de documento, sugira variáveis padronizadas: {{NOME_SERVIDOR}} para nome completo, {{CPF}} para CPF, {{CARGO}} para cargo, {{SECRETARIA}} para secretaria. Sempre recomende incluir as tags de sistema {{SYS_NUMERO}}, {{SYS_DATA}} e {{SYS_PREFEITO}}.',
                        },
                    ].map((exemplo, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => {
                                setEditingPrompt(null)
                                setModalOpen(true)
                                // Timeout para modal abrir antes de preencher (React state batching)
                                setTimeout(() => {
                                    const modal = document.querySelector('#nome') as HTMLInputElement
                                    if (modal) modal.value = exemplo.nome
                                }, 100)
                            }}
                            className="text-left p-3 rounded-lg border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <CategoriaBadge categoria={exemplo.categoria} />
                                <span className="font-semibold text-sm text-slate-700 group-hover:text-primary transition-colors">{exemplo.nome}</span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{exemplo.conteudo}</p>
                            <p className="text-[10px] text-primary font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Clique para usar como base →</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrar:</span>
                {['TODOS', ...Object.keys(CATEGORIA_CONFIG)].map(cat => {
                    const count = cat === 'TODOS' ? prompts.length : prompts.filter(p => p.categoria === cat).length
                    return (
                        <button
                            key={cat}
                            onClick={() => setFiltroCategoria(cat)}
                            className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
                                filtroCategoria === cat
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
                            }`}
                        >
                            {cat === 'TODOS' ? 'Todos' : CATEGORIA_CONFIG[cat as Categoria].label}
                            <span className="ml-1 opacity-70">({count})</span>
                        </button>
                    )
                })}
            </div>

            {/* Lista de prompts */}
            <div className="space-y-2">
                {promptsFiltrados.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold">Nenhum prompt encontrado</p>
                        <p className="text-sm mt-1">Crie um novo prompt para treinar o assistente</p>
                        <Button className="mt-4" onClick={() => { setEditingPrompt(null); setModalOpen(true) }}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Criar primeiro prompt
                        </Button>
                    </div>
                ) : (
                    promptsFiltrados.map((prompt, idx) => (
                        <PromptCard
                            key={prompt.id}
                            prompt={prompt}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onEdit={(p) => { setEditingPrompt(p); setModalOpen(true) }}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            isFirst={idx === 0}
                            isLast={idx === promptsFiltrados.length - 1}
                            loading={loading}
                        />
                    ))
                )}
            </div>

            {/* Preview do system prompt */}
            {promptsAtivos.length > 0 && (
                <Card className="border-slate-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-slate-500" />
                                    Preview do System Prompt
                                </CardTitle>
                                <CardDescription>
                                    Como o assistente receberá as instruções ({promptsAtivos.length} prompts ativos · {systemPromptPreview.length.toLocaleString('pt-BR')} caracteres extras)
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setShowPreview(p => !p)}>
                                {showPreview ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                                {showPreview ? 'Ocultar' : 'Mostrar'}
                            </Button>
                        </div>
                    </CardHeader>
                    {showPreview && (
                        <CardContent>
                            <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-80">
                                <p className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {'[SYSTEM PROMPT BASE — llm-system-prompt.ts]\n(conteúdo base do sistema)'}
                                    {systemPromptPreview}
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-2">
                                * O prompt base do sistema ({CATEGORIA_CONFIG.SISTEMA.label}) é sempre carregado do arquivo do sistema.
                                Os prompts acima são adicionados após o prompt base.
                            </p>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Modal de criação/edição */}
            {modalOpen && (
                <PromptModal
                    prompt={editingPrompt}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditingPrompt(null) }}
                    loading={loading}
                />
            )}
        </div>
    )
}
