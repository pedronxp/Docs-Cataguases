import type { LoginRequest, LoginResponse } from '../types/api'
import type { Usuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

const MOCK_USERS: Record<string, { password: string; usuario: Usuario }> = {
    'admin@cataguases.mg.gov.br': {
        password: '123456',
        usuario: {
            id: 'user-admin', name: 'Admin Geral',
            email: 'admin@cataguases.mg.gov.br', role: 'ADMIN_GERAL',
            ativo: true, permissoesExtra: [],
            secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z',
        },
    },
    'prefeito@cataguases.mg.gov.br': {
        password: '123456',
        usuario: {
            id: 'user-prefeito', name: 'Sr. Prefeito',
            email: 'prefeito@cataguases.mg.gov.br', role: 'PREFEITO',
            ativo: true, permissoesExtra: [],
            secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z',
        },
    },
    'secretario@cataguases.mg.gov.br': {
        password: '123456',
        usuario: {
            id: 'user-sec', name: 'Dra. Secretária de RH',
            email: 'secretario@cataguases.mg.gov.br', role: 'SECRETARIO',
            ativo: true, permissoesExtra: [],
            secretariaId: 'sec-rh', setorId: null, createdAt: '2025-01-01T00:00:00Z',
        },
    },
    'operador@cataguases.mg.gov.br': {
        password: '123456',
        usuario: {
            id: 'user-op-001', name: 'Operador Padrão',
            email: 'operador@cataguases.mg.gov.br', role: 'OPERADOR',
            ativo: true, permissoesExtra: [],
            secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: '2025-01-01T00:00:00Z',
        },
    },
}

export async function login(payload: LoginRequest): Promise<Result<LoginResponse>> {
    await mockDelay(1000)
    const found = MOCK_USERS[payload.email]
    if (!found || found.password !== payload.password)
        return err('E-mail ou senha incorretos.')
    if (!found.usuario.ativo)
        return err('Usuário desativado. Contate o administrador.')
    return ok({ token: `mock-jwt-${Date.now()}`, usuario: found.usuario })
}

export async function completarOnboarding(secretariaId: string, setorId: string): Promise<Result<Usuario>> {
    await mockDelay(600)
    // No mock, buscamos o usuário logado (simulado) e atualizamos seu registro no storage
    // Como é mockDB centralizado, pegamos o primeiro usuário pendente ou o 'user-admin' se fosse teste
    const usuario = mockDB.usuarios.find((u: Usuario) => u.role === 'PENDENTE')
    if (!usuario) return err('Usuário não encontrado ou já processado.')

    usuario.secretariaId = secretariaId
    usuario.setorId = setorId

    return ok({ ...usuario })
}
