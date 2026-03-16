import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { NotificacaoItem } from '@/types/domain'

const MAX_NOTIFICACOES = 50

interface NotificationsState {
    notificacoes: NotificacaoItem[]
    naoLidas: number
    ultimaVista: string
    sseToken: string | null
    sseTokenExpiraEm: string | null
    setSseToken: (token: string, expiraEm: string) => void
    addNotificacao: (n: NotificacaoItem) => void
    marcarLida: (id: string) => void
    marcarTodasLidas: () => void
    clearNotificacoes: () => void
    setNaoLidas: (count: number) => void
}

export const useNotificationsStore = create<NotificationsState>()(
    persist(
        (set) => ({
            notificacoes: [],
            naoLidas: 0,
            ultimaVista: new Date().toISOString(),
            sseToken: null,
            sseTokenExpiraEm: null,

            setSseToken: (token, expiraEm) =>
                set({ sseToken: token, sseTokenExpiraEm: expiraEm }),

            addNotificacao: (n) =>
                set((state) => {
                    // Previne duplicatas em reconexões sobrepostas
                    if (state.notificacoes.some((x) => x.id === n.id)) return state
                    return {
                        notificacoes: [n, ...state.notificacoes].slice(0, MAX_NOTIFICACOES),
                        naoLidas: state.naoLidas + 1,
                        ultimaVista: n.criadoEm ?? n.createdAt ?? new Date().toISOString(),
                    }
                }),

            marcarLida: (id) =>
                set((state) => {
                    const idx = state.notificacoes.findIndex((n) => n.id === id)
                    if (idx === -1) return state
                    const already = state.notificacoes[idx].lida
                    if (already) return state
                    const updated = [...state.notificacoes]
                    updated[idx] = { ...updated[idx], lida: true }
                    return {
                        notificacoes: updated,
                        naoLidas: Math.max(0, state.naoLidas - 1),
                    }
                }),

            marcarTodasLidas: () =>
                set((state) => ({
                    naoLidas: 0,
                    ultimaVista: new Date().toISOString(),
                    notificacoes: state.notificacoes.map((n) => ({ ...n, lida: true })),
                })),

            clearNotificacoes: () =>
                set({ notificacoes: [], naoLidas: 0 }),

            setNaoLidas: (count) => set({ naoLidas: count }),
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
