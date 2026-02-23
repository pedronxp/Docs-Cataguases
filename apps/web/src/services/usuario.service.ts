import type { Usuario, RoleUsuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.usuarios = [
    { id: 'user-admin', name: 'Admin Geral', email: 'admin@cataguases.mg.gov.br', role: 'ADMIN_GERAL', ativo: true, permissoesExtra: [], secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z' },
    { id: 'user-prefeito', name: 'Sr. Prefeito', email: 'prefeito@cataguases.mg.gov.br', role: 'PREFEITO', ativo: true, permissoesExtra: [], secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z' },
    { id: 'user-sec', name: 'Dra. Secretária de RH', email: 'secretario@cataguases.mg.gov.br', role: 'SECRETARIO', ativo: true, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null, createdAt: '2025-01-01T00:00:00Z' },
    { id: 'user-op-001', name: 'Operador Padrão', email: 'operador@cataguases.mg.gov.br', role: 'OPERADOR', ativo: true, permissoesExtra: [], secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: '2025-01-01T00:00:00Z' },
    { id: 'user-op-002', name: 'Operadora Inativa', email: 'inativa@cataguases.mg.gov.br', role: 'OPERADOR', ativo: false, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null, createdAt: '2025-02-01T00:00:00Z' },
    { id: 'user-pending-001', name: 'Carlos Mota', email: 'carlos@cataguases.mg.gov.br', role: 'PENDENTE', ativo: true, permissoesExtra: [], secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: new Date().toISOString() },
]

export async function listarUsuarios(): Promise<Result<Usuario[]>> {
    await mockDelay()
    return ok([...mockDB.usuarios])
}

export async function atualizarUsuario(
    id: string,
    patch: { role?: RoleUsuario; secretariaId?: string | null; setorId?: string | null; ativo?: boolean; permissoesExtra?: string[] }
): Promise<Result<Usuario>> {
    await mockDelay(500)
    const usuario = mockDB.usuarios.find((u) => u.id === id)
    if (!usuario) return err(`Usuário "${id}" não encontrado.`)
    Object.assign(usuario, patch)
    return ok({ ...usuario })
}

export async function toggleAtivo(id: string): Promise<Result<Usuario>> {
    await mockDelay(300)
    const usuario = mockDB.usuarios.find((u) => u.id === id)
    if (!usuario) return err('Usuário não encontrado.')
    usuario.ativo = !usuario.ativo
    return ok({ ...usuario })
}
