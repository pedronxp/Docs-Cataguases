# AGENTS.md — DOC'S CATAGUASES (v10.0)
# Stack: React + Vite | Next.js App Router | Supabase
# Arquitetura: Clean Arch + DDD + CQRS + Frontend-First + SSOT + GovTech + CASL ABAC
# Leia também: MOCKS.md (código completo dos serviços mock)

---

IDENTIDADE: Você é um Arquiteto de Software Sênior GovTech operando como agente autônomo nesta IDE. Sua missão é construir o Doc's Cataguases — plataforma de gestão documental, numeração oficial e redação para a Prefeitura de Cataguases/MG.

---

VERSÕES FIXAS — não atualize sem instrução explícita:
- @tanstack/react-router: ^1.114.0
- @tanstack/react-query: ^5.0.0
- @casl/ability: ^6.7.3
- @casl/react: ^4.0.0
- zustand: ^5.0.3
- zod: ^3.23.0
- react-hook-form: ^7.54.0
- shadcn/ui: npx shadcn@latest (sempre latest)
- tailwindcss: ^3.4.0
- vite: ^6.0.0

---

CONTRATO DE COMPORTAMENTO — NUNCA viole estas regras:

| # | Regra | Motivo |
|---|-------|--------|
| 1 | NUNCA use `any` em TypeScript. Use `unknown` + type guards. | Type-safety total |
| 2 | NUNCA use `throw` solto. Use Result<T, E> para erros esperados. | Fluxo previsível |
| 3 | NUNCA inicie o Backend antes do Frontend estar visualmente aprovado. | Frontend-First |
| 4 | NUNCA misture lógica de domínio com lógica de UI. Serviços ficam em src/services/. | Separação de concerns |
| 5 | NUNCA chame ability.can() só no Frontend. O Backend SEMPRE valida independente. | Defense in depth |
| 6 | NUNCA faça hard-code de role === 'X'. Use CASL ability.can('ação', 'Sujeito'). | ABAC puro |
| 7 | NUNCA edite cabeçalhos ou imagens no DOCX via API. Só substitua variáveis de texto. | SSOT Word |
| 8 | NUNCA gere novo número para portaria em FALHA_PROCESSAMENTO. Reaproveite o existente. | Zero buracos na numeração |
| 9 | NUNCA use console.log em produção. Use o logger estruturado src/lib/logger.ts. | Observabilidade |
| 10 | NUNCA commite .env. Sempre commite .env.example com as chaves, sem valores. | Segurança |

---

NAMING CONVENTIONS:

Componentes React:   PascalCase  → PortariaDataTable.tsx
Hooks customizados:  camelCase   → usePortariaList.ts
Serviços:            camelCase   → portaria.service.ts
Tipos de domínio:    PascalCase  → Portaria, Usuario, FeedAtividade
Constantes globais:  SCREAMING   → STATUS_PORTARIA, ROLES
Routes TanStack:     kebab-case  → portarias.$id.tsx

---

ESTRUTURA OBRIGATÓRIA DE PASTAS:

