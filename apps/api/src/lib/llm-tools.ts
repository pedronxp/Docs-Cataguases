import prisma from '@/lib/prisma'

// ── Cache server-side para análise de DOCX ─────────────────────────────────
// Armazena o HTML completo e variáveis da última análise de DOCX por userId.
// Expira automaticamente após 30 minutos para evitar vazamento de memória.
const docxAnaliseCache = new Map<string, { conteudoHtml: string; variaveis: any[]; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutos

export function setDocxAnalise(userId: string, data: { conteudoHtml: string; variaveis: any[] }) {
    docxAnaliseCache.set(userId, { ...data, timestamp: Date.now() })
    // Auto-limpeza após TTL
    setTimeout(() => docxAnaliseCache.delete(userId), CACHE_TTL_MS)
}

export function getDocxAnalise(userId: string) {
    const cached = docxAnaliseCache.get(userId)
    if (!cached) return null
    // Verificar expiração
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        docxAnaliseCache.delete(userId)
        return null
    }
    return { conteudoHtml: cached.conteudoHtml, variaveis: cached.variaveis }
}

export function clearDocxAnalise(userId: string) {
    docxAnaliseCache.delete(userId)
}

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

// ── Helper: registrar ação do assistente de IA no feed de auditoria ──────────
async function logAcaoIA(
    autorId: string,
    mensagem: string,
    secretariaId?: string,
    metadata?: Record<string, unknown>
) {
    try {
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: 'ACAO_ASSISTENTE_IA',
                mensagem,
                autorId,
                secretariaId: secretariaId ?? null,
                metadata: (metadata ?? {}) as object,
            },
        })
    } catch (e) {
        // Log de auditoria nunca deve quebrar a operação principal
        console.warn('[LLM Tools] Falha ao registrar log de auditoria:', e)
    }
}

// ── Helper: verificar permissão do usuário ─────────────────────────────────────
async function verificarPermissao(
    email: string,
    rolesPermitidos: string[]
): Promise<{ ok: boolean; user?: any; erro?: string }> {
    const user = await prisma.user.findFirst({
        where: { email, ativo: true },
    })
    if (!user) {
        return { ok: false, erro: `Usuário com e-mail "${email}" não encontrado no sistema ou inativo.` }
    }
    if (!rolesPermitidos.includes(user.role)) {
        return {
            ok: false,
            erro: `Ação negada. Seu cargo é "${user.role}", mas esta ação exige um dos seguintes: ${rolesPermitidos.join(', ')}.`,
        }
    }
    return { ok: true, user }
}

