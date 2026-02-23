import type { FeedAtividade } from '../types/domain'
import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.feed = [
    {
        id: 'f-001', tipoEvento: 'PORTARIA_PUBLICADA',
        mensagem: 'Portaria 042/2025 foi assinada e publicada pelo Prefeito.',
        portariaId: 'port-001', autorId: 'user-prefeito',
        secretariaId: 'sec-rh', setorId: null,
        metadata: { numero: '042/2025', titulo: 'Portaria de Nomeação - João Silva' },
        createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
        id: 'f-002', tipoEvento: 'PORTARIA_CRIADA',
        mensagem: 'Nova portaria criada: Portaria de Exoneração - Maria Santos.',
        portariaId: 'port-002', autorId: 'user-op-001',
        secretariaId: 'sec-rh', setorId: null,
        metadata: { titulo: 'Portaria de Exoneração - Maria Santos' },
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
        id: 'f-003', tipoEvento: 'PORTARIA_FALHA',
        mensagem: 'Falha ao gerar PDF da Portaria 038/2025. Verifique e tente novamente.',
        portariaId: 'port-003', autorId: 'user-op-001',
        secretariaId: 'sec-rh', setorId: null,
        metadata: { numero: '038/2025' },
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
        id: 'f-004', tipoEvento: 'PORTARIA_SUBMETIDA',
        mensagem: 'Portaria 039/2025 submetida e aguardando revisão.',
        portariaId: 'port-004', autorId: 'user-op-001',
        secretariaId: 'sec-rh', setorId: null,
        metadata: { numero: '039/2025' },
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
]

export async function listarFeed(secretariaId?: string): Promise<Result<FeedAtividade[]>> {
    await mockDelay(400)
    let feed = [...mockDB.feed]
    if (secretariaId) feed = feed.filter((f) => f.secretariaId === secretariaId)
    return ok(feed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
}
export const feedService = {
    listarFeed,
}