docs-cataguases/
├── apps/
│   ├── web/                           ← Vite + React (Frontend)
│   │   ├── src/
│   │   │   ├── routes/                ← TanStack Router file-based
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── _auth/
│   │   │   │   │   └── login.tsx
│   │   │   │   └── _sistema/
│   │   │   │       ├── dashboard.tsx
│   │   │   │       ├── administrativo/
│   │   │   │       │   └── portarias/
│   │   │   │       │       ├── index.tsx
│   │   │   │       │       ├── novo.tsx
│   │   │   │       │       ├── revisao.$id.tsx
│   │   │   │       │       └── $id.tsx
│   │   │   │       └── admin/
│   │   │   │           ├── modelos.tsx
│   │   │   │           ├── gestao.tsx
│   │   │   │           ├── fluxo-numeracao.tsx
│   │   │   │           ├── variaveis-sistema.tsx
│   │   │   │           ├── analytics.tsx
│   │   │   │           └── usuarios.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/                ← Shadcn/UI (NUNCA modifique estes arquivos)
│   │   │   │   ├── shared/            ← Componentes reutilizáveis do projeto
│   │   │   │   │   ├── PageLayout.tsx       ← USE COMO BASE PARA TODAS AS TELAS
│   │   │   │   │   ├── AppSidebar.tsx
│   │   │   │   │   ├── AppHeader.tsx
│   │   │   │   │   ├── StatusBadge.tsx
│   │   │   │   │   └── DataTableSkeleton.tsx
│   │   │   │   └── features/
│   │   │   │       ├── portaria/
│   │   │   │       ├── usuario/
│   │   │   │       └── feed/
│   │   │   ├── services/              ← Camada de API (Mock → Real, mesma interface)
│   │   │   ├── store/
│   │   │   │   └── auth.store.ts
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── ability.ts
│   │   │   │   ├── result.ts
│   │   │   │   ├── logger.ts
│   │   │   │   ├── queryClient.ts
│   │   │   │   └── utils.ts
│   │   │   ├── types/
│   │   │   │   ├── domain.ts
│   │   │   │   ├── api.ts
│   │   │   │   └── permissions.ts
│   │   │   └── validators/
│   │   │       ├── portaria.schema.ts
│   │   │       └── usuario.schema.ts
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── api/                           ← Next.js App Router (Backend — Ciclo 2+)
│       ├── src/app/api/
│       └── src/lib/
│           ├── prisma.ts
│           ├── auth.ts
│           └── abac.ts
├── .env.example
├── AGENTS.md                          ← este arquivo
└── MOCKS.md                           ← código dos serviços mock

---

STATE MACHINE DO DOCUMENTO — NUNCA pule estados nem faça transições inválidas:

RASCUNHO (numeroOficial: null)
  → [usuário clica Submeter]
PROCESSANDO (numeroOficial: "X" — gravado atomicamente ANTES do PDF)
  → [CloudConvert OK]     → PENDENTE (pdfUrl preenchida)
  → [CloudConvert falha]  → FALHA_PROCESSAMENTO (reaproveita número, nunca gera novo)
    → [Tentar Novamente]  → PROCESSANDO (mesmo número, zero buracos)
PENDENTE
  → [Gestor aprova]   → APROVADA
  → [Gestor rejeita]  → RASCUNHO
APROVADA
  → [Prefeito assina] → PUBLICADA (IMUTÁVEL — nenhum campo editável jamais)

---

TIPOS TYPESCRIPT COMPLETOS:

// src/types/domain.ts

export const STATUS_PORTARIA = {
  RASCUNHO: 'RASCUNHO',
  PROCESSANDO: 'PROCESSANDO',
  PENDENTE: 'PENDENTE',
  APROVADA: 'APROVADA',
  PUBLICADA: 'PUBLICADA',
  FALHA_PROCESSAMENTO: 'FALHA_PROCESSAMENTO',
} as const
export type StatusPortaria = (typeof STATUS_PORTARIA)[keyof typeof STATUS_PORTARIA]

export const ROLES = {
  ADMIN_GERAL: 'ADMIN_GERAL',
  PREFEITO: 'PREFEITO',
  SECRETARIO: 'SECRETARIO',
  GESTOR_SETOR: 'GESTOR_SETOR',
  OPERADOR: 'OPERADOR',
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
  pdfUrl: string | null; docxRascunhoUrl: string | null; hashAssinatura: string | null
  dadosFormulario: Record<string, string>
  autor?: Pick<Usuario, 'id' | 'name' | 'email'>
  secretaria?: Secretaria; createdAt: string; updatedAt: string
}

export interface ModeloDocumento {
  id: string; nome: string; descricao: string; secretariaId: string | null
  docxTemplateUrl: string; variaveis: ModeloVariavel[]; ativo: boolean
}

export interface ModeloVariavel {
  id: string; modeloId: string; chave: string; label: string
  tipo: 'texto' | 'data' | 'numero' | 'select' | 'textarea'
  opcoes: string[]; obrigatorio: boolean; ordem: number
}

export interface VariavelSistema {
  id: string; chave: string; valor: string; descricao: string
  resolvidaAutomaticamente: boolean
}

export interface LivroNumeracao {
  id: string; secretariaId: string; setorId: string | null
  ano: number; proximoNumero: number; formato: string
  secretaria?: Pick<Secretaria, 'id' | 'nome' | 'sigla'>
}

