import type { VariavelSistema } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarVariaveis(): Promise<Result<VariavelSistema[]>> {
    try {
        const response = await api.get('/api/admin/variaveis')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar variáveis globais')
    }
}

export async function salvarVariavel(payload: any): Promise<Result<VariavelSistema>> {
    try {
        const response = await api.post('/api/admin/variaveis', payload)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao salvar variável global')
    }
}

export async function excluirVariavel(id: string): Promise<Result<boolean>> {
    try {
        const response = await api.delete(`/api/admin/variaveis/${id}`)
        return ok(response.data.success)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao excluir variável global')
    }
}

export const variavelService = {
    listarVariaveis,
    salvarVariavel,
    excluirVariavel,
}
