# MOCKS.md — DOC'S CATAGUASES
# Código completo dos serviços mock para o Ciclo 1 (Frontend-First)
# Leia também: AGENTS.md (regras, arquitetura e roadmap)
# IMPORTANTE: a interface de cada função é idêntica à versão real do Ciclo 2.
# A troca Mock → Real é feita alterando apenas 1 linha de import no hook.

---

// src/services/_mock.helpers.ts

import type { Portaria, Usuario, FeedAtividade } from '../types/domain'

export const mockDelay = (ms = 600) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export const mockDB = {
  portarias: [] as Portaria[],
  usuarios:  [] as Usuario[],
  feed:      [] as FeedAtividade[],
}

---

// src/services/auth.service.ts

import type { LoginRequest, LoginResponse } from '../types/api'
import type { Usuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_USERS: Record<string, { password: string; usuario: Usuario }> = {
  'admin@cataguases.mg.gov.br': {
    password: '123456',
    usuario: {
      id: 'user-admin', name: 'Admin Geral',
      email: 'admin@cataguases.mg.gov.br', role: 'ADMIN_GERAL',
      ativo: true, permissoesExtra: [],
      secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z',
    },
  },
  'prefeito@cataguases.mg.gov.br': {
    password: '123456',
    usuario: {
      id: 'user-prefeito', name: 'Sr. Prefeito',
      email: 'prefeito@cataguases.mg.gov.br', role: 'PREFEITO',
      ativo: true, permissoesExtra: [],
      secretariaId: null, setorId: null, createdAt: '2025-01-01T00:00:00Z',
    },
  },
  'secretario@cataguases.mg.gov.br': {
    password: '123456',
    usuario: {
      id: 'user-sec', name: 'Dra. Secretária de RH',
      email: 'secretario@cataguases.mg.gov.br', role: 'SECRETARIO',
      ativo: true, permissoesExtra: [],
      secretariaId: 'sec-rh', setorId: null, createdAt: '2025-01-01T00:00:00Z',
    },
  },
  'operador@cataguases.mg.gov.br': {
    password: '123456',
    usuario: {
      id: 'user-op-001', name: 'Operador Padrão',
      email: 'operador@cataguases.mg.gov.br', role: 'OPERADOR',
      ativo: true, permissoesExtra: [],
      secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: '2025-01-01T00:00:00Z',
    },
  },
}

export async function login(payload: LoginRequest): Promise<Result<LoginResponse>> {
  await mockDelay(1000)
  const found = MOCK_USERS[payload.email]
  if (!found || found.password !== payload.password)
    return err('E-mail ou senha incorretos.')
  if (!found.usuario.ativo)
    return err('Usuário desativado. Contate o administrador.')
  return ok({ token: `mock-jwt-${Date.now()}`, usuario: found.usuario })
}

---

// src/services/portaria.service.ts

import type { Portaria } from '../types/domain'
import type {
  CriarPortariaRequest, SubmeterPortariaRequest,
  PaginatedResponse, ListQueryParams,
} from '../types/api'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.portarias = [
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
  },
  {
    id: 'port-002',
    titulo: 'Portaria de Exoneração - Maria Santos',
    numeroOficial: null,
    status: 'RASCUNHO',
    autorId: 'user-op-001',
    secretariaId: 'sec-rh',
    setorId: null,
    modeloId: 'modelo-exoneracao',
    pdfUrl: null,
    docxRascunhoUrl: 'https://mock.storage/rascunho-port-002.docx',
    hashAssinatura: null,
    dadosFormulario: { NOME_SERVIDOR: 'Maria Santos', CARGO: 'Técnica Administrativa' },
    createdAt: '2025-06-15T09:30:00Z',
    updatedAt: '2025-06-15T09:30:00Z',
  },
  {
    id: 'port-003',
    titulo: 'Portaria de Gratificação - Carlos Souza',
    numeroOficial: '038/2025',
    status: 'FALHA_PROCESSAMENTO',
    autorId: 'user-op-001',
    secretariaId: 'sec-rh',
    setorId: null,
    modeloId: 'modelo-gratificacao',
    pdfUrl: null,
    docxRascunhoUrl: null,
    hashAssinatura: null,
    dadosFormulario: { NOME_SERVIDOR: 'Carlos Souza' },
    createdAt: '2025-06-14T11:00:00Z',
    updatedAt: '2025-06-14T12:00:00Z',
  },
  {
    id: 'port-004',
    titulo: 'Portaria de Licença - Ana Costa',
    numeroOficial: '039/2025',
    status: 'PENDENTE',
    autorId: 'user-op-001',
    secretariaId: 'sec-rh',
    setorId: null,
    modeloId: 'modelo-licenca',
    pdfUrl: 'https://mock.storage/portaria-039.pdf',
    docxRascunhoUrl: null,
    hashAssinatura: null,
    dadosFormulario: { NOME_SERVIDOR: 'Ana Costa' },
    createdAt: '2025-06-13T10:00:00Z',
    updatedAt: '2025-06-13T11:30:00Z',
  },
]

