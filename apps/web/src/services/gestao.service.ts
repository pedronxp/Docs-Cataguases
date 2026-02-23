import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export interface DadosGestao {
    id: string
    nomeGestao: string
    dataInicio: string
    dataFim: string
    prefeito: string
    vicePrefeito: string
    chefeGabinete: string
    secretarios: Record<string, string> // ID da Secretaria -> Nome do Secretário
}

export async function listarGestoes(): Promise<Result<DadosGestao[]>> {
    try {
        const response = await api.get('/api/admin/gestao')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar gestões')
    }
}

export async function salvarGestao(dados: DadosGestao): Promise<Result<DadosGestao>> {
    try {
        const response = await api.post('/api/admin/gestao', dados)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao salvar dados da gestão')
    }
}

export const gestaoService = {
    listarGestoes,
    salvarGestao
}
