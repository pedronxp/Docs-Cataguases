import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { llmChat, type LLMMessage } from '@/services/llm.service'
import { DOCS_SYSTEM_PROMPT, DOCS_SYSTEM_PROMPT_CHAT } from '@/lib/llm-system-prompt'

// Timeout para evitar que o request fique pendurado (30s)
const LLM_TIMEOUT_MS = 30_000

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const {
        messages,
        model,
        maxTokens,
        temperature,
        provider,
        useSystemPrompt = true,
        // modo 'chat' usa prompt compacto; qualquer outro usa o completo
        mode = 'chat',
    } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: 'Campo "messages" é obrigatório.' }, { status: 400 })
    }

    const validRoles = ['system', 'user', 'assistant']
    for (const msg of messages as LLMMessage[]) {
        if (!validRoles.includes(msg.role) || typeof msg.content !== 'string') {
            return NextResponse.json({ error: 'Mensagem inválida: role e content são obrigatórios.' }, { status: 400 })
        }
    }

    // Escolhe o system prompt conforme o modo
    const systemPrompt = mode === 'chat' ? DOCS_SYSTEM_PROMPT_CHAT : DOCS_SYSTEM_PROMPT

    const hasSystemMsg = messages[0]?.role === 'system'
    const finalMessages: LLMMessage[] = useSystemPrompt && !hasSystemMsg
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

    // Modelo padrão por modo: chat → 8b-instant (rápido), outros → 70b (qualidade)
    const defaultModel = mode === 'chat' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile'

    try {
        const llmPromise = llmChat({
            messages: finalMessages,
            model: model ?? defaultModel,
            maxTokens: maxTokens ?? (mode === 'chat' ? 1024 : 2048),
            temperature: temperature ?? 0.6,
            provider,
        })

        // Timeout para não deixar o request pendurado
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: o modelo demorou mais de 30s para responder.')), LLM_TIMEOUT_MS)
        )

        const result = await Promise.race([llmPromise, timeoutPromise])

        return NextResponse.json({
            success: true,
            content: result.content,
            provider: result.provider,
            model: result.model,
            usage: result.usage,
        })
    } catch (err: any) {
        const isTimeout = err.message?.includes('Timeout')
        const status = isTimeout ? 504 : err.status === 429 ? 429 : 500
        return NextResponse.json(
            {
                success: false,
                error: isTimeout
                    ? 'O assistente demorou para responder. Tente novamente.'
                    : err.message || 'Erro interno no serviço LLM',
                code: status,
            },
            { status }
        )
    }
}
