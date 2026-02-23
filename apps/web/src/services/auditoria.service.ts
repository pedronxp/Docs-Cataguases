import type { LogAuditoria } from '../types/domain'
import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_LOGS: LogAuditoria[] = [
    {
        id: 'log-001',
        usuarioId: 'user-admin',
        usuarioNome: 'Admin Geral',
        acao: 'Alteração de Permissão',
        modulo: 'USUARIOS',
        severidade: 'AVISO',
        detalhes: 'Alterou o papel do usuário joao@email.com de OPERADOR para GESTOR.',
        ip: '192.168.1.45',
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    },
    {
        id: 'log-002',
        usuarioId: 'user-prefeito',
        usuarioNome: 'Sr. Prefeito',
        acao: 'Assinatura em Lote',
        modulo: 'PORTARIAS',
        severidade: 'INFO',
        detalhes: 'Assinou 12 portarias simultaneamente via Painel de Assinaturas.',
        ip: '200.150.10.5',
        createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    },
    {
        id: 'log-003',
        usuarioId: 'user-op-001',
        usuarioNome: 'Operador Padrão',
        acao: 'Configuração de Variável',
        modulo: 'SISTEMA',
        severidade: 'CRITICO',
        detalhes: 'Tentativa de alteração da variável global VALOR_PADRAO sem permissão.',
        ip: '177.42.15.120',
        metadata: { variavel: 'VALOR_PADRAO', valor_tentado: '5000' },
        createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
    {
        id: 'log-004',
        usuarioId: 'user-admin',
        usuarioNome: 'Admin Geral',
        acao: 'Exclusão de Modelo',
        modulo: 'MODELOS',
        severidade: 'AVISO',
        detalhes: 'O modelo "Portaria de Testes Antigos" foi excluído permanentemente.',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
        id: 'log-005',
        usuarioId: 'user-anonymous',
        usuarioNome: 'Visitante Externo',
        acao: 'Validação de Documento',
        modulo: 'SISTEMA',
        severidade: 'INFO',
        detalhes: 'Consulta pública realizada para o Hash sha256-abc123def456.',
        ip: '45.18.2.1',
        createdAt: new Date(Date.now() - 25 * 3600000).toISOString(),
    },
]

export async function listarLogs(): Promise<Result<LogAuditoria[]>> {
    await mockDelay(600)
    return ok([...MOCK_LOGS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
}

export const auditoriaService = {
    listarLogs,
}
