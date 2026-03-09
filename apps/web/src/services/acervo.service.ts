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
    status?: string
}

export async function buscarAcervo(
    params: AcervoQueryParams
): Promise<Result<PaginatedResponse<Portaria>>> {
    try {
        // Mapeia os campos do frontend para os nomes esperados pelo backend
        const { busca, pageSize, ...rest } = params
        const queryParams: Record<string, any> = { ...rest }
        if (busca) queryParams.q = busca
        if (pageSize) queryParams.limit = pageSize

        const response = await api.get('/api/acervo', { params: queryParams })
        const { data: itens, meta } = response.data

        // Normaliza para o formato PaginatedResponse esperado
        return ok({
            data: itens ?? [],
            total: meta?.total ?? 0,
            page: meta?.page ?? 1,
            pageSize: meta?.limit ?? pageSize ?? 10,
            totalPages: meta?.totalPages ?? 1,
        })
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar no acervo')
    }
}

export interface EstatisticasAcervo {
    porSecretaria: Record<string, number>
    publicadasEsteMes: number
}

// Retorna estatísticas do acervo: contagem por secretaria + publicadas este mês
export async function obterEstatisticasAcervo(): Promise<Result<EstatisticasAcervo>> {
    try {
        const response = await api.get('/api/acervo/estatisticas')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao obter estatísticas do acervo')
    }
}

// Alias legado — compatibilidade com código existente
export async function contarPorSecretaria(): Promise<Result<Record<string, number>>> {
    const result = await obterEstatisticasAcervo()
    if (result.success) return ok(result.data.porSecretaria)
    return err(result.error)
}

export const acervoService = {
    buscarAcervo,
    contarPorSecretaria
}
