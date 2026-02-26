import type { LivroNumeracao } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarLivros(): Promise<Result<LivroNumeracao[]>> {
    try {
        const response = await api.get('/api/admin/livros')
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao listar livros de numeração')
    }
}

export async function criarLivro(payload: any): Promise<Result<LivroNumeracao>> {
    try {
        const response = await api.post('/api/admin/livros', payload)
        return ok(response.data.data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao criar livro de numeração')
    }
}

export const livroService = {
    listarLivros,
    criarLivro,
}
