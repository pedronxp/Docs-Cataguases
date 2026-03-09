import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
    RefreshCw, Zap, Globe, ArrowLeftRight, CheckCircle2, XCircle,
    Clock, Cpu, MessageSquare, AlertTriangle, Send, BarChart3
} from 'lucide-react'
import {
    getLLMStatus, setLLMProvider, llmChat,
    type LLMStatus, type LLMProvider, type LLMRequestLog
} from '@/services/llm.service'

export const Route = createFileRoute('/_sistema/admin/llm')({
    component: LLMDashboard,
})

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
    return n.toLocaleString('pt-BR')
}
function fmtMs(ms: number) {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
function fmtTs(ts: string) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function credColor(remaining: number | undefined, total: number | undefined) {
    if (remaining == null || total == null || total === 0) return 'text-slate-400'
    const pct = remaining / total
    if (pct > 0.5) return 'text-emerald-600'
    if (pct > 0.2) return 'text-amber-600'
    return 'text-red-600'
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="flex flex-col items-center p-3 bg-slate-50 rounded-lg border border-slate-200 text-center min-w-[80px]">
            <span className="text-lg font-bold text-slate-800">{typeof value === 'number' ? fmtNum(value) : value}</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-0.5">{label}</span>
            {sub && <span className="text-[10px] text-slate-400 mt-0.5">{sub}</span>}
        </div>
    )
}

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({
    name,
    label,
    icon: Icon,
    isActive,
    onSwitch,
    switching,
    stats,
}: {
    name: LLMProvider
    label: string
    icon: React.ElementType
    isActive: boolean
    onSwitch: () => void
    switching: boolean
    stats: LLMStatus['groq'] | LLMStatus['openrouter']
}) {
    return (
        <Card className={`border-2 transition-all ${isActive ? 'border-primary shadow-md' : 'border-slate-200'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{label}</CardTitle>
                            <CardDescription className="text-xs">
                                {name === 'groq' ? 'api.groq.com — ultra-rápido' : 'openrouter.ai — 400+ modelos'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isActive
                            ? <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-xs">Ativo</Badge>
                            : <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onSwitch} disabled={switching}>
                                <ArrowLeftRight className="h-3 w-3" />
                                Usar este
                            </Button>
                        }
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                    <StatChip label="Req Hoje" value={stats.requestsToday} />
                    <StatChip label="Total Req" value={stats.requestsTotal} />
                    <StatChip label="Tokens hoje in" value={stats.tokensInputToday} />
                    <StatChip label="Tokens hoje out" value={stats.tokensOutputToday} />
                </div>

                {name === 'groq' && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {stats.groqRemainingRequests != null && (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span><b>{fmtNum(stats.groqRemainingRequests)}</b> req restantes</span>
                            </div>
                        )}
                        {stats.groqRemainingTokens != null && (
                            <div className="flex items-center gap-1">
                                <Cpu className="h-3.5 w-3.5 text-blue-500" />
                                <span><b>{fmtNum(stats.groqRemainingTokens)}</b> tokens restantes</span>
                            </div>
                        )}
                        {stats.groqResetTokensAt && (
                            <div className="flex items-center gap-1 col-span-2">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span>Reset em: <b>{stats.groqResetTokensAt}</b></span>
                            </div>
                        )}
                        {stats.rateLimitCount > 0 && (
                            <div className="flex items-center gap-1 col-span-2 text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{stats.rateLimitCount}x rate limit | último: {stats.lastRateLimitAt ? fmtTs(stats.lastRateLimitAt) : '–'}</span>
                            </div>
                        )}
                    </div>
                )}

                {name === 'openrouter' && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className={`text-base font-bold ${credColor(stats.openrouterCreditsRemaining, stats.openrouterCreditsTotal)}`}>
                                ${(stats.openrouterCreditsRemaining ?? 0).toFixed(4)}
                            </span>
                            <span className="text-[10px] text-slate-500">Restantes</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-base font-bold text-slate-700">
                                ${(stats.openrouterCreditsUsed ?? 0).toFixed(4)}
                            </span>
                            <span className="text-[10px] text-slate-500">Usados</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-base font-bold text-slate-700">
                                ${(stats.openrouterCreditsTotal ?? 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500">Total</span>
                        </div>
                        {stats.rateLimitCount > 0 && (
                            <div className="flex items-center gap-1 col-span-3 text-xs text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{stats.rateLimitCount}x rate limit</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// ── Log row ───────────────────────────────────────────────────────────────────
function LogRow({ entry }: { entry: LLMRequestLog }) {
    return (
        <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs border ${entry.success ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-slate-400 font-mono w-20 shrink-0">{fmtTs(entry.ts)}</span>
            {entry.success
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            }
            <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 shrink-0 ${entry.provider === 'groq' ? 'text-purple-700 border-purple-300 bg-purple-50' : 'text-blue-700 border-blue-300 bg-blue-50'}`}>
                {entry.provider}
            </Badge>
            <span className="text-slate-500 truncate flex-1">{entry.model.split('/').pop()}</span>
            {entry.success ? (
                <>
                    <span className="text-slate-400 shrink-0">↑{fmtNum(entry.inputTokens)} ↓{fmtNum(entry.outputTokens)}</span>
                    <span className="text-slate-400 font-mono shrink-0">{fmtMs(entry.durationMs)}</span>
                </>
            ) : (
                <span className="text-red-600 truncate flex-1">{entry.error}</span>
            )}
        </div>
    )
}

