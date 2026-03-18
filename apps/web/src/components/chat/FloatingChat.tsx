import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { llmChat, type LLMMessage } from '@/services/llm.service'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import {
    Bot, X, Send, RefreshCw, ChevronDown, Sparkles,
    Zap, Globe, AlertTriangle, Trash2, Copy, Check,
    Paperclip, FileText, Loader2
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    provider?: string
    model?: string
    tokens?: number
    error?: boolean
    docxAnexo?: { nome: string }    // indica mensagem com documento anexado
    fallbackUsed?: boolean           // true quando usou provider diferente do selecionado
    requestedProvider?: string       // provider originalmente solicitado
}

// ── Modelos disponíveis para seleção manual (com mapeamento para provider) ───
const MODELS = [
    { value: '', provider: '',          label: '⚡ Automático (Sistema escolhe)', sub: 'Cerebras por padrão' },
    { value: 'llama3.1-8b',    provider: 'cerebras', label: 'Llama 3.1 8B ⚡',     sub: 'Padrão e textos rápidos' },
    { value: 'llama3.3-70b',  provider: 'cerebras', label: 'Llama 3.3 70B ⚡',    sub: 'Tarefas complexas e longas' },
    { value: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large',      sub: 'Raciocínio avançado' },
    { value: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B (Groq)', sub: 'Fallback rápido' },
    { value: 'deepseek-r1-distill-llama-70b', provider: 'groq', label: 'DeepSeek R1 70B', sub: 'Raciocínio longo' },
    { value: 'moonshot-v1-8k', provider: 'kimi', label: 'Kimi (Moonshot 8K)', sub: 'Inteligência chinesa' },
    { value: 'moonshot-v1-32k', provider: 'kimi', label: 'Kimi (Moonshot 32K)', sub: 'Janela estendida' },
]

// ── Sugestões de perguntas por role ───────────────────────────────────────────
function getSugestoes(role: string): string[] {
    switch (role) {
        case 'ADMIN_GERAL':
            return [
                'Como gerenciar usuários e permissões?',
                'Como criar uma nova secretaria?',
                'O que significa FALHA_PROCESSAMENTO?',
                'Como configurar modelos de documento?',
                'Como funcionam os relatórios do sistema?',
            ]
        case 'PREFEITO':
            return [
                'Quais portarias aguardam minha assinatura?',
                'Como assinar documentos em lote?',
                'Como acompanhar o histórico de portarias?',
                'Qual é o fluxo de publicação no Diário Oficial?',
            ]
        case 'SECRETARIO':
            return [
                'Como criar uma nova portaria?',
                'Como gerenciar revisores da secretaria?',
                'Como aprovar e encaminhar para assinatura?',
                'Como acompanhar portarias em revisão?',
                'Como publicar no Diário Oficial?',
            ]
        case 'REVISOR':
            return [
                'Como solicitar uma revisão?',
                'Como aprovar ou devolver um documento?',
                'Como transferir uma revisão para outro revisor?',
                'Quais documentos estão aguardando revisão?',
            ]
        default:
            return [
                'Como criar uma nova portaria?',
                'Qual é o fluxo completo de publicação?',
                'O que são variáveis de sistema?',
                'Como preencher os campos do documento?',
                'O que acontece após submeter para revisão?',
            ]
    }
}

// ── Label amigável para o role ─────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
    ADMIN_GERAL: 'Administrador Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    REVISOR: 'Revisor',
    OPERADOR: 'Operador',
    PENDENTE: 'Pendente',
}

// ── Formatação de markdown completa ───────────────────────────────────────────
function renderMarkdown(text: string): string {
    const lines = text.split('\n')
    const result: string[] = []
    let inUl = false
    let inOl = false

    const applyInline = (l: string) => {
        l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        l = l.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        l = l.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-primary px-1 py-0.5 rounded text-xs font-mono">$1</code>')
        l = l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, href) => {
            // Block dangerous protocols
            const safestHref = /^(https?:\/\/|\/)/i.test(href) ? href : '#'
            return `<a href="${safestHref}" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 underline font-medium">${linkText}</a>`
        })
        return l
    }

    const closeLists = () => {
        if (inUl) { result.push('</ul>'); inUl = false }
        if (inOl) { result.push('</ol>'); inOl = false }
    }

    for (const rawLine of lines) {
        const l = applyInline(rawLine)

        if (rawLine.startsWith('### ')) {
            closeLists()
            result.push(`<h3 class="text-sm font-bold text-slate-800 mt-2 mb-0.5">${l.slice(4)}</h3>`)
        } else if (rawLine.startsWith('## ')) {
            closeLists()
            result.push(`<h2 class="text-sm font-bold text-slate-900 mt-3 mb-1">${l.slice(3)}</h2>`)
        } else if (rawLine.startsWith('# ')) {
            closeLists()
            result.push(`<h1 class="text-base font-bold text-slate-900 mt-2 mb-1">${l.slice(2)}</h1>`)
        } else if (rawLine.startsWith('> ')) {
            closeLists()
            result.push(`<blockquote class="border-l-2 border-primary/30 pl-3 text-slate-600 italic my-1 text-sm">${l.slice(2)}</blockquote>`)
        } else if (rawLine.match(/^[-*] /)) {
            if (inOl) { result.push('</ol>'); inOl = false }
            if (!inUl) { result.push('<ul class="list-disc pl-4 space-y-0.5 my-1 text-sm">'); inUl = true }
            result.push(`<li>${l.slice(2)}</li>`)
        } else if (rawLine.match(/^\d+\. /)) {
            if (inUl) { result.push('</ul>'); inUl = false }
            if (!inOl) { result.push('<ol class="list-decimal pl-4 space-y-0.5 my-1 text-sm">'); inOl = true }
            result.push(`<li>${l.replace(/^\d+\. /, '')}</li>`)
        } else {
            closeLists()
            result.push(rawLine.trim() === '' ? '<br />' : l + '<br />')
        }
    }

    closeLists()
    return result.join('')
}

