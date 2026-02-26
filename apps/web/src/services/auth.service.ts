import type { LoginRequest, LoginResponse } from '../types/api'
import type { Usuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function login(payload: LoginRequest): Promise<Result<LoginResponse>> {
    try {
        const response = await api.post('/api/auth/login', payload)
        const { user, token } = response.data.data

        // Salvar token no localStorage para o interceptador Axios
        localStorage.setItem('auth-token', token)

        return ok({ token, usuario: user })
    } catch (error: any) {
        const message = error.response?.data?.error || 'Erro ao realizar login'
        return err(message)
    }
}

export async function completarOnboarding(secretariaId: string, setorId: string): Promise<Result<Usuario>> {
    try {
        const response = await api.post('/api/auth/onboarding', { secretariaId, setorId })
        return ok(response.data.data)
    } catch (error: any) {
        const message = error.response?.data?.error || 'Erro ao completar onboarding'
        return err(message)
    }
}

export const authService = {
    login,
    completarOnboarding
}
