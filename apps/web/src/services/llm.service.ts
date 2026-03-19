import { ok, err, type Result } from '../lib/result'
import { BaseApiService, httpClient } from '@/services/base'

export type LLMProvider = 'cerebras' | 'mistral' | 'groq' | 'openrouter'

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface LLMChatRequest {
    messages: LLMMessage[]
    model?: string
    selectedModel?: string   // modelo escolhido manualmente pelo usuário no seletor do chat
    maxTokens?: number
    temperature?: number
    provider?: LLMProvider
    mode?: 'chat' | 'analysis'
    useSystemPrompt?: boolean
    userAuth?: { nome: string; email: string; role?: string }
}

export interface LLMChatResponse {
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
    inputTokens: number
    outputTokens: number
    totalTokens: number
    durationMs: number
    success: boolean
    error?: string
}

export interface LLMStatus {
    activeProvider: LLMProvider
    cerebras: LLMProviderStats
    mistral: LLMProviderStats
    groq: LLMProviderStats
    openrouter: LLMProviderStats
    recentRequests: LLMRequestLog[]
    models: {
        cerebras: Array<{ id: string; label: string; contextWindow?: number }>
        mistral: Array<{ id: string; label: string; contextWindow?: number }>
        groq: Array<{ id: string; label: string; contextWindow?: number }>
        openrouter: Array<{ id: string; label: string }>
    }
}

class LLMApiService extends BaseApiService {
    constructor(http = httpClient) {
        super(http, '/api/llm')
    }

    async chat(request: LLMChatRequest): Promise<Result<LLMChatResponse>> {
        try {
            const raw: any = await this.http.post(this.url('/chat'), request)
            const body = raw?.data ?? raw
            if (!body?.success) return err(body?.error || 'Resposta inválida do servidor LLM')
            return ok({
                content: body.content,
                provider: body.provider,
                model: body.model,
                usage: body.usage,
            })
        } catch (e: any) {
            return err(e.response?.data?.error || e.message || 'Erro ao chamar LLM')
        }
    }

    async getStatus(): Promise<Result<LLMStatus>> {
        try {
            const raw: any = await this.http.get(this.url('/status'))
            return ok(raw?.data ?? raw)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao buscar status LLM')
        }
    }

    async setProvider(provider: LLMProvider): Promise<Result<{ activeProvider: LLMProvider }>> {
        try {
            const raw: any = await this.http.patch(this.url('/provider'), { provider })
            return ok(raw?.data ?? raw)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao trocar provider')
        }
    }
}

export const llmApiService = new LLMApiService()

export const llmChat = (req: LLMChatRequest) => llmApiService.chat(req)
export const getLLMStatus = () => llmApiService.getStatus()
export const setLLMProvider = (provider: LLMProvider) => llmApiService.setProvider(provider)