export async function listarPortarias(
  params: ListQueryParams = {}
): Promise<Result<PaginatedResponse<Portaria>>> {
  await mockDelay()
  let lista = [...mockDB.portarias]
  if (params.status) lista = lista.filter((p) => p.status === params.status)
  if (params.secretariaId) lista = lista.filter((p) => p.secretariaId === params.secretariaId)
  if (params.busca)
    lista = lista.filter((p) =>
      p.titulo.toLowerCase().includes(params.busca!.toLowerCase())
    )
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 10
  const total = lista.length
  const data = lista.slice((page - 1) * pageSize, page * pageSize)
  return ok({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function buscarPortaria(id: string): Promise<Result<Portaria>> {
  await mockDelay(300)
  const portaria = mockDB.portarias.find((p) => p.id === id)
  if (!portaria) return err(`Portaria "${id}" não encontrada.`)
  return ok({ ...portaria })
}

export async function criarPortaria(
  payload: CriarPortariaRequest
): Promise<Result<Portaria>> {
  await mockDelay(800)
  const nova: Portaria = {
    id: `port-${Date.now()}`,
    titulo: payload.titulo,
    numeroOficial: null,
    status: 'RASCUNHO',
    autorId: 'user-op-001',
    secretariaId: 'sec-rh',
    setorId: null,
    modeloId: payload.modeloId,
    pdfUrl: null,
    docxRascunhoUrl: `https://mock.storage/rascunho-${Date.now()}.docx`,
    hashAssinatura: null,
    dadosFormulario: payload.dadosFormulario,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  mockDB.portarias.unshift(nova)
  return ok(nova)
}

export async function submeterPortaria(
  payload: SubmeterPortariaRequest
): Promise<Result<Portaria>> {
  await mockDelay(1500)
  const portaria = mockDB.portarias.find((p) => p.id === payload.portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'RASCUNHO') return err('Apenas rascunhos podem ser submetidos.')

  // Simula Numeração Atômica: número gravado ANTES do PDF ser gerado
  const seq = String(Math.floor(Math.random() * 99) + 1).padStart(3, '0')
  portaria.numeroOficial = `${seq}/${new Date().getFullYear()}`
  portaria.status = 'PROCESSANDO'
  portaria.updatedAt = new Date().toISOString()

  // Simula CloudConvert assíncrono (fora da transação atômica)
  setTimeout(() => {
    const p = mockDB.portarias.find((x) => x.id === payload.portariaId)
    if (p) {
      p.status = 'PENDENTE'
      p.pdfUrl = `https://mock.storage/${p.numeroOficial!.replace('/', '-')}.pdf`
      p.updatedAt = new Date().toISOString()
    }
  }, 4000)

  return ok({ ...portaria })
}

export async function tentarNovamente(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(1500)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'FALHA_PROCESSAMENTO')
    return err('Apenas portarias com falha podem ser reprocessadas.')

  // CRÍTICO: NÃO gera novo número. Reutiliza o numeroOficial já existente.
  portaria.status = 'PROCESSANDO'
  portaria.updatedAt = new Date().toISOString()

  setTimeout(() => {
    const p = mockDB.portarias.find((x) => x.id === portariaId)
    if (p) {
      p.status = 'PENDENTE'
      p.pdfUrl = `https://mock.storage/retry-${p.numeroOficial!.replace('/', '-')}.pdf`
      p.updatedAt = new Date().toISOString()
    }
  }, 4000)

  return ok({ ...portaria })
}

export async function aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(500)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'PENDENTE')
    return err('Apenas portarias pendentes podem ser aprovadas.')
  portaria.status = 'APROVADA'
  portaria.updatedAt = new Date().toISOString()
  return ok({ ...portaria })
}

export async function rejeitarPortaria(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(500)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  portaria.status = 'RASCUNHO'
  portaria.updatedAt = new Date().toISOString()
  return ok({ ...portaria })
}

export async function publicarPortaria(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(700)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'APROVADA')
    return err('Apenas portarias aprovadas podem ser publicadas.')
  portaria.status = 'PUBLICADA'
  portaria.hashAssinatura = `sha256-${Date.now()}`
  portaria.updatedAt = new Date().toISOString()
  return ok({ ...portaria })
}

---

// src/services/usuario.service.ts

