import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { llmChat, type LLMMessage } from '@/services/llm.service'
import { DOCS_SYSTEM_PROMPT_DOCS, DOCS_SYSTEM_PROMPT } from '@/lib/llm-system-prompt'
import { LLM_TOOLS, executeToolCall } from '@/lib/llm-tools'
import { sanitizeMessages } from '@/lib/llm-sanitizer'
import { RateLimitService, rateLimitHeaders } from '@/services/rate-limit.service'

const MAX_TOKENS_PER_CHAT = 2048
const LLM_TIMEOUT_MS = 30_000
const MAX_TOOL_LOOPS = 4

export async function POST(req: NextRequest) {
    const userSession = await getSession()
    if (!userSession) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // ── Rate Limiting: 50 req/hora por usuário ────────────────────────────────
    const rl = await RateLimitService.check('LLM_CHAT', userSession.id as string)
    const rlHeaders = rateLimitHeaders(rl)

    if (!rl.allowed) {
        const minutos = Math.ceil(rl.retryAfter / 60)
        return NextResponse.json(
            {
                success: false,
                error: `Doc's Cataguases — Limite de uso do assistente atingido (${rl.max} mensagens/hora). Tente novamente em ${minutos} minuto${minutos !== 1 ? 's' : ''}.`,
                code: 429,
                retryAfter: rl.retryAfter,
                resetAt: rl.resetAt.toISOString(),
            },
            { status: 429, headers: rlHeaders }
        )
    }

    let body: any
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const {
        sessionId,
        message,
        model,
        provider,
        anexoId
    } = body

    if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Mensagem inválida ou ausente.' }, { status: 400 })
    }

    try {
        const dbUserRaw = await prisma.user.findUnique({
            where: { id: userSession.id as string },
            include: { secretaria: true, setor: true }
        })

        if (!dbUserRaw) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        const dbUser = dbUserRaw as any

        // 1. Verificar limite de tokens
        if (dbUser.tokensUsadosMesLlm >= dbUser.limiteTokensLlm) {
            return NextResponse.json({
                error: `Limite mensal de tokens atingido. Você já usou ${dbUser.tokensUsadosMesLlm.toLocaleString()} de ${dbUser.limiteTokensLlm.toLocaleString()} tokens.`
            }, { status: 402 })
        }

        // Extrair IDs para contexto das ferramentas
        const userSecretariaId: string | undefined = dbUser.secretariaId ?? undefined
        const userSetorId: string | undefined = dbUser.setorId ?? undefined

        // Montar userAuth para repassar às ferramentas (mesmo formato de /api/llm/chat)
        const userAuth = {
            nome: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
        }

        // 2. Resolver Sessão
        let chatSessionId = sessionId
        if (!chatSessionId) {
            const newSession = await (prisma as any).chatSession.create({
                data: {
                    userId: dbUser.id,
                    titulo: message.length > 30 ? message.substring(0, 30) + '...' : message,
                    provider: provider || 'auto',
                    model: model || 'auto'
                }
            })
            chatSessionId = newSession.id
        } else {
            const s = await (prisma as any).chatSession.findFirst({ where: { id: chatSessionId, userId: dbUser.id } })
            if (!s) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 404 })
        }

        // 3. Montar histórico
        const history = await (prisma as any).chatMessage.findMany({
            where: { sessionId: chatSessionId },
            orderBy: { createdAt: 'asc' },
            include: { anexo: true }
        })

        const messages: LLMMessage[] = history.map((h: any) => {
            let content = h.content
            if (h.anexo) {
                content += `\n\n[Documento Anexado no Contexto: ${h.anexo.titulo}]\n${JSON.stringify(h.anexo.formData)}`
            }
            const msg: LLMMessage = { role: h.role as any, content }
            if (h.metadata) {
                const meta = h.metadata as any
                if (meta.tool_calls) msg.tool_calls = meta.tool_calls
                if (meta.tool_call_id) msg.tool_call_id = meta.tool_call_id
                if (meta.name) msg.name = meta.name
            }
            return msg
        })

        // Adicionar mensagem atual do usuário
        let userMsgContentForLlm = message
        let currentAnexo: any = null

        if (anexoId) {
            currentAnexo = await prisma.portaria.findUnique({ where: { id: anexoId } })
            if (currentAnexo) {
                userMsgContentForLlm += `\n\n[Documento Anexado no Contexto: ${currentAnexo.titulo}]\n${JSON.stringify(currentAnexo.formData)}`
            }
        }

        messages.push({ role: 'user', content: userMsgContentForLlm })

        // Montar contexto do usuário e system prompt
        const secInfo = dbUser.secretaria
            ? `Secretaria: ${dbUser.secretaria.nome}${dbUser.secretaria.sigla ? ` (${dbUser.secretaria.sigla})` : ''}.`
            : ''
        const setInfo = dbUser.setor ? ` Setor: ${dbUser.setor.nome}.` : ''
        const userCtx = `\n\n[CONTEXTO DO USUÁRIO] Usuário: "${dbUser.name}" (${dbUser.email}). Role: ${dbUser.role}. ${secInfo}${setInfo}`

        // Se há documento anexado → prompt especializado de ChatDocs
        // Caso contrário → prompt completo com todas as ferramentas
        const basePrompt = currentAnexo ? DOCS_SYSTEM_PROMPT_DOCS : DOCS_SYSTEM_PROMPT
        const systemMsg: LLMMessage = {
            role: 'system',
            content: basePrompt + userCtx,
        }

        // 4. Sanitizar mensagens e executar loop de ferramentas
        const callStart = Date.now()
        let currentMessages = sanitizeMessages([systemMsg, ...messages]) as LLMMessage[]
        let finalResult: any = null
        let loopCount = 0

        while (loopCount < MAX_TOOL_LOOPS) {
            loopCount++

            const llmPromise = llmChat({
                messages: currentMessages,
                model: model || undefined,
                provider: provider || undefined,
                maxTokens: MAX_TOKENS_PER_CHAT,
                temperature: 0.7,
                tools: LLM_TOOLS,
            })

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: o modelo demorou mais de 30s para responder.')), LLM_TIMEOUT_MS)
            )

            const result = await Promise.race([llmPromise, timeoutPromise])

            if (result.tool_calls && result.tool_calls.length > 0) {
                // LLM quer chamar ferramentas — adiciona a resposta parcial ao histórico
                currentMessages.push({
                    role: 'assistant',
                    content: result.content || '',
                    tool_calls: result.tool_calls,
                } as any)

                // Executa todas as ferramentas em paralelo
                const toolResults = await Promise.all(
                    result.tool_calls.map(async (toolCall: any) => {
                        const funcName = toolCall.function.name
                        let args: Record<string, unknown> = {}
                        try {
                            args = JSON.parse(toolCall.function.arguments || '{}')
                        } catch {
                            return {
                                role: 'tool' as const,
                                tool_call_id: toolCall.id,
                                name: funcName,
                                content: JSON.stringify({ erro: 'Falha ao interpretar argumentos da função', funcao: funcName }),
                            } as any
                        }

                        const funcResult = await executeToolCall(funcName, args, {
                            userAuth,
                            secretariaId: userSecretariaId,
                            setorId: userSetorId,
                        })

                        return {
                            role: 'tool' as const,
                            tool_call_id: toolCall.id,
                            name: funcName,
                            content: JSON.stringify(funcResult),
                        } as any
                    })
                )

                // Sanitizar respostas das ferramentas antes de devolver ao LLM
                currentMessages.push(...(sanitizeMessages(toolResults) as any))
                continue
            }

            // Sem tool_calls — verifica se content contém JSON de tool call disfarçado
            let safeContent = result.content || ''
            if (safeContent.includes('"name"') && safeContent.includes('"arguments"')) {
                try {
                    let cleaned = safeContent.trim()
                        .replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim()
                    const testParse = cleaned.startsWith('[') ? JSON.parse(cleaned) : cleaned.startsWith('{') ? JSON.parse(cleaned) : null
                    const isToolLike = testParse && (
                        (Array.isArray(testParse) && testParse.some((t: any) => t?.name)) ||
                        (typeof testParse === 'object' && testParse.name)
                    )
                    if (isToolLike) {
                        console.warn('[chat-session] Content final contém JSON de tool call — substituindo por mensagem segura')
                        safeContent = 'Estou processando sua solicitação. Pode repetir o que precisa para eu responder de forma mais clara?'
                    }
                } catch { /* não é JSON, tudo certo */ }
            }
            finalResult = { ...result, content: safeContent }
            break
        }

        const duration = Date.now() - callStart

        // Limite de loops atingido sem resposta final
        if (!finalResult) {
            console.warn('[chat-session] Loop limite de ferramentas atingido', { model, sessionId: chatSessionId })
            finalResult = {
                content: 'Precisei consultar muitas ferramentas em sequência e interrompi para não travar o sistema. Posso ajudar com alguma dúvida específica?',
                provider: provider || 'unknown',
                model: model || 'auto',
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                fallbackUsed: false,
            }
        }

        // 5. Salvar Mensagens no Banco
        await prisma.$transaction([
            // Mensagem do usuário
            (prisma as any).chatMessage.create({
                data: {
                    sessionId: chatSessionId,
                    role: 'user',
                    content: message,
                    anexoId: currentAnexo ? currentAnexo.id : undefined,
                    tokens: Math.ceil(userMsgContentForLlm.length / 4)
                }
            }),
            // Resposta do assistente (apenas a mensagem final, sem intermediários de tool)
            (prisma as any).chatMessage.create({
                data: {
                    sessionId: chatSessionId,
                    role: 'assistant',
                    content: finalResult.content,
                    provider: finalResult.provider,
                    model: finalResult.model,
                    tokens: finalResult.usage.outputTokens,
                    metadata: {
                        durationMs: duration,
                        fallbackUsed: finalResult.fallbackUsed,
                        toolLoops: loopCount,
                    }
                }
            }),
            // Atualizar consumo de tokens do usuário
            prisma.user.update({
                where: { id: dbUser.id },
                data: { tokensUsadosMesLlm: { increment: finalResult.usage.totalTokens } } as any
            }),
            // Atualizar timestamp da sessão
            (prisma as any).chatSession.update({
                where: { id: chatSessionId },
                data: { updatedAt: new Date() }
            })
        ])

        return NextResponse.json(
            {
                success: true,
                sessionId: chatSessionId,
                message: {
                    role: 'assistant',
                    content: finalResult.content,
                    provider: finalResult.provider,
                    model: finalResult.model,
                    tokens: finalResult.usage.totalTokens
                },
                tokensUsadosMes: dbUser.tokensUsadosMesLlm + finalResult.usage.totalTokens
            },
            { headers: rlHeaders }
        )

    } catch (err: any) {
        console.error('[POST /api/llm/chat-session]', err)
        const isTimeout = err.message?.includes('Timeout')
        const status = isTimeout ? 504 : err.status === 429 ? 429 : 500
        const rawMsg = isTimeout
            ? `Doc's Cataguases — O assistente demorou para responder. Tente novamente.`
            : err.message?.startsWith("Doc's Cataguases")
            ? err.message
            : `Doc's Cataguases — ${err.message || 'Erro interno ao processar chat.'}`
        return NextResponse.json({ error: rawMsg, code: status }, { status })
    }
}