// ── Painel principal ──────────────────────────────────────────────────────────
function LLMDashboard() {
    const { toast } = useToast()
    const [status, setStatus] = useState<LLMStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [switching, setSwitching] = useState(false)

    // Playground
    const [prompt, setPrompt] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [chatting, setChatting] = useState(false)
    const [chatResponse, setChatResponse] = useState<string | null>(null)
    const [chatMeta, setChatMeta] = useState<{ provider: string; model: string; tokens: number; ms: number } | null>(null)

    const fetchStatus = useCallback(async () => {
        const res = await getLLMStatus()
        if (res.success) setStatus(res.data)
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, 30000)  // auto-refresh a cada 30s
        return () => clearInterval(interval)
    }, [fetchStatus])

    const handleSwitch = async (provider: LLMProvider) => {
        setSwitching(true)
        const res = await setLLMProvider(provider)
        if (res.success) {
            toast({ title: `Provider trocado para ${provider.toUpperCase()}` })
            await fetchStatus()
        } else {
            toast({ title: 'Erro ao trocar provider', description: res.error, variant: 'destructive' })
        }
        setSwitching(false)
    }

    const handleChat = async () => {
        if (!prompt.trim()) return
        setChatting(true)
        setChatResponse(null)
        setChatMeta(null)

        const start = Date.now()
        const res = await llmChat({
            messages: [{ role: 'user', content: prompt }],
            model: selectedModel || undefined,
        })

        if (res.success) {
            setChatResponse(res.data.content)
            setChatMeta({
                provider: res.data.provider,
                model: res.data.model,
                tokens: res.data.usage.totalTokens,
                ms: Date.now() - start,
            })
            await fetchStatus()
        } else {
            toast({ title: 'Erro no LLM', description: res.error, variant: 'destructive' })
        }
        setChatting(false)
    }

    if (loading && !status) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
        )
    }

    const allModels = [
        ...(status?.models.groq ?? []).map(m => ({ ...m, provider: 'groq' as LLMProvider })),
        ...(status?.models.openrouter ?? []).map(m => ({ ...m, provider: 'openrouter' as LLMProvider })),
    ]

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Painel de IA</h2>
                    <p className="text-sm text-slate-500">Monitore o uso de tokens e gerencie os providers de IA.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading} title="Atualizar">
                    <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Provider ativo */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
                <div>
                    <p className="text-sm font-semibold text-slate-700">Provider ativo</p>
                    <p className="text-xs text-slate-500">
                        {status?.activeProvider === 'groq'
                            ? 'Groq (ultra-rápido) — troca automática para OpenRouter se atingir rate limit'
                            : 'OpenRouter (400+ modelos) — active'}
                    </p>
                </div>
                <Badge className={`ml-auto font-bold text-sm px-3 py-1 ${status?.activeProvider === 'groq' ? 'bg-purple-100 text-purple-700 border-none' : 'bg-blue-100 text-blue-700 border-none'}`}>
                    {status?.activeProvider?.toUpperCase() ?? '–'}
                </Badge>
            </div>

            {/* Cards de provider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status && (
                    <>
                        <ProviderCard
                            name="groq"
                            label="Groq"
                            icon={Zap}
                            isActive={status.activeProvider === 'groq'}
                            onSwitch={() => handleSwitch('groq')}
                            switching={switching}
                            stats={status.groq}
                        />
                        <ProviderCard
                            name="openrouter"
                            label="OpenRouter"
                            icon={Globe}
                            isActive={status.activeProvider === 'openrouter'}
                            onSwitch={() => handleSwitch('openrouter')}
                            switching={switching}
                            stats={status.openrouter}
                        />
                    </>
                )}
            </div>

            {/* Playground */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">Playground</CardTitle>
                    </div>
                    <CardDescription>Teste os modelos diretamente do painel</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Modelo (opcional — deixe em branco para usar o padrão)</Label>
                        <Select value={selectedModel || 'auto'} onValueChange={v => setSelectedModel(v === 'auto' ? '' : v)}>
                            <SelectTrigger className="bg-slate-50/50">
                                <SelectValue placeholder="Padrão do provider ativo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">Padrão do provider ativo</SelectItem>
                                {allModels.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <span className="flex items-center gap-2">
                                            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${m.provider === 'groq' ? 'text-purple-700 border-purple-300' : 'text-blue-700 border-blue-300'}`}>
                                                {m.provider}
                                            </Badge>
                                            {m.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Sua mensagem</Label>
                        <Textarea
                            placeholder="Digite aqui sua pergunta ou instrução..."
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            rows={3}
                            className="bg-slate-50/50 resize-none"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleChat()
                            }}
                        />
                        <p className="text-[10px] text-slate-400">Ctrl+Enter para enviar</p>
                    </div>

                    <Button onClick={handleChat} disabled={!prompt.trim() || chatting} className="bg-primary text-white font-bold gap-2 w-full">
                        {chatting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {chatting ? 'Processando...' : 'Enviar'}
                    </Button>

                    {chatResponse && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                            {chatMeta && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={`text-[10px] font-bold ${chatMeta.provider === 'groq' ? 'text-purple-700 border-purple-300 bg-purple-50' : 'text-blue-700 border-blue-300 bg-blue-50'}`}>
                                        {chatMeta.provider}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 font-mono">{chatMeta.model.split('/').pop()}</span>
                                    <span className="text-[10px] text-slate-400">•</span>
                                    <span className="text-[10px] text-slate-500">{fmtNum(chatMeta.tokens)} tokens</span>
                                    <span className="text-[10px] text-slate-400">•</span>
                                    <span className="text-[10px] text-slate-500">{fmtMs(chatMeta.ms)}</span>
                                </div>
                            )}
                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{chatResponse}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Log de requisições */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-slate-600" />
                        <CardTitle className="text-base">Últimas Requisições</CardTitle>
                    </div>
                    <CardDescription>Histórico em memória (últimas 20 — reseta ao reiniciar o servidor)</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {!status?.recentRequests?.length ? (
                        <p className="text-sm text-slate-400 text-center py-8">Nenhuma requisição ainda.</p>
                    ) : (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                            {status.recentRequests.map(entry => (
                                <LogRow key={entry.id} entry={entry} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
