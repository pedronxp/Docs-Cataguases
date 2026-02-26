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

// ── Setores ──────────────────────────────────────────────────────────────────

export interface Setor {
    id: string
    nome: string
    sigla: string
    secretariaId: string
    ativo?: boolean
}

export async function listarSetores(secretariaId: string): Promise<Result<Setor[]>> {
    try {
        const response = await api.get(`/api/admin/config/secretarias/${secretariaId}/setores`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar setores')
    }
}

export async function criarSetor(secretariaId: string, dados: { nome: string; sigla: string }): Promise<Result<Setor>> {
    try {
        const response = await api.post(`/api/admin/config/secretarias/${secretariaId}/setores`, dados)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar setor')
    }
}

export async function deletarSetor(secretariaId: string, setorId: string): Promise<Result<void>> {
    try {
        await api.delete(`/api/admin/config/secretarias/${secretariaId}/setores/${setorId}`)
        return ok(undefined)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao deletar setor')
    }
}
