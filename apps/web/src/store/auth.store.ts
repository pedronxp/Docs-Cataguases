import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Usuario } from '@/types/domain'
import { buildAbility, type AppAbility } from '@/lib/ability'

interface AuthState {
    usuario: Usuario | null; ability: AppAbility | null
    token: string | null; isAuthenticated: boolean
    setSession: (usuario: Usuario, token: string) => void
    updateUsuario: (usuario: Usuario) => void
    clearSession: () => void
    refreshAbility: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            usuario: null, ability: null, token: null, isAuthenticated: false,
            setSession: (usuario, token) =>
                set({ usuario, token, ability: buildAbility(usuario), isAuthenticated: true }),
            updateUsuario: (usuario) =>
                set({ usuario, ability: buildAbility(usuario) }),
            clearSession: () =>
                set({ usuario: null, token: null, ability: null, isAuthenticated: false }),
            refreshAbility: () => {
                const { usuario } = get()
                if (usuario) set({ ability: buildAbility(usuario) })
            },
        }),
        {
            name: 'docs-cataguases-auth',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (s) => ({ usuario: s.usuario, token: s.token, isAuthenticated: s.isAuthenticated }),
        }
    )
)
