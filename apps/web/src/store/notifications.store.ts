import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { NotificacaoItem } from '@/types/domain'
import api from '@/lib/api'

const MAX_NOTIFICACOES = 50

interface NotificationsState {
    notificacoes: NotificacaoItem[]
    naoLidas: number
    ultimaVista: string
    sseToken: string | null
    sseTokenExpiraEm: string | null
    isLoading: boolean
    setSseToken: (token: string, expiraEm: string) => void
    addNotificacao: (n: NotificacaoItem) => void
    marcarLida: (id: string) => Promise<void>
    marcarTodasLidas: () => Promise<void>
    clearNotificacoes: () => void
    setNaoLidas: (count: number) => void
    fetchInitialNotifications: () => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>()(
    persist(
        (set, get) => ({
            notificacoes: [],
            naoLidas: 0,
            ultimaVista: new Date().toISOString(),
            sseToken: null,
            sseTokenExpiraEm: null,
            isLoading: false,

            setSseToken: (token, expiraEm) =>
                set({ sseToken: token, sseTokenExpiraEm: expiraEm }),

            addNotificacao: (n) =>
                set((state) => {
                    // Previne duplicatas em reconexões sobrepostas
                    if (state.notificacoes.some((x) => x.id === n.id)) return state

                    // Deduplicação semântica: mesmo portariaId + tipoEvento dentro de 10s
                    // FeedAtividade e Notificacao são registros distintos com IDs diferentes
                    // mas podem representar o mesmo evento humano
                    if (n.portariaId && n.tipoEvento) {
                        const JANELA_MS = 10_000
                        const agora = Date.now()
                        const jaExiste = state.notificacoes.some((x) => {
                            if (x.portariaId !== n.portariaId) return false
                            if (x.tipoEvento !== n.tipoEvento) return false
                            const xTs = x.criadoEm ? new Date(x.criadoEm).getTime() : 0
                            const nTs = n.criadoEm ? new Date(n.criadoEm).getTime() : agora
                            return Math.abs(xTs - nTs) < JANELA_MS
                        })
                        if (jaExiste) return state
                    }

                    const novasNotificacoes = [n, ...state.notificacoes].slice(0, MAX_NOTIFICACOES)
                    const novaData = n.criadoEm ?? n.createdAt ?? state.ultimaVista

                    return {
                        notificacoes: novasNotificacoes,
                        naoLidas: state.naoLidas + 1,
                        ultimaVista: novaData,
                    }
                }),

            marcarLida: async (id) => {
                const state = get()
                const notif = state.notificacoes.find((n) => n.id === id)
                if (!notif || notif.lida) return

                // Update local
                set((state) => ({
                    notificacoes: state.notificacoes.map((n) =>
                        n.id === id ? { ...n, lida: true } : n
                    ),
                    naoLidas: Math.max(0, state.naoLidas - 1),
                }))

                // Update remoto se for uma notificação persistente (com UUID)
                // IDs de broadcast (FeedAtividade) podem não ser persistentes por usuário
                if (id.length > 20) { // IDs cuid/uuid são longos
                    try {
                        await api.patch(`/api/notifications/${id}`)
                    } catch (error) {
                        console.error('Erro ao marcar notificação como lida no servidor:', error)
                    }
                }
            },

            marcarTodasLidas: async () => {
                // Update local
                set((state) => ({
                    naoLidas: 0,
                    notificacoes: state.notificacoes.map((n) => ({ ...n, lida: true })),
                }))

                // Update remoto
                try {
                    await api.patch('/api/notifications/read-all')
                } catch (error) {
                    console.error('Erro ao marcar todas as notificações como lidas no servidor:', error)
                }
            },

            clearNotificacoes: () =>
                set({ notificacoes: [], naoLidas: 0 }),

            setNaoLidas: (count) => set({ naoLidas: count }),

            fetchInitialNotifications: async () => {
                if (get().isLoading) return
                set({ isLoading: true })
                try {
                    const res = await api.get('/api/notifications')
                    if (res.data?.success) {
                        const backendNotifs = res.data.data.map((n: any) => ({
                            id: n.id,
                            tipo: n.tipo,
                            tipoEvento: n.tipo,
                            mensagem: n.mensagem,
                            lida: n.lida,
                            portariaId: n.portariaId,
                            portariaTitulo: n.portariaTitulo,
                            portariaNumero: n.portariaNumero,
                            metadata: n.metadata || {},
                            createdAt: n.criadoEm,
                            criadoEm: n.criadoEm,
                            direcionada: true
                        }))

                        set((state) => {
                            // Merge com as que já temos (SSE pode ter enviado algo enquanto carregava)
                            const existingIds = new Set(backendNotifs.map((n: any) => n.id))
                            const newOnly = state.notificacoes.filter(n => !existingIds.has(n.id))
                            
                            const merged = [...newOnly, ...backendNotifs]
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .slice(0, MAX_NOTIFICACOES)

                            const ultima = merged[0]?.createdAt || state.ultimaVista

                            return {
                                notificacoes: merged,
                                naoLidas: res.data.naoLidas,
                                ultimaVista: ultima
                            }
                        })
                    }
                } catch (error) {
                    console.error('Erro ao carregar notificações iniciais:', error)
                } finally {
                    set({ isLoading: false })
                }
            }
        }),
        {
            name: 'docs-cataguases-notifications',
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({
                notificacoes: s.notificacoes,
                naoLidas: s.naoLidas,
                ultimaVista: s.ultimaVista,
            }),
        }
    )
)
