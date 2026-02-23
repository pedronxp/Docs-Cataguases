import type { Portaria } from '../types/domain'
import type {
    CriarPortariaRequest, SubmeterPortariaRequest,
    PaginatedResponse, ListQueryParams,
} from '../types/api'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarPortarias(
    params: ListQueryParams = {}
): Promise<Result<PaginatedResponse<Portaria>>> {
    try {
        const response = await api.get('/api/portarias', { params })
        // A API real pode retornar o array direto ou com metadados de paginação
        const data = response.data.data
        return ok({
            data,
            total: data.length, // Ajustar conforme implementação de paginação real no backend
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 10,
            totalPages: Math.ceil(data.length / (params.pageSize ?? 10))
        })
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar portarias')
    }
}

export async function buscarPortaria(id: string): Promise<Result<Portaria>> {
    try {
        const response = await api.get(`/api/portarias/${id}`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar portaria')
    }
}

export async function criarPortaria(
    payload: CriarPortariaRequest
): Promise<Result<Portaria>> {
    try {
        const response = await api.post('/api/portarias', payload)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar portaria')
    }
}

export async function assinarPortaria(id: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${id}/assinar`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao assinar portaria')
    }
}

export async function submeterPortaria(
    payload: SubmeterPortariaRequest
): Promise<Result<Portaria>> {
    try {
        // Na API real, submeter pode ser um PATCH que muda o status ou um POST específico
        // Conforme portarias/route.ts, o POST já aceita 'submetido: true'
        // Se for uma portaria existente, usamos o PATCH
        const response = await api.patch(`/api/portarias/${payload.portariaId}`, {
            status: 'PROCESSANDO'
        })
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao submeter portaria')
    }
}

export async function tentarNovamente(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/retry`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao reprocessar portaria')
    }
}

export async function aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/aprovar`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao aprovar portaria')
    }
}

export async function rejeitarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/rejeitar`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao rejeitar portaria')
    }
}

export async function publicarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/publicar`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao publicar portaria')
    }
}

export async function assinarLote(ids: string[]): Promise<Result<Portaria[]>> {
    try {
        const response = await api.post('/api/portarias/assinar-lote', { ids })
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao assinar documentos em lote')
    }
}

export const portariaService = {
    listarPortarias,
    buscarPortaria,
    obterPortaria: buscarPortaria,
    criarPortaria,
    assinarPortaria,
    submeterPortaria,
    assinarLote,
    tentarNovamente,
    aprovarPortaria,
    rejeitarPortaria,
    publicarPortaria,
}
