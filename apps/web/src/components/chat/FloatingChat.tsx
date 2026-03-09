import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { llmChat, type LLMMessage } from '@/services/llm.service'
import {
    Bot, X, Send, RefreshCw, ChevronDown, Sparkles,
    Zap, Globe, AlertTriangle, Trash2, Copy, Check
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
}

// ── Sugestões de perguntas iniciais ───────────────────────────────────────────
const SUGESTOES = [
    'Como criar uma nova portaria?',
    'Qual é o fluxo completo de publicação?',
    'O que são variáveis de sistema?',
    'Como configurar um novo secretário?',
    'O que significa status FALHA_PROCESSAMENTO?',
    'Como adicionar um modelo de documento?',
]

// ── Formatação de markdown simples ────────────────────────────────────────────
function renderMarkdown(text: string) {
    // Bold **texto**
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Código inline `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-primary px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Quebras de linha
    html = html.replace(/\n/g, '<br />')
    return html
}

// ── Bolha de mensagem ─────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(msg.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm">
                    {msg.content}
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-2 items-start group">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
                <div className={`relative max-w-[95%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm ${msg.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-white border border-slate-200 text-slate-800'}`}>
                    {msg.error
                        ? <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />{msg.content}</span>
                        : <span
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
                    <div className="flex items-center gap-1.5 pl-1">
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 border ${msg.provider === 'groq' ? 'text-purple-600 border-purple-200 bg-purple-50' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                            {msg.provider === 'groq' ? <Zap className="h-2.5 w-2.5 mr-0.5" /> : <Globe className="h-2.5 w-2.5 mr-0.5" />}
                            {msg.provider}
                        </Badge>
                        {msg.tokens && <span className="text-[9px] text-slate-400">{msg.tokens.toLocaleString('pt-BR')} tokens</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function FloatingChat() {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [unread, setUnread] = useState(0)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    const sendMessage = useCallback(async (text: string) => {
        const content = text.trim()
        if (!content || loading) return

        const userMsg: ChatMessage = {
            id: Math.random().toString(36).slice(2),
            role: 'user',
            content,
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            // Histórico de conversa (sem o system prompt — o backend injeta)
            const history: LLMMessage[] = [
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content },
            ]

            const res = await llmChat({
                messages: history,
                mode: 'chat', // prompt compacto + llama-3.1-8b-instant
            })

            if (res.success) {
                const assistantMsg: ChatMessage = {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.data.content,
                    provider: res.data.provider,
                    model: res.data.model,
                    tokens: res.data.usage?.totalTokens,
                }
                setMessages(prev => [...prev, assistantMsg])
                if (!open) setUnread(u => u + 1)
            } else {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.error ?? 'Ocorreu um erro ao processar sua pergunta. Tente novamente.',
                    error: true,
                }])
            }
        } catch (unexpectedErr: any) {
            // Garante que o loading nunca trava mesmo se algo inesperado acontecer
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).slice(2),
                role: 'assistant',
                content: unexpectedErr?.message ?? 'Erro inesperado. Tente novamente.',
                error: true,
            }])
        } finally {
            setLoading(false)
        }
    }, [loading, messages, open])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const handleClear = () => {
        setMessages([])
    }

    const isEmpty = messages.length === 0

    return (
        <>
            {/* Botão flutuante */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
                {!open && (
                    <div className="bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs text-slate-600 font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Assistente Doc's ✨
                    </div>
                )}
                <Button
                    onClick={() => setOpen(o => !o)}
                    className={`w-14 h-14 rounded-full shadow-xl relative transition-all duration-300 ${open ? 'bg-slate-700 hover:bg-slate-800' : 'bg-primary hover:bg-primary/90'}`}
                >
                    {open
                        ? <ChevronDown className="h-6 w-6 text-white" />
                        : <Bot className="h-6 w-6 text-white" />
                    }
                    {!open && unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-black flex items-center justify-center">
                            {unread}
                        </span>
                    )}
                </Button>
            </div>

            {/* Janela do chat */}
            {open && (
                <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-primary text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold leading-tight">Assistente Doc's</p>
                                <p className="text-[10px] text-white/70 leading-tight">Prefeitura de Cataguases</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                    title="Limpar conversa"
                                >
                                    <Trash2 className="h-4 w-4 text-white/80" />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
                        {isEmpty ? (
                            <div className="space-y-4">
                                <div className="flex gap-2 items-start">
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-slate-800 shadow-sm">
                                        Olá! Sou o assistente do <strong>Doc's Cataguases</strong>. Posso te ajudar com dúvidas sobre o sistema, fluxos de portarias, variáveis, permissões e muito mais. O que você precisa saber?
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 text-center font-medium">Sugestões</p>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {SUGESTOES.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                className="text-[11px] px-2.5 py-1.5 bg-slate-50 hover:bg-primary/5 hover:text-primary border border-slate-200 hover:border-primary/30 rounded-full text-slate-600 transition-colors font-medium"
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
                                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                    <div className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
                                        <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
                        <div className="flex gap-2 items-end bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Digite sua dúvida... (Enter para enviar)"
                                className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 bg-transparent text-sm p-0 min-h-[36px] max-h-[120px]"
                                rows={1}
                                disabled={loading}
                            />
                            <Button
                                size="icon"
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || loading}
                                className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 shrink-0 mb-0.5"
                            >
                                {loading
                                    ? <RefreshCw className="h-3.5 w-3.5 text-white animate-spin" />
                                    : <Send className="h-3.5 w-3.5 text-white" />
                                }
                            </Button>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center mt-1.5">Shift+Enter para nova linha • respostas com IA Groq/OpenRouter</p>
                    </div>
                </div>
            )}
        </>
    )
}
