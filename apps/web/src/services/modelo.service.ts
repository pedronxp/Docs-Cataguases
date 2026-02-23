import type { ModeloDocumento } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarModelos(secretariaId?: string): Promise<Result<ModeloDocumento[]>> {
    try {
        const url = secretariaId ? `/api/modelos?secretariaId=${secretariaId}` : '/api/modelos'
        const response = await api.get(url)
        if (response.data.success) {
            return ok(response.data.data as ModeloDocumento[])
        }
        return err(response.data.error || 'Erro ao carregar modelos')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Falha na conexão com o catálogo de modelos')
    }
}

export async function buscarModelo(id: string): Promise<Result<ModeloDocumento>> {
    try {
        const response = await api.get(`/api/modelos/${id}`)
        if (response.data.success) {
            return ok(response.data.data as ModeloDocumento)
        }
        return err(response.data.error || 'Modelo não encontrado')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar detalhes do modelo')
    }
}

export const modeloService = {
    listarModelos,
    buscarModelo,
}
