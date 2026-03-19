import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
    RefreshCw, Zap, Globe, ArrowLeftRight, CheckCircle2, XCircle,
    Clock, Cpu, MessageSquare, AlertTriangle, Send, BarChart3,
    KeyRound, Plus, Trash2, PowerOff, Power, ShieldAlert, PlugZap, Sparkles, Loader2,
    Bot, Shield, Info, Activity
} from 'lucide-react'
import {
    getLLMStatus, setLLMProvider, llmChat,
    type LLMStatus, type LLMProvider, type LLMRequestLog
} from '@/services/llm.service'

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000'
const apiUrl = (path: string) => `${API_BASE}${path}`

export const Route = createFileRoute('/_sistema/admin/llm')({
    component: LLMDashboard,
})

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) { return n.toLocaleString('pt-BR') }
function fmtMs(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }
function fmtTs(ts: string) {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── Provider config ───────────────────────────────────────────────────────────
const PROVIDERS: { name: LLMProvider; label: string; desc: string; icon: React.ElementType; accent: string; accentBg: string; accentBorder: string }[] = [
    { name: 'cerebras', label: 'Cerebras', desc: 'Wafer-scale — mais rápido', icon: Zap, accent: 'text-[#c55a00]', accentBg: 'bg-[#fff5eb]', accentBorder: 'border-[#c55a00]' },
    { name: 'mistral', label: 'Mistral', desc: 'Modelos de ponta', icon: Sparkles, accent: 'text-[#6730a3]', accentBg: 'bg-[#f3f0ff]', accentBorder: 'border-[#6730a3]' },
    { name: 'groq', label: 'Groq', desc: 'Ultra-rápido', icon: Cpu, accent: 'text-[#6730a3]', accentBg: 'bg-[#f3f0ff]', accentBorder: 'border-[#6730a3]' },
    { name: 'openrouter', label: 'OpenRouter', desc: '400+ modelos', icon: Globe, accent: 'text-[#1351b4]', accentBg: 'bg-[#edf5ff]', accentBorder: 'border-[#1351b4]' },
    { name: 'kimi' as LLMProvider, label: 'Kimi', desc: 'Moonshot AI', icon: Sparkles, accent: 'text-[#1d9e74]', accentBg: 'bg-[#e6f4f1]', accentBorder: 'border-[#1d9e74]' },
]

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({
    name, label, desc, icon: Icon, accent, accentBg, accentBorder,
    isActive, onSwitch, switching, stats,
}: {
    name: LLMProvider; label: string; desc: string; icon: React.ElementType
    accent: string; accentBg: string; accentBorder: string
    isActive: boolean; onSwitch: () => void; switching: boolean
    stats: LLMStatus['groq'] | LLMStatus['openrouter'] | LLMStatus['cerebras'] | LLMStatus['mistral']
}) {
    return (
        <div className={`bg-white border rounded p-4 transition-all ${isActive ? `border-2 ${accentBorder}` : 'border-[#e6e6e6]'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${accentBg}`}>
                        <Icon className={`h-5 w-5 ${accent}`} />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-[#333333]">{label}</p>
                        <p className="text-xs text-[#555555]">{desc}</p>
                    </div>
                </div>
                {isActive ? (
                    <Badge className="bg-[#e6f4eb] text-[#008833] border-[#008833] font-bold text-xs px-2.5 py-1 rounded" variant="outline">
                        Ativo
                    </Badge>
                ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-[#cccccc] text-[#555555] hover:bg-[#f0f4f8] rounded font-bold" onClick={onSwitch} disabled={switching}>
                        <ArrowLeftRight className="h-3 w-3" />
                        Usar
                    </Button>
                )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                    <p className="text-lg font-bold text-[#333333] tabular-nums">{fmtNum(stats.requestsToday)}</p>
                    <p className="text-[10px] text-[#555555] font-medium uppercase tracking-wider">Req Hoje</p>
                </div>
                <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                    <p className="text-lg font-bold text-[#333333] tabular-nums">{fmtNum(stats.requestsTotal)}</p>
                    <p className="text-[10px] text-[#555555] font-medium uppercase tracking-wider">Total Req</p>
                </div>
                <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                    <p className="text-lg font-bold text-[#333333] tabular-nums">{fmtNum(stats.tokensInputToday)}</p>
                    <p className="text-[10px] text-[#555555] font-medium uppercase tracking-wider">Tokens In</p>
                </div>
                <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                    <p className="text-lg font-bold text-[#333333] tabular-nums">{fmtNum(stats.tokensOutputToday)}</p>
                    <p className="text-[10px] text-[#555555] font-medium uppercase tracking-wider">Tokens Out</p>
                </div>
            </div>

            {/* Provider-specific details */}
            {name === 'groq' && (
                <div className="mt-3 space-y-1.5 text-xs">
                    {stats.groqRemainingRequests != null && (
                        <div className="flex items-center gap-1.5 text-[#555555]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#008833]" />
                            <b>{fmtNum(stats.groqRemainingRequests)}</b> req restantes
                        </div>
                    )}
                    {stats.groqRemainingTokens != null && (
                        <div className="flex items-center gap-1.5 text-[#555555]">
                            <Cpu className="h-3.5 w-3.5 text-[#1351b4]" />
                            <b>{fmtNum(stats.groqRemainingTokens)}</b> tokens restantes
                        </div>
                    )}
                    {stats.groqResetTokensAt && (
                        <div className="flex items-center gap-1.5 text-[#555555]">
                            <Clock className="h-3.5 w-3.5 text-[#555555]" />
                            Reset em: <b>{stats.groqResetTokensAt}</b>
                        </div>
                    )}
                    {stats.rateLimitCount > 0 && (
                        <div className="flex items-center gap-1.5 text-[#a06b00]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {stats.rateLimitCount}x rate limit | último: {stats.lastRateLimitAt ? fmtTs(stats.lastRateLimitAt) : '–'}
                        </div>
                    )}
                </div>
            )}

            {name === 'openrouter' && (
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-[#e6f4eb] border border-[#008833]/20 rounded p-2 text-center">
                        <p className="text-sm font-bold text-[#008833]">${(stats.openrouterCreditsRemaining ?? 0).toFixed(4)}</p>
                        <p className="text-[10px] text-[#555555]">Restantes</p>
                    </div>
                    <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                        <p className="text-sm font-bold text-[#333333]">${(stats.openrouterCreditsUsed ?? 0).toFixed(4)}</p>
                        <p className="text-[10px] text-[#555555]">Usados</p>
                    </div>
                    <div className="bg-[#f8f9fa] border border-[#e6e6e6] rounded p-2 text-center">
                        <p className="text-sm font-bold text-[#333333]">${(stats.openrouterCreditsTotal ?? 0).toFixed(2)}</p>
                        <p className="text-[10px] text-[#555555]">Total</p>
                    </div>
                    {stats.rateLimitCount > 0 && (
                        <div className="flex items-center gap-1 col-span-3 text-[#a06b00]">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {stats.rateLimitCount}x rate limit
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Log row ───────────────────────────────────────────────────────────────────
function LogRow({ entry }: { entry: LLMRequestLog }) {
    const providerColor = entry.provider === 'cerebras' ? 'text-[#c55a00] border-[#c55a00] bg-[#fff5eb]'
        : entry.provider === 'mistral' ? 'text-[#6730a3] border-[#6730a3] bg-[#f3f0ff]'
        : entry.provider === 'groq' ? 'text-[#6730a3] border-[#6730a3] bg-[#f3f0ff]'
        : (entry.provider as string) === 'kimi' ? 'text-[#1d9e74] border-[#1d9e74] bg-[#e6f4f1]'
        : 'text-[#1351b4] border-[#1351b4] bg-[#edf5ff]'
    return (
        <TableRow className={`text-xs ${entry.success ? '' : 'bg-[#ffefec]'} border-b border-[#e6e6e6]`}>
            <TableCell className="py-2.5 font-mono text-[#555555] w-20">{fmtTs(entry.ts)}</TableCell>
            <TableCell className="py-2.5 w-8">
                {entry.success
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-[#008833]" />
                    : <XCircle className="h-3.5 w-3.5 text-[#e52207]" />
                }
            </TableCell>
            <TableCell className="py-2.5">
                <Badge variant="outline" className={`text-[10px] font-bold px-1.5 py-0 rounded ${providerColor}`}>
                    {entry.provider}
                </Badge>
            </TableCell>
            <TableCell className="py-2.5 text-[#555555] truncate max-w-[200px]">{entry.model.split('/').pop()}</TableCell>
            {entry.success ? (
                <>
                    <TableCell className="py-2.5 text-[#555555]">↑{fmtNum(entry.inputTokens)} ↓{fmtNum(entry.outputTokens)}</TableCell>
                    <TableCell className="py-2.5 font-mono text-[#555555]">{fmtMs(entry.durationMs)}</TableCell>
                </>
            ) : (
                <TableCell colSpan={2} className="py-2.5 text-[#e52207] truncate">{entry.error}</TableCell>
            )}
        </TableRow>
    )
}

const REFRESH_INTERVAL = 15

// ── Keys tab types ────────────────────────────────────────────────────────────
interface LlmKey {
    id: string
    provider: 'groq' | 'openrouter' | 'cerebras' | 'mistral' | 'kimi'
    label: string
    mask: string
    ativo: boolean
    esgotada: boolean
    esgotadaAte: string | null
    requisicoes: number
    tokensTotal: number
    criadoEm: string
}

function remainingTime(esgotadaAte: string | null): string {
    if (!esgotadaAte) return ''
    const diff = new Date(esgotadaAte).getTime() - Date.now()
    if (diff <= 0) return 'expirando'
    const min = Math.floor(diff / 60000)
    return `${min} min restantes`
}

const PROVIDER_BADGE_COLOR: Record<string, string> = {
    cerebras: 'text-[#c55a00] border-[#c55a00] bg-[#fff5eb]',
    mistral: 'text-[#6730a3] border-[#6730a3] bg-[#f3f0ff]',
    groq: 'text-[#6730a3] border-[#6730a3] bg-[#f3f0ff]',
    openrouter: 'text-[#1351b4] border-[#1351b4] bg-[#edf5ff]',
    kimi: 'text-[#1d9e74] border-[#1d9e74] bg-[#e6f4f1]',
}

// ── Keys Tab ──────────────────────────────────────────────────────────────────
function KeysTab() {
    const { toast } = useToast()
    const [keys, setKeys] = useState<LlmKey[]>([])
    const [poolStats, setPoolStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ provider: 'groq', label: '', key: '' })

    const fetchKeys = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(apiUrl('/api/admin/llm/keys'), { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setKeys(data.keys)
                setPoolStats(data.stats)
            }
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchKeys() }, [fetchKeys])

    const handleAdd = async () => {
        if (!form.label.trim() || !form.key.trim()) {
            toast({ title: 'Preencha todos os campos.', variant: 'destructive' })
            return
        }
        setAdding(true)
        const res = await fetch(apiUrl('/api/admin/llm/keys'), {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        if (res.ok) {
            toast({ title: 'Chave adicionada com sucesso!', className: 'bg-green-600 text-white' })
            setForm({ provider: 'groq', label: '', key: '' })
            setShowModal(false)
            await fetchKeys()
        } else {
            toast({ title: 'Erro', description: data.error, variant: 'destructive' })
        }
        setAdding(false)
    }

    const handleToggle = async (key: LlmKey) => {
        const res = await fetch(apiUrl(`/api/admin/llm/keys/${key.id}`), {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: !key.ativo }),
        })
        if (res.ok) {
            toast({ title: key.ativo ? 'Chave desativada.' : 'Chave ativada.' })
            await fetchKeys()
        }
    }

    const handleReset = async (key: LlmKey) => {
        const res = await fetch(apiUrl(`/api/admin/llm/keys/${key.id}`), {
            method: 'PATCH', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetEsgotamento: true }),
        })
        if (res.ok) { toast({ title: 'Cooldown resetado.' }); await fetchKeys() }
    }

    const handleDelete = async (key: LlmKey) => {
        if (!confirm(`Remover chave "${key.label}"?`)) return
        const res = await fetch(apiUrl(`/api/admin/llm/keys/${key.id}`), { method: 'DELETE', credentials: 'include' })
        if (res.ok) { toast({ title: 'Chave removida.' }); await fetchKeys() }
    }

    return (
        <div className="space-y-6">
            {/* Pool Health */}
            {poolStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(['cerebras', 'mistral', 'groq', 'openrouter', 'kimi'] as const).map(provider => {
                        const p = poolStats[provider]
                        const healthy = p?.ativas > 0 && p?.esgotadas === 0
                        const warning = p?.ativas > 0 && p?.esgotadas > 0
                        const critical = p?.ativas === 0
                        return (
                            <div key={provider} className={`bg-white border rounded p-4 ${
                                critical ? 'border-[#e52207]' : warning ? 'border-[#a06b00]' : 'border-[#008833]'
                            }`}>
                                <div className="flex items-center gap-2 mb-3">
                                    {PROVIDERS.find(pp => pp.name === provider)?.icon && (() => {
                                        const P = PROVIDERS.find(pp => pp.name === provider)!
                                        return <P.icon className={`h-4 w-4 ${P.accent}`} />
                                    })()}
                                    <span className="font-bold text-sm text-[#333333] capitalize">{provider}</span>
                                    <Badge variant="outline" className={`ml-auto text-xs font-bold rounded px-2 py-0.5 ${
                                        critical ? 'text-[#e52207] border-[#e52207] bg-[#ffefec]'
                                        : healthy ? 'text-[#008833] border-[#008833] bg-[#e6f4eb]'
                                        : 'text-[#a06b00] border-[#a06b00] bg-[#fef6e0]'
                                    }`}>
                                        {p?.ativas ?? 0}/{p?.total ?? 0} ativas
                                    </Badge>
                                </div>
                                <div className="w-full bg-[#f8f9fa] rounded-full h-2 border border-[#e6e6e6]">
                                    <div className={`h-full rounded-full transition-all ${
                                        critical ? 'bg-[#e52207]' : warning ? 'bg-[#a06b00]' : 'bg-[#008833]'
                                    }`} style={{ width: !p?.total ? '0%' : `${(p.ativas / p.total) * 100}%` }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Header + Add button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-[#1351b4]" />
                    <p className="font-bold text-[#333333]">Pool de API Keys ({keys.length} cadastrada{keys.length !== 1 ? 's' : ''})</p>
                </div>
                <Button size="sm" className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold rounded shadow-none gap-1.5" onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4" /> Nova Chave
                </Button>
            </div>

            {/* Dialog Adicionar Chave */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black text-[#333333] text-lg">
                            <PlugZap className="h-5 w-5 text-[#1351b4]" />
                            Adicionar Nova Chave de API
                        </DialogTitle>
                        <DialogDescription className="text-[#555555]">
                            A chave será criptografada e nunca exibida novamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label className="font-bold text-[#333333]">Provider</Label>
                            <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
                                <SelectTrigger className="border-[#cccccc] rounded h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cerebras">Cerebras (Motor Principal)</SelectItem>
                                    <SelectItem value="mistral">Mistral</SelectItem>
                                    <SelectItem value="groq">Groq</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                                    <SelectItem value="kimi">Moonshot AI (Kimi)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label className="font-bold text-[#333333]">Label (identificação)</Label>
                            <Input placeholder="Ex: Conta TI Prefeitura" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="border-[#cccccc] rounded h-11" />
                        </div>
                        <div className="grid gap-2">
                            <Label className="font-bold text-[#333333]">API Key</Label>
                            <Input type="password" placeholder="Cole a chave aqui" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} className="border-[#cccccc] rounded h-11" />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowModal(false)} className="rounded border-[#cccccc]">Cancelar</Button>
                        <Button onClick={handleAdd} disabled={adding} className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold rounded">
                            {adding ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</> : <><Plus className="h-4 w-4 mr-2" /> Salvar Chave</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Keys list */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1351b4]" />
                </div>
            ) : keys.length === 0 ? (
                <div className="text-center py-12 text-[#555555]">
                    <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Nenhuma chave cadastrada ainda.</p>
                    <p className="text-xs mt-1">Adicione chaves para ativar o pool de IA.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {keys.map(key => (
                        <div key={key.id} className={`flex items-center gap-3 p-3 rounded border ${
                            !key.ativo ? 'bg-[#f8f9fa] border-[#e6e6e6] opacity-60'
                                : key.esgotada ? 'bg-[#ffefec] border-[#e52207]'
                                : 'bg-white border-[#e6e6e6]'
                        }`}>
                            <Badge variant="outline" className={`shrink-0 text-xs font-bold rounded px-2 py-0.5 ${PROVIDER_BADGE_COLOR[key.provider] || PROVIDER_BADGE_COLOR.openrouter}`}>
                                {key.provider}
                            </Badge>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-[#333333] truncate">{key.label}</p>
                                <p className="text-xs text-[#555555] font-mono">{key.mask}</p>
                            </div>
                            <div className="text-right shrink-0">
                                {key.esgotada ? (
                                    <Badge variant="outline" className="text-[#e52207] border-[#e52207] bg-[#ffefec] text-xs font-bold rounded px-2">
                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                        Esgotada · {remainingTime(key.esgotadaAte)}
                                    </Badge>
                                ) : key.ativo ? (
                                    <Badge variant="outline" className="text-[#008833] border-[#008833] bg-[#e6f4eb] text-xs font-bold rounded px-2">Ativa</Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[#555555] border-[#cccccc] bg-[#f8f9fa] text-xs font-bold rounded px-2">Inativa</Badge>
                                )}
                                <p className="text-[10px] text-[#555555] mt-0.5">{key.requisicoes} req · {key.tokensTotal.toLocaleString('pt-BR')} tokens</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                {key.esgotada && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#a06b00] hover:bg-[#fef6e0]" title="Resetar cooldown" onClick={() => handleReset(key)}>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-[#555555] hover:bg-[#f0f4f8]" title={key.ativo ? 'Desativar' : 'Ativar'} onClick={() => handleToggle(key)}>
                                    {key.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5 text-[#008833]" />}
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-[#e52207] hover:bg-[#ffefec]" title="Remover" onClick={() => handleDelete(key)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function LLMDashboard() {
    const { toast } = useToast()
    const [status, setStatus] = useState<LLMStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [switching, setSwitching] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Playground state
    const [prompt, setPrompt] = useState('')
    const [selectedModel, setSelectedModel] = useState('')
    const [chatting, setChatting] = useState(false)
    const [chatResponse, setChatResponse] = useState<string | null>(null)
    const [chatMeta, setChatMeta] = useState<{ provider: string; model: string; tokens: number; ms: number } | null>(null)

    const resetCountdown = useCallback(() => {
        setCountdown(REFRESH_INTERVAL)
        if (countdownRef.current) clearInterval(countdownRef.current)
        countdownRef.current = setInterval(() => {
            setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1))
        }, 1000)
    }, [])

    const fetchStatus = useCallback(async () => {
        const res = await getLLMStatus()
        if (res.success) { setStatus(res.data); setLastUpdated(new Date()) }
        setLoading(false)
        resetCountdown()
    }, [resetCountdown])

    useEffect(() => {
        fetchStatus()
        const interval = setInterval(fetchStatus, REFRESH_INTERVAL * 1000)
        return () => { clearInterval(interval); if (countdownRef.current) clearInterval(countdownRef.current) }
    }, [fetchStatus])

    const handleSwitch = async (provider: LLMProvider) => {
        setSwitching(true)
        const res = await setLLMProvider(provider)
        if (res.success) {
            toast({ title: `Provider trocado para ${provider.toUpperCase()}`, className: 'bg-green-600 text-white' })
            await fetchStatus()
        } else {
            toast({ title: 'Erro ao trocar provider', description: res.error, variant: 'destructive' })
        }
        setSwitching(false)
    }

    const handleChat = async () => {
        if (!prompt.trim()) return
        setChatting(true); setChatResponse(null); setChatMeta(null)
        const start = Date.now()
        const res = await llmChat({ messages: [{ role: 'user', content: prompt }], selectedModel: selectedModel || undefined })
        if (res.success) {
            setChatResponse(res.data.content)
            setChatMeta({ provider: res.data.provider, model: res.data.model, tokens: res.data.usage.totalTokens, ms: Date.now() - start })
            await fetchStatus()
        } else {
            toast({ title: 'Erro no LLM', description: res.error, variant: 'destructive' })
        }
        setChatting(false)
    }

    if (loading && !status) {
        return (
            <div className="flex items-center justify-center min-h-[400px] gap-3 text-[#555555]">
                <Loader2 className="h-6 w-6 animate-spin text-[#1351b4]" />
                Carregando painel de IA...
            </div>
        )
    }

    const allModels = [
        ...(status?.models?.cerebras ?? []).map(m => ({ ...m, provider: 'cerebras' as LLMProvider })),
        ...(status?.models?.mistral ?? []).map(m => ({ ...m, provider: 'mistral' as LLMProvider })),
        ...(status?.models?.groq ?? []).map(m => ({ ...m, provider: 'groq' as LLMProvider })),
        ...(status?.models?.openrouter ?? []).map(m => ({ ...m, provider: 'openrouter' as LLMProvider })),
    ]

    const activeProviderConfig = PROVIDERS.find(p => p.name === status?.activeProvider) ?? PROVIDERS[0]

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Painel de IA</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        Monitore uso de tokens, gerencie providers e configure o pool de API Keys.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-[#555555] font-medium">
                            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin text-[#1351b4]' : 'text-[#555555]'}`} />
                            {loading ? 'Atualizando…' : `Próxima em ${countdown}s`}
                        </div>
                        {lastUpdated && (
                            <span className="text-[10px] text-[#555555]">
                                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                        <div className="w-28 h-1 bg-[#e6e6e6] rounded-full overflow-hidden">
                            <div className="h-full bg-[#1351b4]/40 rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100}%` }} />
                        </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchStatus} disabled={loading} title="Atualizar agora"
                        className="border-[#cccccc] hover:bg-[#f0f4f8] rounded">
                        <RefreshCw className={`h-4 w-4 text-[#555555] ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Tabs — Shadcn */}
            <Tabs defaultValue="monitor" className="space-y-6">
                <TabsList className="bg-white border border-[#e6e6e6] rounded p-1 h-auto">
                    <TabsTrigger value="monitor" className="gap-1.5 font-bold text-sm data-[state=active]:bg-[#1351b4] data-[state=active]:text-white rounded px-4 py-2">
                        <BarChart3 className="h-4 w-4" /> Monitor
                    </TabsTrigger>
                    <TabsTrigger value="keys" className="gap-1.5 font-bold text-sm data-[state=active]:bg-[#1351b4] data-[state=active]:text-white rounded px-4 py-2">
                        <KeyRound className="h-4 w-4" /> Chaves de API
                    </TabsTrigger>
                    <TabsTrigger value="playground" className="gap-1.5 font-bold text-sm data-[state=active]:bg-[#1351b4] data-[state=active]:text-white rounded px-4 py-2">
                        <MessageSquare className="h-4 w-4" /> Playground
                    </TabsTrigger>
                    <TabsTrigger value="chatdocs" className="gap-1.5 font-bold text-sm data-[state=active]:bg-[#1351b4] data-[state=active]:text-white rounded px-4 py-2">
                        <Bot className="h-4 w-4" /> chatDoc's
                    </TabsTrigger>
                </TabsList>

                {/* ── Monitor ── */}
                <TabsContent value="monitor" className="space-y-6 mt-0">
                    {/* Provider ativo */}
                    <div className="flex items-center gap-3 p-4 bg-[#edf5ff] border border-[#1351b4]/20 rounded">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${activeProviderConfig.accentBg}`}>
                            <activeProviderConfig.icon className={`h-5 w-5 ${activeProviderConfig.accent}`} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-[#333333]">Provider ativo</p>
                            <p className="text-xs text-[#555555]">{activeProviderConfig.label} — {activeProviderConfig.desc}</p>
                        </div>
                        <Badge variant="outline" className={`font-bold text-sm px-3 py-1 rounded ${activeProviderConfig.accent} ${activeProviderConfig.accentBorder} ${activeProviderConfig.accentBg}`}>
                            {status?.activeProvider?.toUpperCase() ?? '–'}
                        </Badge>
                    </div>

                    {/* Provider cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {status && PROVIDERS.map(p => (
                            <ProviderCard
                                key={p.name}
                                {...p}
                                isActive={status.activeProvider === p.name}
                                onSwitch={() => handleSwitch(p.name)}
                                switching={switching}
                                stats={(status as any)[p.name] ?? status.groq}
                            />
                        ))}
                    </div>

                    {/* Request log */}
                    <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                        <CardHeader className="border-b border-[#e6e6e6] bg-[#f8f9fa] py-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-[#1351b4]" />
                                <CardTitle className="text-base font-bold text-[#333333]">Últimas Requisições</CardTitle>
                            </div>
                            <CardDescription className="text-[#555555]">Histórico em memória (últimas 20 — reseta ao reiniciar o servidor)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!status?.recentRequests?.length ? (
                                <p className="text-sm text-[#555555] text-center py-12 font-medium">Nenhuma requisição ainda.</p>
                            ) : (
                                <div className="max-h-80 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-[#f8f9fa] border-b-2 border-[#1351b4] sticky top-0">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs">Hora</TableHead>
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs w-8"></TableHead>
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs">Provider</TableHead>
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs">Modelo</TableHead>
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs">Tokens</TableHead>
                                                <TableHead className="text-[#333333] font-bold py-3 text-xs">Duração</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {status.recentRequests.map(entry => (
                                                <LogRow key={entry.id} entry={entry} />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Keys ── */}
                <TabsContent value="keys" className="mt-0">
                    <KeysTab />
                </TabsContent>

                {/* ── Playground ── */}
                <TabsContent value="playground" className="mt-0">
                    <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                        <CardHeader className="border-b border-[#e6e6e6] bg-[#f8f9fa] py-4">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-[#1351b4]" />
                                <CardTitle className="text-base font-bold text-[#333333]">Playground</CardTitle>
                            </div>
                            <CardDescription className="text-[#555555]">Teste os modelos diretamente do painel</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid gap-2">
                                <Label className="font-bold text-[#333333] text-xs">Modelo (opcional — deixe em branco para usar o padrão)</Label>
                                <Select value={selectedModel || 'auto'} onValueChange={v => setSelectedModel(v === 'auto' ? '' : v)}>
                                    <SelectTrigger className="border-[#cccccc] rounded h-11"><SelectValue placeholder="Padrão do provider ativo" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Padrão do provider ativo</SelectItem>
                                        {allModels.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                <span className="flex items-center gap-2">
                                                    <Badge variant="outline" className={`text-[10px] px-1 py-0 rounded font-bold ${PROVIDER_BADGE_COLOR[m.provider] || ''}`}>
                                                        {m.provider}
                                                    </Badge>
                                                    {m.label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="font-bold text-[#333333] text-xs">Sua mensagem</Label>
                                <Textarea
                                    placeholder="Digite aqui sua pergunta ou instrução..."
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    rows={3}
                                    className="resize-none border-[#cccccc] rounded"
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleChat() }}
                                />
                                <p className="text-[10px] text-[#555555]">Ctrl+Enter para enviar</p>
                            </div>

                            <Button onClick={handleChat} disabled={!prompt.trim() || chatting} className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold gap-2 w-full rounded shadow-none h-11">
                                {chatting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {chatting ? 'Processando...' : 'Enviar'}
                            </Button>

                            {chatResponse && (
                                <div className="rounded border border-[#008833]/30 bg-[#e6f4eb] p-4 space-y-2">
                                    {chatMeta && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className={`text-[10px] font-bold rounded ${PROVIDER_BADGE_COLOR[chatMeta.provider] || ''}`}>
                                                {chatMeta.provider}
                                            </Badge>
                                            <span className="text-[10px] text-[#555555] font-mono">{chatMeta.model.split('/').pop()}</span>
                                            <span className="text-[10px] text-[#555555]">•</span>
                                            <span className="text-[10px] text-[#555555]">{fmtNum(chatMeta.tokens)} tokens</span>
                                            <span className="text-[10px] text-[#555555]">•</span>
                                            <span className="text-[10px] text-[#555555]">{fmtMs(chatMeta.ms)}</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-[#333333] whitespace-pre-wrap leading-relaxed">{chatResponse}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── ChatDoc's ── */}
                <TabsContent value="chatdocs" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Regras de Tokens */}
                        <Card className="border-[#e6e6e6] shadow-none rounded">
                            <CardHeader className="border-b border-[#e6e6e6] bg-[#f8f9fa] py-4">
                                <CardTitle className="text-base font-bold text-[#333333] flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-[#1351b4]" />
                                    Limites de Tokens por Perfil
                                </CardTitle>
                                <CardDescription className="text-xs text-[#555555]">
                                    Cotas distribuídas mensalmente de acordo com a hierarquia.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-[#f8f9fa]">
                                        <TableRow className="border-[#e6e6e6]">
                                            <TableHead className="text-xs font-bold text-[#333333]">Cargo / Role</TableHead>
                                            <TableHead className="text-xs font-bold text-[#333333]">Tokens/mês</TableHead>
                                            <TableHead className="text-xs font-bold text-[#333333]">Renovação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="border-[#e6e6e6]">
                                            <TableCell className="py-3 text-sm font-medium text-[#333333]">Administrador Geral</TableCell>
                                            <TableCell className="py-3 text-sm text-[#1351b4] font-bold">1.000.000</TableCell>
                                            <TableCell className="py-3 text-xs text-[#555555]">Dia 1</TableCell>
                                        </TableRow>
                                        <TableRow className="border-[#e6e6e6]">
                                            <TableCell className="py-3 text-sm font-medium text-[#333333]">Prefeito</TableCell>
                                            <TableCell className="py-3 text-sm text-[#1351b4] font-bold">800.000</TableCell>
                                            <TableCell className="py-3 text-xs text-[#555555]">Dia 1</TableCell>
                                        </TableRow>
                                        <TableRow className="border-[#e6e6e6]">
                                            <TableCell className="py-3 text-sm font-medium text-[#333333]">Secretários</TableCell>
                                            <TableCell className="py-3 text-sm text-[#1351b4] font-bold">500.000</TableCell>
                                            <TableCell className="py-3 text-xs text-[#555555]">Dia 1</TableCell>
                                        </TableRow>
                                        <TableRow className="border-[#e6e6e6]">
                                            <TableCell className="py-3 text-sm font-medium text-[#333333]">Revisores / Operadores</TableCell>
                                            <TableCell className="py-3 text-sm text-[#1351b4] font-bold">200.000</TableCell>
                                            <TableCell className="py-3 text-xs text-[#555555]">Dia 1</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <div className="p-4 bg-[#edf5ff] border-t border-[#e6e6e6] text-xs text-[#1351b4] flex gap-2">
                                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span>Os tokens representam aproximadamente 4 letras cada. Quando a cota de um usuário esgota, o chat é bloqueado até a virada do mês, evitando cobranças excessivas de API.</span>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            {/* Lei de Privacidade */}
                            <Card className="border-[#e6e6e6] shadow-none rounded">
                                <CardHeader className="border-b border-[#e6e6e6] bg-[#f8f9fa] py-4">
                                    <CardTitle className="text-base font-bold text-[#333333] flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-[#008833]" />
                                        Política de Privacidade da IA
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <p className="text-sm text-[#555555] leading-relaxed">
                                        O chatDoc's foi arquitetado para proteger dados corporativos:
                                    </p>
                                    <ul className="text-sm text-[#555555] space-y-2 list-disc pl-4">
                                        <li><strong>Zero Content Training (ZCT):</strong> Nenhum prompt, anexo ou conversa trafegada através das APIs (Mistral, Groq, Cerebras, Kimi) é utilizada para treinar os modelos fundacionais de origem.</li>
                                        <li><strong>Retenção Efêmera Padrão:</strong> Alguns provedores retêm os logs temporariamente apenas para monitoramento de abusos e detecção de incidentes (normalmente ≤ 30 dias).</li>
                                        <li><strong>LGPD / Complience:</strong> Documentos de teor ultrassigiloso não devem ter dados de pessoa física alimentados na IA diretamente (Anonimização recomendada).</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            {/* Configuração de Resposta (Context Engine) */}
                            <Card className="border-[#e6e6e6] shadow-none rounded">
                                <CardHeader className="border-b border-[#e6e6e6] bg-[#f8f9fa] py-4">
                                    <CardTitle className="text-base font-bold text-[#333333] flex items-center gap-2">
                                        <Bot className="h-5 w-5 text-[#6730a3]" />
                                        Context Engine (Configuração de Resposta)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <p className="text-sm text-[#555555] leading-relaxed">
                                        Toda vez que o usuário envia uma mensagem, o sistema injeta um <i>System Prompt Oculto</i> para guiar a atuação da IA:
                                    </p>
                                    <div className="bg-[#f8f9fa] p-3 rounded font-mono text-[11px] text-[#555555] border border-[#e6e6e6]">
                                        "Você é o chatDoc's, IA assistente do 'Docs Cataguases'. Responda sempre em Markdown limpo... O papel deste usuário no sistema é [CARGO]. Adapte a resposta para ele."
                                    </div>
                                    <p className="text-sm text-[#555555]">
                                        A IA responderá demandas de <b>Prefeitos</b> focando na Assinatura Gov.br e visão macro, e para <b>Revisores</b> com viés de formatação e trâmites de correção.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
