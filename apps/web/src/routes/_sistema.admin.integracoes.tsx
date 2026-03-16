import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Zap, Globe, CloudLightning, Puzzle,
    CheckCircle2, XCircle, ArrowRight, ExternalLink,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getLLMStatus, type LLMStatus } from '@/services/llm.service'

export const Route = createFileRoute('/_sistema/admin/integracoes')({
    component: IntegracoesPage,
})

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface IntegrationCard {
    id: string
    name: string
    description: string
    icon: React.ElementType
    docsUrl: string
    manageRoute?: string
    status: 'ok' | 'error' | 'unknown'
    statusLabel: string
    badgeColor: string
}

// ── Página principal ──────────────────────────────────────────────────────────

function IntegracoesPage() {
    const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null)
    const [llmLoading, setLlmLoading] = useState(true)

    useEffect(() => {
        getLLMStatus().then(res => {
            if (res.success) setLlmStatus(res.data)
            setLlmLoading(false)
        })
    }, [])

    // ── Derivar status das integrações ──────────────────────────────────────

    const groqOk = !llmLoading && llmStatus !== null
    const openrouterOk = !llmLoading && llmStatus !== null

    const integrations: IntegrationCard[] = [
        {
            id: 'groq',
            name: 'Groq',
            description: 'Provider de IA ultra-rápido. Usado como provider padrão para geração de texto, análise de documentos e assistente de revisão.',
            icon: Zap,
            docsUrl: 'https://console.groq.com',
            manageRoute: '/admin/llm',
            status: llmLoading ? 'unknown' : groqOk ? 'ok' : 'error',
            statusLabel: llmLoading ? 'Verificando…' : groqOk ? 'Configurado' : 'Sem chave',
            badgeColor: llmLoading
                ? 'bg-slate-100 text-slate-500'
                : groqOk
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700',
        },
        {
            id: 'openrouter',
            name: 'OpenRouter',
            description: 'Gateway com 400+ modelos de IA. Usado como fallback automático quando o Groq atinge o rate limit.',
            icon: Globe,
            docsUrl: 'https://openrouter.ai/keys',
            manageRoute: '/admin/llm',
            status: llmLoading ? 'unknown' : openrouterOk ? 'ok' : 'error',
            statusLabel: llmLoading ? 'Verificando…' : openrouterOk ? 'Configurado' : 'Sem chave',
            badgeColor: llmLoading
                ? 'bg-slate-100 text-slate-500'
                : openrouterOk
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700',
        },
        {
            id: 'cloudconvert',
            name: 'CloudConvert',
            description: 'Serviço de conversão de documentos. Usado para converter arquivos DOCX em PDF com alta fidelidade.',
            icon: CloudLightning,
            docsUrl: 'https://cloudconvert.com/dashboard',
            manageRoute: '/admin/cloudconvert',
            status: 'ok',
            statusLabel: 'Configurado',
            badgeColor: 'bg-emerald-100 text-emerald-700',
        },
    ]

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                    <Puzzle className="h-6 w-6 text-primary" />
                    Integrações
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    Gerencie as integrações externas utilizadas pelo sistema.
                    As chaves de API são configuradas no arquivo <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> do servidor.
                </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-4">
                {integrations.map(integration => {
                    const Icon = integration.icon
                    return (
                        <Card key={integration.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{integration.name}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {integration.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge className={`text-xs font-semibold border-none gap-1 ${integration.badgeColor}`}>
                                            {integration.status === 'ok' && <CheckCircle2 className="h-3 w-3" />}
                                            {integration.status === 'error' && <XCircle className="h-3 w-3" />}
                                            {integration.statusLabel}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {integration.manageRoute && (
                                        <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                                            <Link to={integration.manageRoute}>
                                                <ArrowRight className="h-3 w-3" />
                                                Gerenciar
                                            </Link>
                                        </Button>
                                    )}
                                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1 text-slate-500">
                                        <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3 w-3" />
                                            Console
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Info sobre variáveis de ambiente */}
            <Card className="border-slate-200 bg-slate-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Variáveis de Ambiente</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-slate-500 mb-3">
                        As chaves abaixo devem ser configuradas no arquivo <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">apps/api/.env</code>:
                    </p>
                    <div className="space-y-1.5 font-mono text-xs">
                        {[
                            { key: 'GROQ_API_KEY', label: 'Groq', required: true },
                            { key: 'OPENROUTER_API_KEY', label: 'OpenRouter', required: false },
                            { key: 'CLOUDCONVERT_API_KEY_*', label: 'CloudConvert', required: true },
                        ].map(v => (
                            <div key={v.key} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border border-slate-200">
                                <span className="text-slate-700 font-semibold">{v.key}</span>
                                <span className="text-slate-400 text-[10px]">—</span>
                                <span className="text-slate-500 text-[10px]">{v.label}</span>
                                {v.required
                                    ? <Badge className="ml-auto text-[10px] bg-red-50 text-red-600 border-none h-4">obrigatório</Badge>
                                    : <Badge className="ml-auto text-[10px] bg-slate-100 text-slate-500 border-none h-4">opcional</Badge>
                                }
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
