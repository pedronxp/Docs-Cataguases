import type { LoginRequest, LoginResponse } from '../types/api'
import type { Usuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function login(payload: LoginRequest): Promise<Result<LoginResponse>> {
    try {
        const response = await api.post('/api/auth/login', payload)

        if (response.data.success) {
            const { token, user } = response.data.data

            // Salva o token para persistência (embora o cookie httpOnly seja a fonte principal de verdade)
            localStorage.setItem('auth-token', token)

            return ok({
                token,
                usuario: user as unknown as Usuario
            })
        }

        return err(response.data.error || 'Falha na autenticação')
    } catch (error: any) {
        const message = error.response?.data?.error || 'Erro ao conectar com o servidor'
        return err(message)
    }
}

export async function checkSession(): Promise<Result<Usuario>> {
    try {
        const response = await api.get('/api/auth/me')
        if (response.data.success) {
            return ok(response.data.data.user as unknown as Usuario)
        }
        return err('Sessão expirada')
    } catch (error) {
        return err('Sem sessão ativa')
    }
}

export async function completarOnboarding(secretariaId: string, setorId: string): Promise<Result<Usuario>> {
    try {
        const response = await api.post('/api/auth/onboarding', { secretariaId, setorId })
        if (response.data.success) {
            return ok(response.data.data.user as unknown as Usuario)
        }
        return err(response.data.error || 'Erro ao salvar onboarding')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro técnico no onboarding')
    }
}

export function logout() {
    localStorage.removeItem('auth-token')
    // A limpeza de cookies httpOnly deve ser feita pelo backend ou via rota específica
    api.post('/api/auth/logout').catch(() => { })
}
