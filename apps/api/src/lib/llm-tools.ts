// ── Cache DOCX e helpers compartilhados — re-exportados dos handlers ─────────
// Definidos em ./llm-tools/handlers/_shared.ts para evitar dependência circular
export { setDocxAnalise, getDocxAnalise, clearDocxAnalise } from './llm-tools/handlers/_shared'

// 1. Tool definitions for LLM providers (OpenAI format)
export const LLM_TOOLS = [
    // ── LISTAGEM ──────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'listar_secretarias',
            description: 'Lista todas as secretarias ativas da prefeitura com ID, nome e sigla. Use antes de qualquer ação que precise do ID de uma secretaria.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_setores_secretaria',
            description: 'Lista os setores de uma secretaria específica pela sigla ou ID.',
            parameters: {
                type: 'object',
                properties: {
                    termo_secretaria: {
                        type: 'string',
                        description: 'A sigla ou ID da secretaria.',
                    },
                },
                required: ['termo_secretaria'],
            },
        },
    },
    // ── CRIAÇÃO ───────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'criar_secretaria',
            description: 'Cria uma nova secretaria no banco de dados. Requer permissão ADMIN_GERAL. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    nome: { type: 'string', description: 'Nome completo da secretaria (ex: Secretaria de Educação).' },
                    sigla: { type: 'string', description: 'Sigla curta em maiúsculo (ex: SME).' },
                    cor: { type: 'string', description: 'Opcional. Cor em hex (ex: #3b82f6).' },
                },
                required: ['nome', 'sigla'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'criar_setor',
            description: 'Cria um novo setor (departamento) vinculado a uma secretaria. Exige o ID da secretaria (use listar_secretarias antes se não souber). ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    nome: { type: 'string', description: 'Nome do setor (ex: Recursos Humanos).' },
                    sigla: { type: 'string', description: 'Sigla do setor (ex: RH).' },
                    secretariaId: { type: 'string', description: 'ID da secretaria pai.' },
                },
                required: ['nome', 'sigla', 'secretariaId'],
            },
        },
    },
    // ── DELEÇÃO ───────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'deletar_secretaria',
            description: 'Deleta (desativa) uma secretaria pelo ID ou sigla. Use listar_secretarias primeiro para obter o ID correto. Requer permissão ADMIN_GERAL. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    secretariaId: {
                        type: 'string',
                        description: 'O ID único da secretaria a ser deletada (obtido via listar_secretarias).',
                    },
                },
                required: ['secretariaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'deletar_setor',
            description: 'Deleta (desativa) um setor pelo ID. Use listar_setores_secretaria para descobrir o ID. Requer permissão ADMIN_GERAL ou SECRETARIO. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    setorId: {
                        type: 'string',
                        description: 'O ID único do setor a ser deletado.',
                    },
                },
                required: ['setorId'],
            },
        },
    },
    // ── EDIÇÃO ────────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'editar_secretaria',
            description: 'Edita o nome, sigla ou cor de uma secretaria existente. Use listar_secretarias para obter o ID antes. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    secretariaId: { type: 'string', description: 'O ID da secretaria a editar.' },
                    nome: { type: 'string', description: 'Novo nome da secretaria (opcional).' },
                    sigla: { type: 'string', description: 'Nova sigla da secretaria (opcional).' },
                    cor: { type: 'string', description: 'Nova cor em hex (opcional).' },
                },
                required: ['secretariaId'],
            },
        },
    },
    // ── MODELOS ───────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'listar_modelos',
            description: 'Lista todos os modelos de documento disponíveis no sistema (nome, tipo, variáveis). Use antes de criar portaria para saber quais modelos existem.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'criar_modelo',
            description: 'Cria um novo modelo de documento no sistema. ATENÇÃO: SOMENTE use esta ferramenta após confirmar com o usuário os 4 campos obrigatórios: (1) nome oficial, (2) descrição/ementa, (3) tipo de documento, (4) categoria (secretaria). Requer ADMIN_GERAL. Se o usuário anexou um DOCX que foi analisado, NÃO forneça conteudoHtml — o sistema usa automaticamente o HTML completo da análise.',
            parameters: {
                type: 'object',
                properties: {
                    nome: { type: 'string', description: 'Nome oficial do modelo (ex: Portaria de Nomeação de Cargo Comissionado).' },
                    descricao: { type: 'string', description: 'Descrição/ementa do modelo — finalidade e quando usar.' },
                    tipoDocumento: { type: 'string', enum: ['PORTARIA', 'MEMORANDO', 'OFICIO', 'LEI'], description: 'Tipo do documento. Pergunte ao usuário se não estiver claro.' },
                    secretariaId: { type: 'string', description: 'ID da secretaria/categoria do modelo (obtido via listar_secretarias). Use a secretaria que melhor representa a categoria do documento (ex: RH, Licitação, Gabinete). Chame listar_secretarias para obter o ID correto.' },
                    conteudoHtml: { type: 'string', description: 'Conteúdo HTML do modelo com tags {{VARIAVEL}}.' },
                    variaveis: {
                        type: 'array',
                        description: 'Lista de variáveis do modelo.',
                        items: {
                            type: 'object',
                            properties: {
                                chave: { type: 'string' },
                                label: { type: 'string' },
                                tipo: { type: 'string', enum: ['texto', 'data', 'numero', 'select', 'textarea'] },
                                obrigatorio: { type: 'boolean' },
                            },
                        },
                    },
                },
                required: ['nome', 'descricao', 'tipoDocumento', 'conteudoHtml'],
            },
        },
    },
    // ── PORTARIAS ─────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'listar_portarias',
            description: 'Lista portarias com filtros opcionais de status e secretaria. Use para ver portarias pendentes, em revisão, etc.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', description: 'Filtro de status: RASCUNHO, EM_REVISAO_ABERTA, EM_REVISAO_ATRIBUIDA, AGUARDANDO_ASSINATURA, PRONTO_PUBLICACAO, PUBLICADA.' },
                    limite: { type: 'number', description: 'Máximo de resultados (padrão 10).' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'criar_portaria',
            description: 'Cria uma nova portaria (rascunho) no sistema. Precisa do modeloId (use listar_modelos) e secretariaId (use listar_secretarias). Permitido para OPERADOR, SECRETARIO, REVISOR, PREFEITO e ADMIN_GERAL. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    titulo: { type: 'string', description: 'Título da portaria (ex: Portaria de Nomeação de João Silva).' },
                    descricao: { type: 'string', description: 'Descrição breve do objeto da portaria.' },
                    modeloId: { type: 'string', description: 'ID do modelo a usar (obtido via listar_modelos).' },
                    secretariaId: { type: 'string', description: 'ID da secretaria (obtido via listar_secretarias).' },
                    formData: { type: 'object', description: 'Valores das variáveis do modelo em formato {CHAVE: valor}.' },
                },
                required: ['titulo', 'modeloId', 'secretariaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'buscar_contexto_usuario',
            description: 'Busca um resumo do contexto atual do usuário: portarias pendentes, recentes, contagem por status. Use no início de conversas para ter contexto completo sem perguntar ao usuário.',
            parameters: { type: 'object', properties: {} },
        },
    },
    // ── DOCUMENTOS ────────────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'buscar_documentos',
            description: 'Busca portarias publicadas no diário oficial por palavra-chave (assunto, número, nome de servidor).',
            parameters: {
                type: 'object',
                properties: {
                    termo: { type: 'string', description: 'Palavra-chave a buscar.' },
                    limite: { type: 'number', description: 'Máximo de resultados (padrão 5).' },
                },
                required: ['termo'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'resumir_documento',
            description: 'Busca os detalhes de uma portaria pelo ID e gera um resumo/ementa, incluindo link para download do PDF.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria (obtido via buscar_documentos).' },
                },
                required: ['portariaId'],
            },
        },
    },
    // ── FLUXO DE PORTARIA ─────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'submeter_portaria',
            description: 'Submete uma portaria em RASCUNHO (ou CORRECAO_NECESSARIA) para a fila de revisão, mudando o status para EM_REVISAO_ABERTA. Permitido apenas para o autor da portaria ou ADMIN_GERAL. Use listar_portarias para obter o portariaId. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria a submeter.' },
                    observacao: { type: 'string', description: 'Observação opcional para o revisor.' },
                },
                required: ['portariaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'aprovar_revisao',
            description: 'Aprova a revisão de uma portaria em EM_REVISAO_ATRIBUIDA, enviando-a para AGUARDANDO_ASSINATURA. Permitido para REVISOR (se for o revisor atual), SECRETARIO e ADMIN_GERAL. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria a aprovar.' },
                    observacao: { type: 'string', description: 'Observação ou parecer opcional da revisão.' },
                },
                required: ['portariaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'verificar_prontidao_publicacao',
            description: 'Verifica se uma portaria está pronta para publicação: checa status, assinatura, PDF gerado e permissão do usuário. Use antes de pedir ao usuário para publicar.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria a verificar.' },
                },
                required: ['portariaId'],
            },
        },
    },
    // ── DESFAZER / REVERTER AÇÕES ──────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'deletar_portaria',
            description: 'Deleta permanentemente uma portaria em status RASCUNHO. Use para "desfazer" a criação de uma portaria. Permitido para o autor ou ADMIN_GERAL. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria a ser deletada.' },
                },
                required: ['portariaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reverter_status_portaria',
            description: 'Reverte o status de uma portaria um passo atrás (ex: de EM_REVISAO_ABERTA volta para RASCUNHO). Use para "desfazer" uma submissão ou aprovação. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    portariaId: { type: 'string', description: 'O ID da portaria a reverter.' },
                },
                required: ['portariaId'],
            },
        },
    },
    // ── GESTÃO DE USUÁRIOS ────────────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'listar_usuarios',
            description: 'Lista usuários do sistema com filtros opcionais. Requer ADMIN_GERAL. Use para verificar quem tem determinado papel, quem está em uma secretaria ou buscar um servidor pelo nome.',
            parameters: {
                type: 'object',
                properties: {
                    role: { type: 'string', description: 'Filtrar por papel: ADMIN_GERAL, PREFEITO, SECRETARIO, REVISOR, OPERADOR, PENDENTE.' },
                    secretariaId: { type: 'string', description: 'Filtrar por secretaria (ID obtido via listar_secretarias).' },
                    busca: { type: 'string', description: 'Busca por nome ou e-mail (busca parcial).' },
                    ativo: { type: 'boolean', description: 'Filtrar por status: true = ativos, false = inativos. Padrão: todos.' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'alterar_papel',
            description: 'Altera o papel (role) de um usuário e opcionalmente sua secretaria de lotação. Requer ADMIN_GERAL. Para REVISOR, OPERADOR e SECRETARIO é obrigatório informar secretariaId. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'ID do usuário a alterar (obtido via listar_usuarios).' },
                    role: { type: 'string', description: 'Novo papel: ADMIN_GERAL, PREFEITO, SECRETARIO, REVISOR, OPERADOR.' },
                    secretariaId: { type: 'string', description: 'ID da secretaria de lotação (obrigatório para REVISOR, OPERADOR e SECRETARIO).' },
                    ativo: { type: 'boolean', description: 'Ativar (true) ou desativar (false) o usuário.' },
                },
                required: ['userId', 'role'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'alterar_lotacao',
            description: 'Altera a secretaria e/ou setor de lotação de um usuário sem mudar seu papel. Requer ADMIN_GERAL. Use quando o servidor foi transferido de secretaria. ATENÇÃO: É OBRIGATÓRIO pedir confirmação ao usuário antes de executar.',
            parameters: {
                type: 'object',
                properties: {
                    userId: { type: 'string', description: 'ID do usuário (obtido via listar_usuarios).' },
                    secretariaId: { type: 'string', description: 'ID da nova secretaria (obtido via listar_secretarias).' },
                    setorId: { type: 'string', description: 'ID do novo setor (opcional, obtido via listar_setores_secretaria).' },
                },
                required: ['userId', 'secretariaId'],
            },
        },
    },
]

