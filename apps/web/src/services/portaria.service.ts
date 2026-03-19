import type { Portaria, FeedAtividade } from '../types/domain'
import type {
    CriarPortariaRequest, SubmeterPortariaRequest,
    PaginatedResponse, ListQueryParams,
} from '../types/api'
import { ok, err, type Result } from '../lib/result'
import { BaseApiService, httpClient } from '@/services/base'

/**
 * Desencapsula respostas que podem vir de duas formas:
 *  - AxiosResponse wrapping API wrapper: res.data.data  → { success, data: payload }
 *  - AxiosResponse direto:               res.data        → payload
 *  - Dado já desencapsulado:             res             → payload
 */
function unwrap(res: any): any {
    return res?.data?.data ?? res?.data ?? res
}

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
            return ok(unwrap(res))
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

    /** Registra assinatura com tipo, justificativa e comprovante opcional */
    async assinarComTipo(
        portariaId: string,
        payload: {
            tipoAssinatura: 'DIGITAL' | 'MANUAL' | 'DISPENSADA'
            justificativa?: string
            comprovanteBase64?: string
            comprovanteNome?: string
        }
    ): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.post(this.url(`/portarias/${portariaId}/assinar`), payload)
            return ok(unwrap(res))
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao registrar assinatura')
        }
    }

    /**
     * Faz upload de um PDF já assinado digitalmente (fora do sistema).
     * O PDF substitui o pdfUrl atual e avança o status para PRONTO_PUBLICACAO.
     */
    async uploadPdfAssinado(
        portariaId: string,
        pdfFile: File,
        justificativa?: string
    ): Promise<Result<Portaria> & { hashIntegridade?: string }> {
        try {
            const formData = new FormData()
            formData.append('pdf', pdfFile)
            if (justificativa) formData.append('justificativa', justificativa)
            const res: any = await this.http.post(
                this.url(`/portarias/${portariaId}/upload-assinado`),
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            )
            const data = unwrap(res)
            const hash = res?.data?.hashIntegridade as string | undefined
            const result = ok(data) as Result<Portaria> & { hashIntegridade?: string }
            if (hash) result.hashIntegridade = hash
            return result
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao enviar PDF assinado')
        }
    }

    async submeterPortaria(
        payload: SubmeterPortariaRequest
    ): Promise<Result<Portaria> & { warning?: string }> {
        try {
            const res: any = await this.http.post(this.url(`/portarias/${payload.portariaId}/submeter`), {
                docxEditadoBase64: payload.docxEditadoBase64
            })
            const data = unwrap(res)
            const warning = res?.data?.warning as string | undefined
            const result = ok(data) as Result<Portaria> & { warning?: string }
            if (warning) result.warning = warning
            return result
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao submeter portaria')
        }
    }

    async downloadDocx(portariaId: string, regenerar = false): Promise<Result<{ url: string }>> {
        try {
            const params = regenerar ? { regenerar: 'true' } : undefined
            const res: any = await this.http.get(this.url(`/portarias/${portariaId}/docx`), { params })
            return ok(unwrap(res))
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

    /** @deprecated Use solicitarRevisao */
    async assumirRevisao(portariaId: string): Promise<Result<Portaria>> {
        return this.solicitarRevisao(portariaId)
    }

    async solicitarRevisao(portariaId: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'SOLICITAR_REVISAO' })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao solicitar revisão')
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

    async rollbackRascunho(portariaId: string, justificativa?: string): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}/fluxo`), { action: 'ROLLBACK_RASCUNHO', justificativa })
            return ok(res.data || res)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao reverter para rascunho')
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
            return ok(res.data)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao gerar PDF')
        }
    }

    async deletar(portariaId: string, motivo?: string): Promise<Result<void>> {
        try {
            await this.http.delete(this.url(`/portarias/${portariaId}`), { data: { motivo } })
            return ok(undefined)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao excluir portaria')
        }
    }

    async buscarHistorico(portariaId: string): Promise<Result<FeedAtividade[]>> {
        try {
            const res: any = await this.http.get(this.url(`/portarias/${portariaId}/historico`))
            return ok(unwrap(res))
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao buscar histórico')
        }
    }

    async deletarLote(ids: string[], motivo: string): Promise<Result<void>> {
        try {
            await this.http.post(this.url('/portarias/delete-lote'), { ids, motivo })
            return ok(undefined)
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao excluir portarias em lote')
        }
    }

    /** Salva alterações nos campos do formulário sem submeter para revisão */
    async atualizarFormData(portariaId: string, formData: Record<string, any>): Promise<Result<Portaria>> {
        try {
            const res: any = await this.http.patch(this.url(`/portarias/${portariaId}`), { formData })
            return ok(unwrap(res))
        } catch (e: any) {
            return err(e.response?.data?.error || 'Erro ao salvar alterações')
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
export const regenerarDocx = (portariaId: string) => portariaService.downloadDocx(portariaId, true)
export const tentarNovamente = (portariaId: string) => portariaService.tentarNovamente(portariaId)
export const enviarParaRevisao = (portariaId: string) => portariaService.enviarParaRevisao(portariaId)
export const assumirRevisao = (portariaId: string) => portariaService.assumirRevisao(portariaId)
export const solicitarRevisao = (portariaId: string) => portariaService.solicitarRevisao(portariaId)
export const assinarComTipo = (
    portariaId: string,
    payload: Parameters<PortariaService['assinarComTipo']>[1]
) => portariaService.assinarComTipo(portariaId, payload)
export const aprovarPortaria = (portariaId: string) => portariaService.aprovarPortaria(portariaId)
export const rejeitarPortaria = (portariaId: string, observacao: string) =>
    portariaService.rejeitarPortaria(portariaId, observacao)
export const transferirRevisao = (portariaId: string, revisorId: string, justificativa: string) =>
    portariaService.transferirRevisao(portariaId, revisorId, justificativa)
export const publicarPortaria = (portariaId: string) => portariaService.publicarPortaria(portariaId)
export const assinarLote = (ids: string[]) => portariaService.assinarLote(ids)
export const validarDocumento = (hash: string) => portariaService.validarDocumento(hash)
export const gerarPdf = (portariaId: string) => portariaService.gerarPdf(portariaId)
export const deletar = (portariaId: string, motivo?: string) => portariaService.deletar(portariaId, motivo)
export const deletarLote = (ids: string[], motivo: string) => portariaService.deletarLote(ids, motivo)
export const buscarHistorico = (portariaId: string) => portariaService.buscarHistorico(portariaId)
