import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { toast } from '@/hooks/use-toast'
import api from '@/lib/api'
import type { NotificacaoItem } from '@/types/domain'

const BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000'
const MAX_RETRIES = 10

const LABELS: Record<string, string> = {
    PORTARIA_APROVADA: 'Portaria Aprovada',
    PORTARIA_REJEITADA: 'Portaria Rejeitada',
    PORTARIA_SUBMETIDA: 'Nova Portaria Submetida',
    PORTARIA_PUBLICADA: 'Portaria Publicada',
    PORTARIA_CRIADA: 'Portaria Criada',
    PORTARIA_FALHA: 'Falha no Processamento',
    // Revisão
    MUDANCA_STATUS_SOLICITAR_REVISAO: 'Revisão Assumida',
    MUDANCA_STATUS_ASSUMIR_REVISAO: 'Revisão Assumida',
    REVISAO_ATRIBUIDA: 'Revisão Atribuída',
    MUDANCA_STATUS_APROVAR_REVISAO: 'Portaria Aprovada na Revisão',
    MUDANCA_STATUS_REJEITAR_REVISAO: 'Documento Devolvido para Correção',
    DOCUMENTO_DEVOLVIDO_AUTOR: 'Documento Devolvido — Corrija e Reenvie',
    MUDANCA_STATUS_TRANSFERIR_REVISAO: 'Revisão Transferida',
    // Assinatura
    ASSINATURA_DIGITAL: 'Assinatura Digital Registrada',
    ASSINATURA_MANUAL: 'Assinatura Manual Registrada',
    ASSINATURA_DISPENSADA: 'Assinatura Dispensada',
    // Modelos
    MODELO_CRIADO: 'Novo Modelo Disponível',
    MODELO_ATUALIZADO: 'Modelo Atualizado',
}

async function fetchSseToken(): Promise<{ token: string; expiraEm: string } | null> {
    try {
        const res = await api.post('/api/notifications/token')
        if (res.data?.sseToken) {
            return { token: res.data.sseToken, expiraEm: res.data.expiresAt }
        }
    } catch {
        // falha silenciosa — o hook tentará novamente no próximo ciclo de reconexão
    }
    return null
}

function isSseTokenValido(expiraEm: string | null): boolean {
    if (!expiraEm) return false
    // margem de 30s para evitar usar token prestes a expirar
    return new Date(expiraEm).getTime() > Date.now() + 30_000
}

/**
 * Hook que gerencia o canal SSE de notificações em tempo real.
 *
 * Comportamento:
 * - Obtém um sseToken de curta duração (5 min) via POST /api/notifications/token
 * - Abre EventSource em GET /api/notifications/sse?sseToken=...
 * - Ao receber evento "portaria-update": adiciona ao store + exibe toast
 * - Em caso de erro: reconecta com exponential backoff (1s → 2s → 4s ... → 30s)
 * - Renova o sseToken automaticamente quando expira
 * - Para silenciosamente após MAX_RETRIES tentativas (não trava a UI)
 * - Cleanup correto no unmount (fecha EventSource + timers)
 */
export function useNotificationsSSE() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
    const token = useAuthStore((s) => s.token)

    const esRef = useRef<EventSource | null>(null)
    const retryCountRef = useRef(0)
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isMountedRef = useRef(true)

    const connect = async () => {
        if (!isMountedRef.current) return

        const { isAuthenticated: authed } = useAuthStore.getState()
        if (!authed) return

        // Fecha conexão anterior se existir
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }

        // Obtém ou reutiliza o sseToken
        const { sseToken, sseTokenExpiraEm, setSseToken, addNotificacao } =
            useNotificationsStore.getState()

        let activeToken = sseToken
        if (!activeToken || !isSseTokenValido(sseTokenExpiraEm)) {
            const resultado = await fetchSseToken()
            if (!resultado || !isMountedRef.current) return
            setSseToken(resultado.token, resultado.expiraEm)
            activeToken = resultado.token
        }

        // Inclui ultimaVista como cursor para o servidor não re-enviar eventos já vistos
        const { ultimaVista } = useNotificationsStore.getState()
        const url = `${BASE_URL}/api/notifications/sse?sseToken=${encodeURIComponent(activeToken)}&lastEventAt=${encodeURIComponent(ultimaVista)}`
        const es = new EventSource(url)
        esRef.current = es

        // ── Evento de broadcast por secretaria/setor ──────────────────────────
        es.addEventListener('portaria-update', (e: MessageEvent) => {
            if (!isMountedRef.current) return
            try {
                const data = JSON.parse(e.data)
                const notif: NotificacaoItem = {
                    id: data.id,
                    tipoEvento: data.tipoEvento,
                    mensagem: data.mensagem,
                    portariaId: data.portariaId ?? null,
                    portariaTitulo: data.portariaTitulo ?? null,
                    portariaNumero: data.portariaNumero ?? null,
                    metadata: data.metadata ?? {},
                    createdAt: data.createdAt,
                    criadoEm: data.createdAt,
                    lida: false,
                    direcionada: false,
                }
                
                const storeState = useNotificationsStore.getState()
                const jaExiste = storeState.notificacoes.some((x) => x.id === notif.id)
                if (jaExiste) {
                    useNotificationsStore.setState({ ultimaVista: data.createdAt })
                    return
                }
                
                addNotificacao(notif)
                toast({
                    title: LABELS[data.tipoEvento] ?? 'Notificação',
                    description: data.mensagem,
                })
                // Reset do contador de retentativas após sucesso
                retryCountRef.current = 0
            } catch {
                // JSON malformado — ignora silenciosamente
            }
        })

        // ── Evento direcionado ao usuário (tabela Notificacao) ───────────────
        es.addEventListener('notificacao', (e: MessageEvent) => {
            if (!isMountedRef.current) return
            try {
                const data = JSON.parse(e.data)
                const notif: NotificacaoItem = {
                    id: data.id,
                    tipo: data.tipo,
                    tipoEvento: data.tipo,
                    mensagem: data.mensagem,
                    portariaId: data.portariaId ?? null,
                    portariaTitulo: data.portariaTitulo ?? null,
                    portariaNumero: data.portariaNumero ?? null,
                    metadata: data.metadata ?? {},
                    createdAt: data.criadoEm,
                    criadoEm: data.criadoEm,
                    lida: data.lida ?? false,
                    direcionada: true,
                }
                
                const storeState = useNotificationsStore.getState()
                const jaExiste = storeState.notificacoes.some((x) => x.id === notif.id)
                if (jaExiste) {
                    useNotificationsStore.setState({ ultimaVista: data.criadoEm })
                    return
                }

                addNotificacao(notif)
                toast({
                    title: LABELS[data.tipo] ?? 'Notificação',
                    description: data.mensagem,
                })
                retryCountRef.current = 0
            } catch {
                // JSON malformado — ignora silenciosamente
            }
        })

        es.onerror = () => {
            es.close()
            esRef.current = null
            if (!isMountedRef.current) return
            if (retryCountRef.current >= MAX_RETRIES) return

            const delay = Math.min(1_000 * Math.pow(2, retryCountRef.current), 30_000)
            retryCountRef.current++
            retryTimerRef.current = setTimeout(connect, delay)
        }
    }

    useEffect(() => {
        isMountedRef.current = true

        if (isAuthenticated && token) {
            connect()
        }

        return () => {
            isMountedRef.current = false
            if (esRef.current) {
                esRef.current.close()
                esRef.current = null
            }
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current)
                retryTimerRef.current = null
            }
        }
    }, [isAuthenticated, token])
}
