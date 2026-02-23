import type { Portaria, Usuario, FeedAtividade, Secretaria } from '../types/domain'

export const mockDelay = (ms = 600) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms))

export const mockDB = {
    portarias: [
        {
            id: 'port-001',
            titulo: 'Portaria de Nomeação - João Silva',
            numeroOficial: '042/2025',
            status: 'PUBLICADA',
            autorId: 'user-op-001',
            secretariaId: 'sec-rh',
            setorId: 'setor-dp',
            modeloId: 'modelo-nomeacao',
            pdfUrl: 'https://mock.storage/portaria-042.pdf',
            docxRascunhoUrl: null,
            hashAssinatura: 'sha256-abc123def456',
            dadosFormulario: { NOME_SERVIDOR: 'João Silva', CARGO: 'Assistente Administrativo' },
            createdAt: '2025-06-10T14:00:00Z',
            updatedAt: '2025-06-12T09:00:00Z',
        }
    ] as Portaria[],
    usuarios: [
        { id: 'user-admin', name: 'Admin Geral', email: 'admin@cataguases.mg.gov.br', role: 'ADMIN_GERAL', ativo: true, permissoesExtra: [], secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'user-prefeito', name: 'Sr. Prefeito', email: 'prefeito@cataguases.mg.gov.br', role: 'PREFEITO', ativo: true, permissoesExtra: [], secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'user-sec', name: 'Dra. Secretária de RH', email: 'secretario@cataguases.mg.gov.br', role: 'SECRETARIO', ativo: true, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null, createdAt: '2025-01-01T00:00:00Z' },
        { id: 'user-op-001', name: 'Operador Padrão', email: 'operador@cataguases.mg.gov.br', role: 'OPERADOR', ativo: true, permissoesExtra: [], secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'user-op-002', name: 'Operadora Inativa', email: 'inativa@cataguases.mg.gov.br', role: 'OPERADOR', ativo: false, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null, createdAt: '2025-02-01T00:00:00Z' },
    ] as Usuario[],
    feed: [
        {
            id: 'f-001', tipoEvento: 'PORTARIA_PUBLICADA',
            mensagem: 'Portaria 042/2025 foi assinada e publicada pelo Prefeito.',
            portariaId: 'port-001', autorId: 'user-prefeito',
            secretariaId: 'sec-rh', setorId: null,
            metadata: { numero: '042/2025', titulo: 'Portaria de Nomeação - João Silva' },
            createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        }
    ] as FeedAtividade[],
    secretarias: [
        { id: 'sec-rh', nome: 'Secretaria de Recursos Humanos', sigla: 'RH', cor: 'blue' },
        { id: 'sec-saude', nome: 'Secretaria de Saúde', sigla: 'SMS', cor: 'emerald' },
        { id: 'sec-edu', nome: 'Secretaria de Educação', sigla: 'SME', cor: 'amber' },
        { id: 'sec-admin', nome: 'Secretaria de Administração', sigla: 'SMA', cor: 'purple' },
    ] as Secretaria[],
}
