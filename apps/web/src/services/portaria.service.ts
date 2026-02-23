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
        if (response.data.success) {
            // No backend real pode não vir paginado por padrão ainda, 
            // mas simulamos aqui ou ajustamos se o backend já suportar
            const data = response.data.data
            return ok({
                data,
                total: data.length,
                page: 1,
                pageSize: 100,
                totalPages: 1
            })
        }
        return err(response.data.error || 'Erro ao listar portarias')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro na comunicação com o servidor')
    }
}

export async function buscarPortaria(id: string): Promise<Result<Portaria>> {
    try {
        const response = await api.get(`/api/portarias/${id}`)
        if (response.data.success) {
            return ok(response.data.data as Portaria)
        }
        return err(response.data.error || 'Portaria não encontrada')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar portaria')
    }
}

export async function criarPortaria(
    payload: CriarPortariaRequest
): Promise<Result<Portaria>> {
    try {
        // Mapeamos para o que o backend espera (titulo, descricao, modeloId, formData, etc)
        const response = await api.post('/api/portarias', {
            titulo: payload.titulo,
            modeloId: payload.modeloId,
            formData: payload.dadosFormulario,
        })

        if (response.data.success) {
            return ok(response.data.data as Portaria)
        }
        return err(response.data.error || 'Erro ao criar portaria')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro técnico na criação da portaria')
    }
}

export async function submeterPortaria(
    payload: SubmeterPortariaRequest
): Promise<Result<Portaria>> {
    try {
        // No backend real a submissão pode ser um PATCH que muda o status
        const response = await api.patch(`/api/portarias/${payload.portariaId}/submeter`, {
            docxEditadoBase64: payload.docxEditadoBase64
        })
        if (response.data.success) {
            return ok(response.data.data as Portaria)
        }
        return err(response.data.error || 'Erro ao submeter portaria')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro na submissão do documento')
    }
}

export async function aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/aprovar`)
        if (response.data.success) return ok(response.data.data as Portaria)
        return err(response.data.error || 'Erro ao aprovar')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Falha na aprovação')
    }
}

export async function rejeitarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/rejeitar`)
        if (response.data.success) return ok(response.data.data as Portaria)
        return err(response.data.error || 'Erro ao rejeitar')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Falha na rejeição')
    }
}

export async function publicarPortaria(portariaId: string): Promise<Result<Portaria>> {
    try {
        const response = await api.post(`/api/portarias/${portariaId}/publicar`)
        if (response.data.success) return ok(response.data.data as Portaria)
        return err(response.data.error || 'Erro ao publicar')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Falha na publicação')
    }
}

export async function assinarLote(ids: string[]): Promise<Result<Portaria[]>> {
    try {
        const response = await api.post('/api/portarias/lote/assinar', { ids })
        if (response.data.success) return ok(response.data.data as Portaria[])
        return err(response.data.error || 'Erro ao assinar lote')
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro técnico no lote')
    }
}

export const portariaService = {
    listarPortarias,
    buscarPortaria,
    obterPortaria: buscarPortaria,
    criarPortaria,
    submeterPortaria,
    assinarLote,
    aprovarPortaria,
    rejeitarPortaria,
    publicarPortaria,
}
