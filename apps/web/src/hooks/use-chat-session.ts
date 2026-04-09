import { useState, useCallback } from 'react'
import api from '@/lib/api'

interface SessionMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    provider?: string
    model?: string
    tokens?: number
    error?: boolean
}

interface UseChatSession {
    sessionId: string | null
    isCreating: boolean
    createSession: (provider?: string, model?: string) => Promise<string | null>
    saveMessages: (sessionId: string, messages: SessionMessage[]) => Promise<void>
}

export function useChatSession(): UseChatSession {
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)

    const createSession = useCallback(async (provider?: string, model?: string): Promise<string | null> => {
        setIsCreating(true)
        try {
            const res = await api.post('/api/llm/sessions', {
                titulo: `Chat ${new Date().toLocaleDateString('pt-BR')}`,
                ...(provider && { provider }),
                ...(model && { model }),
            })
            if (res.data?.success && res.data?.data?.id) {
                setSessionId(res.data.data.id)
                return res.data.data.id
            }
            return null
        } catch (err) {
            console.error('[useChatSession] Falha ao criar sessão:', err)
            return null
        } finally {
            setIsCreating(false)
        }
    }, [])

    const saveMessages = useCallback(async (sid: string, messages: SessionMessage[]): Promise<void> => {
        try {
            // Salva apenas as últimas 50 mensagens para evitar payload grande
            const toSave = messages.slice(-50)
            await api.patch(`/api/llm/sessions/${sid}`, {
                messages: toSave.map(m => ({
                    role: m.role,
                    content: m.content,
                    metadata: {
                        provider: m.provider,
                        model: m.model,
                        tokens: m.tokens,
                        error: m.error,
                    }
                }))
            })
        } catch (err) {
            // Falha silenciosa — não interrompe o chat
            console.warn('[useChatSession] Falha ao salvar mensagens:', err)
        }
    }, [])

    return { sessionId, isCreating, createSession, saveMessages }
}
