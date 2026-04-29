import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { useNavigate } from '@tanstack/react-router'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { llmChat, type LLMMessage } from '@/services/llm.service'
import { useAuthStore } from '@/store/auth.store'
import { useChatSession } from '@/hooks/use-chat-session'
import { usePageContext } from '@/hooks/use-page-context'
import api from '@/lib/api'
import {
    X, Send, RefreshCw, Sparkles,
    Zap, Globe, AlertTriangle, Trash2, Copy, Check,
    Paperclip, FileText, Loader2, MessageSquare, Plus, Settings2, Cpu, Wand2
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
    searchMode?: boolean
    searchSources?: Array<{ title: string; url: string }>
}

// ── Modelos disponíveis para seleção manual (com mapeamento para provider) ───
const MODELS = [
    { value: '', provider: '',          label: 'Automatico recomendado', sub: 'Groq GPT-OSS 120B por padrao' },
    { value: 'openai/gpt-oss-120b', provider: 'groq', label: 'GPT-OSS 120B (Groq)', sub: 'Melhor desempenho online' },
    { value: 'openai/gpt-oss-20b', provider: 'groq', label: 'GPT-OSS 20B (Groq)', sub: 'Mais rapido para respostas curtas' },
    { value: 'llama-3.3-70b-versatile', provider: 'groq', label: 'Llama 3.3 70B (Groq)', sub: 'Fallback estavel no Groq' },
    { value: 'llama3.1-8b',    provider: 'cerebras', label: 'Llama 3.1 8B',     sub: 'Padrao e textos rapidos' },
    { value: 'llama3.3-70b',  provider: 'cerebras', label: 'Llama 3.3 70B',    sub: 'Tarefas complexas e longas' },
    { value: 'mistral-large-latest', provider: 'mistral', label: 'Mistral Large',      sub: 'Raciocinio avancado' },
    { value: 'moonshot-v1-8k', provider: 'kimi', label: 'Kimi (Moonshot 8K)', sub: 'Inteligencia chinesa' },
    { value: 'moonshot-v1-32k', provider: 'kimi', label: 'Kimi (Moonshot 32K)', sub: 'Janela estendida' },
    { value: 'google/gemma-3-27b-it:free', provider: 'openrouter', label: 'Gemma 3 27B (free)', sub: 'Google via OpenRouter' },
    { value: 'deepseek/deepseek-r1:free', provider: 'openrouter', label: 'DeepSeek R1 (free)', sub: 'Raciocinio via OpenRouter' },
    { value: 'qwen3:8b', provider: 'ollama', label: 'Ollama Local (Qwen 3 8B)', sub: 'Opcional, exige servidor com GPU/CPU' },
    { value: 'llama3.1:8b', provider: 'ollama', label: 'Ollama Local (Llama 3.1 8B)', sub: 'Opcional, exige servidor com GPU/CPU' },
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
        ollama: {
            cls: 'text-emerald-700 border-emerald-200 bg-emerald-50',
            icon: <Cpu className="h-2.5 w-2.5 mr-0.5" />,
            label: 'ollama local',
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
function improveDraftText(value: string): string {
    let text = value
        .trim()
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')

    const replacements: Array<[RegExp, string]> = [
        [/\bvc\b/gi, 'você'],
        [/\bpq\b/gi, 'por que'],
        [/\bq\b/gi, 'que'],
        [/\btb\b/gi, 'também'],
        [/\bobs\b/gi, 'observação'],
        [/\bpfv\b/gi, 'por favor'],
    ]
    for (const [pattern, replacement] of replacements) {
        text = text.replace(pattern, replacement)
    }

    text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)

    if (text && !/[.!?]$/.test(text)) {
        const questionStart = /^(como|qual|quais|quando|onde|por que|porque|quem|o que|me diga|explique|pode|consegue)\b/i
        text += questionStart.test(text) ? '?' : '.'
    }

    return text
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
    const [copied, setCopied] = useState(false)
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Cache do HTML sanitizado — só recomputa quando msg.content muda (P3 performance)
    const sanitizedHtml = useMemo(
        () => DOMPurify.sanitize(renderMarkdown(msg.content), {
            ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'br', 'a', 'h1', 'h2', 'h3', 'blockquote', 'hr', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'class', 'rel'],
            ALLOW_DATA_ATTR: false,
        }),
        [msg.content]
    )

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
            <div className="flex flex-col items-end gap-1">
                {msg.searchMode && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        <Globe className="h-3 w-3" /> Pesquisa web
                    </span>
                )}
                <div className="max-w-[82%] whitespace-pre-wrap rounded-3xl bg-[#f4f4f4] px-4 py-2.5 text-sm leading-relaxed text-slate-900">
                    {msg.content}
                </div>
            </div>
        )
    }

    return (
        <div className="group flex gap-3 items-start">
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 space-y-1">
                <div className={`relative max-w-[96%] rounded-2xl px-4 py-3 text-sm ${msg.error
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'text-slate-900'
                    }`}>
                    {msg.error
                        ? <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />{msg.content}</span>
                        : <div
                            className="leading-6"
                            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                        />
                    }
                    {!msg.error && (
                        <button
                            onClick={handleCopy}
                            className="absolute -right-1 top-2 rounded-lg p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
                            title="Copiar resposta"
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
                        {msg.searchSources && msg.searchSources.length > 0 && (
                            <span className="text-[9px] text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0 font-semibold flex items-center gap-0.5">
                                <Globe className="h-2.5 w-2.5" />
                                {msg.searchSources.length} fonte{msg.searchSources.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}
                {msg.searchSources && msg.searchSources.length > 0 && (
                    <div className="ml-1 mt-1 flex flex-wrap gap-1.5">
                        {msg.searchSources.slice(0, 3).map((source, index) => (
                            <a
                                key={`${source.url}-${index}`}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[10rem] truncate rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                                title={source.title}
                            >
                                {index + 1}. {source.title}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Persistência no localStorage ──────────────────────────────────────────────
const CHAT_STORAGE_KEY = (userId: string) => `docs_chat_messages_${userId}`
const CHAT_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas
const CHAT_MAX_MESSAGES = 20

interface StoredChat {
    messages: ChatMessage[]
    savedAt: number
}

function loadStoredMessages(userId: string): ChatMessage[] {
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY(userId))
        if (!raw) return []
        const stored: StoredChat = JSON.parse(raw)
        // Descarta se passou do TTL
        if (Date.now() - stored.savedAt > CHAT_TTL_MS) {
            localStorage.removeItem(CHAT_STORAGE_KEY(userId))
            return []
        }
        return stored.messages ?? []
    } catch {
        return []
    }
}

function saveMessages(userId: string, messages: ChatMessage[]) {
    try {
        const toSave = messages.slice(-CHAT_MAX_MESSAGES)
        const stored: StoredChat = { messages: toSave, savedAt: Date.now() }
        localStorage.setItem(CHAT_STORAGE_KEY(userId), JSON.stringify(stored))
    } catch { /* quota ou modo privado — silencioso */ }
}

function clearStoredMessages(userId: string) {
    try { localStorage.removeItem(CHAT_STORAGE_KEY(userId)) } catch { /* noop */ }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function FloatingChat() {
    // ── Auth: pega os dados reais do usuário logado ───────────────────────────
    const usuario = useAuthStore((s) => s.usuario)
    const navigate = useNavigate()

    // ── Hooks de sessão e contexto de página ─────────────────────────────────
    const { createSession, saveMessages: saveSessionMessages } = useChatSession()
    const { systemContext, portariaId } = usePageContext()
    const sessionIdRef = useRef<string | null>(null)

    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        // Carrega do localStorage na inicialização (se disponível)
        if (typeof window === 'undefined') return []
        try {
            // usuario ainda não disponível aqui — carregamos depois no useEffect
            return []
        } catch { return [] }
    })
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [unread, setUnread] = useState(0)
    const [selectedModel, setSelectedModel] = useState('')
    const [searchMode, setSearchMode] = useState(false)
    const [docxAnalisando, setDocxAnalisando] = useState(false)
    const [docxAnexado, setDocxAnexado] = useState<{ nome: string; contexto: string; contextInjected?: boolean } | null>(null)
    const [rateLimited, setRateLimited] = useState<{ until: Date | null }>({ until: null })
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const messagesRef = useRef<ChatMessage[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Carregar modelo salvo e mensagens anteriores (uma vez que o usuário está disponível)
    useEffect(() => {
        try {
            const savedModel = localStorage.getItem('chatSelectedModel')
            const saved = MODELS.find(m => m.value === savedModel)
            if (savedModel && saved && saved.provider !== 'ollama') {
                setSelectedModel(savedModel)
            } else if (savedModel) {
                localStorage.removeItem('chatSelectedModel')
            }
            setSearchMode(localStorage.getItem('chatSearchMode') === 'true')
        } catch { /* silencioso */ }
    }, [])

    // Carregar histórico salvo quando o usuário estiver disponível
    useEffect(() => {
        if (!usuario?.id) return
        const stored = loadStoredMessages(usuario.id)
        if (stored.length > 0) {
            setMessages(stored)
        }
    }, [usuario?.id])

    // Salvar mensagens no localStorage sempre que mudarem
    useEffect(() => {
        if (!usuario?.id || messages.length === 0) return
        saveMessages(usuario.id, messages)
    }, [messages, usuario?.id])

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
            // Criar sessão server-side se ainda não existir
            if (!sessionIdRef.current && usuario?.id) {
                createSession(
                    selectedModel ? MODELS.find(m => m.value === selectedModel)?.provider : undefined,
                    selectedModel || undefined
                ).then(sid => {
                    if (sid) sessionIdRef.current = sid
                })
            }
        }
    }, [open, scrollToBottom, createSession, selectedModel, usuario?.id])

    useEffect(() => {
        document.body.classList.toggle('assistant-chat-open', open)
        return () => document.body.classList.remove('assistant-chat-open')
    }, [open])

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
                searchMode,
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
                    searchSources: res.data.search?.results?.map(source => ({ title: source.title, url: source.url })),
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
    }, [open, selectedModel, searchMode, usuario])

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
            searchMode,
        }

        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const baseHistory = messagesRef.current.map(m => ({ role: m.role, content: m.content }))

            // Contexto de página (portaria aberta) + docx se presente
            const contextMessages: LLMMessage[] = []
            if (systemContext) {
                contextMessages.push({ role: 'system' as const, content: systemContext })
            }
            const needsContextInjection = docxAnexado?.contexto && !docxAnexado.contextInjected
            if (needsContextInjection) {
                contextMessages.push({ role: 'system' as const, content: docxAnexado.contexto })
            }

            const history: LLMMessage[] = [
                ...baseHistory,
                ...contextMessages,
                { role: 'user' as const, content }
            ]

            // Marca o contexto docx como já injetado (não repete em mensagens futuras, economiza tokens)
            if (needsContextInjection) {
                setDocxAnexado(prev => prev ? { ...prev, contextInjected: true } : null)
            }

            // ── Envia os dados reais do usuário autenticado ──────────────────
            const res = await llmChat({
                messages: history,
                mode: 'chat',
                selectedModel: selectedModel || undefined,
                searchMode,
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
                    searchSources: res.data.search?.results?.map(source => ({ title: source.title, url: source.url })),
                }
                setMessages(prev => [...prev, assistantMsg])
                if (!open) setUnread(u => u + 1)
                // Persistir sessão server-side (fire-and-forget — não bloqueia a UI)
                if (sessionIdRef.current) {
                    const allMessages = [...messagesRef.current, assistantMsg]
                    saveSessionMessages(sessionIdRef.current, allMessages).catch(() => {})
                }
            } else {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: res.error ?? `Doc's Cataguases — Ocorreu um erro ao processar sua pergunta. Tente novamente.`,
                    error: true,
                }])
            }
        } catch (unexpectedErr: any) {
            // Detecta 429 (rate limit) do axios e bloqueia o input até resetAt
            if (unexpectedErr?.response?.status === 429) {
                const data = unexpectedErr.response?.data ?? {}
                const resetAt = data.resetAt ? new Date(data.resetAt) : new Date(Date.now() + 60_000)
                setRateLimited({ until: resetAt })
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: data.error || 'Limite de mensagens atingido. Aguarde antes de enviar novamente.',
                    error: true,
                }])
            } else {
                setMessages(prev => [...prev, {
                    id: Math.random().toString(36).slice(2),
                    role: 'assistant',
                    content: unexpectedErr?.message?.startsWith("Doc's Cataguases")
                        ? unexpectedErr.message
                        : `Doc's Cataguases — Erro inesperado. Tente novamente.`,
                    error: true,
                }])
            }
        } finally {
            setLoading(false)
        }
    }, [loading, open, selectedModel, searchMode, usuario, docxAnexado, rateLimited, systemContext, saveSessionMessages])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    const handleClear = () => {
        setMessages([])
        setDocxAnexado(null)
        if (usuario?.id) clearStoredMessages(usuario.id)
        // Resetar sessão para que a próxima abertura crie uma nova
        sessionIdRef.current = null
    }
    const isEmpty = messages.length === 0

    // Não renderiza se o usuário não estiver logado
    if (!usuario) return null

    const nomeUsuario = usuario.name
    const roleLabel = ROLE_LABEL[usuario.role] ?? usuario.role

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border transition-all duration-200 ${
                    open
                        ? 'border-slate-900 bg-slate-950 text-white shadow-sm'
                        : 'border-[#e0e2e6] bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                aria-label={open ? "Fechar Assistente Doc's" : "Abrir Assistente Doc's"}
                title="Assistente Doc's"
            >
                <Sparkles className="h-5 w-5" />
                {!open && unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Janela do chat */}
            {open && (
                <div className="fixed right-0 top-14 z-50 flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl shadow-slate-900/10 animate-in fade-in slide-in-from-right-4 duration-200 sm:w-[440px]">
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 text-slate-950">
                        <div className="flex items-center gap-2.5">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white shadow-sm">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold leading-tight">Assistente Doc's</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    {/* Mostra o role do usuário logado no header */}
                                    <p className="truncate text-[11px] leading-tight text-slate-500">{nomeUsuario} · {roleLabel}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                    title="Limpar conversa"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                title="Fechar"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Mensagens */}
                    <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto bg-white px-4 py-5">
                        {isEmpty ? (
                            <div className="flex min-h-full flex-col justify-center space-y-6 pb-10">
                                {/* Mensagem de boas-vindas personalizada com nome e role */}
                                <div className="mx-auto max-w-sm text-center">
                                    <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-slate-950 text-white shadow-sm">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold tracking-normal text-slate-950">Como posso ajudar?</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Olá, <strong className="font-semibold text-slate-800">{nomeUsuario}</strong>. Vou responder considerando seu perfil de <strong className="font-semibold text-slate-800">{roleLabel}</strong> no Doc's Cataguases.
                                    </p>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="grid gap-2">
                                        {getSugestoes(usuario.role).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => sendMessage(s)}
                                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
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
                            <div className="flex gap-3 items-start">
                                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm">
                                    <Sparkles className="h-3.5 w-3.5" />
                                </div>
                                <div className="rounded-2xl px-4 py-3">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-2">
                        {/* Seletor de modelo */}
                        <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                            <Settings2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <select
                                value={selectedModel}
                                onChange={e => {
                                    setSelectedModel(e.target.value)
                                    try { localStorage.setItem('chatSelectedModel', e.target.value) } catch { /* noop */ }
                                }}
                                className="min-w-0 flex-1 cursor-pointer bg-transparent text-[12px] text-slate-700 outline-none"
                            >
                                {MODELS.map(m => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}{m.sub ? ` — ${m.sub}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Ações rápidas de portaria (visível apenas quando em /portarias/:id) */}
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchMode(prev => {
                                        const next = !prev
                                        try { localStorage.setItem('chatSearchMode', String(next)) } catch { /* noop */ }
                                        return next
                                    })
                                }}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                                    searchMode
                                        ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                                title="Quando ligado, a pergunta tambem e consultada no DuckDuckGo antes da resposta."
                            >
                                <Globe className="h-3.5 w-3.5" />
                                Pesquisa web
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setInput(prev => improveDraftText(prev))
                                    setTimeout(() => textareaRef.current?.focus(), 0)
                                }}
                                disabled={!input.trim() || loading || docxAnalisando}
                                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                                title="Aprimorar pontuacao e clareza do texto digitado localmente."
                            >
                                <Wand2 className="h-3.5 w-3.5" />
                                Aprimorar
                            </button>
                        </div>

                        {portariaId && (
                            <div className="flex gap-2 mb-2 flex-wrap">
                                <button
                                    onClick={() => navigate({ to: '/administrativo/portarias/$id', params: { id: portariaId } })}
                                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                    Ver esta portaria →
                                </button>
                                <button
                                    onClick={() => navigate({ to: '/administrativo/portarias/novo' })}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                    <Plus className="h-3 w-3" /> Nova portaria
                                </button>
                            </div>
                        )}

                        {/* Preview de documento anexado */}
                        {docxAnexado && (
                            <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate flex-1">{docxAnexado.nome}</span>
                                <button onClick={() => setDocxAnexado(null)} className="text-slate-400 hover:text-slate-700">
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-end gap-2 rounded-3xl border border-slate-300 bg-white px-3 py-2 shadow-[0_2px_12px_rgba(15,23,42,0.08)] transition-all focus-within:border-slate-400 focus-within:shadow-[0_6px_24px_rgba(15,23,42,0.12)]">
                            {/* Botão de anexar DOCX */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || docxAnalisando}
                                title="Anexar documento DOCX para criar modelo"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40"
                            >
                                {docxAnalisando
                                    ? <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
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
                                placeholder={searchMode ? 'Pergunte com pesquisa web...' : 'Digite sua dúvida... (Enter para enviar)'}
                                className="min-h-[40px] flex-1 resize-none border-none bg-transparent p-1 text-sm leading-6 shadow-none focus-visible:ring-0"
                                rows={1}
                                disabled={loading || docxAnalisando || (rateLimited.until !== null && new Date() < rateLimited.until)}
                            />
                            <button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || loading || docxAnalisando || (rateLimited.until !== null && new Date() < rateLimited.until)}
                                className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                                title="Enviar"
                            >
                                {loading
                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    : <Send className="h-3.5 w-3.5" />
                                }
                            </button>
                        </div>
                        {rateLimited.until && new Date() < rateLimited.until && (
                            <p className="text-xs text-amber-600 mt-1 text-center">
                                Limite atingido. Liberado em {rateLimited.until.toLocaleTimeString('pt-BR')}.
                            </p>
                        )}
                        <p className="mt-1.5 text-center text-[10px] text-slate-400">Shift+Enter para nova linha · use o clipe para anexar DOCX</p>
                    </div>
                </div>
            )}
        </>
    )
}
