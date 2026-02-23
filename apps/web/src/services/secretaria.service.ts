import type { Secretaria } from '../types/domain'
export type { Secretaria }

import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarSecretarias(): Promise<Result<Secretaria[]>> {
    try {
        const response = await api.get('/api/admin/config/secretarias')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar secretarias')
    }
}

export async function criarSecretaria(dados: Omit<Secretaria, 'id'>): Promise<Result<Secretaria>> {
    try {
        const response = await api.post('/api/admin/config/secretarias', dados)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar secretaria')
    }
}

export async function deletarSecretaria(id: string): Promise<Result<void>> {
    try {
        await api.delete(`/api/admin/config/secretarias/${id}`)
        return ok(undefined)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao deletar secretaria')
    }
}
