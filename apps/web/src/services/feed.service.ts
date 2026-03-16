import type { FeedAtividade } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import api from '../lib/api'

export async function listarFeed(secretariaId?: string, meuFeed?: boolean): Promise<Result<FeedAtividade[]>> {
    try {
        const response = await api.get('/api/feed', {
            params: {
                secretariaId,
                meuFeed: meuFeed ? 'true' : undefined,
            }
        })
        // A API de feed retorna { itens: [], meta: {} } dentro de data
        const data = response.data.data?.itens || response.data.data || []
        return ok(data)
    } catch (error: any) {
        return err(error.response?.data?.error || 'Erro ao carregar feed de atividades')
    }
}

export const feedService = {
    listarFeed,
}
