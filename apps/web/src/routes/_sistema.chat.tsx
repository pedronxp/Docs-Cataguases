import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import {
    Plus, Trash2, Bot, User as UserIcon, Send, Sparkles, Loader2, Cpu, Globe, Settings, Info, Paperclip, X, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow, format, startOfMonth, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_sistema/chat')({
    component: ChatPage,
})

const MODELS = [
    { value: 'llama3.1-8b', provider: 'cerebras', label: 'Cerebras Llama 3.1 8B' },
    { value: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large 2' },
    { value: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Groq Llama 3.3 70B' },
    { value: 'google/gemini-2.5-flash', provider: 'openrouter', label: 'Gemini 2.5 Flash' },
    { value: 'anthropic/claude-3.5-sonnet', provider: 'openrouter', label: 'Claude 3.5 Sonnet' },
    { value: 'moonshot-v1-8k', provider: 'kimi', label: 'Moonshot v1 8K' },
    { value: 'moonshot-v1-32k', provider: 'kimi', label: 'Moonshot v1 32K' },
]

type Session = { id: string; titulo: string; updatedAt: string; provider: string; model: string; _count: { mensagens: number } }
type Message = { id?: string; role: 'user' | 'assistant' | 'system'; content: string; provider?: string; model?: string; tokens?: number; anexo?: { id: string, titulo: string, numeroOficial?: string } }

function renderMarkdown(text: string): string {
    const lines = text.split('\n')
    const result: string[] = []
    let inUl = false
    let inOl = false

    const applyInline = (l: string) => {
        l = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        l = l.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
        l = l.replace(/`([^`]+)`/g, '<code class="bg-muted text-primary px-1.5 py-0.5 rounded-md text-[13px] font-mono">$1</code>')
        l = l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, linkText, href) => {
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
        let l = rawLine
        
        // Handle code blocks (simple version for now)
        if (l.startsWith('```')) {
            closeLists()
            result.push(`<div class="bg-slate-950 text-slate-50 p-4 rounded-xl my-3 font-mono text-sm overflow-x-auto shadow-sm border border-slate-800">`)
            continue
        } else if (l === '```' || l.startsWith('```')) {
            result.push(`</div>`)
            continue
        }

        l = applyInline(rawLine)

        if (rawLine.startsWith('### ')) {
            closeLists()
            result.push(`<h3 class="text-base font-bold text-slate-800 mt-4 mb-2">${l.slice(4)}</h3>`)
        } else if (rawLine.startsWith('## ')) {
            closeLists()
            result.push(`<h2 class="text-lg font-bold text-slate-900 mt-5 mb-2">${l.slice(3)}</h2>`)
        } else if (rawLine.startsWith('# ')) {
            closeLists()
            result.push(`<h1 class="text-xl font-bold text-slate-900 mt-6 mb-3">${l.slice(2)}</h1>`)
        } else if (rawLine.startsWith('> ')) {
            closeLists()
            result.push(`<blockquote class="border-l-4 border-primary/40 pl-4 text-slate-600 italic my-3 text-[15px] bg-slate-50 py-2 rounded-r-lg">${l.slice(2)}</blockquote>`)
        } else if (rawLine.match(/^[-*] /)) {
            if (inOl) { result.push('</ol>'); inOl = false }
            if (!inUl) { result.push('<ul class="list-disc pl-5 space-y-1.5 my-3 text-[15px] text-slate-700 marker:text-slate-400">'); inUl = true }
            result.push(`<li>${l.slice(2)}</li>`)
        } else if (rawLine.match(/^\d+\. /)) {
            if (inUl) { result.push('</ul>'); inUl = false }
            if (!inOl) { result.push('<ol class="list-decimal pl-5 space-y-1.5 my-3 text-[15px] text-slate-700 marker:text-slate-400">'); inOl = true }
            result.push(`<li>${l.replace(/^\d+\. /, '')}</li>`)
        } else {
            closeLists()
            result.push(rawLine.trim() === '' ? '<br />' : `<p class="leading-relaxed text-[15px] text-slate-700 mb-2">${l}</p>`)
        }
    }

    closeLists()
    return result.join('')
}

