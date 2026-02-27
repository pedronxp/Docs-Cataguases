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
        const raw = response.data
        const data = raw.data || raw
        const items = Array.isArray(data) ? data : (data.items || [])
        return ok({
            data: items,
            total: items.length,
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 10,
            totalPages: 1
        })
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar portarias')
    }
}

export async function buscarPortaria(id: string): Promise<Result<Portaria>> {
    try {
        const response = await api.get(`/api/portarias/${id}`)
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar portaria')
    }
}

export async function criarPortaria(
    payload: CriarPortariaRequest
): Promise<Result<Portaria>> {
    try {
        const response = await api.post('/api/portarias', payload)
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar portaria')
    }
}

export async function assinarPortaria(id: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${id}/assinar`)
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao assinar portaria')
    }
}

export async function submeterPortaria(
    payload: SubmeterPortariaRequest
): Promise<Result<Portaria>> {
    try {
        // Na API real, submeter pode ser um PATCH que muda o status ou um POST específico
        const response = await api.patch(`/api/portarias/${payload.portariaId}`, {
            status: 'PROCESSANDO'
        })
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao submeter portaria')
    }
}

export async function tentarNovamente(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.patch(`/api/portarias/${portariaId}/retry`)
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao reprocessar portaria')
    }
}

export async function enviarParaRevisao(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.patch(`/api/portarias/${portariaId}/fluxo`, { action: 'ENVIAR_REVISAO' })
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao enviar para revisão')
    }
}

export async function assumirRevisao(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.patch(`/api/portarias/${portariaId}/fluxo`, { action: 'ASSUMIR_REVISAO' })
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao assumir revisão')
    }
}

export async function aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.patch(`/api/portarias/${portariaId}/fluxo`, { action: 'APROVAR_REVISAO' })
        return ok(response.data.data || response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao aprovar portaria')
    }
}

export async function rejeitarPortaria(portariaId: string, observacao: string): Promise<Result<Portaria>> {
    try {
        const response = await api.patch(`/api/portarias/${portariaId}/fluxo`, { action: 'REJEITAR_REVISAO', observacao })
        return ok(response.data.data || response.data)
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

export async function validarDocumento(hash: string): Promise<Result<Portaria>> {
    try {
        const response = await api.get('/api/public/validar', { params: { hash } })
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Documento não localizado ou inválido')
    }
}

export async function gerarPdf(portariaId: string): Promise<Result<{ url: string }>> {
    try {
        const response = await api.get(`/api/portarias/${portariaId}/pdf`)
        return ok(response.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao gerar PDF')
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
    enviarParaRevisao,
    assumirRevisao,
    aprovarPortaria,
    rejeitarPortaria,
    publicarPortaria,
    validarDocumento,
    gerarPdf,
}
