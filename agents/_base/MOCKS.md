# agents/_base/MOCKS.md — SERVIÇOS MOCK (CICLO 1)
# Leia junto com: agents/_base/AGENTS.md | agents/_modulos/WIZARD_PORTARIA.md
# IA: Responda SEMPRE em português (pt-BR).
# IMPORTANTE: A interface de cada função é IDÊNCITCA à versão real do Ciclo 2.
# A troca Mock → Real é feita alterando APENAS 1 linha de import no hook.
#
# ALINHAMENTO PENDENTE (Ciclo 2):
#   - ModeloDocumento e ModeloVariavel.chave → renomear para Modelo e campo tag
#     conforme spec em agents/_modulos/GESTAO_MODELOS.md
#   - TipoVariavel: adicionar 'textarea' ao union type em src/types/domain.ts
#   - publicarPortaria (legado) substituída por enviarParaAssinatura + assinarPublicar

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
    hashAssinatura: 'sha256-abc123def456', // Mock: hash fake. No Ciclo 3 o backend gera SHA-256 real.
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
  {
    id: 'port-005',
    titulo: 'Portaria de Redistribuição - Pedro Fonseca',
    numeroOficial: '040/2025',
    status: 'AGUARDANDO_ASSINATURA',
    autorId: 'user-op-001',
    secretariaId: 'sec-rh',
    setorId: null,
    modeloId: 'modelo-nomeacao',
    pdfUrl: 'https://mock.storage/portaria-040-preview.pdf',
    docxRascunhoUrl: 'https://mock.storage/rascunho-port-005.docx',
    hashAssinatura: null,
    dadosFormulario: { NOME_SERVIDOR: 'Pedro Fonseca', CARGO: 'Analista' },
    createdAt: '2025-06-16T08:00:00Z',
    updatedAt: '2025-06-16T10:00:00Z',
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

// APROVADA → AGUARDANDO_ASSINATURA
// Chamado quando o revisor envia o documento ao assinante autorizado (Prefeito/Secretário).
export async function enviarParaAssinatura(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(600)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'APROVADA')
    return err('Apenas portarias aprovadas podem ser enviadas para assinatura.')
  portaria.status = 'AGUARDANDO_ASSINATURA'
  portaria.updatedAt = new Date().toISOString()
  return ok({ ...portaria })
}

// AGUARDANDO_ASSINATURA → PUBLICADA
// O assinante digita a senha e confirma. A portaria é publicada com hash.
// Ciclo 1: senha mockada '123456'. Ciclo 3: Supabase Auth verifica a senha real.
export async function assinarPublicar(
  portariaId: string,
  senha: string
): Promise<Result<Portaria>> {
  await mockDelay(900)
  if (senha !== '123456') return err('Senha incorreta.')
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'AGUARDANDO_ASSINATURA')
    return err('A portaria não está aguardando assinatura.')
  portaria.status = 'PUBLICADA'
  // Mock: hash curto fake. No Ciclo 3 o backend gera SHA-256 real do binário do PDF.
  portaria.hashAssinatura = `mock-sha256-${portariaId}-${Date.now()}`
  portaria.updatedAt = new Date().toISOString()
  return ok({ ...portaria })
}

---

// src/services/usuario.service.ts