// ── Badge de provider ─────────────────────────────────────────────────────────
function ProviderBadge({ provider }: { provider: string }) {
    const config: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
        cerebras: {
            cls: 'text-orange-600 border-orange-200 bg-orange-50',
            icon: <Zap className="h-2.5 w-2.5 mr-0.5" />,
            label: 'cerebras',
        },
        mistral: {
            cls: 'text-indigo-600 border-indigo-200 bg-indigo-50',
            icon: <Sparkles className="h-2.5 w-2.5 mr-0.5" />,
            label: 'mistral',
        },
        groq: {
            cls: 'text-purple-600 border-purple-200 bg-purple-50',
            icon: <Zap className="h-2.5 w-2.5 mr-0.5" />,
            label: 'groq',
        },
        kimi: {
            cls: 'text-teal-600 border-teal-200 bg-teal-50',
            icon: <Sparkles className="h-2.5 w-2.5 mr-0.5" />,
            label: 'kimi',
        },
    }
    const c = config[provider] ?? {
        cls: 'text-blue-600 border-blue-200 bg-blue-50',
        icon: <Globe className="h-2.5 w-2.5 mr-0.5" />,
        label: provider,
    }
    return (
        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 border flex items-center ${c.cls}`}>
            {c.icon}{c.label}
        </Badge>
    )
}

// ── Bolha de mensagem ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
    const [copied, setCopied] = useState(false)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content)
        setCopied(true)
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }

    useEffect(() => {
        return () => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        }
    }, [])

    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] bg-gradient-to-br from-primary to-[#0D3F8F] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-md shadow-primary/20">
                    {msg.content}
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-2 items-start group">
            <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mt-0.5 shadow-sm">
                <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
                <div className={`relative max-w-[95%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm ${msg.error
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-white border border-slate-200/80 text-slate-800'
                    }`}>
                    {msg.error
                        ? <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />{msg.content}</span>
                        : <div
                            className="leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                    }
                    {!msg.error && (
                        <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-slate-600"
                        >
                            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        </button>
                    )}
                </div>
                {msg.provider && (
                    <div className="flex items-center gap-1.5 pl-1 flex-wrap">
                        <ProviderBadge provider={msg.provider} />
                        {msg.fallbackUsed && msg.requestedProvider && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0 font-semibold flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {msg.requestedProvider} indisponível
                            </span>
                        )}
                        {msg.tokens && <span className="text-[9px] text-slate-400">{msg.tokens.toLocaleString('pt-BR')} tokens</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function FloatingChat() {
    // ── Auth: pega os dados reais do usuário logado ───────────────────────────
    const usuario = useAuthStore((s) => s.usuario)

    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [unread, setUnread] = useState(0)
    const [selectedModel, setSelectedModel] = useState('')
    const [docxAnalisando, setDocxAnalisando] = useState(false)
    const [docxAnexado, setDocxAnexado] = useState<{ nome: string; contexto: string; contextInjected?: boolean } | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesRef = useRef<ChatMessage[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Carregar modelo salvo
    useEffect(() => {
        try {
            const savedModel = localStorage.getItem('chatSelectedModel')
            if (savedModel) setSelectedModel(savedModel)
        } catch { /* silencioso */ }
    }, [])

    // Manter messagesRef sincronizado com messages
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        if (open) {
            setUnread(0)
            setTimeout(() => {
                scrollToBottom()
                textareaRef.current?.focus()
            }, 100)
        }
    }, [open, scrollToBottom])

    useEffect(() => {
        if (open) scrollToBottom()
    }, [messages, open, scrollToBottom])

    // ── Upload e análise de DOCX ──────────────────────────────────────────────
    const handleDocxUpload = useCallback(async (file: File) => {
        if (!file.name.match(/\.(docx)$/i)) {
            alert('Apenas arquivos .docx são suportados.')
            return
        }
        setDocxAnalisando(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await api.post('/api/admin/modelos/analisar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            const data = res.data?.data
            if (!data) throw new Error('Resposta inválida da análise')

            const variavelList = (data.variaveis || []).map((v: any) => `{{${v.chave}}} — ${v.label}`).join('\n')
            const sysVarList = (data.variaveisSistema || []).join(', ')

            const contexto = `[DOCUMENTO ANALISADO PELO USUÁRIO]
Arquivo: ${file.name}
Variáveis detectadas (${data.variaveis?.length || 0}):
${variavelList || '(nenhuma)'}
Variáveis de sistema: ${sysVarList || '(nenhuma)'}
Total de tags: ${data.totalTags || 0}
HTML do documento (resumo): ${(data.conteudoHtml || '').slice(0, 800)}...

INSTRUÇÕES IMPORTANTES: O usuário acabou de anexar este documento e está enviando uma mensagem. Apresente de forma resumida o que foi encontrado (tipo de documento, variáveis detectadas). Faça perguntas para confirmar nome, descrição e ajustes necessários nos campos. NÃO use a ferramenta criar_modelo sem receber confirmação explícita do usuário.`

            // Mantém o contexto do documento ativo — será injetado na próxima mensagem do usuário
            setDocxAnexado({ nome: file.name, contexto })

            // Exibe apenas uma notificação no chat — NÃO chama o LLM automaticamente.
            // O LLM só será acionado quando o usuário enviar a próxima mensagem.
            const msgAnexo: ChatMessage = {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: `📎 **Documento analisado: ${file.name}**\n${data.variaveis?.length || 0} variável(is) encontrada(s): ${(data.variaveis || []).map((v: any) => `{{${v.chave}}}`).join(', ') || '(nenhuma)'}.\n\nDigite uma mensagem para continuar — posso criar o modelo, ajustar campos ou tirar dúvidas sobre o documento.`,
                docxAnexo: { nome: file.name },
            }
            setMessages(prev => [...prev, msgAnexo])
        } catch (e: any) {
            const rawErr: string = e?.response?.data?.error || e?.message || ''
            const friendlyMsg = rawErr.includes('402') || rawErr.toLowerCase().includes('cota') || rawErr.toLowerCase().includes('esgotad')
                ? 'O serviço de análise de documentos está temporariamente indisponível. Tente novamente em alguns minutos.'
                : rawErr
                    ? `Não foi possível analisar o documento: ${rawErr}`
                    : 'Não foi possível analisar o documento. Verifique se é um arquivo .docx válido e tente novamente.'
            setDocxAnexado(null) // limpa em caso de erro
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: friendlyMsg,
                error: true,
            }])
        } finally {
            setDocxAnalisando(false)
            // NÃO limpa docxAnexado aqui — persiste até o usuário enviar a próxima mensagem
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }, [])  // sendMessageWithContext será adicionado abaixo via ref

    const sendMessageWithContextRef = useRef<((text: string, extraCtx?: string) => Promise<void>) | null>(null)

    const sendMessageWithContext = useCallback(async (text: string, extraContext?: string) => {
        const content = text.trim()
        if (!content || !usuario) return

        setLoading(true)
        try {
            const baseHistory: LLMMessage[] = messagesRef.current.map(m => ({ role: m.role, content: m.content }))

            // Se há contexto extra (documento analisado), injeta como mensagem de sistema
            const history: LLMMessage[] = extraContext
                ? [...baseHistory, { role: 'system', content: extraContext }, { role: 'user', content }]
                : [...baseHistory, { role: 'user', content }]

            const res = await llmChat({
                messages: history,
                mode: 'chat',
                selectedModel: selectedModel || undefined,
                userAuth: { nome: usuario.name, email: usuario.email, role: usuario.role },
            })

            if (res.success) {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.data.content,
                    provider: res.data.provider,
                    model: res.data.model,
                    tokens: res.data.usage?.totalTokens,
                }])
                if (!open) setUnread(u => u + 1)
            } else {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.error ?? 'Erro ao processar.',
                    error: true,
                }])
            }
        } catch (e: any) {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: e?.message ?? 'Erro inesperado.',
                error: true,
            }])
        } finally {
            setLoading(false)
        }
    }, [open, selectedModel, usuario])

    // Atualiza a ref para o handleDocxUpload poder usar sendMessageWithContext
    useEffect(() => {
        sendMessageWithContextRef.current = sendMessageWithContext
    }, [sendMessageWithContext])

    const sendMessage = useCallback(async (text: string) => {
        const content = text.trim()
        if (!content || loading || !usuario) return

        const userMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            role: 'user',
            content,
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const baseHistory = messagesRef.current.map(m => ({ role: m.role, content: m.content }))

            // Se há documento analisado pendente E o contexto ainda não foi injetado,
            // injeta como mensagem de sistema antes da mensagem do usuário.
            // O docxAnexado persiste até o chat ser limpo — o HTML completo fica no cache server-side.
            const needsContextInjection = docxAnexado?.contexto && !docxAnexado.contextInjected
            const history: LLMMessage[] = needsContextInjection
                ? [...baseHistory, { role: 'system' as const, content: docxAnexado.contexto }, { role: 'user' as const, content }]
                : [...baseHistory, { role: 'user' as const, content }]

            // Marca o contexto como já injetado (não repete em mensagens futuras, economiza tokens)
            if (needsContextInjection) {
                setDocxAnexado(prev => prev ? { ...prev, contextInjected: true } : null)
            }

            // ── Envia os dados reais do usuário autenticado ──────────────────
            const res = await llmChat({
                messages: history,
                mode: 'chat',
                selectedModel: selectedModel || undefined,
                userAuth: {
                    nome: usuario.name,
                    email: usuario.email,
                    role: usuario.role,
                },
            })

            if (res.success) {
                const assistantMsg: ChatMessage = {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.data.content,
                    provider: res.data.provider,
                    model: res.data.model,
                    tokens: res.data.usage?.totalTokens,
                    fallbackUsed: (res.data as any).fallbackUsed ?? false,
                    requestedProvider: (res.data as any).requestedProvider ?? undefined,
                }
                setMessages(prev => [...prev, assistantMsg])
                if (!open) setUnread(u => u + 1)
            } else {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.error ?? `Doc's Cataguases — Ocorreu um erro ao processar sua pergunta. Tente novamente.`,
                    error: true,
                }])
            }
        } catch (unexpectedErr: any) {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: unexpectedErr?.message?.startsWith("Doc's Cataguases")
                    ? unexpectedErr.message
                    : `Doc's Cataguases — Erro inesperado. Tente novamente.`,
                error: true,
            }])
        } finally {
            setLoading(false)
        }
    }, [loading, open, selectedModel, usuario, docxAnexado])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const handleClear = () => { setMessages([]); setDocxAnexado(null) }
    const isEmpty = messages.length === 0

    // Não renderiza se o usuário não estiver logado
    if (!usuario) return null

    const nomeUsuario = usuario.name
    const roleLabel = ROLE_LABEL[usuario.role] ?? usuario.role

    return (
        <>
            {/* Botão flutuante */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
                {!open && (
                    <div className="bg-white border border-slate-200 shadow-lg shadow-slate-200/60 rounded-full px-3.5 py-1.5 text-xs text-slate-600 font-semibold animate-in fade-in slide-in-from-bottom-2 duration-300 backdrop-blur-sm">
                        Assistente Doc's ✨
                    </div>
                )}
                <button
                    onClick={() => setOpen(o => !o)}
                    className={`w-14 h-14 rounded-full shadow-xl relative transition-all duration-300 flex items-center justify-center ${open
                        ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-400/30'
                        : 'bg-gradient-to-br from-primary to-[#0D3F8F] hover:from-primary/95 hover:to-[#0D3F8F]/95 chat-pulse shadow-primary/30'
                        }`}
                >
                    {open
                        ? <ChevronDown className="h-6 w-6 text-white" />
                        : <Bot className="h-6 w-6 text-white drop-shadow-sm" />
                    }
                    {!open && unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-sm">
                            {unread}
                        </span>
                    )}
                </button>
            </div>

            {/* Janela do chat */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-[390px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-[#0D3F8F] text-white shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/20">
                                <Sparkles className="h-4.5 w-4.5 text-white drop-shadow" />
                            </div>
                            <div>
                                <p className="text-sm font-bold leading-tight">Assistente Doc's</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                                    </span>
                                    {/* Mostra o role do usuário logado no header */}
                                    <p className="text-[10px] text-white/75 leading-tight">{nomeUsuario} · {roleLabel}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                                    title="Limpar conversa"
                                >
                                    <Trash2 className="h-4 w-4 text-white/80" />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-slate-50/40">
                        {isEmpty ? (
                            <div className="space-y-4">
                                {/* Mensagem de boas-vindas personalizada com nome e role */}
                                <div className="flex gap-2 items-start">
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 shadow-sm">
                                        Olá, <strong>{nomeUsuario}</strong>! Sou o assistente do <strong>Doc's Cataguases</strong>.
                                        {' '}Estou ciente de que você é <strong>{roleLabel}</strong> e vou considerar suas permissões em todas as respostas.
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <p className="text-[10px] text-slate-400 text-center font-semibold uppercase tracking-wider">Sugestões</p>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {getSugestoes(usuario.role).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                className="text-[11px] px-3 py-1.5 bg-white hover:bg-primary/5 hover:text-primary border border-slate-200 hover:border-primary/30 rounded-full text-slate-600 transition-all font-medium text-left shadow-sm hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
                        )}

                        {loading && (
                            <div className="flex gap-2 items-start">
                                <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-slate-100 bg-white shrink-0">
                        {/* Seletor de modelo */}
                        <div className="mb-2 flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-orange-400 shrink-0" />
                            <select
                                value={selectedModel}
                                onChange={e => {
                                    setSelectedModel(e.target.value)
                                    try { localStorage.setItem('chatSelectedModel', e.target.value) } catch { /* noop */ }
                                }}
                                className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                            >
                                {MODELS.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}{m.sub ? ` — ${m.sub}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Preview de documento anexado */}
                        {docxAnexado && (
                            <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs text-blue-700">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1">{docxAnexado.nome}</span>
                                <button onClick={() => setDocxAnexado(null)} className="text-blue-400 hover:text-blue-600">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex gap-2 items-end bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-white transition-all shadow-sm">
                            {/* Botão de anexar DOCX */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || docxAnalisando}
                                title="Anexar documento DOCX para criar modelo"
                                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
                            >
                                {docxAnalisando
                                    ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    : <Paperclip className="h-4 w-4" />
                                }
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".docx"
                                className="hidden"
                                onChange={e => {
                                    const file = e.target.files?.[0]
                                    if (file) handleDocxUpload(file)
                                }}
                            />

                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digite sua dúvida... (Enter para enviar)"
                                className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 bg-transparent text-sm p-0 min-h-[36px] max-h-[120px]"
                                rows={1}
                                disabled={loading || docxAnalisando}
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || loading || docxAnalisando}
                                className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[#0D3F8F] hover:from-primary/90 hover:to-[#0D3F8F]/90 flex items-center justify-center shrink-0 mb-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 disabled:shadow-none"
                            >
                                {loading
                                    ? <RefreshCw className="h-3.5 w-3.5 text-white animate-spin" />
                                    : <Send className="h-3.5 w-3.5 text-white" />
                                }
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center mt-1.5">Shift+Enter para nova linha · 📎 para anexar DOCX</p>
                    </div>
                </div>
            )}
        </>
    )
}