export interface FeedAtividade {
  id: string; tipoEvento: TipoEventoFeed; mensagem: string
  portariaId: string; autorId: string; secretariaId: string; setorId: string | null
  metadata: Record<string, string>
  autor?: Pick<Usuario, 'id' | 'name'>
  portaria?: Pick<Portaria, 'id' | 'titulo' | 'numeroOficial'>
  createdAt: string
}

---

// src/types/api.ts

import type { StatusPortaria } from './domain'

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { token: string; usuario: import('./domain').Usuario }

export interface CriarPortariaRequest {
  titulo: string; modeloId: string; dadosFormulario: Record<string, string>
}
export interface SubmeterPortariaRequest { portariaId: string; docxEditadoBase64?: string }
export interface AprovarPortariaRequest { portariaId: string; observacao?: string }
export interface PublicarPortariaRequest { portariaId: string; hashAssinatura: string }

export interface PaginatedResponse<T> {
  data: T[]; total: number; page: number; pageSize: number; totalPages: number
}
export interface ListQueryParams {
  page?: number; pageSize?: number; busca?: string; status?: StatusPortaria
  secretariaId?: string; setorId?: string; dataInicio?: string; dataFim?: string
}

---

// src/lib/result.ts

export type Ok<T> = { readonly success: true; readonly data: T }
export type Err<E = string> = { readonly success: false; readonly error: E }
export type Result<T, E = string> = Ok<T> | Err<E>
export const ok = <T>(data: T): Ok<T> => ({ success: true, data })
export const err = <E = string>(error: E): Err<E> => ({ success: false, error })
export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.success
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.success

---

// src/lib/ability.ts

import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'
import { createContext } from 'react'
import type { Usuario } from '@/types/domain'

type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
               'aprovar' | 'rejeitar' | 'assinar' | 'publicar' | 'gerenciar'
type Subjects = 'Portaria' | 'Usuario' | 'Modelo' | 'Secretaria' | 'Setor' |
                'LivroNumeracao' | 'VariavelSistema' | 'FeedAtividade' | 'Analytics' | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>
export const AbilityContext = createContext<AppAbility>(null!)

export function buildAbility(user: Usuario): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  if (user.role === 'ADMIN_GERAL') { can('gerenciar', 'all'); return build() }

  if (user.role === 'PREFEITO') {
    can('ler', 'all')
    can('assinar', 'Portaria')
    can('publicar', 'Portaria')
    return build()
  }

  if (user.role === 'SECRETARIO') {
    can('ler', 'Portaria', { secretariaId: user.secretariaId! })
    can('aprovar', 'Portaria', { secretariaId: user.secretariaId! })
    can('rejeitar', 'Portaria', { secretariaId: user.secretariaId! })
    can('ler', 'FeedAtividade', { secretariaId: user.secretariaId! })
  }

  if (user.role === 'GESTOR_SETOR') {
    can('ler', 'Portaria', { setorId: user.setorId! })
    can('editar', 'Portaria', { setorId: user.setorId!, status: 'RASCUNHO' })
    can('aprovar', 'Portaria', { setorId: user.setorId! })
  }

  if (user.role === 'OPERADOR') {
    can('criar', 'Portaria')
    can('ler', 'Portaria', { autorId: user.id })
    can('editar', 'Portaria', { autorId: user.id, status: 'RASCUNHO' })
    can('submeter', 'Portaria', { autorId: user.id })
    cannot('deletar', 'Portaria')
    cannot('publicar', 'Portaria')
  }

  // Permissões granulares dinâmicas — formato no banco: "deletar:Portaria"
  for (const permissao of user.permissoesExtra) {
    const parts = permissao.split(':')
    if (parts.length === 2) {
      const [action, subject] = parts as [Actions, Subjects]
      can(action, subject)
    }
  }

  return build()
}

---

// src/store/auth.store.ts

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Usuario } from '@/types/domain'
import { buildAbility, type AppAbility } from '@/lib/ability'

interface AuthState {
  usuario: Usuario | null; ability: AppAbility | null
  token: string | null; isAuthenticated: boolean
  setSession: (usuario: Usuario, token: string) => void
  clearSession: () => void
  refreshAbility: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null, ability: null, token: null, isAuthenticated: false,
      setSession: (usuario, token) =>
        set({ usuario, token, ability: buildAbility(usuario), isAuthenticated: true }),
      clearSession: () =>
        set({ usuario: null, token: null, ability: null, isAuthenticated: false }),
      refreshAbility: () => {
        const { usuario } = get()
        if (usuario) set({ ability: buildAbility(usuario) })
      },
    }),
    {
      name: 'docs-cataguases-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ usuario: s.usuario, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
)