import type { Usuario, RoleUsuario } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.usuarios = [
  { id: 'user-admin',    name: 'Admin Geral',          email: 'admin@cataguases.mg.gov.br',     role: 'ADMIN_GERAL', ativo: true,  permissoesExtra: [], secretariaId: null,     setorId: null,       createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-prefeito', name: 'Sr. Prefeito',          email: 'prefeito@cataguases.mg.gov.br',  role: 'PREFEITO',    ativo: true,  permissoesExtra: [], secretariaId: null,     setorId: null,       createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-sec',      name: 'Dra. Secretária de RH', email: 'secretario@cataguases.mg.gov.br',role: 'SECRETARIO',  ativo: true,  permissoesExtra: [], secretariaId: 'sec-rh', setorId: null,       createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-op-001',   name: 'Operador Padrão',       email: 'operador@cataguases.mg.gov.br',  role: 'OPERADOR',    ativo: true,  permissoesExtra: [], secretariaId: 'sec-rh', setorId: 'setor-dp', createdAt: '2025-01-01T00:00:00Z' },
  { id: 'user-op-002',   name: 'Operadora Inativa',     email: 'inativa@cataguases.mg.gov.br',   role: 'OPERADOR',    ativo: false, permissoesExtra: [], secretariaId: 'sec-rh', setorId: null,       createdAt: '2025-02-01T00:00:00Z' },
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
  {
    id: 'f-005', tipoEvento: 'PORTARIA_ENVIADA_ASSINATURA',
    mensagem: 'Portaria 040/2025 enviada para assinatura do Prefeito.',
    portariaId: 'port-005', autorId: 'user-sec',
    secretariaId: 'sec-rh', setorId: null,
    metadata: { numero: '040/2025', titulo: 'Portaria de Redistribuição - Pedro Fonseca' },
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'f-006', tipoEvento: 'PORTARIA_RETRY',
    mensagem: 'Reprocessamento da Portaria 038/2025 iniciado.',
    portariaId: 'port-003', autorId: 'user-op-001',
    secretariaId: 'sec-rh', setorId: null,
    metadata: { numero: '038/2025' },
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
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
// NOTA: ModeloDocumento → Modelo e chave → tag serão alinhados no Ciclo 2.
// Ref: agents/_modulos/GESTAO_MODELOS.md

import type { ModeloDocumento } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_MODELOS: ModeloDocumento[] = [
  {
    id: 'modelo-nomeacao', nome: 'Portaria de Nomeação',
    descricao: 'Para nomear servidores em cargos efetivos ou comissionados.',
    secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-nomeacao.docx',
    ativo: true,
    variaveis: [
      { id: 'v1', modeloId: 'modelo-nomeacao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto',  opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v2', modeloId: 'modelo-nomeacao', chave: 'CARGO',         label: 'Cargo',             tipo: 'texto',  opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v3', modeloId: 'modelo-nomeacao', chave: 'DATA_INICIO',   label: 'Data de Início',     tipo: 'data',   opcoes: [], obrigatorio: true, ordem: 3 },
    ],
  },
  {
    id: 'modelo-exoneracao', nome: 'Portaria de Exoneração',
    descricao: 'Para exonerar servidores de cargos comissionados.',
    secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-exoneracao.docx',
    ativo: true,
    variaveis: [
      { id: 'v4', modeloId: 'modelo-exoneracao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto',  opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v5', modeloId: 'modelo-exoneracao', chave: 'CARGO',         label: 'Cargo',             tipo: 'texto',  opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v6', modeloId: 'modelo-exoneracao', chave: 'MOTIVO',        label: 'Motivo',            tipo: 'select', opcoes: ['A pedido', 'De ofício', 'Por conclusão de mandato'], obrigatorio: true, ordem: 3 },
    ],
  },
  {
    id: 'modelo-gratificacao', nome: 'Portaria de Gratificação',
    descricao: 'Para concessão de gratificações e benefícios.',
    secretariaId: 'sec-rh', docxTemplateUrl: 'https://mock.storage/template-gratificacao.docx',
    ativo: true,
    variaveis: [
      { id: 'v7', modeloId: 'modelo-gratificacao', chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto',    opcoes: [], obrigatorio: true, ordem: 1 },
      { id: 'v8', modeloId: 'modelo-gratificacao', chave: 'PERCENTUAL',    label: 'Percentual (%)',   tipo: 'numero',   opcoes: [], obrigatorio: true, ordem: 2 },
      { id: 'v9', modeloId: 'modelo-gratificacao', chave: 'JUSTIFICATIVA', label: 'Justificativa',    tipo: 'textarea', opcoes: [], obrigatorio: true, ordem: 3 },
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

---

// src/services/assinatura.service.ts
// Gerencia assinatura em lote (seleção múltipla na listagem).
// No Ciclo 1: simula. No Ciclo 3: chama PATCH /api/portarias/[id]/assinar.

import type { Portaria } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'
import { assinarPublicar } from './portaria.service'

export interface AssinaturaLoteResult {
  sucesso: string[]  // IDs assinados com sucesso
  falha:   string[]  // IDs que falharam (senha ok, mas status invalido ou nao encontrado)
}

export async function assinarLote(
  portariaIds: string[],
  senha: string
): Promise<Result<AssinaturaLoteResult>> {
  if (senha !== '123456') return err('Senha incorreta.')
  const resultado: AssinaturaLoteResult = { sucesso: [], falha: [] }
  for (const id of portariaIds) {
    const res = await assinarPublicar(id, senha)
    if (res.ok) resultado.sucesso.push(id)
    else resultado.falha.push(id)
  }
  return ok(resultado)
}

---

// src/services/validar.service.ts
// Validação pública de documentos — SEM autenticação.
// Simula GET /api/validar/[hash] do Ciclo 3.
// Qualquer cidadão pode verificar a autenticidade de um documento publicado.

import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export interface ValidacaoPublicaResult {
  titulo:        string
  numeroOficial: string
  assinadoEm:    string
  pdfUrl:        string
  assinante:     string  // No Ciclo 3: JOIN com usuarios
  secretaria:    string  // No Ciclo 3: JOIN com secretarias
  hashSHA256:    string
}

export async function validarDocumento(
  hash: string
): Promise<Result<ValidacaoPublicaResult>> {
  await mockDelay(500)
  const portaria = mockDB.portarias.find(
    (p) => p.hashAssinatura === hash && p.status === 'PUBLICADA'
  )
  if (!portaria) return err('Documento não encontrado. Verifique o código informado.')
  return ok({
    titulo:        portaria.titulo,
    numeroOficial: portaria.numeroOficial ?? '',
    assinadoEm:    portaria.updatedAt,
    pdfUrl:        portaria.pdfUrl ?? '',
    assinante:     'Sr. Prefeito Municipal',
    secretaria:    'Secretaria Municipal de Administração',
    hashSHA256:    hash,
  })
}
