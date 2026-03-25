/**
 * LLM Service — Multi-Provider Pool + Smart Router + Circuit Breaker
 *
 * Providers (REGRA MÁXIMA: Cerebras primeiro):
 *   - Cerebras:   https://api.cerebras.ai/v1      (motor principal — wafer-scale ⚡)
 *   - Mistral:    https://api.mistral.ai/v1       (alternativa de alta qualidade)
 *   - Groq:       https://api.groq.com/openai/v1  (fallback rápido)
 *   - OpenRouter: https://openrouter.ai/api/v1    (fallback robusto final)
 *
 * Lógica:
 *   1. Smart Router analisa a mensagem → escolhe o modelo ideal (Cerebras preferencial)
 *   2. Pool Balancer seleciona a melhor API Key do banco de dados
 *   3. Circuit Breaker detecta 429 → gira para próxima key → fallback chain
 *   4. Fallback legacy para variáveis de ambiente (compatibilidade)
 */

import prisma from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'

export type LLMProvider = 'cerebras' | 'mistral' | 'groq' | 'openrouter' | 'kimi'

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: any[]
    tool_call_id?: string
    name?: string
}

export interface LLMChatOptions {
    messages: LLMMessage[]
    model?: string
    maxTokens?: number
    temperature?: number
    provider?: LLMProvider  // forçar provider específico
    tools?: any[]           // ferramentas para o modelo (Function Calling)
    skipSmartRouter?: boolean // desabilita seleção automática de modelo
}

export interface LLMChatResult {
    content: string
    tool_calls?: any[]
    provider: LLMProvider
    model: string
    keyId?: string              // ID da chave usada (para auditoria)
    fallbackUsed?: boolean      // true se provider diferente do solicitado foi usado
    requestedProvider?: LLMProvider // provider originalmente solicitado (para transparência)
    usage: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
    }
}

// ── Configuração dos providers ─────────────────────────────────────────────────

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const CEREBRAS_BASE = 'https://api.cerebras.ai/v1'
const MISTRAL_BASE = 'https://api.mistral.ai/v1'
const KIMI_BASE = 'https://api.moonshot.cn/v1'

// ── Catálogo de Modelos ────────────────────────────────────────────────────────

// CEREBRAS — Motor principal (wafer-scale ⚡, gratuito)
export const CEREBRAS_MODELS = [
    { id: 'llama3.1-8b',  label: 'Llama 3.1 8B ⚡ (Padrão)', contextWindow: 8192 },
    { id: 'llama3.3-70b', label: 'Llama 3.3 70B ⚡ (Alta Capacidade)', contextWindow: 8192 },
]

// MISTRAL — Alta qualidade, raciocínio estruturado
export const MISTRAL_MODELS = [
    { id: 'mistral-large-latest', label: 'Mistral Large (Raciocínio avançado)', contextWindow: 128000 },
    { id: 'mistral-small-latest', label: 'Mistral Small (Rápido)', contextWindow: 32768 },
    { id: 'open-mistral-nemo',    label: 'Mistral Nemo (Leve e eficiente)', contextWindow: 128000 },
]

// GROQ — Fallback rápido
export const GROQ_MODELS = [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Versatile)', contextWindow: 128000 },
    { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (Instant)', contextWindow: 131072 },
    { id: 'qwen-2.5-32b',            label: 'Qwen 2.5 32B (Raciocínio)', contextWindow: 32768 },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 (Contexto longo)', contextWindow: 128000 },
]

