export const STATUS_PORTARIA = {
    RASCUNHO: 'RASCUNHO',
    EM_REVISAO_ABERTA: 'EM_REVISAO_ABERTA',
    EM_REVISAO_ATRIBUIDA: 'EM_REVISAO_ATRIBUIDA',
    CORRECAO_NECESSARIA: 'CORRECAO_NECESSARIA',
    AGUARDANDO_ASSINATURA: 'AGUARDANDO_ASSINATURA',
    PRONTO_PUBLICACAO: 'PRONTO_PUBLICACAO',
    PUBLICADA: 'PUBLICADA',
    FALHA_PROCESSAMENTO: 'FALHA_PROCESSAMENTO',
    ERRO_GERACAO: 'ERRO_GERACAO',
} as const
export type StatusPortaria = (typeof STATUS_PORTARIA)[keyof typeof STATUS_PORTARIA]

export const ROLES = {
    ADMIN_GERAL: 'ADMIN_GERAL',
    PREFEITO: 'PREFEITO',
    SECRETARIO: 'SECRETARIO',
    GESTOR_SETOR: 'GESTOR_SETOR',
    OPERADOR: 'OPERADOR',
    PENDENTE: 'PENDENTE',
} as const
export type RoleUsuario = (typeof ROLES)[keyof typeof ROLES]

export const TIPO_EVENTO_FEED = {
    PORTARIA_CRIADA: 'PORTARIA_CRIADA',
    PORTARIA_SUBMETIDA: 'PORTARIA_SUBMETIDA',
    PORTARIA_APROVADA: 'PORTARIA_APROVADA',
    PORTARIA_REJEITADA: 'PORTARIA_REJEITADA',
    PORTARIA_PUBLICADA: 'PORTARIA_PUBLICADA',
    PORTARIA_FALHA: 'PORTARIA_FALHA',
} as const
export type TipoEventoFeed = (typeof TIPO_EVENTO_FEED)[keyof typeof TIPO_EVENTO_FEED]

export interface Secretaria { id: string; nome: string; sigla: string; cor: string }
export interface Setor { id: string; nome: string; secretariaId: string }

export interface Usuario {
    id: string; name: string; email: string; role: RoleUsuario; ativo: boolean
    permissoesExtra: string[]; secretariaId: string | null; setorId: string | null
    secretaria?: Secretaria; setor?: Setor; createdAt: string
}

export interface Portaria {
    id: string; titulo: string; numeroOficial: string | null; status: StatusPortaria
    autorId: string; secretariaId: string; setorId: string | null; modeloId: string
    pdfUrl: string | null; docxRascunhoUrl: string | null; hashIntegridade: string | null
    assinaturaStatus: string; assinaturaJustificativa: string | null; assinaturaComprovanteUrl: string | null
    revisorAtualId: string | null
    assinadoEm: string | null; assinadoPorId: string | null; dataPublicacao: string | null
    formData: Record<string, any>
    autor?: Pick<Usuario, 'id' | 'name' | 'email'>
    secretaria?: Secretaria; createdAt: string; updatedAt: string
    feedAtividades?: FeedAtividade[]
}

export interface ModeloDocumento {
    id: string; nome: string; descricao: string; secretariaId: string | null
    docxTemplateUrl: string; variaveis: ModeloVariavel[]; ativo: boolean
}

export type TipoVariavel = 'texto' | 'numero' | 'data' | 'cpf' | 'moeda' | 'textarea' | 'select' | 'assinatura' | 'data_extenso'
export interface ModeloVariavel {
    id: string; modeloId: string; chave: string; label: string
    tipo: TipoVariavel
    opcoes: string[]; obrigatorio: boolean; ordem: number
    descricao?: string
}

export interface VariavelSistema {
    id: string; chave: string; valor: string; descricao: string
    resolvidaAutomaticamente: boolean
}

export interface LivroLog {
    numero: string
    portaria_id: string
    aprovador: string
    data: string
    ip: string
}

export interface LivrosNumeracao {
    id: string
    nome: string
    formato_base: string
    proximo_numero: number
    numero_inicial: number
    tipos_suportados: Record<string, number>
    logs: LivroLog[]
    ativo: boolean
    criado_em: string
    atualizado_em: string
}

export interface FeedAtividade {
    id: string; tipoEvento: TipoEventoFeed; mensagem: string
    portariaId: string; autorId: string; secretariaId: string; setorId: string | null
    metadata: Record<string, string>
    autor?: Pick<Usuario, 'id' | 'name'>
    portaria?: Pick<Portaria, 'id' | 'titulo' | 'numeroOficial'>
    createdAt: string
}