function ChatPage() {
    const { usuario } = useAuthStore()
    const { toast } = useToast()
    const [sessions, setSessions] = useState<Session[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [loadingSessions, setLoadingSessions] = useState(true)
    
    // Anexo state
    const [anexoId, setAnexoId] = useState<string | null>(null)
    const [anexoTitulo, setAnexoTitulo] = useState<string | null>(null)
    const [portarias, setPortarias] = useState<any[]>([])
    const [loadingPortarias, setLoadingPortarias] = useState(false)
    const [showAttachDialog, setShowAttachDialog] = useState(false)

    const [selectedModel, setSelectedModel] = useState<string>('llama3.1-8b')
    
    // Token Limits
    const [tokensUsados, setTokensUsados] = useState(0)
    const [limiteTokens, setLimiteTokens] = useState(500000)
    
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchSessions()
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchSessions = async () => {
        try {
            setLoadingSessions(true)
            const { data } = await api.get('/api/llm/sessions')
            setSessions(data.sessions || [])
            setTokensUsados(data.tokensUsadosMes || 0)
            setLimiteTokens(data.limiteTokens || 500000)
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao carregar histórico de conversas', variant: 'destructive' })
        } finally {
            setLoadingSessions(false)
        }
    }

    const loadSession = async (id: string) => {
        try {
            setActiveSessionId(id)
            setMessages([])
            const { data } = await api.get(`/api/llm/sessions/${id}`)
            if (data.session) {
                setMessages(data.session.mensagens.filter((m: any) => m.role !== 'system'))
            }
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao carregar mensagens da sessão', variant: 'destructive' })
        }
    }

    const startNewChat = () => {
        setActiveSessionId(null)
        setMessages([])
        setAnexoId(null)
        setAnexoTitulo(null)
    }

    const requestPortarias = async () => {
        if (portarias.length > 0) return
        setLoadingPortarias(true)
        try {
            const res = await api.get('/api/portarias')
            setPortarias(res.data || [])
        } catch { } 
        setLoadingPortarias(false)
    }

    const deleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Deseja excluir esta conversa para sempre?')) return
        try {
            await api.delete(`/api/llm/sessions/${id}`)
            setSessions(s => s.filter(x => x.id !== id))
            if (activeSessionId === id) startNewChat()
            toast({ title: 'Sucesso', description: 'Conversa deletada' })
        } catch {
            toast({ title: 'Erro', description: 'Erro ao deletar conversa', variant: 'destructive' })
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || sending) return
        if (tokensUsados >= limiteTokens) {
            toast({ title: 'Atenção', description: 'Limite mensal de tokens excedido!', variant: 'destructive' })
            return
        }

        const userText = input.trim()
        setInput('')
        
        // Optimistic UI
        const optimisticAnexo = anexoId && anexoTitulo ? { id: anexoId, titulo: anexoTitulo } : undefined
        const tempMsgs: Message[] = [...messages, { role: 'user', content: userText, anexo: optimisticAnexo }]
        setMessages(tempMsgs)
        setSending(true)

        try {
            const providerInfo = MODELS.find(m => m.value === selectedModel)?.provider || 'auto'
            const payload = {
                sessionId: activeSessionId,
                message: userText,
                model: selectedModel,
                provider: providerInfo,
                anexoId: anexoId
            }

            // Limpa o anexo visual enquanto envia
            setAnexoId(null)
            setAnexoTitulo(null)

            const { data } = await api.post('/api/llm/chat-session', payload)
            
            if (data.success) {
                setMessages([...tempMsgs, data.message])
                setTokensUsados(data.tokensUsadosMes)
                
                if (!activeSessionId) {
                    setActiveSessionId(data.sessionId)
                    fetchSessions() // Refresh sidebar with new title
                }
            }
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Erro ao comunicar com a Inteligência Artificial'
            toast({ title: 'Erro', description: errMsg, variant: 'destructive' })
            // Remove optimistic message if failed
            setMessages(messages) 
        } finally {
            setSending(false)
        }
    }

    const percentUsed = Math.min(100, (tokensUsados / limiteTokens) * 100)
    const dataRenovacao = format(startOfMonth(addMonths(new Date(), 1)), "dd/MM/yyyy", { locale: ptBR })
    const tokensRestantes = Math.max(0, limiteTokens - tokensUsados)

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
            {/* Sidebar Histórico */}
            <div className="w-72 border-r bg-muted/20 hidden md:flex flex-col">
                <div className="p-4 border-b">
                    <Button onClick={startNewChat} className="w-full gap-2 justify-start font-medium" variant="outline">
                        <Plus className="w-4 h-4" />
                        Nova Conversa
                    </Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                        {loadingSessions ? (
                            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : sessions.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground p-4">Nenhuma conversa anterior.</p>
                        ) : (
                            sessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => loadSession(s.id)}
                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors group flex items-center justify-between ${
                                        activeSessionId === s.id ? 'bg-secondary font-medium' : 'hover:bg-muted'
                                    }`}
                                >
                                    <div className="flex flex-col truncate pr-2">
                                        <span className="truncate">{s.titulo}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(s.updatedAt), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </div>
                                    <Trash2 
                                        onClick={(e) => deleteSession(e, s.id)}
                                        className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0" 
                                    />
                                </button>
                            ))
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-muted/10 shrink-0">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="space-y-1.5 relative group cursor-pointer hover:bg-slate-100 p-2 -mx-2 rounded-xl transition-colors">
                                <div className="flex justify-between text-xs text-muted-foreground pb-0.5 font-medium items-center">
                                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Tokens Disponíveis</span>
                                    <span>{tokensRestantes.toLocaleString('pt-BR')}</span>
                                </div>
                                <Progress value={percentUsed} className="h-1.5" />
                                {percentUsed >= 90 ? (
                                    <p className="text-[10px] text-destructive pt-1 font-medium">Atenção: Limite mensal próximo de estourar.</p>
                                ) : (
                                    <p className="text-[10px] text-slate-400 pt-1 font-medium group-hover:text-primary transition-colors flex items-center justify-between">
                                        Clique p/ Configurações <Settings className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                    </p>
                                )}
                            </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-primary" />
                                    Configurações da IA
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                                <div className="space-y-4 rounded-xl border p-4 bg-slate-50/50">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Plano Atual</span>
                                        <span className="font-semibold text-primary">Ilimitado (Padrão)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Limite Mensal</span>
                                        <span className="font-medium text-slate-700">{limiteTokens.toLocaleString('pt-BR')} tokens</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Tokens Consumidos</span>
                                        <span className="font-medium text-slate-700">{tokensUsados.toLocaleString('pt-BR')} tokens</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Tokens Restantes</span>
                                        <span className="font-bold text-emerald-600">{tokensRestantes.toLocaleString('pt-BR')}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex gap-3 items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-blue-900">Renovação de Tokens</p>
                                            <p className="text-xs text-blue-800/80 leading-relaxed">
                                                Seu saldo de tokens será redefinido automaticamente e gratuitamente no dia <strong>{dataRenovacao}</strong>.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 items-start bg-slate-100 p-3 rounded-xl">
                                        <Bot className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-700">Identidade do Chat</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                A IA sabe que seu cargo é <strong>{usuario?.role}</strong> e adapta as respostas para a sua atuação.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col h-full relative bg-white dark:bg-slate-950">
                {/* Header Sub-Bar */}
                <div className="h-14 border-b flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-[15px] text-slate-800 dark:text-slate-200">Doc's IA Premium</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="h-9 w-[240px] text-sm bg-slate-50 border-slate-200 shadow-sm focus:ring-primary/20 transition-all rounded-xl">
                                <SelectValue placeholder="Selecione o Modelo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                {MODELS.map(m => (
                                    <SelectItem key={m.value} value={m.value} className="text-sm py-2">
                                        <div className="flex items-center justify-between w-full pr-2">
                                            <span className="font-medium text-slate-700">{m.label}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded-full ml-3">{m.provider}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 w-full relative">
                    <div className="max-w-4xl mx-auto w-full px-4 md:px-8 pt-8 pb-32 flex flex-col gap-8 min-h-full">
                        {messages.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 opacity-80 mt-20">
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-inner border border-white dark:border-slate-800">
                                    <Sparkles className="w-8 h-8 text-primary/60" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Como posso ajudar hoje?</h3>
                                    <p className="text-[15px] text-slate-500 max-w-md">Selecione o raciocínio neural no topo e envie sua mensagem para iniciar a inteligência colaborativa.</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isUser = msg.role === 'user'
                                return (
                                    <div key={idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex gap-4 md:gap-5 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                                            <Avatar className={`w-9 h-9 shrink-0 shadow-sm border-2 border-white ${isUser ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'}`}>
                                                <AvatarFallback>
                                                    {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                            
                                            <div className="flex flex-col gap-1.5 min-w-0">
                                                {!isUser && (
                                                    <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 ml-1">Doc's IA</span>
                                                )}
                                                
                                                <div className={`${
                                                    isUser 
                                                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-5 py-3.5 rounded-3xl rounded-tr-sm shadow-sm' 
                                                        : 'bg-transparent text-slate-800 dark:text-slate-200 pt-1'
                                                }`}>
                                                    {isUser && msg.anexo && (
                                                        <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg mb-2 w-max max-w-full">
                                                            <FileText className="w-3.5 h-3.5 opacity-80 shrink-0" />
                                                            <span className="text-[11px] font-medium opacity-90 truncate">Analisando: {msg.anexo.titulo}</span>
                                                        </div>
                                                    )}
                                                    {isUser ? (
                                                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    ) : (
                                                        <div 
                                                            className="text-[15px] leading-relaxed break-words"
                                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                                        />
                                                    )}
                                                </div>
                                                
                                                {!isUser && msg.model && (
                                                    <div className="flex items-center gap-1.5 mt-2 opacity-60">
                                                        <span className="text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                                                            <Sparkles className="w-3 h-3 text-emerald-500" /> {msg.provider} • {msg.model.split('/').pop()}
                                                        </span>
                                                        {msg.tokens && (
                                                            <span className="text-[10px] font-medium text-slate-400">
                                                                {msg.tokens.toLocaleString('pt-BR')} tokens
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        {sending && (
                            <div className="flex w-full justify-start">
                                <div className="flex gap-4 md:gap-5 max-w-[75%]">
                                    <Avatar className="w-9 h-9 shrink-0 shadow-sm border-2 border-white bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
                                        <AvatarFallback><Bot className="w-4 h-4 animate-pulse" /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-1.5 mt-2">
                                        <div className="flex items-center gap-1.5 h-8">
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" />
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce delay-75" />
                                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce delay-150" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="absolute bottom-6 left-0 right-0 px-4 md:px-8 pointer-events-none">
                    <div className="max-w-4xl mx-auto flex flex-col gap-2 relative pointer-events-auto">
                        {anexoTitulo && (
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl w-max ml-1 animate-in slide-in-from-bottom-2 shadow-sm">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span className="text-[13px] font-semibold text-indigo-700">Anexo: {anexoTitulo}</span>
                                <button onClick={() => { setAnexoId(null); setAnexoTitulo(null) }} className="hover:bg-indigo-200 p-1 rounded-full text-indigo-400 hover:text-indigo-700 transition-colors ml-2"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        )}
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[28px] blur opacity-60 group-focus-within:opacity-100 transition-opacity" />
                            <div className="relative flex flex-row items-center bg-white dark:bg-slate-900 rounded-[24px] shadow-lg border border-slate-200 dark:border-slate-800 p-1 pl-2">
                                <Dialog open={showAttachDialog} onOpenChange={(open) => { setShowAttachDialog(open); if(open) requestPortarias() }}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-slate-100 text-slate-500 shrink-0">
                                            <Paperclip className="w-4.5 h-4.5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Anexar Documento do Sistema</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-2 mt-4 max-h-[50vh] overflow-y-auto pr-1">
                                            {loadingPortarias ? (
                                                <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                                            ) : portarias.length === 0 ? (
                                                <div className="text-center p-6 space-y-2">
                                                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                                                    <p className="text-sm font-medium text-slate-500">Nenhum documento encontrado no seu setor.</p>
                                                </div>
                                            ) : (
                                                portarias.map(p => (
                                                    <button key={p.id} onClick={() => { setAnexoId(p.id); setAnexoTitulo(p.titulo); setShowAttachDialog(false) }} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors flex items-center justify-between gap-3 group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                                <FileText className="w-4.5 h-4.5 text-blue-500" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-semibold truncate text-slate-700">{p.titulo}</span>
                                                                <span className="text-[11px] text-slate-400 font-medium">Doc: {p.numeroOficial || 'S/N'} • Criado por {p.criadoPor?.name?.split(' ')[0]}</span>
                                                            </div>
                                                        </div>
                                                        <Plus className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))
                                            )}
                                            <p className="text-[11px] text-center text-slate-400 pt-2 font-medium">Os anexos vinculados processam o texto do documento e enviam para a Inteligência Artificial diretamente, sem duplicar o tamanho do banco de dados (ZCT Compliant).</p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <Input 
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            sendMessage()
                                        }
                                    }}
                                    placeholder={tokensUsados >= limiteTokens ? "Limite mensal excedido." : "Mande uma mensagem para a IA..."}
                                    disabled={sending || tokensUsados >= limiteTokens}
                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent h-12 text-[15px] px-5 w-full resize-none placeholder:text-slate-400"
                                />
                                <Button 
                                    disabled={sending || !input.trim() || tokensUsados >= limiteTokens}
                                    onClick={sendMessage}
                                    size="icon" 
                                    className="h-10 w-10 shrink-0 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm mt-1 mr-1 transition-transform active:scale-95 disabled:opacity-50"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                                </Button>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5 mt-1 mix-blend-multiply dark:mix-blend-normal">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                A inteligência artificial do sistema sabe seu cargo: {usuario?.role}. Considere verificar as informações importantes.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
