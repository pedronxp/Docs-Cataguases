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
    marcarTodasLidas: () => void
    clearNotificacoes: () => void
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
                        ultimaVista: n.createdAt, // avança o cursor para a reconexão
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