// OPENROUTER — Fallback final
export const OPENROUTER_FREE_MODELS = [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
    { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
    { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (free)' },
]

// KIMI — Moonshot AI
export const KIMI_MODELS = [
    { id: 'moonshot-v1-8k', label: 'Moonshot v1 8K', contextWindow: 8192 },
    { id: 'moonshot-v1-32k', label: 'Moonshot v1 32K', contextWindow: 32768 },
]

// ── Estado de rastreamento em memória ─────────────────────────────────────────

let activeProvider: LLMProvider = (process.env.LLM_DEFAULT_PROVIDER as LLMProvider) || 'cerebras'

export interface LLMProviderStats {
    requestsTotal: number
    requestsToday: number
    tokensInputTotal: number
    tokensOutputTotal: number
    tokensInputToday: number
    tokensOutputToday: number
    lastRateLimitAt: string | null
    rateLimitCount: number
    groqRemainingRequests?: number
    groqRemainingTokens?: number
    groqResetRequestsAt?: string
    groqResetTokensAt?: string
    openrouterCreditsTotal?: number
    openrouterCreditsUsed?: number
    openrouterCreditsRemaining?: number
}

export interface LLMRequestLog {
    id: string
    ts: string
    provider: LLMProvider
    model: string
    keyId?: string
    keyMask?: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    durationMs: number
    success: boolean
    error?: string
}

const emptyStats = (): LLMProviderStats => ({
    requestsTotal: 0, requestsToday: 0,
    tokensInputTotal: 0, tokensOutputTotal: 0,
    tokensInputToday: 0, tokensOutputToday: 0,
    lastRateLimitAt: null, rateLimitCount: 0,
})

const stats: Record<LLMProvider, LLMProviderStats> = {
    cerebras:   emptyStats(),
    mistral:    emptyStats(),
    groq:       emptyStats(),
    openrouter: emptyStats(),
    kimi:       emptyStats(),
}

const requestLog: LLMRequestLog[] = []

let lastResetDay = new Date().toDateString()
function resetDailyIfNeeded() {
    const today = new Date().toDateString()
    if (today !== lastResetDay) {
        lastResetDay = today
        for (const p of Object.keys(stats) as LLMProvider[]) {
            stats[p].requestsToday = 0
            stats[p].tokensInputToday = 0
            stats[p].tokensOutputToday = 0
        }
    }
}

// ── Smart Router — Seleção de Modelo por Complexidade ─────────────────────────

interface ModelChoice {
    provider: LLMProvider
    model: string
    reason: string
}

function getDefaultModelForProvider(provider: LLMProvider): string {
    if (provider === 'cerebras') return 'llama3.1-8b'
    if (provider === 'mistral') return 'mistral-large-latest'
    if (provider === 'groq') return 'llama-3.3-70b-versatile'
    if (provider === 'openrouter') return 'meta-llama/llama-3.3-70b-instruct:free'
    if (provider === 'kimi') return 'moonshot-v1-8k'
    return 'llama3.1-8b'
}

function chooseModel(options: LLMChatOptions): ModelChoice {
    // Se provider foi solicitado explicitamente, respeitar e NÃO usar smart router
    if (options?.provider) {
        return {
            provider: options.provider,
            model: options.model || getDefaultModelForProvider(options.provider),
            reason: `Provider explicitamente solicitado: ${options.provider}`
        }
    }

    // Se modelo foi solicitado explicitamente, respeitar
    if (options.model) {
        const provider = activeProvider
        return { provider, model: options.model, reason: 'Modelo explicitamente solicitado' }
    }

    const hasTools = options.tools && options.tools.length > 0
    const totalChars = options.messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)

    // Usa o provider ativo configurado pelo admin (padrão: cerebras)
    const preferred = activeProvider

    // Modelos por provider para cada cenário
    const modelMap: Record<LLMProvider, { tools: string; fast: string; long: string; default: string }> = {
        cerebras:   { tools: 'llama3.3-70b', fast: 'llama3.1-8b', long: 'llama3.3-70b', default: 'llama3.1-8b' },
        mistral:    { tools: 'mistral-large-latest', fast: 'mistral-small-latest', long: 'mistral-large-latest', default: 'mistral-large-latest' },
        groq:       { tools: 'llama-3.3-70b-versatile', fast: 'llama-3.1-8b-instant', long: 'deepseek-r1-distill-llama-70b', default: 'llama-3.3-70b-versatile' },
        openrouter: { tools: 'meta-llama/llama-3.3-70b-instruct:free', fast: 'meta-llama/llama-3.3-70b-instruct:free', long: 'deepseek/deepseek-r1:free', default: 'meta-llama/llama-3.3-70b-instruct:free' },
        kimi:       { tools: 'moonshot-v1-8k', fast: 'moonshot-v1-8k', long: 'moonshot-v1-32k', default: 'moonshot-v1-8k' },
    }

    const models = modelMap[preferred]

    // Tools: usar modelo com melhor raciocínio para function calling
    if (hasTools) {
        return {
            provider: preferred,
            model: models.tools,
            reason: `Function Calling → ${preferred}/${models.tools}`
        }
    }

    // Pergunta curta e simples → modelo rápido
    if (totalChars < 400) {
        return {
            provider: preferred,
            model: models.fast,
            reason: `Pergunta curta (${totalChars} chars) → ${preferred}/${models.fast}`
        }
    }

    // Contexto muito longo → modelo com contexto longo
    if (totalChars >= 4000) {
        return {
            provider: preferred,
            model: models.long,
            reason: `Contexto longo (${totalChars} chars) → ${preferred}/${models.long}`
        }
    }

    // Padrão: modelo principal do provider ativo
    return {
        provider: preferred,
        model: models.default,
        reason: `Complexidade média (${totalChars} chars) → ${preferred}/${models.default}`
    }
}

// ── Pool Balancer — Seleção da Melhor API Key ─────────────────────────────────

async function pickBestKey(provider: LLMProvider) {
    const now = new Date()
    
    // Reativar chaves cujo cooldown expirou
    await prisma.llmApiKey.updateMany({
        where: {
            provider,
            esgotada: true,
            esgotadaAte: { lt: now },
        },
        data: { esgotada: false, esgotadaAte: null },
    })

    // Pegar chave menos usada que ainda está disponível
    return prisma.llmApiKey.findFirst({
        where: {
            provider,
            ativo: true,
            esgotada: false,
        },
        orderBy: { requisicoes: 'asc' },
    })
}

async function markKeyExhausted(keyId: string, cooldownMinutes = 60) {
    const esgotadaAte = new Date(Date.now() + cooldownMinutes * 60 * 1000)
    await prisma.llmApiKey.update({
        where: { id: keyId },
        data: { esgotada: true, esgotadaAte },
    })
}

async function incrementKeyUsage(keyId: string, tokens: number) {
    await prisma.llmApiKey.update({
        where: { id: keyId },
        data: {
            requisicoes: { increment: 1 },
            tokensTotal: { increment: tokens },
        },
    })
}

// ── Circuit Breaker — Chamada com Retry Automático ────────────────────────────

// Motivo pelo qual um provider não foi usado
type SkipReason = 'no_key' | 'rate_limited' | 'api_error'

async function callWithCircuitBreaker(
    provider: LLMProvider,
    model: string,
    options: LLMChatOptions
): Promise<LLMChatResult & { tried: boolean; skipReason?: SkipReason }> {
    // Tentar cada chave do pool para este provider
    while (true) {
        const key = await pickBestKey(provider)

        // Se não há chave no banco, tentar via variável de ambiente (fallback legacy)
        if (!key) {
            const envKey = provider === 'groq'
                ? process.env.GROQ_API_KEY
                : provider === 'cerebras'
                ? process.env.CEREBRAS_API_KEY
                : provider === 'mistral'
                ? process.env.MISTRAL_API_KEY
                : provider === 'kimi'
                ? process.env.KIMI_API_KEY
                : process.env.OPENROUTER_API_KEY

            if (!envKey) {
                // Sem chave alguma para este provider
                console.warn(`[LLM Pool] ${provider}: nenhuma chave configurada (banco ou .env)`)
                return { tried: false, skipReason: 'no_key' } as any
            }

            try {
                const result = await callProviderRaw(provider, envKey, undefined, model, options)
                return { ...result, tried: true }
            } catch (err: any) {
                const status = err.status ?? 0
                if (status === 429 || status === 402) {
                    // Rate limit — pula para o próximo provider
                    console.warn(`[LLM Pool] ${provider} ENV key esgotou (${status}) → próximo provider`)
                    stats[provider].rateLimitCount++
                    stats[provider].lastRateLimitAt = new Date().toISOString()
                    return { tried: false, skipReason: 'rate_limited' } as any
                }
                if (status === 401 || status === 403) {
                    // Chave inválida ou expirada — pula para o próximo provider
                    console.warn(`[LLM Pool] ${provider} ENV key inválida/expirada (${status}) → próximo provider`)
                    return { tried: false, skipReason: 'no_key' } as any
                }
                // Outros erros (400, 404, 500, timeout): pula mas registra como api_error
                console.error(`[LLM Pool] ${provider} erro da API (${status}): ${err.message?.slice(0, 120)} → próximo provider`)
                return { tried: false, skipReason: 'api_error' } as any
            }
        }

        try {
            // Descriptografa a chave em memória — nunca persiste o valor plano
            let plainKey: string
            try {
                plainKey = isEncrypted(key.keyEncrypted)
                    ? decrypt(key.keyEncrypted)
                    : key.keyEncrypted // fallback para chaves legacy ainda não migradas
            } catch (decErr: any) {
                console.error(`[LLM Pool] Falha ao descriptografar chave ${key.mask}:`, decErr?.message)
                return { tried: false, skipReason: 'no_key' } as any
            }
            const result = await callProviderRaw(provider, plainKey, key.id, model, options)
            await incrementKeyUsage(key.id, result.usage.totalTokens).catch(() => {})
            return { ...result, tried: true }
        } catch (err: any) {
            const status = err.status ?? 0
            if (status === 429 || status === 402) {
                console.warn(`[LLM Pool] Chave ${key.mask} do ${provider} esgotada (${status}) → próxima chave`)
                await markKeyExhausted(key.id, 60)
                stats[provider].rateLimitCount++
                stats[provider].lastRateLimitAt = new Date().toISOString()
                continue  // Tenta a próxima chave do mesmo provider
            }
            if (status === 401 || status === 403) {
                console.warn(`[LLM Pool] Chave ${key.mask} do ${provider} inválida/expirada (${status}) → desativa e tenta próxima`)
                await markKeyExhausted(key.id, 24 * 60) // Cooldown de 24h para chave inválida
                continue  // Tenta a próxima chave do mesmo provider
            }
            // Erro inesperado (500) ou formato inválido / modelo inexistente (400, 404)
            console.error(`[LLM Pool] Chave ${key.mask} do ${provider} erro (${status}): ${err.message?.slice(0, 80)}`)
            await markKeyExhausted(key.id, 5)
            // Para 404/400 (Client Errors), não adianta tentar outra chave do mesmo provider para o mesmo modelo com mesmo prompt
            if (status === 400 || status === 404) {
                return { tried: false, skipReason: 'api_error' } as any
            }
            continue
        }
    }
}

// ── Função Principal de Chat ──────────────────────────────────────────────────

/**
 * Verifica se um provider tem chave ENV configurada.
 * Usado para otimizar a ordem de tentativas — providers sem chave vão para o final.
 */
function hasEnvKey(p: LLMProvider): boolean {
    const k = p === 'cerebras'   ? process.env.CEREBRAS_API_KEY
        : p === 'mistral'        ? process.env.MISTRAL_API_KEY
        : p === 'groq'           ? process.env.GROQ_API_KEY
        : p === 'kimi'           ? process.env.KIMI_API_KEY
        : process.env.OPENROUTER_API_KEY
    return !!k
}

export async function llmChat(options: LLMChatOptions): Promise<LLMChatResult> {
    resetDailyIfNeeded()

    const choice = options.skipSmartRouter
        ? { provider: (options.provider || 'cerebras') as LLMProvider, model: options.model || 'llama3.1-8b', reason: 'Manual' }
        : chooseModel(options)

    console.log(`[LLM Router] ${choice.reason} → ${choice.provider}/${choice.model}`)

    const start = Date.now()

    // ── Ordem de failover ─────────────────────────────────────────────────────
    // MODO MANUAL (skipSmartRouter=true): respeitar escolha do usuário, SEM failover.
    // Se o provider selecionado falhar, retornar erro claro. NÃO tentar outros providers.
    //
    // MODO AUTOMÁTICO: Fallback chain Cerebras → Mistral → Groq → OpenRouter
    let providerOrder: LLMProvider[]

    if (options.skipSmartRouter) {
        // Modo manual: somente o provider escolhido, sem fallback silencioso
        providerOrder = [choice.provider]
        console.log(`[LLM Router] Modo manual: usando APENAS ${choice.provider}/${choice.model} (sem fallback)`)
    } else {
        // Modo automático: tentar em ordem de disponibilidade
        const allProviders: LLMProvider[] = ['cerebras', 'mistral', 'kimi', 'groq', 'openrouter']
        const base = Array.from(new Set([choice.provider, ...allProviders]))
        providerOrder = [
            ...base.filter(p => hasEnvKey(p)),   // providers com chave ENV primeiro
            ...base.filter(p => !hasEnvKey(p)),  // providers sem chave ENV por último
        ]
        console.log(`[LLM Router] Modo automático: ${providerOrder.join(' → ')} (${providerOrder.filter(hasEnvKey).join(', ')} com chave ENV)`)
    }

    // Rastrear motivos de falha por provider
    const failReasons: Record<string, SkipReason | 'error'> = {}

    for (const provider of providerOrder) {
        // Seleciona modelo padrão do provider apenas quando houve failover real
        // (provider diferente do escolhido) — NÃO substituir por causa do '/' no nome,
        // pois modelos OpenRouter legitimamente têm '/' (ex: meta-llama/llama-3.3-70b-instruct:free)
        let modelToUse = choice.model
        if (provider !== choice.provider) {
            if (provider === 'cerebras') modelToUse = 'llama3.1-8b'
            else if (provider === 'mistral') modelToUse = 'mistral-large-latest'
            else if (provider === 'groq') modelToUse = 'llama-3.3-70b-versatile'
            else if (provider === 'kimi') modelToUse = 'moonshot-v1-8k'
            else modelToUse = 'meta-llama/llama-3.3-70b-instruct:free'
        }

        try {
            const result = await callWithCircuitBreaker(provider, modelToUse, options)

            if (!(result as any).tried) {
                const reason = (result as any).skipReason as SkipReason
                failReasons[provider] = reason
                console.warn(`[LLM Pool] ${provider} pulado (${reason}) → tentando próximo provider`)
                continue
            }

            trackSuccess(provider, modelToUse, result, Date.now() - start, result.keyId)

            // Atualizar stats do Groq com info dos headers (se disponível)
            if (provider === 'groq' && (result as any).groqHeaders) {
                const h = (result as any).groqHeaders
                stats.groq.groqRemainingRequests = h.remaining
                stats.groq.groqRemainingTokens = h.remainingTokens
            }

            // Indicar se houve fallback (provider diferente do solicitado)
            const fallbackUsed = provider !== choice.provider
            return {
                ...result,
                fallbackUsed,
                requestedProvider: fallbackUsed ? choice.provider : undefined,
            }
        } catch (err: any) {
            failReasons[provider] = 'error'
            trackError(provider, modelToUse, err.message, Date.now() - start)

            if (provider === providerOrder[providerOrder.length - 1]) {
                throw err // Último provider também falhou — relança o erro real
            }

            console.warn(`[LLM Pool] ${provider} erro não-recuperável: ${err.message?.slice(0, 100)}. Tentando ${providerOrder[providerOrder.indexOf(provider) + 1]}`)
        }
    }

    // Diagnóstico: quantos falharam por qual motivo
    const noKey = Object.entries(failReasons).filter(([, r]) => r === 'no_key').map(([p]) => p)
    const rateLimited = Object.entries(failReasons).filter(([, r]) => r === 'rate_limited').map(([p]) => p)
    const apiError = Object.entries(failReasons).filter(([, r]) => r === 'api_error').map(([p]) => p)

    console.error('[LLM Pool] Todos os providers falharam:', JSON.stringify(failReasons))

    // ── Mensagens de erro com branding "Doc's Cataguases" ────────────────────
    if (options.skipSmartRouter && apiError.includes(choice.provider)) {
        throw new Error(
            `Doc's Cataguases — O serviço de inteligência artificial selecionado encontra-se temporariamente indisponível. Por gentileza, aguarde alguns instantes ou opte pelo modo automático.`
        )
    }

    if (options.skipSmartRouter && rateLimited.includes(choice.provider)) {
        // Modo manual: provider escolhido está com rate limit
        throw new Error(
            `Doc's Cataguases — O modelo selecionado está operando em sua capacidade máxima no momento. Por favor, aguarde alguns minutos e tente novamente, ou selecione outra opção.`
        )
    }

    if (options.skipSmartRouter && noKey.includes(choice.provider)) {
        // Modo manual: provider escolhido não tem chave configurada
        throw new Error(
            `Doc's Cataguases — O provedor selecionado encontra-se inativo no sistema. Recomendamos utilizar o modo automático ou contatar o suporte técnico.`
        )
    }

    if (rateLimited.length > 0 && noKey.length + rateLimited.length === providerOrder.length) {
        // Todos falharam — compõe mensagem detalhada
        throw new Error(
            `Doc's Cataguases — Nossos serviços de assistência encontram-se com alta demanda no momento. Por gentileza, aguarde alguns minutos antes de realizar uma nova solicitação.`
        )
    }

    if (noKey.length === providerOrder.length) {
        // Nenhum provider tem chave configurada
        throw new Error(
            `Doc's Cataguases — O serviço de assistência encontra-se inativo no momento. Por favor, reporte esta situação à equipe de suporte técnico.`
        )
    }

    throw new Error(
        `Doc's Cataguases — Constatamos uma instabilidade temporária na comunicação com o assistente. Por favor, tente novamente em alguns instantes.`
    )
}

// ── Chamada ao Provider ───────────────────────────────────────────────────────

async function callProviderRaw(
    provider: LLMProvider,
    apiKey: string,
    keyId: string | undefined,
    model: string,
    options: LLMChatOptions
): Promise<LLMChatResult> {
    const baseUrl = provider === 'cerebras' ? CEREBRAS_BASE
        : provider === 'mistral' ? MISTRAL_BASE
        : provider === 'groq' ? GROQ_BASE
        : provider === 'kimi' ? KIMI_BASE
        : OPENROUTER_BASE

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    }

    if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://docs.cataguases.mg.gov.br'
        headers['X-Title'] = 'Docs Cataguases'
    }
    if (provider === 'mistral') {
        headers['Accept'] = 'application/json'
    }

    // Garantir que a estrutura de histórico atende às APIS (ex: Cerebras, Groq)
    // Se o frontend (ou db) salvou argumentos como objeto, serializar de volta para string
    const normalizedMessages = options.messages.map(msg => {
        if (msg.role === 'assistant' && msg.tool_calls) {
            msg.tool_calls = msg.tool_calls.map((tc: any) => {
                if (tc.function && typeof tc.function.arguments === 'object') {
                    tc.function.arguments = JSON.stringify(tc.function.arguments)
                }
                return tc
            })
        }
        return msg
    })

    const body: any = {
        model,
        messages: normalizedMessages,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.7,
    }

    if (options.tools && options.tools.length > 0) {
        body.tools = options.tools
        body.tool_choice = 'auto'
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    // Capturar headers de rate limit do Groq
    const groqHeaders = provider === 'groq' ? {
        remaining: parseInt(res.headers.get('x-ratelimit-remaining-requests') || '999'),
        remainingTokens: parseInt(res.headers.get('x-ratelimit-remaining-tokens') || '999999'),
        resetAt: res.headers.get('x-ratelimit-reset-requests'),
    } : null

    if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }))
        // Log estruturado sem expor chaves ou dados sensíveis — sem escrita em disco
        console.error(`[LLM Provider ${provider}] Status ${res.status}:`, JSON.stringify({
            status: res.status,
            model,
            errorCode: errBody?.error?.code,
            errorType: errBody?.error?.type,
            errorMsg: (errBody?.error?.message || errBody?.error || res.statusText)?.slice(0, 200),
        }))
        const err = new Error(errBody?.error?.message || errBody?.error || res.statusText) as any
        err.status = res.status
        err.resetAt = groqHeaders?.resetAt
        throw err
    }

    const data = await res.json()
    const choice = data.choices?.[0]

    let content = choice?.message?.content ?? ''
    let tool_calls = choice?.message?.tool_calls

    // Normalização: alguns provedores (Cerebras) podem retornar arguments como objeto, mas a API (incluindo eles mesmos depois) 
    // exige que seja uma string JSON válida.
    if (tool_calls && Array.isArray(tool_calls)) {
        tool_calls = tool_calls.map((tc: any) => {
            if (tc.function && typeof tc.function.arguments === 'object') {
                tc.function.arguments = JSON.stringify(tc.function.arguments)
            }
            return tc
        })
    }

    // ── Fallback: Modelos pequenos (ex: Cerebras llama3.1-8b) às vezes retornam
    //    chamadas de tool como JSON puro no content em vez de usar tool_calls.
    //    Formatos conhecidos:
    //      1) {"name": "func", "arguments": "{...}"}           (uma tool)
    //      2) {"name": "func", "arguments": "{...}"}\n{...}    (múltiplas, uma por linha)
    //      3) [{"name": "func", ...}, ...]                      (array)
    //      4) {"type": "function", "name": "func", "parameters": {...}}
    //      5) Qualquer dos acima envoltos em ```json ... ```
    if (!tool_calls && content && content.includes('"name"')) {
        try {
            let cleanJson = content.trim()
            // Remove blocos de code fence
            cleanJson = cleanJson.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
            if (cleanJson.startsWith('`') && cleanJson.endsWith('`')) {
                cleanJson = cleanJson.slice(1, -1).trim()
            }

            // Tenta parsear como JSON
            let candidates: any[] = []

            if (cleanJson.startsWith('[')) {
                // Formato array: [{"name":...}, {"name":...}]
                const parsed = JSON.parse(cleanJson)
                if (Array.isArray(parsed)) candidates = parsed
            } else if (cleanJson.startsWith('{')) {
                // Pode ser um único objeto ou múltiplos objetos separados por newline
                // Tenta primeiro como objeto único
                try {
                    candidates = [JSON.parse(cleanJson)]
                } catch {
                    // Múltiplos objetos JSON separados por newline (JSONL / ndjson)
                    const lines = cleanJson.split(/\n/).map((l: string) => l.trim()).filter((l: string) => l.startsWith('{'))
                    for (const line of lines) {
                        try { candidates.push(JSON.parse(line)) } catch { /* pula linhas inválidas */ }
                    }
                }
            }

            // Filtra apenas objetos que parecem tool calls válidas
            const validCalls = candidates.filter(c =>
                c && typeof c === 'object' && typeof c.name === 'string' && c.name.length > 0
            )

            if (validCalls.length > 0) {
                tool_calls = validCalls.map(c => {
                    // Normaliza arguments: pode vir como string JSON ou como objeto
                    let args = c.arguments ?? c.parameters ?? '{}'
                    if (typeof args === 'object') args = JSON.stringify(args)

                    return {
                        id: 'call_' + Math.random().toString(36).slice(2, 9),
                        type: 'function',
                        function: {
                            name: c.name,
                            arguments: args,
                        }
                    }
                })
                content = '' // Zera o content pois era tool call(s)
            }
        } catch (e) {
            // Se não for JSON válido, ignora e mantém o content como texto
        }
    }

    return {
        content,
        tool_calls,
        provider,
        model: data.model || model,
        keyId,
        groqHeaders,
        usage: {
            inputTokens: data.usage?.prompt_tokens ?? 0,
            outputTokens: data.usage?.completion_tokens ?? 0,
            totalTokens: data.usage?.total_tokens ?? 0,
        },
    } as any
}

