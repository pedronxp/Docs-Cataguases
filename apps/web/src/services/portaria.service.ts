import type { Portaria } from '../types/domain'
import type {
    CriarPortariaRequest, SubmeterPortariaRequest,
    PaginatedResponse, ListQueryParams,
} from '../types/api'
import { ok, err, type Result } from '../lib/result'
import { BaseApiService, httpClient } from './base'

export class PortariaService extends BaseApiService {
    constructor(http = httpClient) {
        super(http, '/api')
    }

    async listarPortarias(
        params: ListQueryParams = {}
    ): Promise<Result<PaginatedResponse<Portaria>>> {
        try {
            const raw: any = await this.http.get(this.url('/portarias'), { params })
            const data = raw.data || raw
            const items = Array.isArray(data) ? data : (data.items || [])
            return ok({
                data: items,
                total: items.length,
                page: params.page ?? 1,
                pageSize: params.pageSize ?? 10,
                totalPages: 1
            })
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao listar portarias')
        }
    }

    async buscarPortaria(id: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.get(this.url(`/portarias/${id}`))
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao buscar portaria')
        }
    }

    /** Alias de buscarPortaria */
    async obterPortaria(id: string): Promise<Result<Portaria>> {
        return this.buscarPortaria(id)
    }

    async criarPortaria(
        payload: CriarPortariaRequest
    ): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.post(this.url('/portarias'), payload)
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao criar portaria')
        }
    }

    async assinarPortaria(id: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.post(this.url(`/portarias/${id}/assinar`))
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao assinar portaria')
        }
    }

    async submeterPortaria(
        payload: SubmeterPortariaRequest
    ): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.post(this.url(`/portarias/${payload.portariaId}/submeter`), {
                docxEditadoBase64: payload.docxEditadoBase64
            })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao submeter portaria')
        }
    }

    async downloadDocx(portariaId: string): Promise<Result<{ url: string }>> {
        try {
            const res: any = await this.http.get(this.url(`/portarias/${portariaId}/docx`))
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao obter URL do DOCX')
        }
    }

    async tentarNovamente(portariaId: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/retry`))
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao reprocessar portaria')
        }
    }

    /**
     * @deprecated Use `submeterPortaria` diretamente.
     * Esta função agora delega para POST /submeter, que gera o PDF automaticamente.
     * A ação ENVIAR_REVISAO no /fluxo foi removida para evitar portarias sem PDF.
     */
    async enviarParaRevisao(portariaId: string): Promise<Result<Portaria>> {
        return this.submeterPortaria({ portariaId })
    }

    async assumirRevisao(portariaId: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'ASSUMIR_REVISAO' })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao assumir revisão')
        }
    }

    async aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'APROVAR_REVISAO' })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao aprovar portaria')
        }
    }

    async rejeitarPortaria(portariaId: string, observacao: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'REJEITAR_REVISAO', observacao })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao rejeitar portaria')
        }
    }

    async transferirRevisao(portariaId: string, revisorId: string, justificativa: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'TRANSFERIR_REVISAO', revisorId, justificativa })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao transferir revisão')
        }
    }

    async publicarPortaria(portariaId: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.post(this.url(`/portarias/${portariaId}/publicar`))
            return ok(res.data)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao publicar portaria')
        }
    }

    async assinarLote(ids: string[]): Promise<Result<Portaria[]>> {
        try {
            const res: any = await this.http.post(this.url('/portarias/assinar-lote'), { ids })
            return ok(res.data)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao assinar documentos em lote')
        }
    }

    async validarDocumento(hash: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.get(this.url('/public/validar'), { params: { hash } })
            return ok(res.data)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Documento não localizado ou inválido')
        }
    }

    async gerarPdf(portariaId: string): Promise<Result<{ url: string }>> {
        try {
            const res: any = await this.http.get(this.url(`/portarias/${portariaId}/pdf`))
            return ok(res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao gerar PDF')
        }
    }

    async deletar(portariaId: string): Promise<Result<void>> {
        try {
            await this.http.delete(this.url(`/portarias/${portariaId}`))
            return ok(undefined)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao excluir portaria')
        }
    }
}

export const portariaService = new PortariaService()

// Funções standalone por compatibilidade
export const listarPortarias = (params?: ListQueryParams) => portariaService.listarPortarias(params)
export const buscarPortaria = (id: string) => portariaService.buscarPortaria(id)
export const obterPortaria = (id: string) => portariaService.buscarPortaria(id)
export const criarPortaria = (payload: CriarPortariaRequest) => portariaService.criarPortaria(payload)
export const assinarPortaria = (id: string) => portariaService.assinarPortaria(id)
export const submeterPortaria = (payload: SubmeterPortariaRequest) => portariaService.submeterPortaria(payload)
export const downloadDocx = (portariaId: string) => portariaService.downloadDocx(portariaId)
export const tentarNovamente = (portariaId: string) => portariaService.tentarNovamente(portariaId)
export const enviarParaRevisao = (portariaId: string) => portariaService.enviarParaRevisao(portariaId)
export const assumirRevisao = (portariaId: string) => portariaService.assumirRevisao(portariaId)
export const aprovarPortaria = (portariaId: string) => portariaService.aprovarPortaria(portariaId)
export const rejeitarPortaria = (portariaId: string, observacao: string) =>
    portariaService.rejeitarPortaria(portariaId, observacao)
export const transferirRevisao = (portariaId: string, revisorId: string, justificativa: string) =>
    portariaService.transferirRevisao(portariaId, revisorId, justificativa)
export const publicarPortaria = (portariaId: string) => portariaService.publicarPortaria(portariaId)
export const assinarLote = (ids: string[]) => portariaService.assinarLote(ids)
export const validarDocumento = (hash: string) => portariaService.validarDocumento(hash)
export const gerarPdf = (portariaId: string) => portariaService.gerarPdf(portariaId)
