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
    REVISOR: 'REVISOR',
    OPERADOR: 'OPERADOR',
    PENDENTE: 'PENDENTE',
} as const
export type RoleUsuario = (typeof ROLES)[keyof typeof ROLES]

export const TIPO_EVENTO_FEED = {
    // Portarias – ciclo de vida
    PORTARIA_CRIADA: 'PORTARIA_CRIADA',
    PORTARIA_SUBMETIDA: 'PORTARIA_SUBMETIDA',
    PORTARIA_APROVADA: 'PORTARIA_APROVADA',
    PORTARIA_REJEITADA: 'PORTARIA_REJEITADA',
    PORTARIA_PUBLICADA: 'PORTARIA_PUBLICADA',
    PORTARIA_FALHA: 'PORTARIA_FALHA',
    PORTARIA_RETRY: 'PORTARIA_RETRY',
    // Revisão
    REVISAO_ATRIBUIDA: 'REVISAO_ATRIBUIDA',
    DOCUMENTO_DEVOLVIDO_AUTOR: 'DOCUMENTO_DEVOLVIDO_AUTOR',
    // Mudanças de status via fluxo
    MUDANCA_STATUS_SOLICITAR_REVISAO: 'MUDANCA_STATUS_SOLICITAR_REVISAO',
    MUDANCA_STATUS_ASSUMIR_REVISAO: 'MUDANCA_STATUS_ASSUMIR_REVISAO',
    MUDANCA_STATUS_APROVAR_REVISAO: 'MUDANCA_STATUS_APROVAR_REVISAO',
    MUDANCA_STATUS_REJEITAR_REVISAO: 'MUDANCA_STATUS_REJEITAR_REVISAO',
    MUDANCA_STATUS_TRANSFERIR_REVISAO: 'MUDANCA_STATUS_TRANSFERIR_REVISAO',
    // Assinaturas
    ASSINATURA_DIGITAL: 'ASSINATURA_DIGITAL',
    ASSINATURA_MANUAL: 'ASSINATURA_MANUAL',
    ASSINATURA_DISPENSADA: 'ASSINATURA_DISPENSADA',
    ASSINATURA_LOTE: 'ASSINATURA_LOTE',
    // Exclusão
    EXCLUSAO: 'EXCLUSAO',
    EXCLUSAO_LOTE: 'EXCLUSAO_LOTE',
    // Modelos e variáveis
    MODELO_CRIADO: 'MODELO_CRIADO',
    MODELO_ATUALIZADO: 'MODELO_ATUALIZADO',
    VARIAVEL_CRIADA: 'VARIAVEL_CRIADA',
    VARIAVEL_EDITADA: 'VARIAVEL_EDITADA',
    VARIAVEL_EXCLUIDA: 'VARIAVEL_EXCLUIDA',
    // Assistente IA
    ACAO_ASSISTENTE_IA: 'ACAO_ASSISTENTE_IA',
    // Rastreamento de documento (por portaria)
    DOCX_VISUALIZADO: 'DOCX_VISUALIZADO',
    DOCX_BAIXADO: 'DOCX_BAIXADO',
    PDF_VISUALIZADO: 'PDF_VISUALIZADO',
    FORMULARIO_SALVO: 'FORMULARIO_SALVO',
} as const
// string permite eventos dinâmicos como MUDANCA_STATUS_SOLICITAR_REVISAO sem quebrar o tipo
export type TipoEventoFeed = (typeof TIPO_EVENTO_FEED)[keyof typeof TIPO_EVENTO_FEED] | string

export interface Secretaria {
    id: string; nome: string; sigla: string; cor: string;
    titularId?: string | null;
    titular?: Pick<Usuario, 'id' | 'name' | 'email' | 'image'> | null;
}
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
    // Relações populadas
    autor?: Pick<Usuario, 'id' | 'name' | 'email'>
    criadoPor?: { name: string }
    revisorAtual?: { name: string } | null
    assinadoPor?: { name: string } | null
    modelo?: { nome: string }
    secretaria?: Secretaria & { cor?: string }
    createdAt: string; updatedAt: string
    feedAtividades?: FeedAtividade[]
}

export type TipoDocumento = 'PORTARIA' | 'MEMORANDO' | 'OFICIO' | 'LEI'

export interface ModeloDocumento {
    id: string; nome: string; descricao: string; categoria: string; secretariaId: string | null
    tipoDocumento: TipoDocumento
    docxTemplateUrl: string; conteudoHtml?: string; variaveis: ModeloVariavel[]; ativo: boolean
    versao?: number; modeloPaiId?: string | null
}

export type TipoVariavel = 'texto' | 'numero' | 'data' | 'cpf' | 'moeda' | 'textarea' | 'select' | 'assinatura' | 'data_extenso'
export interface ModeloVariavel {
    id: string; modeloId: string; chave: string; label: string
    tipo: TipoVariavel
    opcoes: string[]; obrigatorio: boolean; ordem: number
    descricao?: string
    valorPadrao?: string | null
    grupo?: string | null
    regraCondicional?: { dependeDe: string; valor: string } | null
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
    tipoDocumento: TipoDocumento
    formato_base: string
    proximo_numero: number
    numero_inicial: number
    logs: LivroLog[]
    ativo: boolean
    reinicia_por_ano: boolean
    ano_atual: number | null
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

export interface NotificacaoItem {
    id: string
    /** Evento do FeedAtividade (broadcast) */
    tipoEvento?: string
    /** Tipo da Notificacao (direcionada por userId) */
    tipo?: string
    mensagem: string
    portariaId: string | null
    portariaTitulo: string | null
    portariaNumero: string | null
    /** Data de criação no FeedAtividade */
    createdAt?: string
    /** Data de criação na tabela Notificacao */
    criadoEm?: string
    lida: boolean
    metadata?: Record<string, string>
    /** true se veio da tabela Notificacao (direcionada); false se é broadcast */
    direcionada?: boolean
}
