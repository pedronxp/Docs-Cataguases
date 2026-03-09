/**
 * LLM Service — Groq + OpenRouter com failover automático
 *
 * Providers:
 *   - Groq:       https://api.groq.com/openai/v1  (ultra-rápido, free tier)
 *   - OpenRouter: https://openrouter.ai/api/v1    (400+ modelos, inclui gratuitos)
 *
 * Lógica de rotação:
 *   1. Usa Groq por padrão (mais rápido)
 *   2. Se Groq retornar 429 (rate limit), troca para OpenRouter automaticamente
 *   3. Admin pode forçar troca manualmente via setActiveProvider()
 */

export type LLMProvider = 'groq' | 'openrouter'

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface LLMChatOptions {
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
    temperature?: number
    provider?: LLMProvider  // forçar provider específico
}

export interface LLMChatResult {
    content: string
    provider: LLMProvider
    model: string
    usage: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }
}

export interface LLMProviderStats {
    requestsTotal: number
    requestsToday: number
    tokensInputTotal: number
    tokensOutputTotal: number
    tokensInputToday: number
    tokensOutputToday: number
    lastRateLimitAt: string | null
    rateLimitCount: number
    // Groq-specific (dos headers de resposta)
    groqRemainingRequests?: number
    groqRemainingTokens?: number
    groqResetRequestsAt?: string
    groqResetTokensAt?: string
    // OpenRouter-specific
    openrouterCreditsTotal?: number
    openrouterCreditsUsed?: number
    openrouterCreditsRemaining?: number
}

export interface LLMRequestLog {
    id: string
    ts: string
    provider: LLMProvider
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    durationMs: number
    success: boolean
    error?: string
}

// ── Estado em memória ─────────────────────────────────────────────────────────

let activeProvider: LLMProvider = (process.env.LLM_DEFAULT_PROVIDER as LLMProvider) || 'groq'

const stats: Record<LLMProvider, LLMProviderStats> = {
    groq: {
        requestsTotal: 0, requestsToday: 0,
        tokensInputTotal: 0, tokensOutputTotal: 0,
        tokensInputToday: 0, tokensOutputToday: 0,
        lastRateLimitAt: null, rateLimitCount: 0,
    },
    openrouter: {
        requestsTotal: 0, requestsToday: 0,
        tokensInputTotal: 0, tokensOutputTotal: 0,
        tokensInputToday: 0, tokensOutputToday: 0,
        lastRateLimitAt: null, rateLimitCount: 0,
    },
}

const requestLog: LLMRequestLog[] = []

// Reset contadores diários à meia-noite
let lastResetDay = new Date().toDateString()
function resetDailyIfNeeded() {
    const today = new Date().toDateString()
    if (today !== lastResetDay) {
        lastResetDay = today
        for (const p of ['groq', 'openrouter'] as LLMProvider[]) {
            stats[p].requestsToday = 0
            stats[p].tokensInputToday = 0
            stats[p].tokensOutputToday = 0
        }
    }
}

// ── Configurações dos providers ───────────────────────────────────────────────

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

// Modelos padrão por provider
const DEFAULT_MODELS: Record<LLMProvider, string> = {
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
}

// Modelos disponíveis para seleção no frontend
export const GROQ_MODELS = [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Versatile)', contextWindow: 128000 },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Instant)', contextWindow: 131072 },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B', contextWindow: 8192 },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', contextWindow: 32768 },
]

