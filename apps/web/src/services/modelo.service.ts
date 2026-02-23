import type { ModeloDocumento } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarModelos(): Promise<Result<ModeloDocumento[]>> {
    try {
        const response = await api.get('/api/admin/modelos')
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

export async function atualizarModelo(id: string, payload: any): Promise<Result<ModeloDocumento>> {
    try {
        const response = await api.patch(`/api/admin/modelos/${id}`, payload)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao atualizar modelo')
    }
}

export async function uploadTemplate(file: File): Promise<Result<string>> {
    try {
        const formData = new FormData()
        formData.append('file', file)
        const response = await api.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        return ok(response.data.url)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro no upload do arquivo')
    }
}

export async function analisarModelo(url: string): Promise<Result<{ html: string, variaveis: any[] }>> {
    try {
        const response = await api.post('/api/admin/modelos/analisar', { url })
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
    uploadTemplate,
    analisarModelo
}
