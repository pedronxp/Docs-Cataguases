import type { ModeloDocumento } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarModelos(secretariaId?: string): Promise<Result<ModeloDocumento[]>> {
    try {
        const params = secretariaId ? `?secretariaId=${secretariaId}` : ''
        const response = await api.get(`/api/admin/modelos${params}`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar modelos')
    }
}

export async function buscarModelo(id: string): Promise<Result<ModeloDocumento>> {
    try {
        const response = await api.get(`/api/admin/modelos/${id}`)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao buscar modelo')
    }
}

export async function criarModelo(payload: any): Promise<Result<ModeloDocumento>> {
    try {
        const response = await api.post('/api/admin/modelos', payload)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar modelo')
    }
}

export async function atualizarModelo(id: string, payload: any): Promise<Result<{ modelo: ModeloDocumento; novaVersao: boolean }>> {
    try {
        const response = await api.patch(`/api/admin/modelos/${id}`, payload)
        return ok({ modelo: response.data.data, novaVersao: response.data.novaVersao ?? false })
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao atualizar modelo')
    }
}

export async function deletarModelo(id: string): Promise<Result<void>> {
    try {
        await api.delete(`/api/admin/modelos/${id}`)
        return ok(undefined)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao deletar modelo')
    }
}

/**
 * Faz upload do arquivo .docx template para o Supabase Storage.
 * Retorna o path do arquivo no bucket (salvar como docxTemplateUrl no modelo).
 */
export async function uploadTemplate(file: File): Promise<Result<string>> {
    try {
        const formData = new FormData()
        formData.append('file', file)
        const response = await api.post('/api/admin/modelos/upload-template', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        // Retorna o path no Storage (ex: "modelos/1234567890_portaria.docx")
        return ok(response.data.data.path)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro no upload do template')
    }
}

/**
 * Envia o conteúdo HTML para a API extrair as variáveis {{TAG}}.
 * Retorna variáveis de usuário (para configurar no Wizard) separadas das SYS_*.
 */
export async function analisarModelo(conteudo: string | File): Promise<Result<{
    conteudoHtml: string;
    variaveis: { chave: string; label: string; tipo: string; obrigatorio: boolean; opcoes: string[]; ordem: number }[];
    variaveisSistema: string[];
    recomendacoes: any[];
    totalTags: number;
}>> {
    try {
        let response;
        if (conteudo instanceof File) {
            const formData = new FormData()
            formData.append('file', conteudo)
            response = await api.post('/api/admin/modelos/analisar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
        } else {
            response = await api.post('/api/admin/modelos/analisar', { conteudoHtml: conteudo })
        }
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao analisar variáveis do documento')
    }
}

export const modeloService = {
    listarModelos,
    buscarModelo,
    criarModelo,
    atualizarModelo,
    deletarModelo,
    uploadTemplate,
    analisarModelo
}
