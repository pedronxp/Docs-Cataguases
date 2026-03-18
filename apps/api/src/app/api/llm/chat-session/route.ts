import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { llmChat, type LLMMessage } from '@/services/llm.service'

const MAX_TOKENS_PER_CHAT = 2048

export async function POST(req: NextRequest) {
    const userSession = await getSession()
    if (!userSession) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
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
            include: { secretaria: true, setor: true } // para contexto
        })

        if (!dbUserRaw) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        
        const dbUser = dbUserRaw as any; // typescript cache bypass

        // 1. Verificar limite de tokens
        if (dbUser.tokensUsadosMesLlm >= dbUser.limiteTokensLlm) {
            return NextResponse.json({ 
                error: `Limite mensal de tokens atingido. Você já usou ${dbUser.tokensUsadosMesLlm.toLocaleString()} de ${dbUser.limiteTokensLlm.toLocaleString()} tokens.` 
            }, { status: 402 }) // Payment Required / Limit Exceeded
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
            // Verificar se sessão pertence ao usuário
            const s = await (prisma as any).chatSession.findFirst({ where: { id: chatSessionId, userId: dbUser.id } })
            if (!s) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 404 })
        }

        // 3. Montar histórico
        const history = await (prisma as any).chatMessage.findMany({
            where: { sessionId: chatSessionId },
            orderBy: { createdAt: 'asc' },
            include: { anexo: true }
        })

        // Converter para o formato do LLM
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

        // Montar contexto do cargo
        const secInfo = dbUser.secretaria ? ` Secretaria: ${dbUser.secretaria.nome}.` : ''
        const setInfo = dbUser.setor ? ` Setor: ${dbUser.setor.nome}.` : ''
        const systemMsg: LLMMessage = { 
            role: 'system', 
            content: `Você é o Doc's Cataguases, um assistente corporativo. Você está conversando com o usuário "${dbUser.name}" (${dbUser.email}).\nCargo/Permissão: ${dbUser.role}.${secInfo}${setInfo}\nResponda sempre levando o cargo do usuário em consideração, adaptando a linguagem e o escopo de informações que ele tem acesso.` 
        }
        
        const finalMessages = [systemMsg, ...messages]

        // 4. Chamar LLM Externo via llmChat() (com suporte a Fallback)
        const callStart = Date.now()
        const llmRes = await llmChat({
            messages: finalMessages,
            model: model || undefined,
            provider: provider || undefined,
            maxTokens: MAX_TOKENS_PER_CHAT,
            temperature: 0.7
        })
        const duration = Date.now() - callStart

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
            // Resposta do assistente
            (prisma as any).chatMessage.create({
                data: {
                    sessionId: chatSessionId,
                    role: 'assistant',
                    content: llmRes.content,
                    provider: llmRes.provider,
                    model: llmRes.model,
                    tokens: llmRes.usage.outputTokens,
                    metadata: { durationMs: duration, fallbackUsed: llmRes.fallbackUsed }
                }
            }),
            // Atualizar token e timestamp da sessão
            prisma.user.update({
                where: { id: dbUser.id },
                data: { tokensUsadosMesLlm: { increment: llmRes.usage.totalTokens } } as any
            }),
            (prisma as any).chatSession.update({
                where: { id: chatSessionId },
                data: { updatedAt: new Date() }
            })
        ])

        return NextResponse.json({
            success: true,
            sessionId: chatSessionId,
            message: {
                role: 'assistant',
                content: llmRes.content,
                provider: llmRes.provider,
                model: llmRes.model,
                tokens: llmRes.usage.totalTokens
            },
            tokensUsadosMes: dbUser.tokensUsadosMesLlm + llmRes.usage.totalTokens
        })

    } catch (err: any) {
        console.error('[POST /api/llm/chat-session]', err)
        return NextResponse.json({ error: err.message || 'Erro interno ao processar chat' }, { status: 500 })
    }
}
