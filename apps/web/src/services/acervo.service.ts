import type { Portaria } from '../types/domain'
import type { PaginatedResponse } from '../types/api'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export interface AcervoQueryParams {
    secretariaId?: string
    busca?: string
    ano?: number
    setorId?: string
    page?: number
    pageSize?: number
    statusFiltro?: string[]
}

export async function buscarAcervo(
    params: AcervoQueryParams
): Promise<Result<PaginatedResponse<Portaria>>> {
    try {
        const response = await api.get('/api/acervo', { params })
        return ok(response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar no acervo')
    }
}

// Retorna contagem de docs publicados por secretaria
export async function contarPorSecretaria(): Promise<Result<Record<string, number>>> {
    try {
        const response = await api.get('/api/acervo/estatisticas')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao obter estatísticas do acervo')
    }
}

export const acervoService = {
    buscarAcervo,
    contarPorSecretaria
}