---

// src/validators/portaria.schema.ts

import { z } from 'zod'

export const criarPortariaSchema = z.object({
  titulo: z.string().min(10, 'Título deve ter no mínimo 10 caracteres').max(200, 'Título muito longo'),
  modeloId: z.string().min(1, 'Selecione um modelo de documento'),
  dadosFormulario: z.record(z.string(), z.string()),
})
export type CriarPortariaForm = z.infer<typeof criarPortariaSchema>

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
export type LoginForm = z.infer<typeof loginSchema>

---

COMPONENTE DE REFERÊNCIA — use como template para TODAS as telas:

// src/components/shared/PageLayout.tsx
// TODA tela do sistema deve usar este componente como wrapper.

import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

interface PageLayoutProps {
  title: string
  actions?: React.ReactNode   // Botões no canto direito do header
  children: React.ReactNode
}

export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// Exemplo de uso em qualquer tela:
//
// export default function PortariasPage() {
//   return (
//     <PageLayout
//       title="Portarias"
//       actions={
//         <Can I="criar" a="Portaria" ability={ability}>
//           <Button size="sm">Nova Portaria</Button>
//         </Can>
//       }
//     >
//       {isLoading ? <DataTableSkeleton /> : <PortariaDataTable data={portarias} />}
//     </PageLayout>
//   )
// }

---

// src/components/shared/AppSidebar.tsx
// Itens do menu filtrados por ability.can() — nunca exiba item que o usuário não pode usar.

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { Link } from '@tanstack/react-router'
import { LayoutDashboard, FileText, Users, Settings, BookOpen, BarChart2 } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/_sistema/dashboard',                           label: 'Dashboard',          icon: LayoutDashboard, action: 'ler',      subject: 'FeedAtividade' },
  { to: '/_sistema/administrativo/portarias',            label: 'Portarias',          icon: FileText,        action: 'ler',      subject: 'Portaria' },
  { to: '/_sistema/admin/modelos',                       label: 'Modelos',            icon: BookOpen,        action: 'gerenciar', subject: 'Modelo' },
  { to: '/_sistema/admin/usuarios',                      label: 'Usuários',           icon: Users,           action: 'gerenciar', subject: 'Usuario' },
  { to: '/_sistema/admin/fluxo-numeracao',               label: 'Numeração',          icon: Settings,        action: 'gerenciar', subject: 'LivroNumeracao' },
  { to: '/_sistema/admin/analytics',                     label: 'Analytics',          icon: BarChart2,       action: 'ler',      subject: 'Analytics' },
] as const

export function AppSidebar() {
  const ability = useAbility(AbilityContext)
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        <span className="font-bold text-gov-blue text-sm">Doc's Cataguases</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) =>
          ability.can(item.action, item.subject) ? (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              activeProps={{ className: 'bg-slate-100 text-gov-blue font-medium' }}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ) : null
        )}
      </nav>
    </aside>
  )
}

---

// src/components/shared/StatusBadge.tsx

import { Badge } from '@/components/ui/badge'
import type { StatusPortaria } from '@/types/domain'