export const OPENROUTER_FREE_MODELS = [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
    { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
    { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free – raciocínio)' },
    { id: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (free)' },
    { id: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini 128K (free)' },
]

// ── Função principal de chat ──────────────────────────────────────────────────

export async function llmChat(options: LLMChatOptions): Promise<LLMChatResult> {
    resetDailyIfNeeded()

    const providerToUse = options.provider || activeProvider
    const model = options.model || DEFAULT_MODELS[providerToUse]
    const start = Date.now()

    try {
        const result = await callProvider(providerToUse, model, options)
        trackSuccess(providerToUse, model, result, Date.now() - start)
        return result
    } catch (err: any) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('rate_limit')

        if (is429 && providerToUse === 'groq') {
            // Failover automático para OpenRouter
            stats.groq.lastRateLimitAt = new Date().toISOString()
            stats.groq.rateLimitCount++
            activeProvider = 'openrouter'

            const fallbackModel = options.model && options.model.includes(':free')
                ? options.model
                : DEFAULT_MODELS.openrouter

            try {
                const result = await callProvider('openrouter', fallbackModel, options)
                trackSuccess('openrouter', fallbackModel, result, Date.now() - start)
                return result
            } catch (fallbackErr: any) {
                trackError('openrouter', fallbackModel, fallbackErr.message, Date.now() - start)
                throw fallbackErr
            }
        }

        trackError(providerToUse, model, err.message, Date.now() - start)
        throw err
    }
}

// ── Chamada ao provider ───────────────────────────────────────────────────────

async function callProvider(
    provider: LLMProvider,
    model: string,
    options: LLMChatOptions
): Promise<LLMChatResult> {
    const apiKey = provider === 'groq'
        ? process.env.GROQ_API_KEY
        : process.env.OPENROUTER_API_KEY

    if (!apiKey) throw new Error(`API key não configurada para provider: ${provider}`)

    const baseUrl = provider === 'groq' ? GROQ_BASE : OPENROUTER_BASE

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    }

    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://docs.cataguases.mg.gov.br'
        headers['X-Title'] = 'Docs Cataguases'
    }

    const body = {
        model,
        messages: options.messages,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    // Capturar headers de rate limit do Groq
    if (provider === 'groq') {
        const s = stats.groq
        s.groqRemainingRequests = parseInt(res.headers.get('x-ratelimit-remaining-requests') || '0')
        s.groqRemainingTokens = parseInt(res.headers.get('x-ratelimit-remaining-tokens') || '0')
        s.groqResetRequestsAt = res.headers.get('x-ratelimit-reset-requests') || undefined
        s.groqResetTokensAt = res.headers.get('x-ratelimit-reset-tokens') || undefined
    }

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }))
        const err = new Error(errBody?.error?.message || errBody?.error || res.statusText) as any
        err.status = res.status
        throw err
    }

    const data = await res.json()
    const choice = data.choices?.[0]

    return {
        content: choice?.message?.content ?? '',
        provider,
        model: data.model || model,
        usage: {
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0,
        },
    }
}

// ── Helpers de rastreamento ───────────────────────────────────────────────────

function trackSuccess(
    provider: LLMProvider,
    model: string,
    result: LLMChatResult,
    durationMs: number
) {
    const s = stats[provider]
    s.requestsTotal++
    s.requestsToday++
    s.tokensInputTotal += result.usage.inputTokens
    s.tokensOutputTotal += result.usage.outputTokens
    s.tokensInputToday += result.usage.inputTokens
    s.tokensOutputToday += result.usage.outputTokens

    addLog({
        provider,
        model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        durationMs,
        success: true,
    })
}

function trackError(provider: LLMProvider, model: string, error: string, durationMs: number) {
    addLog({ provider, model, inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs, success: false, error })
}

function addLog(entry: Omit<LLMRequestLog, 'id' | 'ts'>) {
    requestLog.unshift({
        id: Math.random().toString(36).slice(2),
        ts: new Date().toISOString(),
        ...entry,
    })
    if (requestLog.length > 100) requestLog.length = 100  // manter apenas últimas 100
}

// ── Consultar créditos do OpenRouter ─────────────────────────────────────────

export async function fetchOpenRouterCredits(): Promise<void> {
    const key = process.env.OPENROUTER_API_KEY
    if (!key) return

    try {
        const res = await fetch(`${OPENROUTER_BASE}/credits`, {
            headers: { Authorization: `Bearer ${key}` },
        })
        if (!res.ok) return
        const data = await res.json()

        const s = stats.openrouter
        s.openrouterCreditsTotal = data.total_credits ?? 0
        s.openrouterCreditsUsed = data.total_usage ?? 0
        s.openrouterCreditsRemaining = (data.total_credits ?? 0) - (data.total_usage ?? 0)
    } catch {
        // silencioso
    }
}

// ── API pública do serviço ────────────────────────────────────────────────────

export function getActiveProvider(): LLMProvider {
    return activeProvider
}

export function setActiveProvider(provider: LLMProvider): void {
    activeProvider = provider
}

export function getLLMStats() {
    return {
        activeProvider,
        groq: stats.groq,
        openrouter: stats.openrouter,
        recentRequests: requestLog.slice(0, 20),
        models: {
            groq: GROQ_MODELS,
            openrouter: OPENROUTER_FREE_MODELS,
        },
    }
}