// 2. Tool executor
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
        switch (toolName) {

        // ── LISTAGEM ──────────────────────────────────────────────────────────
        case 'listar_secretarias': {
            const secretarias = await prisma.secretaria.findMany({
                where: { ativo: true },
                select: { id: true, nome: true, sigla: true, cor: true },
                orderBy: { nome: 'asc' },
            })
            return { mensagem: 'Lista de secretarias ativas.', secretarias }
        }

        case 'listar_setores_secretaria': {
            const { termo_secretaria } = args
            const setores = await prisma.setor.findMany({
                where: {
                    ativo: true,
                    secretaria: {
                        OR: [
                            { sigla: { equals: termo_secretaria, mode: 'insensitive' } },
                            { id: termo_secretaria },
                        ],
                    },
                },
                select: {
                    id: true,
                    nome: true,
                    sigla: true,
                    secretaria: { select: { sigla: true, nome: true } },
                },
            })
            return {
                mensagem: setores.length > 0 ? 'Setores encontrados.' : 'Nenhum setor encontrado para esta secretaria.',
                setores,
            }
        }

        // ── CRIAÇÃO ───────────────────────────────────────────────────────────
        case 'criar_secretaria': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { nome, sigla, cor } = args
            const existente = await prisma.secretaria.findUnique({ where: { sigla: sigla.toUpperCase() } })
            if (existente) return { erro: `Já existe uma secretaria com a sigla ${sigla.toUpperCase()}.` }

            const secretaria = await prisma.secretaria.create({
                data: { nome, sigla: sigla.toUpperCase(), cor: cor || '#6366f1', ativo: true },
            })
            await logAcaoIA(perm.user!.id, `Assistente IA criou secretaria "${secretaria.nome}" (${secretaria.sigla})`, secretaria.id, { acao: 'criar_secretaria', secretariaId: secretaria.id })
            return {
                mensagem: 'Secretaria criada com sucesso!',
                secretaria: { id: secretaria.id, nome: secretaria.nome, sigla: secretaria.sigla },
            }
        }

        case 'criar_setor': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL', 'SECRETARIO'])
            if (!perm.ok) return { erro: perm.erro }

            const { nome, sigla, secretariaId } = args
            const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
            if (!sec) return { erro: `Secretaria com ID ${secretariaId} não encontrada.` }

            try {
                const setor = await prisma.setor.create({
                    data: { nome, sigla: sigla.toUpperCase(), secretariaId, ativo: true },
                })
                await logAcaoIA(perm.user!.id, `Assistente IA criou setor "${setor.nome}" (${setor.sigla}) na secretaria ${sec.sigla}`, secretariaId, { acao: 'criar_setor', setorId: setor.id, secretariaId })
                return {
                    mensagem: 'Setor criado com sucesso!',
                    setor: { id: setor.id, nome: setor.nome, sigla: setor.sigla, secretaria: sec.sigla },
                }
            } catch (err: any) {
                if (err.code === 'P2002') return { erro: 'Já existe um setor com essa sigla nessa secretaria.' }
                return { erro: 'Falha ao criar setor.', detalhes: err.message }
            }
        }

        // ── DELEÇÃO ───────────────────────────────────────────────────────────
        case 'deletar_secretaria': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { secretariaId } = args
            const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
            if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada.` }

            // Soft delete — marca como inativa
            await prisma.secretaria.update({
                where: { id: secretariaId },
                data: { ativo: false },
            })
            await logAcaoIA(perm.user!.id, `Assistente IA desativou secretaria "${sec.nome}" (${sec.sigla})`, sec.id, { acao: 'deletar_secretaria', secretariaId: sec.id })
            return {
                mensagem: `Secretaria "${sec.nome}" (${sec.sigla}) foi desativada com sucesso.`,
                secretariaId: sec.id,
            }
        }

        case 'deletar_setor': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL', 'SECRETARIO'])
            if (!perm.ok) return { erro: perm.erro }

            const { setorId } = args
            const setor = await prisma.setor.findUnique({
                where: { id: setorId },
                include: { secretaria: { select: { sigla: true } } },
            })
            if (!setor) return { erro: `Setor com ID "${setorId}" não encontrado.` }

            await prisma.setor.update({
                where: { id: setorId },
                data: { ativo: false },
            })
            await logAcaoIA(perm.user!.id, `Assistente IA desativou setor "${setor.nome}" (${setor.sigla}) da secretaria ${setor.secretaria.sigla}`, setor.secretariaId, { acao: 'deletar_setor', setorId: setor.id })
            return {
                mensagem: `Setor "${setor.nome}" (${setor.sigla}) da secretaria ${setor.secretaria.sigla} foi desativado com sucesso.`,
                setorId: setor.id,
            }
        }

        // ── EDIÇÃO ────────────────────────────────────────────────────────────
        case 'editar_secretaria': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { secretariaId, nome, sigla, cor } = args
            const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
            if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada.` }

            // Se mudou sigla, verificar conflito
            if (sigla && sigla.toUpperCase() !== sec.sigla) {
                const conflito = await prisma.secretaria.findUnique({ where: { sigla: sigla.toUpperCase() } })
                if (conflito) return { erro: `Já existe outra secretaria com a sigla ${sigla.toUpperCase()}.` }
            }

            const atualizada = await prisma.secretaria.update({
                where: { id: secretariaId },
                data: {
                    ...(nome && { nome }),
                    ...(sigla && { sigla: sigla.toUpperCase() }),
                    ...(cor && { cor }),
                },
            })
            await logAcaoIA(perm.user!.id, `Assistente IA editou secretaria "${sec.nome}" → "${atualizada.nome}" (${atualizada.sigla})`, atualizada.id, { acao: 'editar_secretaria', secretariaId: atualizada.id, alteracoes: { nome, sigla, cor } })
            return {
                mensagem: `Secretaria atualizada com sucesso!`,
                secretaria: { id: atualizada.id, nome: atualizada.nome, sigla: atualizada.sigla },
            }
        }

        // ── MODELOS ───────────────────────────────────────────────────────────
        case 'listar_modelos': {
            const modelos = await prisma.modeloDocumento.findMany({
                where: { ativo: true },
                select: {
                    id: true, nome: true, descricao: true, tipoDocumento: true, versao: true,
                    variaveis: { select: { chave: true, label: true, tipo: true, obrigatorio: true }, orderBy: { ordem: 'asc' } },
                },
                orderBy: { nome: 'asc' },
            })
            return { mensagem: `${modelos.length} modelo(s) disponível(is).`, modelos }
        }

        case 'criar_modelo': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            let { nome, descricao, tipoDocumento, secretariaId, conteudoHtml, variaveis = [] } = args

            // Se o HTML não foi fornecido (ou é muito curto), usar o cache da análise DOCX
            const analise = getDocxAnalise(perm.user!.id)
            if ((!conteudoHtml || conteudoHtml.length < 200) && analise) {
                conteudoHtml = analise.conteudoHtml
                if (!variaveis || variaveis.length === 0) {
                    variaveis = analise.variaveis
                }
            }

            if (!conteudoHtml || conteudoHtml.length < 10) {
                return { erro: 'Conteúdo HTML do modelo não disponível. Envie o documento DOCX primeiro ou forneça o HTML.' }
            }

            // Validar secretaria/categoria se fornecida
            if (secretariaId) {
                const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
                if (!sec) return { erro: `Secretaria/categoria "${secretariaId}" não encontrada. Use listar_secretarias para ver as opções disponíveis.` }
            }

            const modelo = await prisma.modeloDocumento.create({
                data: {
                    nome,
                    descricao,
                    tipoDocumento: tipoDocumento || 'PORTARIA',
                    conteudoHtml: conteudoHtml || '',
                    docxTemplateUrl: '',
                    ativo: true,
                    versao: 1,
                    ...(secretariaId && { secretariaId }),
                    variaveis: {
                        create: (variaveis as any[]).map((v: any, i: number) => ({
                            chave: v.chave,
                            label: v.label || v.chave,
                            tipo: v.tipo || 'texto',
                            obrigatorio: v.obrigatorio !== false,
                            ordem: i,
                        })),
                    },
                },
                include: { variaveis: true },
            })

            // Limpa o cache da análise após criação bem-sucedida
            clearDocxAnalise(perm.user!.id)
            await logAcaoIA(perm.user!.id, `Assistente IA criou modelo "${modelo.nome}" (${modelo.tipoDocumento}) com ${modelo.variaveis.length} variável(is)`, undefined, { acao: 'criar_modelo', modeloId: modelo.id })
            return {
                mensagem: `Modelo "${modelo.nome}" criado com sucesso! ID: ${modelo.id}`,
                modelo: { id: modelo.id, nome: modelo.nome, tipo: modelo.tipoDocumento, totalVariaveis: modelo.variaveis.length },
            }
        }

        // ── PORTARIAS ─────────────────────────────────────────────────────────
        case 'listar_portarias': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
            if (!dbUser) return { erro: 'Usuário não encontrado.' }

            const { status, limite = 10 } = args

            const where: any = {}
            if (status) where.status = status
            // Operadores só veem as suas; Secretário/Revisor veem da secretaria; Admin/Prefeito veem tudo
            if (dbUser.role === 'OPERADOR') where.criadoPorId = dbUser.id
            else if (['SECRETARIO', 'REVISOR'].includes(dbUser.role) && dbUser.secretariaId) where.secretariaId = dbUser.secretariaId

            const portarias = await prisma.portaria.findMany({
                where,
                take: Number(limite),
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true, titulo: true, status: true, numeroOficial: true,
                    createdAt: true, updatedAt: true,
                    secretaria: { select: { sigla: true } },
                    modelo: { select: { nome: true } },
                    criadoPor: { select: { name: true } },
                },
            })
            return {
                mensagem: `${portarias.length} portaria(s) encontrada(s).`,
                portarias: portarias.map(p => ({
                    id: p.id, titulo: p.titulo, status: p.status,
                    numero: p.numeroOficial, secretaria: p.secretaria?.sigla,
                    modelo: p.modelo?.nome, autor: p.criadoPor?.name,
                    atualizada: p.updatedAt,
                })),
            }
        }

        case 'criar_portaria': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['OPERADOR', 'SECRETARIO', 'REVISOR', 'PREFEITO', 'ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { titulo, descricao, modeloId, secretariaId, formData = {} } = args

            // Validar modelo
            const modelo = await prisma.modeloDocumento.findFirst({ where: { id: modeloId, ativo: true } })
            if (!modelo) return { erro: `Modelo com ID "${modeloId}" não encontrado ou inativo. Use listar_modelos para ver os disponíveis.` }

            // Validar secretaria
            const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
            if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada. Use listar_secretarias para ver as disponíveis.` }

            const portaria = await prisma.portaria.create({
                data: {
                    titulo,
                    descricao: descricao || titulo,
                    status: 'RASCUNHO',
                    criadoPorId: perm.user!.id,
                    secretariaId,
                    modeloId,
                    formData: (formData || {}) as object,
                },
            })

            await logAcaoIA(perm.user!.id, `Assistente IA criou portaria "${titulo}" (RASCUNHO) na secretaria ${sec.sigla}`, secretariaId, { acao: 'criar_portaria', portariaId: portaria.id })
            return {
                mensagem: `Portaria "${titulo}" criada com sucesso como RASCUNHO! ID: ${portaria.id}`,
                portaria: { id: portaria.id, titulo: portaria.titulo, status: portaria.status, secretaria: sec.sigla, modelo: modelo.nome },
                proximoPasso: 'Para enviar para revisão, acesse a portaria e clique em "Submeter para Revisão".',
            }
        }

        case 'buscar_contexto_usuario': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({
                where: { email: context.userAuth.email, ativo: true },
                include: { secretaria: { select: { nome: true, sigla: true } }, setor: { select: { nome: true } } },
            })
            if (!dbUser) return { erro: 'Usuário não encontrado no sistema.' }

            const where: any = {}
            if (dbUser.role === 'OPERADOR') where.criadoPorId = dbUser.id
            else if (['SECRETARIO', 'REVISOR'].includes(dbUser.role) && dbUser.secretariaId) where.secretariaId = dbUser.secretariaId

            const [totalRascunho, totalRevisao, totalAssinatura, totalPublicadas, recentes] = await Promise.all([
                prisma.portaria.count({ where: { ...where, status: 'RASCUNHO' } }),
                prisma.portaria.count({ where: { ...where, status: { in: ['EM_REVISAO_ABERTA', 'EM_REVISAO_ATRIBUIDA'] } } }),
                prisma.portaria.count({ where: { ...where, status: { in: ['AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO'] } } }),
                prisma.portaria.count({ where: { ...where, status: 'PUBLICADA' } }),
                prisma.portaria.findMany({
                    where, take: 5, orderBy: { updatedAt: 'desc' },
                    select: { id: true, titulo: true, status: true, updatedAt: true, secretaria: { select: { sigla: true } } },
                }),
            ])

            return {
                usuario: { nome: dbUser.name, role: dbUser.role, secretaria: dbUser.secretaria?.sigla, setor: dbUser.setor?.nome },
                resumo: { rascunhos: totalRascunho, emRevisao: totalRevisao, aguardandoAssinatura: totalAssinatura, publicadas: totalPublicadas },
                recentes: recentes.map(p => ({ id: p.id, titulo: p.titulo, status: p.status, secretaria: p.secretaria?.sigla })),
            }
        }

        // ── DOCUMENTOS ────────────────────────────────────────────────────────
        case 'buscar_documentos': {
            const { termo, limite = 5 } = args
            if (!termo || termo.length < 3) return { erro: 'O termo de busca deve ter pelo menos 3 caracteres.' }

            const portarias = await prisma.portaria.findMany({
                where: {
                    status: 'PUBLICADA',
                    OR: [
                        { titulo: { contains: termo, mode: 'insensitive' } },
                        { descricao: { contains: termo, mode: 'insensitive' } },
                        { numeroOficial: { contains: termo, mode: 'insensitive' } },
                        { formData: { string_contains: termo } },
                    ],
                },
                take: limite,
                orderBy: { dataPublicacao: 'desc' },
                select: {
                    id: true,
                    titulo: true,
                    numeroOficial: true,
                    dataPublicacao: true,
                    secretaria: { select: { sigla: true } },
                },
            })
            return {
                mensagem: portarias.length > 0 ? `Encontradas ${portarias.length} portarias.` : 'Nenhuma portaria encontrada.',
                resultados: portarias,
            }
        }

        case 'resumir_documento': {
            const { portariaId } = args
            const doc = await prisma.portaria.findUnique({
                where: { id: portariaId, status: 'PUBLICADA' },
                include: { secretaria: true, setor: true, modelo: true },
            })
            if (!doc) return { erro: 'Documento não encontrado ou não publicado.' }

            const urlDownload = `/api/publico/portarias/${doc.id}/pdf`
            return {
                id: doc.id,
                titulo: doc.titulo,
                descricao: doc.descricao,
                numeroOficial: doc.numeroOficial,
                dataPublicacao: doc.dataPublicacao,
                orgao: doc.secretaria?.nome,
                assinadoEm: doc.assinadoEm,
                conteudoTexto: JSON.stringify(doc.formData),
                urlDownload,
                instrucaoParaIA: `Gere um resumo (ementa) deste documento e inclua "[Baixar Documento](${urlDownload})" ao final.`,
            }
        }

        // ── FLUXO DE PORTARIA ──────────────────────────────────────────────────
        case 'submeter_portaria': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
            if (!dbUser) return { erro: 'Usuário não encontrado.' }

            const { portariaId, observacao } = args
            const portaria = await prisma.portaria.findUnique({
                where: { id: portariaId },
                include: { secretaria: { select: { sigla: true, nome: true } } }
            }) as any
            if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada. Use listar_portarias para verificar.` }

            // Apenas o autor ou ADMIN_GERAL pode submeter
            if (portaria.criadoPorId !== dbUser.id && dbUser.role !== 'ADMIN_GERAL') {
                return { erro: 'Apenas o autor da portaria ou um ADMIN_GERAL pode submetê-la para revisão.' }
            }

            if (!['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)) {
                return {
                    erro: `Portaria não pode ser submetida no status "${portaria.status}".`,
                    statusAtual: portaria.status,
                    statusPermitidos: ['RASCUNHO', 'CORRECAO_NECESSARIA'],
                }
            }

            await prisma.$transaction(async (tx) => {
                await (tx.portaria as any).update({
                    where: { id: portariaId },
                    data: { status: 'EM_REVISAO_ABERTA' },
                })
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'PORTARIA_SUBMETIDA',
                        mensagem: `Documento submetido para revisão por ${dbUser.name} (via assistente IA)${observacao ? `. Obs: "${observacao}"` : ''}`,
                        portariaId,
                        autorId: dbUser.id,
                        secretariaId: portaria.secretariaId,
                        metadata: { via: 'assistente_ia', observacao } as any,
                    },
                })
            })

            await logAcaoIA(dbUser.id, `Assistente IA submeteu portaria "${portaria.titulo}" para revisão`, portaria.secretariaId, { acao: 'submeter_portaria', portariaId })
            return {
                mensagem: `Portaria "${portaria.titulo}" submetida para revisão com sucesso!`,
                portaria: { id: portariaId, titulo: portaria.titulo, novoStatus: 'EM_REVISAO_ABERTA', secretaria: portaria.secretaria?.sigla },
                proximoPasso: 'A portaria agora está na fila de revisão. Um revisor irá assumí-la e analisar o documento.',
                aviso: portaria.docxRascunhoUrl ? undefined : 'O documento PDF não foi gerado automaticamente via IA. Para gerar, acesse a portaria na interface e use o botão "Reprocessar PDF".',
            }
        }

        case 'aprovar_revisao': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
            if (!dbUser) return { erro: 'Usuário não encontrado.' }

            if (!['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'].includes(dbUser.role)) {
                return { erro: `Ação negada. Seu cargo "${dbUser.role}" não tem permissão para aprovar revisões. Necessário: REVISOR, SECRETARIO ou ADMIN_GERAL.` }
            }

            const { portariaId, observacao } = args
            const portaria = await prisma.portaria.findUnique({ where: { id: portariaId } }) as any
            if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

            if (portaria.status !== 'EM_REVISAO_ATRIBUIDA') {
                return {
                    erro: `Portaria não está em revisão atribuída. Status atual: "${portaria.status}".`,
                    statusAtual: portaria.status,
                    dica: portaria.status === 'EM_REVISAO_ABERTA'
                        ? 'A portaria ainda não foi atribuída a um revisor. Um revisor precisa assumir a revisão primeiro.'
                        : `Para aprovar, o status deve ser EM_REVISAO_ATRIBUIDA.`,
                }
            }

            // Verifica se é o revisor atual (ou ADMIN_GERAL/SECRETARIO)
            if (portaria.revisorAtualId && portaria.revisorAtualId !== dbUser.id && !['ADMIN_GERAL', 'SECRETARIO'].includes(dbUser.role)) {
                return { erro: 'Esta portaria está atribuída a outro revisor. Apenas o revisor designado, um SECRETARIO ou ADMIN_GERAL pode aprová-la.' }
            }

            await prisma.$transaction(async (tx) => {
                await (tx.portaria as any).update({
                    where: { id: portariaId },
                    data: { status: 'AGUARDANDO_ASSINATURA', revisorAtualId: null },
                })
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'MUDANCA_STATUS_APROVAR_REVISAO',
                        mensagem: `Revisão aprovada por ${dbUser.name} (via assistente IA). Aguardando assinatura.${observacao ? ` Parecer: "${observacao}"` : ''}`,
                        portariaId,
                        autorId: dbUser.id,
                        secretariaId: portaria.secretariaId,
                        metadata: { via: 'assistente_ia', action: 'APROVAR_REVISAO', observacao } as any,
                    },
                })
            })

            // Notificar o autor (melhor esforço — falha não bloqueia)
            try {
                if (portaria.criadoPorId) {
                    await prisma.feedAtividade.create({
                        data: {
                            tipoEvento: 'PORTARIA_APROVADA',
                            mensagem: `Sua portaria foi aprovada na revisão por ${dbUser.name} e agora aguarda assinatura.`,
                            portariaId,
                            autorId: dbUser.id,
                            secretariaId: portaria.secretariaId,
                            metadata: { destinatarioId: portaria.criadoPorId } as any,
                        },
                    })
                }
            } catch { /* notificação não crítica */ }

            await logAcaoIA(dbUser.id, `Assistente IA aprovou revisão da portaria "${portaria.titulo}"`, portaria.secretariaId, { acao: 'aprovar_revisao', portariaId })
            return {
                mensagem: `Revisão da portaria "${portaria.titulo}" aprovada com sucesso!`,
                portaria: { id: portariaId, titulo: portaria.titulo, novoStatus: 'AGUARDANDO_ASSINATURA' },
                proximoPasso: 'A portaria agora aguarda assinatura pelo Prefeito. Após a assinatura, estará pronta para publicação no Diário Oficial.',
            }
        }

        case 'verificar_prontidao_publicacao': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
            if (!dbUser) return { erro: 'Usuário não encontrado.' }

            const { portariaId } = args
            const portaria = await prisma.portaria.findUnique({
                where: { id: portariaId },
                include: {
                    secretaria: { select: { sigla: true, nome: true } },
                    modelo: { select: { nome: true, tipoDocumento: true } },
                },
            }) as any
            if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

            const checks = {
                status: portaria.status === 'PRONTO_PUBLICACAO',
                assinatura: portaria.assinaturaStatus !== 'NAO_ASSINADA',
                pdfGerado: !!portaria.pdfUrl,
                permissao: ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO'].includes(dbUser.role),
            }

            const prontoParaPublicar = Object.values(checks).every(Boolean)

            return {
                portaria: {
                    id: portariaId, titulo: portaria.titulo,
                    status: portaria.status,
                    assinaturaStatus: portaria.assinaturaStatus,
                    secretaria: portaria.secretaria?.sigla,
                    modelo: portaria.modelo?.nome,
                },
                verificacoes: {
                    statusCorreto: { ok: checks.status, detalhe: checks.status ? 'PRONTO_PUBLICACAO ✓' : `Status atual: ${portaria.status} — necessário: PRONTO_PUBLICACAO` },
                    assinadaOuDispensada: { ok: checks.assinatura, detalhe: checks.assinatura ? `${portaria.assinaturaStatus} ✓` : 'Portaria não possui assinatura registrada' },
                    pdfDisponivel: { ok: checks.pdfGerado, detalhe: checks.pdfGerado ? 'PDF gerado ✓' : 'PDF não gerado — o sistema irá gerar durante a publicação' },
                    permissao: { ok: checks.permissao, detalhe: checks.permissao ? `Role ${dbUser.role} pode publicar ✓` : `Role ${dbUser.role} não pode publicar — necessário: PREFEITO, SECRETARIO ou ADMIN_GERAL` },
                },
                prontoParaPublicar,
                instrucao: prontoParaPublicar
                    ? `A portaria está pronta! Para publicar, acesse a portaria na interface e clique em "Publicar". A publicação aloca o número oficial, gera o PDF final e registra no Diário Oficial.`
                    : `A portaria ainda não pode ser publicada. Corrija os itens marcados com ✗ acima.`,
            }
        }

        // ── DESFAZER / REVERTER AÇÕES ──────────────────────────────────────────
        case 'deletar_portaria': {
            if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['OPERADOR', 'SECRETARIO', 'REVISOR', 'PREFEITO', 'ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { portariaId } = args
            const portaria = await prisma.portaria.findUnique({
                where: { id: portariaId },
                include: { secretaria: { select: { sigla: true } } }
            })
            if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

            // Apenas autor ou ADMIN_GERAL pode deletar
            if (portaria.criadoPorId !== perm.user!.id && perm.user!.role !== 'ADMIN_GERAL') {
                return { erro: 'Apenas o criador da portaria ou um ADMIN_GERAL pode deletá-la.' }
            }

            // Apenas deletar se for rascunho
            if (portaria.status !== 'RASCUNHO') {
                return { erro: `Não é possível deletar portaria no status "${portaria.status}". Apenas rascunhos podem ser deletados. Para outros status, use reverter_status_portaria.` }
            }

            await prisma.portaria.delete({
                where: { id: portariaId }
            })

            await logAcaoIA(perm.user!.id, `Assistente IA deletou a portaria "${portaria.titulo}" (ID: ${portaria.id})`, portaria.secretariaId, { acao: 'deletar_portaria', portariaId })
            
            return {
                mensagem: `Portaria "${portaria.titulo}" deletada com sucesso! Ação desfeita.`,
            }
        }

        case 'reverter_status_portaria': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
            if (!dbUser) return { erro: 'Usuário não encontrado.' }

            const { portariaId } = args
            const portaria = await prisma.portaria.findUnique({
                where: { id: portariaId },
                include: { secretaria: { select: { sigla: true } } }
            }) as any
            
            if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

            let novoStatus = ''
            let revisorId = portaria.revisorAtualId

            switch (portaria.status) {
                case 'EM_REVISAO_ABERTA':
                    novoStatus = 'RASCUNHO'
                    break
                case 'EM_REVISAO_ATRIBUIDA':
                    novoStatus = 'EM_REVISAO_ABERTA'
                    revisorId = null
                    break
                case 'AGUARDANDO_ASSINATURA':
                    novoStatus = 'EM_REVISAO_ATRIBUIDA'
                    break
                case 'PRONTO_PUBLICACAO':
                    novoStatus = 'AGUARDANDO_ASSINATURA'
                    break
                case 'PUBLICADA':
                    return { erro: 'Não é possível reverter o status de uma portaria já PUBLICADA.' }
                case 'RASCUNHO':
                    return { erro: 'A portaria já está no estágio inicial (RASCUNHO). Se quiser apagá-la, use deletar_portaria.' }
                default:
                    novoStatus = 'RASCUNHO'
            }

            await prisma.$transaction(async (tx) => {
                await (tx.portaria as any).update({
                    where: { id: portariaId },
                    data: { status: novoStatus, revisorAtualId: revisorId },
                })
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'MUDANCA_STATUS_REVERSAO',
                        mensagem: `Status revertido de ${portaria.status} para ${novoStatus} por ${dbUser.name} (via assistente IA).`,
                        portariaId,
                        autorId: dbUser.id,
                        secretariaId: portaria.secretariaId,
                        metadata: { via: 'assistente_ia', action: 'REVERTER_STATUS' } as any,
                    },
                })
            })

            await logAcaoIA(dbUser.id, `Assistente IA reverteu status da portaria "${portaria.titulo}" para ${novoStatus}`, portaria.secretariaId, { acao: 'reverter_status_portaria', portariaId, novoStatus })
            
            return {
                mensagem: `Ação desfeita com sucesso! O status da portaria "${portaria.titulo}" voltou para ${novoStatus}.`,
                portaria: { id: portariaId, titulo: portaria.titulo, novoStatus },
            }
        }

        // ── GESTÃO DE USUÁRIOS ─────────────────────────────────────────────────
        case 'listar_usuarios': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { role, secretariaId, busca, ativo } = args
            const where: any = {}
            if (role) where.role = role
            if (secretariaId) where.secretariaId = secretariaId
            if (typeof ativo === 'boolean') where.ativo = ativo
            if (busca) {
                where.OR = [
                    { name: { contains: busca, mode: 'insensitive' } },
                    { email: { contains: busca, mode: 'insensitive' } },
                ]
            }

            const users = await prisma.user.findMany({
                where,
                take: 20,
                select: {
                    id: true, name: true, email: true, role: true, ativo: true,
                    secretaria: { select: { sigla: true, nome: true } },
                    setor: { select: { nome: true } },
                },
                orderBy: { name: 'asc' },
            })

            return {
                mensagem: `${users.length} usuário(s) encontrado(s).`,
                usuarios: users.map(u => ({
                    id: u.id,
                    nome: u.name,
                    email: u.email,
                    papel: u.role,
                    ativo: u.ativo,
                    secretaria: u.secretaria?.sigla ?? null,
                    setor: u.setor?.nome ?? null,
                })),
            }
        }

        case 'alterar_papel': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { userId, role, secretariaId, ativo } = args

            // Valida: REVISOR, OPERADOR e SECRETARIO precisam de secretaria
            const rolesRequeremSecretaria = ['REVISOR', 'OPERADOR', 'SECRETARIO']
            if (rolesRequeremSecretaria.includes(role) && !secretariaId) {
                return { erro: `O papel "${role}" exige uma secretaria de lotação. Informe secretariaId (use listar_secretarias para obter os IDs).` }
            }

            const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
            if (!target) return { erro: `Usuário com ID "${userId}" não encontrado.` }

            // Impede rebaixar o próprio ADMIN para não travar o sistema
            if (target.role === 'ADMIN_GERAL' && role !== 'ADMIN_GERAL' && perm.user!.id === userId) {
                return { erro: 'Não é possível rebaixar a si mesmo de ADMIN_GERAL.' }
            }

            if (secretariaId) {
                const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
                if (!sec) return { erro: `Secretaria "${secretariaId}" não encontrada ou inativa.` }
            }

            const updateData: any = { role }
            if (secretariaId !== undefined) updateData.secretariaId = secretariaId
            if (typeof ativo === 'boolean') updateData.ativo = ativo

            const atualizado = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: { id: true, name: true, email: true, role: true, ativo: true, secretaria: { select: { sigla: true } } },
            })

            await logAcaoIA(perm.user!.id, `Assistente IA alterou papel de "${target.name}": ${target.role} → ${role}`, secretariaId, { acao: 'alterar_papel', targetUserId: userId, roleAnterior: target.role, roleNovo: role })
            return {
                mensagem: `Papel de "${atualizado.name}" alterado de ${target.role} para ${role} com sucesso!`,
                usuario: { id: atualizado.id, nome: atualizado.name, email: atualizado.email, papel: atualizado.role, ativo: atualizado.ativo, secretaria: atualizado.secretaria?.sigla },
            }
        }

        case 'alterar_lotacao': {
            if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
            const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
            if (!perm.ok) return { erro: perm.erro }

            const { userId, secretariaId, setorId } = args

            const target = await prisma.user.findUnique({
                where: { id: userId },
                select: { name: true, role: true, secretariaId: true, secretaria: { select: { sigla: true } } },
            })
            if (!target) return { erro: `Usuário com ID "${userId}" não encontrado.` }

            const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
            if (!sec) return { erro: `Secretaria "${secretariaId}" não encontrada ou inativa.` }

            if (setorId) {
                const setor = await prisma.setor.findFirst({ where: { id: setorId, secretariaId, ativo: true } })
                if (!setor) return { erro: `Setor "${setorId}" não encontrado ou não pertence à secretaria ${sec.sigla}.` }
            }

            const updateData: any = { secretariaId, setorId: setorId ?? null }
            const atualizado = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: { id: true, name: true, role: true, secretaria: { select: { sigla: true, nome: true } }, setor: { select: { nome: true } } },
            })

            await logAcaoIA(perm.user!.id, `Assistente IA alterou lotação de "${target.name}": ${target.secretaria?.sigla ?? 'N/A'} → ${sec.sigla}`, secretariaId, { acao: 'alterar_lotacao', targetUserId: userId, secretariaAnterior: target.secretariaId, secretariaNova: secretariaId })
            return {
                mensagem: `Lotação de "${atualizado.name}" atualizada para ${sec.nome} (${sec.sigla})!`,
                usuario: { id: atualizado.id, nome: atualizado.name, papel: atualizado.role, secretaria: atualizado.secretaria?.sigla, setor: atualizado.setor?.nome ?? null },
            }
        }

        default:
            return { erro: `Ferramenta '${toolName}' desconhecida.` }
        }
    } catch (error: any) {
        console.error(`[LLM Tool Error] ${toolName}:`, error)
        return { erro: `Erro interno ao executar a ferramenta ${toolName}.`, detalhes: error.message || String(error) }
    }
}
