import type { Usuario, RoleUsuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarUsuarios(): Promise<Result<Usuario[]>> {
    try {
        const response = await api.get('/api/admin/users')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar usuários')
    }
}

export async function atualizarUsuario(
    id: string,
    patch: { role?: RoleUsuario; secretariaId?: string | null; setorId?: string | null; ativo?: boolean; permissoesExtra?: string[] }
): Promise<Result<Usuario>> {
    try {
        const response = await api.patch(`/api/admin/users/${id}`, patch)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao atualizar usuário')
    }
}

export async function toggleAtivo(id: string): Promise<Result<Usuario>> {
    try {
        const response = await api.patch(`/api/admin/users/${id}/toggle-status`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao alterar status do usuário')
    }
}

export const usuarioService = {
    listarUsuarios,
    atualizarUsuario,
    toggleAtivo
}