const STATUS_CONFIG: Record<StatusPortaria, { label: string; className: string }> = {
  RASCUNHO:            { label: 'Rascunho',           className: 'bg-slate-100 text-slate-700 border-slate-300' },
  PROCESSANDO:         { label: 'Processando…',       className: 'bg-blue-100 text-blue-700 border-blue-300' },
  PENDENTE:            { label: 'Aguardando Revisão', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  APROVADA:            { label: 'Aprovada',           className: 'bg-green-100 text-green-700 border-green-300' },
  PUBLICADA:           { label: 'Publicada',          className: 'bg-green-700 text-white border-green-700' },
  FALHA_PROCESSAMENTO: { label: 'Falha no PDF',       className: 'bg-red-100 text-red-700 border-red-300' },
}

export function StatusBadge({ status }: { status: StatusPortaria }) {
  const { label, className } = STATUS_CONFIG[status]
  return <Badge className={className} variant="outline">{label}</Badge>
}

---

// src/components/shared/DataTableSkeleton.tsx

import { Skeleton } from '@/components/ui/skeleton'

export function DataTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

---

PADRÃO OBRIGATÓRIO DE TOAST — use após toda chamada de serviço:

const { toast } = useToast()
const result = await submeterPortaria({ portariaId: id })
if (!result.success) {
  toast({ title: 'Erro', description: result.error, variant: 'destructive' })
  return
}
toast({ title: 'Portaria submetida!', description: `Número ${result.data.numeroOficial} alocado.` })

---

PADRÃO OBRIGATÓRIO DE CASL NO JSX — nunca use if role === 'X':

import { Can } from '@casl/react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'

const ability = useAbility(AbilityContext)

<Can I="publicar" a="Portaria" ability={ability}>
  <Button>Assinar e Publicar</Button>
</Can>

---

CORE SCHEMA PRISMA:

datasource db { provider = "postgresql"; url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }

model User {
  id              String   @id @default(cuid())
  name            String
  email           String   @unique
  password        String
  role            String   @default("OPERADOR")
  ativo           Boolean  @default(true)
  permissoesExtra String[] @default([])
  secretariaId    String?
  setorId         String?
}

model LivroNumeracao {
  id            String  @id @default(cuid())
  secretariaId  String
  setorId       String?
  ano           Int
  proximoNumero Int     @default(1)
  formato       String
  @@unique([secretariaId, setorId, ano])
}

model Portaria {
  id              String   @id @default(cuid())
  titulo          String
  numeroOficial   String?
  status          String   @default("RASCUNHO")
  autorId         String
  secretariaId    String
  setorId         String?
  modeloId        String
  pdfUrl          String?
  docxRascunhoUrl String?
  hashAssinatura  String?
  dadosFormulario Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model FeedAtividade {
  id           String   @id @default(cuid())
  tipoEvento   String
  mensagem     String   @db.Text
  portariaId   String
  autorId      String
  secretariaId String
  setorId      String?
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now())
}

model ModeloDocumento {
  id              String           @id @default(cuid())
  nome            String
  descricao       String
  secretariaId    String?
  docxTemplateUrl String
  ativo           Boolean          @default(true)
  variaveis       ModeloVariavel[]
}

model ModeloVariavel {
  id          String          @id @default(cuid())
  modeloId    String
  modelo      ModeloDocumento @relation(fields: [modeloId], references: [id])
  chave       String
  label       String
  tipo        String          @default("texto")
  opcoes      String[]        @default([])
  obrigatorio Boolean         @default(true)
  ordem       Int             @default(0)
}

model VariavelSistema {
  id                       String  @id @default(cuid())
  chave                    String  @unique
  valor                    String
  descricao                String
  resolvidaAutomaticamente Boolean @default(false)
}

---

VARIÁVEIS DE AMBIENTE — .env.example (COMMITAR este arquivo, nunca o .env real):

VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_ENABLE_MOCKS=true
DATABASE_URL=postgresql://postgres:[SENHA]@db.SEU_PROJETO.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[SENHA]@db.SEU_PROJETO.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
NEXTAUTH_SECRET=gere_com_openssl_rand_base64_32
CLOUDCONVERT_API_KEY=sua_api_key_cloudconvert
JWT_EXPIRES_IN=8h

---

MAPEAMENTO DE ROTAS FRONTEND:

/_auth/login                                   → Login
/_sistema/dashboard                            → Timeline FeedAtividade + Cards resumo
/_sistema/administrativo/portarias             → DataTable de Portarias
/_sistema/administrativo/portarias/novo        → Seleção de Modelo + Formulário Dinâmico
/_sistema/administrativo/portarias/revisao/$id → Baixar DOCX rascunho + Upload DOCX editado
/_sistema/administrativo/portarias/$id         → Preview PDF + Aprovar / Rejeitar / Publicar
/_sistema/admin/modelos                        → Lista e Upload de .docx + mapeamento de tags
/_sistema/admin/gestao                         → Setup Prefeito Ativo e Secretários
/_sistema/admin/fluxo-numeracao                → Painel Panorâmico de LivroNumeracao
/_sistema/admin/variaveis-sistema              → No-Code para criar chaves SYS_
/_sistema/admin/analytics                      → Dashboards Recharts (Prisma.groupBy)
/_sistema/admin/usuarios                       → Gestão de Usuários + Permissões Granulares CASL

ENDPOINTS BACKEND (Ciclo 2+):

POST   /api/auth/login              → Autentica e gera JWT
GET    /api/portarias               → Lista portarias filtradas por ABAC
POST   /api/portarias               → Transação Atômica (LivroNumeracao increment) + CloudConvert async
GET    /api/portarias/[id]          → Busca portaria por id
PATCH  /api/portarias/[id]/aprovar  → Altera status + dispara FeedAtividade
PATCH  /api/portarias/[id]/rejeitar → Volta para RASCUNHO
PATCH  /api/portarias/[id]/publicar → Grava hashAssinatura + PUBLICADA
PATCH  /api/portarias/[id]/retry    → Reprocessa sem gerar novo número
GET    /api/feed                    → FeedAtividade filtrado por ABAC
PATCH  /api/admin/users/[id]        → Atualiza status, lotação, role, permissoesExtra

---

CRITÉRIOS DE ACEITAÇÃO POR TELA:

TELA LOGIN:
- Form react-hook-form + zodResolver(loginSchema)
- Botão com estado "Entrando…" durante loading
- Shake animation se credenciais inválidas
- Redireciona para /_sistema/dashboard após sucesso
- Mock: admin@cataguases.mg.gov.br + 123456 → ADMIN_GERAL
- Mock: prefeito@cataguases.mg.gov.br + 123456 → PREFEITO
- Mock: secretario@cataguases.mg.gov.br + 123456 → SECRETARIO
- Mock: operador@cataguases.mg.gov.br + 123456 → OPERADOR

TELA DASHBOARD:
- Sidebar AppSidebar com itens filtrados por ability.can()
- Cards de resumo: total RASCUNHO, PENDENTE, PUBLICADA
- Feed de atividades com avatar, ícone de evento e tempo relativo via date-fns
- Skeleton DataTableSkeleton durante carregamento
- Botão "Nova Portaria" só visível para can('criar', 'Portaria')

TELA LISTA DE PORTARIAS:
- DataTable colunas: Número, Título, StatusBadge, Data, Ações
- Filtro por texto e por status via Select
- Paginação 10 por página
- Linha FALHA_PROCESSAMENTO com fundo bg-red-50
- Botão "Tentar Novamente" inline na linha com falha
- DataTableSkeleton de 5 linhas no carregamento

TELA NOVO DOCUMENTO:
- Passo 1: cards clicáveis de seleção de modelo (ModeloDocumento[])
- Passo 2: formulário dinâmico gerado de ModeloVariavel[] do modelo selecionado
- Tag {{SYS_NUMERO_PORTARIA}} exibe [RASCUNHO] em destaque no preview
- Validação zodResolver(criarPortariaSchema) antes de submeter
- Chama criarPortaria() → redireciona para /revisao/$id

TELA REVISÃO:
- Exibe status atual da portaria
- Botão "Baixar Rascunho .docx" (anchor href para docxRascunhoUrl)
- Área de Upload: input aceita apenas .docx, rejeita outros formatos, máximo 10MB
- Botão "Submeter Documento Oficial" chama submeterPortaria()
- Após submeter: status muda para PROCESSANDO, botão fica disabled
- Polling a cada 5s via setInterval até status === PENDENTE
- Ao detectar PENDENTE: cancela polling e redireciona para /$id

TELA VISUALIZAÇÃO/APROVAÇÃO:
- Preview PDF via <iframe src={pdfUrl} /> com fallback "PDF em processamento"
- Número oficial exibido em badge destacado no topo
- Botão "Aprovar" visível para can('aprovar', 'Portaria')
- Botão "Rejeitar" abre Dialog com campo textarea de observação
- Botão "Assinar e Publicar" visível para can('publicar', 'Portaria')
- Status PUBLICADA: todos os botões de ação somem, exibe hashAssinatura

TELA GESTÃO DE USUÁRIOS:
- Tabela: Nome, E-mail, Role, Secretaria, Status (ativo/inativo)
- Toggle switch Ativar/Desativar
- Modal de edição: Role (Select), Secretaria (Select), Setor (Select)
- Seção "Permissões Extras" com checkboxes:
    deletar:Portaria | aprovar:Portaria | publicar:Portaria | gerenciar:Modelo
- Ao salvar: atualiza permissoesExtra[] no mockDB + chama refreshAbility()
- Apenas ADMIN_GERAL acessa esta tela (redirecionar outros para dashboard)

---

COMANDOS DE INSTALAÇÃO (execute na ordem exata):

npm create vite@latest apps/web -- --template react-ts
cd apps/web
npm install @tanstack/react-router@^1.114.0 @tanstack/react-query@^5.0.0 @tanstack/react-query-devtools @casl/ability@^6.7.3 @casl/react@^4.0.0 zustand@^5.0.3 react-hook-form@^7.54.0 @hookform/resolvers zod@^3.23.0 axios date-fns lucide-react clsx tailwind-merge
npm install -D @tanstack/router-plugin @tanstack/router-devtools tailwindcss@^3.4.0 postcss autoprefixer @types/node typescript-eslint eslint eslint-plugin-react-hooks prettier prettier-plugin-tailwindcss
npx tailwindcss init -p
npx shadcn@latest init
npx shadcn@latest add button input label card table badge avatar dialog dropdown-menu sidebar sheet skeleton toast form select checkbox tabs separator progress switch textarea

---

ROADMAP — execute nesta ordem exata, sem pular etapas:

1.  Configurar vite.config.ts + tailwind.config.ts + tsconfig.json com path alias @/
2.  Criar src/types/domain.ts
3.  Criar src/types/api.ts
4.  Criar src/lib/result.ts
5.  Criar src/lib/ability.ts com AbilityContext exportado
6.  Criar src/store/auth.store.ts
7.  Criar src/validators/portaria.schema.ts
8.  Criar src/components/shared/PageLayout.tsx
9.  Criar src/components/shared/AppSidebar.tsx
10. Criar src/components/shared/AppHeader.tsx
11. Criar src/components/shared/StatusBadge.tsx
12. Criar src/components/shared/DataTableSkeleton.tsx
13. Criar src/routes/__root.tsx com auth guard
14. TELA: Login (/_auth/login)
15. TELA: Dashboard (/_sistema/dashboard)
16. TELA: Lista de Portarias (/_sistema/administrativo/portarias)
17. TELA: Novo Documento (/_sistema/administrativo/portarias/novo)
18. TELA: Revisão (/_sistema/administrativo/portarias/revisao/$id)
19. TELA: Visualização/Aprovação (/_sistema/administrativo/portarias/$id)
20. TELA: Gestão de Usuários (/_sistema/admin/usuarios)

CRITÉRIO DE CONCLUSÃO DO CICLO 1:
Fluxo RASCUNHO → PUBLICADA funciona 100% com mocks.
Permissões CASL ocultam/mostram ações corretamente para cada role.
Zero erros no npx tsc --noEmit.
SÓ INICIE O CICLO 2 APÓS APROVAÇÃO VISUAL EXPLÍCITA DO CICLO 1.

---

CHECKLIST DE QUALIDADE — verificar antes de cada commit:

- Zero `any` no TypeScript (rodar npx tsc --noEmit sem erros)
- Todos os erros tratados com Result<T,E>, nunca throw solto
- Todo componente que busca dados tem loading state (DataTableSkeleton ou Skeleton)
- Todo componente que busca dados tem error state com mensagem amigável
- Nenhuma lógica de negócio dentro de componentes React
- Permissões CASL verificadas com <Can> antes de renderizar ações sensíveis
- .env no .gitignore, apenas .env.example commitado

---

INSTRUÇÃO INICIAL:
Leia AGENTS.md e MOCKS.md por completo. Confirme entendimento dos 4 pontos críticos:
1. Frontend-First Mock-Driven: zero linhas de backend antes das telas aprovadas.
2. Numeração Atômica: o número é gerado UMA vez e reutilizado em falhas, nunca recriado.
3. Result Pattern: nenhum throw sem captura em funções de serviço.
4. CASL puro: nenhum if role === 'X' em nenhum lugar do código.
Execute os comandos de instalação e inicie pelo item 1 do Roadmap.
Após cada tela concluída, liste os critérios de aceitação com ✅ ou ❌.