// ── Mapa de permissões por ferramenta ────────────────────────────────────────
// Defense-in-depth: LLM já recebe instrução no system prompt,
// mas aqui garantimos server-side que tools admin nunca chegam ao LLM para usuários comuns.
const TOOL_ROLE_REQUIREMENTS: Record<string, string[]> = {
    // Ferramentas de leitura — sem restrição: qualquer role (incluindo desconhecidos) recebe.
    // Omitidas aqui propositalmente — o filtro inclui por padrão se não há entrada no mapa.

    // Revisão — apenas revisores e superiores
    'aprovar_revisao':               ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'],
    // Setores — ADMIN_SETORIAL ou superior
    'criar_setor':                   ['ADMIN_SETORIAL', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'],
    'deletar_setor':                 ['ADMIN_SETORIAL', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'],
    // Modelos — ADMIN_GERAL apenas (criação)
    'criar_modelo':                  ['ADMIN_GERAL'],
    // Usuários — ADMIN_SETORIAL ou superior (listagem), ADMIN_GERAL (mutações)
    'listar_usuarios':               ['ADMIN_SETORIAL', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'],
    'alterar_papel':                 ['ADMIN_GERAL'],
    'alterar_lotacao':               ['ADMIN_GERAL'],
    // Secretarias — ADMIN_GERAL apenas
    'criar_secretaria':              ['ADMIN_GERAL'],
    'deletar_secretaria':            ['ADMIN_GERAL'],
    'editar_secretaria':             ['ADMIN_GERAL'],
}

/**
 * Filtra LLM_TOOLS pela role do usuário.
 * Ferramentas sem entrada em TOOL_ROLE_REQUIREMENTS são incluídas por padrão (safe default).
 * Deve ser chamado antes de passar tools ao llmChat().
 */
const MUTATING_TOOL_NAMES = new Set([
    'criar_secretaria',
    'criar_setor',
    'deletar_secretaria',
    'deletar_setor',
    'editar_secretaria',
    'criar_modelo',
    'criar_portaria',
    'submeter_portaria',
    'aprovar_revisao',
    'devolver_revisao',
    'assinar_portaria',
    'publicar_portaria',
    'cancelar_portaria',
    'deletar_portaria',
    'reverter_status_portaria',
    'alterar_papel',
    'alterar_lotacao',
])

export function filterToolsByRole(role: string, options: { includeMutating?: boolean } = {}): typeof LLM_TOOLS {
    return LLM_TOOLS.filter(tool => {
        const funcName = tool.function.name
        if (options.includeMutating === false && MUTATING_TOOL_NAMES.has(funcName)) return false
        const allowedRoles = TOOL_ROLE_REQUIREMENTS[funcName]
        // Se não há restrição mapeada, incluir (pode ser uma ferramenta nova/segura por padrão)
        if (!allowedRoles) return true
        return allowedRoles.includes(role)
    })
}

// ── Handlers modulares por domínio ───────────────────────────────────────────
import { handleSecretarias } from './llm-tools/handlers/secretarias'
import { handleSetores } from './llm-tools/handlers/setores'
import { handlePortarias } from './llm-tools/handlers/portarias'
import { handleUsuarios } from './llm-tools/handlers/usuarios'
import { handleModelos } from './llm-tools/handlers/modelos'

// Chain de handlers — cada um retorna null se não conhece a tool
const HANDLERS = [
    handleSecretarias,
    handleSetores,
    handlePortarias,
    handleUsuarios,
    handleModelos,
]

// 2. Tool executor — distribui para o handler correto pelo domínio
export async function executeToolCall(
    toolName: string,
    args: any,
    context?: {
        userAuth?: { nome: string; email: string; role?: string }
        secretariaId?: string
        setorId?: string
    }
): Promise<any> {
    try {
        for (const handler of HANDLERS) {
            const result = await handler(toolName, args, context)
            if (result !== null) return result
        }
        return { erro: `Ferramenta desconhecida: ${toolName}` }
    } catch (error: any) {
        console.error(`[LLM Tool Error] ${toolName}:`, error)
        return { erro: `Erro interno ao executar a ferramenta ${toolName}.`, detalhes: error.message || String(error) }
    }
}