import type { Usuario, RoleUsuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.usuarios = [
  { id: 'user-admin',    name: 'Admin Geral',          email: 'admin@cataguases.mg.gov.br',     role: 'ADMIN_GERAL', ativo: true,  permissoesExtra: [], secretariaId: null,     setorId: null,      createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-prefeito', name: 'Sr. Prefeito',          email: 'prefeito@cataguases.mg.gov.br',  role: 'PREFEITO',    ativo: true,  permissoesExtra: [], secretariaId: null,     setorId: null,      createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-sec',      name: 'Dra. Secretária de RH', email: 'secretario@cataguases.mg.gov.br',role: 'SECRETARIO',  ativo: true,  permissoesExtra: [], secretariaId: 'sec-rh', setorId: null,      createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-op-001',   name: 'Operador Padrão',       email: 'operador@cataguases.mg.gov.br',  role: 'OPERADOR',    ativo: true,  permissoesExtra: [], secretariaId: 'sec-rh', setorId: 'setor-dp',createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-op-002',   name: 'Operadora Inativa',     email: 'inativa@cataguases.mg.gov.br',   role: 'OPERADOR',    ativo: false, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null,      createdAt: '2025-02-01T00:00:00Z' },
]

export async function listarUsuarios(): Promise<Result<Usuario[]>> {
  await mockDelay()
  return ok([...mockDB.usuarios])
}

export async function atualizarUsuario(
  id: string,
  patch: { role?: RoleUsuario; secretariaId?: string | null; setorId?: string | null; ativo?: boolean; permissoesExtra?: string[] }
): Promise<Result<Usuario>> {
  await mockDelay(500)
  const usuario = mockDB.usuarios.find((u) => u.id === id)
  if (!usuario) return err(`Usuário "${id}" não encontrado.`)
  Object.assign(usuario, patch)
  return ok({ ...usuario })
}

export async function toggleAtivo(id: string): Promise<Result<Usuario>> {
  await mockDelay(300)
  const usuario = mockDB.usuarios.find((u) => u.id === id)
  if (!usuario) return err('Usuário não encontrado.')
  usuario.ativo = !usuario.ativo
  return ok({ ...usuario })
}

---

// src/services/feed.service.ts

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

---

// src/services/modelo.service.ts

import type { ModeloDocumento } from '../types/domain'
import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_MODELOS: ModeloDocumento[] = [
  {
    id: 'modelo-nomeacao', nome: 'Portaria de Nomeação',
    descricao: 'Para nomear servidores em cargos efetivos ou comissionados.',
    secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-nomeacao.docx',
    ativo: true,
    variaveis: [
      { id: 'v1', modeloId: 'modelo-nomeacao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v2', modeloId: 'modelo-nomeacao', chave: 'CARGO', label: 'Cargo', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v3', modeloId: 'modelo-nomeacao', chave: 'DATA_INICIO', label: 'Data de Início', tipo: 'data', opcoes: [], obrigatorio: true, ordem: 3 },
    ],
  },
  {
    id: 'modelo-exoneracao', nome: 'Portaria de Exoneração',
    descricao: 'Para exonerar servidores de cargos comissionados.',
    secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-exoneracao.docx',
    ativo: true,
    variaveis: [
      { id: 'v4', modeloId: 'modelo-exoneracao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v5', modeloId: 'modelo-exoneracao', chave: 'CARGO', label: 'Cargo', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v6', modeloId: 'modelo-exoneracao', chave: 'MOTIVO', label: 'Motivo', tipo: 'select', opcoes: ['A pedido', 'De ofício', 'Por conclusão de mandato'], obrigatorio: true, ordem: 3 },
    ],
  },
  {
    id: 'modelo-gratificacao', nome: 'Portaria de Gratificação',
    descricao: 'Para concessão de gratificações e benefícios.',
    secretariaId: 'sec-rh', docxTemplateUrl: 'https://mock.storage/template-gratificacao.docx',
    ativo: true,
    variaveis: [
      { id: 'v7', modeloId: 'modelo-gratificacao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v8', modeloId: 'modelo-gratificacao', chave: 'PERCENTUAL', label: 'Percentual (%)', tipo: 'numero', opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v9', modeloId: 'modelo-gratificacao', chave: 'JUSTIFICATIVA', label: 'Justificativa', tipo: 'textarea', opcoes: [], obrigatorio: true, ordem: 3 },
    ],
  },
]

export async function listarModelos(): Promise<Result<ModeloDocumento[]>> {
  await mockDelay(400)
  return ok(MOCK_MODELOS.filter((m) => m.ativo))
}

export async function buscarModelo(id: string): Promise<Result<ModeloDocumento>> {
  await mockDelay(200)
  const modelo = MOCK_MODELOS.find((m) => m.id === id)
  if (!modelo) return err(`Modelo "${id}" não encontrado.`)
  return ok(modelo)
}
