import type { RoleUsuario } from '@/types/domain'

export const ROLE_LABELS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'Administrador Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    REVISOR: 'Revisor',
    OPERADOR: 'Operador',
    PENDENTE: 'Aguardando Liberação',
}

export const ROLE_COLORS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'border-[#9b59b6] text-[#9b59b6] bg-[#f9f0ff]',
    PREFEITO:    'border-[#d4a017] text-[#7d5c00] bg-[#fffbea]',
    SECRETARIO:  'border-[#1351b4] text-[#1351b4] bg-[#e8f0fb]',
    REVISOR:     'border-[#0c7b41] text-[#0c7b41] bg-[#e6f4eb]',
    OPERADOR:    'border-[#555555] text-[#555555] bg-[#f8f9fa]',
    PENDENTE:    'border-[#e57700] text-[#e57700] bg-[#fff5e6]',
}

export const ROLES_AVAILABLE: RoleUsuario[] = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'REVISOR', 'OPERADOR']

export const ROLES_REQUEREM_SECRETARIA: RoleUsuario[] = ['REVISOR', 'OPERADOR', 'SECRETARIO']

export const ROLES_APROVACAO = [
    { value: 'OPERADOR' as RoleUsuario, label: 'Operador', requerSecretaria: true },
    { value: 'REVISOR' as RoleUsuario, label: 'Revisor', requerSecretaria: true },
    { value: 'SECRETARIO' as RoleUsuario, label: 'Secretário', requerSecretaria: true },
    { value: 'PREFEITO' as RoleUsuario, label: 'Prefeito', requerSecretaria: false },
    { value: 'ADMIN_GERAL' as RoleUsuario, label: 'Administrador Geral', requerSecretaria: false },
]

export const COR_PRESETS = [
    { label: 'Azul GOV', value: '#1351b4' },
    { label: 'Verde', value: '#008833' },
    { label: 'Vermelho', value: '#c41c00' },
    { label: 'Amarelo', value: '#a8820a' },
    { label: 'Roxo', value: '#7b2fa3' },
    { label: 'Cinza', value: '#636363' },
]

export function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// Catálogo de permissões especiais
export type EscopoPermissao = 'global' | 'secretaria' | 'sempre-global'

export interface CatalogoPermissao {
    value: string
    label: string
    descricao: string
    escopo: EscopoPermissao
    categoria: string
    aviso?: string
}

export const CATALOGO_PERMISSOES: CatalogoPermissao[] = [
    {
        value: 'aprovar:Portaria', label: 'Aprovar Portarias',
        descricao: 'Permite aprovar portarias que estão em revisão, avançando para a próxima etapa do fluxo.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'rejeitar:Portaria', label: 'Rejeitar Portarias',
        descricao: 'Devolve portarias ao operador com um comentário de correção obrigatório.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'publicar:Portaria', label: 'Publicar Portarias',
        descricao: 'Publica portarias no diário oficial após a assinatura ter sido realizada.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'deletar:Portaria', label: 'Excluir Portarias',
        descricao: 'Remove portarias permanentemente do sistema. Esta ação não pode ser desfeita.',
        escopo: 'sempre-global', categoria: 'Portarias', aviso: 'Ação irreversível',
    },
    {
        value: 'assinar:Portaria', label: 'Assinar Portarias',
        descricao: 'Coloca assinatura digital em portarias. Normalmente reservado ao Prefeito.',
        escopo: 'sempre-global', categoria: 'Portarias',
    },
    {
        value: 'claim:Revisao', label: 'Pegar Portarias para Revisão',
        descricao: 'Permite assumir portarias da fila de revisão para analisar e aprovar ou rejeitar.',
        escopo: 'sempre-global', categoria: 'Revisão',
    },
    {
        value: 'transferir:Revisao', label: 'Transferir Revisão',
        descricao: 'Passa uma revisão em andamento para outro revisor disponível, com justificativa.',
        escopo: 'sempre-global', categoria: 'Revisão',
    },
    {
        value: 'ler:Analytics', label: 'Ver Painel de Analytics',
        descricao: 'Acessa gráficos e estatísticas de uso do sistema.',
        escopo: 'sempre-global', categoria: 'Dados e Relatórios',
    },
    {
        value: 'visualizar:PortariaGlobal', label: 'Ver Acervo de Todas as Secretarias',
        descricao: 'Permite visualizar portarias de todas as secretarias no acervo documental.',
        escopo: 'sempre-global', categoria: 'Dados e Relatórios',
    },
    {
        value: 'gerenciar:Modelo', label: 'Gerenciar Modelos de Documento',
        descricao: 'Cria, edita e exclui modelos de portaria usados por todas as secretarias.',
        escopo: 'sempre-global', categoria: 'Administração',
    },
]

export const CATEGORIAS_PERMISSAO = [...new Set(CATALOGO_PERMISSOES.map(p => p.categoria))]

export function parsePermissao(raw: string): { base: string; escopo: 'secretaria' | 'global' } {
    const parts = raw.split(':')
    if (parts.length === 3 && parts[2] === 'secretaria') {
        return { base: `${parts[0]}:${parts[1]}`, escopo: 'secretaria' }
    }
    return { base: raw, escopo: 'global' }
}

export function buildPermissaoString(base: string, escopo: 'secretaria' | 'global'): string {
    return escopo === 'secretaria' ? `${base}:secretaria` : base
}