// ── Helpers de Rastreamento ───────────────────────────────────────────────────

function trackSuccess(
    provider: LLMProvider,
    model: string,
    result: LLMChatResult,
    durationMs: number,
    keyId?: string
) {
    const s = stats[provider]
    s.requestsTotal++
    s.requestsToday++
    s.tokensInputTotal += result.usage.inputTokens
    s.tokensOutputTotal += result.usage.outputTokens
    s.tokensInputToday += result.usage.inputTokens
    s.tokensOutputToday += result.usage.outputTokens

    addLog({ provider, model, keyId, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens, durationMs, success: true })
}

function trackError(provider: LLMProvider, model: string, error: string, durationMs: number) {
    addLog({ provider, model, inputTokens: 0, outputTokens: 0, totalTokens: 0, durationMs, success: false, error })
}

function addLog(entry: Omit<LLMRequestLog, 'id' | 'ts'>) {
    requestLog.push({
        id: Math.random().toString(36).slice(2),
        ts: new Date().toISOString(),
        ...entry,
    })
    if (requestLog.length > 100) requestLog.shift()
}

// ── Créditos OpenRouter ───────────────────────────────────────────────────────

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
    } catch { /* silencioso */ }
}

// ── API Pública do Serviço ────────────────────────────────────────────────────

export function getActiveProvider(): LLMProvider { return activeProvider }
export function setActiveProvider(provider: LLMProvider): void { activeProvider = provider }

export function getLLMStats() {
    return {
        activeProvider,
        cerebras:   stats.cerebras,
        mistral:    stats.mistral,
        groq:       stats.groq,
        openrouter: stats.openrouter,
        kimi:       stats.kimi,
        recentRequests: requestLog.slice(0, 20),
        models: {
            cerebras:   CEREBRAS_MODELS,
            mistral:    MISTRAL_MODELS,
            groq:       GROQ_MODELS,
            openrouter: OPENROUTER_FREE_MODELS,
            kimi:       KIMI_MODELS,
        },
    }
}
