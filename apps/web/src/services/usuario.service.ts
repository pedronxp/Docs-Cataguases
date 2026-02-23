import type { Usuario, RoleUsuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarUsuarios(): Promise<Result<Usuario[]>> {
    try {
        const response = await api.get('/api/admin/users')
        if (response.data.success) {
            return ok(response.data.data as Usuario[])
        }
        return err(response.data.error || 'Erro ao carregar usuários')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Falha na conexão com a gestão de usuários')
    }
}

export async function atualizarUsuario(
    id: string,
    patch: { role?: RoleUsuario; secretariaId?: string | null; setorId?: string | null; ativo?: boolean; permissoesExtra?: string[] }
): Promise<Result<Usuario>> {
    try {
        const response = await api.patch(`/api/admin/users/${id}`, patch)
        if (response.data.success) {
            return ok(response.data.data as Usuario)
        }
        return err(response.data.error || 'Erro ao atualizar usuário')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro técnico ao salvar alterações do usuário')
    }
}

export async function toggleAtivo(id: string): Promise<Result<Usuario>> {
    try {
        // Como o backend já suporta PATCH no usuário, podemos usar o mesmo endpoint
        const response = await api.get(`/api/admin/users/${id}`)
        if (!response.data.success) return err('Usuário não encontrado')

        const currentStatus = response.data.data.ativo
        return atualizarUsuario(id, { ativo: !currentStatus })
    } catch (error: any) {
        return err('Erro ao alternar status do usuário')
    }
}
