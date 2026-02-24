# AGENTS_CICLO2.md — BACKEND REAL (CICLO 2)
# Leia junto com AGENTS.md e todos os complementos.
# NAO INICIE ESTE CICLO ANTES DA APROVACAO VISUAL COMPLETA DO CICLO 1.
# Este arquivo substitui os mocks por APIs reais usando Next.js App Router + Prisma + Supabase.

---

## PREREQUISITO ABSOLUTO

Antes de executar qualquer linha deste arquivo, confirme:
  [ ] Todas as 14 telas do Ciclo 1 estão aprovadas visualmente
  [ ] O fluxo RASCUNHO → PUBLICADA funciona 100% com mocks
  [ ] Permissões CASL ocultam e mostram acoes corretamente para cada role
  [ ] Zero erros no npx tsc --noEmit
  [ ] AGENTS.md, MOCKS.md e todos os complementos foram respeitados

Se qualquer item acima estiver pendente, PARE e conclua o Ciclo 1 primeiro.

---

## STACK DO CICLO 2

Next.js App Router    → Backend API (apps/api)
Prisma ORM            → Acesso ao banco de dados
Supabase PostgreSQL   → Banco de dados principal
Supabase Auth         → Autenticacao e sessoes
Supabase Storage      → Armazenamento de PDFs e DOCXs
CloudConvert API v2   → Conversao DOCX → PDF
Jose (JWT)            → Validacao de tokens nas rotas
Zod                   → Validacao de payloads nas rotas
Bcryptjs              → Hash de senhas

---

## VERSOES FIXAS — NAO ATUALIZE SEM INSTRUCAO EXPLICITA

@prisma/client:              ^5.22.0
prisma:                      ^5.22.0
@supabase/supabase-js:       ^2.46.0
cloudconvert:                ^4.0.0
jose:                        ^5.9.0
bcryptjs:                    ^2.4.3
zod:                         ^3.23.0

---

## VARIAVEIS DE AMBIENTE — .env (NUNCA commitar, apenas .env.example)

DATABASE_URL=postgresql://postgres:[SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[SENHA]@db.[SEU_PROJETO].supabase.co:5432/postgres
SUPABASE_URL=https://[SEU_PROJETO].supabase.co
SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
CLOUDCONVERT_API_KEY=sua_api_key_cloudconvert
JWT_SECRET=gere_com_openssl_rand_base64_64
JWT_EXPIRES_IN=8h
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development

---

## ESTRUTURA DE PASTAS DO BACKEND (apps/api)

apps/api/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                        <- seed com dados iniciais
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── health/
│   │       │   └── route.ts           <- GET /api/health (publico)
│   │       ├── health/detailed/
│   │       │   └── route.ts           <- GET /api/health/detailed (admin)
│   │       ├── auth/
│   │       │   └── login/
│   │       │       └── route.ts       <- POST /api/auth/login
│   │       ├── portarias/
│   │       │   ├── route.ts           <- GET lista, POST criar
│   │       │   └── [id]/
│   │       │       ├── route.ts       <- GET buscar
│   │       │       ├── aprovar/route.ts
│   │       │       ├── rejeitar/route.ts
│   │       │       ├── enviar-assinatura/route.ts
│   │       │       ├── assinar/route.ts
│   │       │       └── retry/route.ts
│   │       ├── acervo/
│   │       │   └── route.ts           <- GET /api/acervo
│   │       ├── feed/
│   │       │   └── route.ts           <- GET /api/feed
│   │       └── admin/
│   │           ├── users/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           └── variaveis/
│   │               └── route.ts
│   └── lib/
│       ├── prisma.ts                  <- instancia singleton do Prisma
│       ├── supabase.ts                <- instancia servidor do Supabase
│       ├── auth.ts                    <- validar JWT + extrair usuario
│       ├── abac.ts                    <- buildAbility no servidor
│       ├── cloudconvert.ts            <- wrapper CloudConvert
│       └── logger.ts                  <- logger estruturado (pino)

---

## PRISMA SCHEMA COMPLETO

Crie o arquivo prisma/schema.prisma com este conteudo:

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

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
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Secretaria {
  id        String   @id @default(cuid())
  nome      String
  sigla     String   @unique
  cor       String   @default("#1351B4")
  ativa     Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Setor {
  id           String   @id @default(cuid())
  nome         String
  secretariaId String
  ativo        Boolean  @default(true)
  createdAt    DateTime @default(now())
}

model LivroNumeracao {
  id            String  @id @default(cuid())
  tipoDocumento String  @default("PORTARIA")
  secretariaId  String
  setorId       String?
  ano           Int
  proximoNumero Int     @default(1)
  formato       String  @default("NNN/AAAA")
  @@unique([tipoDocumento, secretariaId, setorId, ano])
}

model Portaria {
  id                      String    @id @default(cuid())
  titulo                  String
  numeroOficial           String?
  status                  String    @default("RASCUNHO")
  autorId                 String
  secretariaId            String
  setorId                 String?
  modeloId                String
  pdfUrl                  String?
  docxRascunhoUrl         String?
  hashAssinatura          String?
  assinanteId             String?
  enviadoParaAssinaturaEm DateTime?
  assinadoEm              DateTime?
  dadosFormulario         Json      @default("{}")
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
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
  tipoDocumento   String           @default("PORTARIA")
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

model GestaoMunicipal {
  id            String   @id @default(cuid())
  nomePrefeito  String
  periodoInicio DateTime
  periodoFim    DateTime
  decretoPosse  String
  ativa         Boolean  @default(true)
  createdAt     DateTime @default(now())
}

---

## LIBS DO SERVIDOR

--- src/lib/prisma.ts ---

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}


--- src/lib/supabase.ts ---

import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)


--- src/lib/auth.ts ---

import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export interface UsuarioAutenticado {
  id: string
  name: string
  email: string
  role: string
  secretariaId: string | null
  setorId: string | null
  permissoesExtra: string[]
  ativo: boolean
}

export async function autenticar(req: NextRequest): Promise<UsuarioAutenticado> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Token ausente ou malformado.')
  }

  const token = authHeader.split(' ')[1]

  const { payload } = await jwtVerify(token, JWT_SECRET).catch(() => {
    throw new Error('Token invalido ou expirado.')
  })

  const usuario = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    select: {
      id: true, name: true, email: true, role: true,
      secretariaId: true, setorId: true,
      permissoesExtra: true, ativo: true,
    },
  })

  if (!usuario) throw new Error('Usuario nao encontrado.')
  if (!usuario.ativo) throw new Error('Usuario desativado.')

  return usuario
}

export function resposta401(mensagem: string) {
  return Response.json({ error: mensagem }, { status: 401 })
}

export function resposta403(mensagem: string) {
  return Response.json({ error: mensagem }, { status: 403 })
}

export function resposta404(mensagem: string) {
  return Response.json({ error: mensagem }, { status: 404 })
}

export function resposta400(mensagem: string) {
  return Response.json({ error: mensagem }, { status: 400 })
}


--- src/lib/cloudconvert.ts ---

import CloudConvert from 'cloudconvert'

export const cloudconvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY!)

export async function converterDocxParaPdf(
  docxUrl: string,
  nomeArquivo: string
): Promise<string> {
  const job = await cloudconvert.jobs.create({
    tasks: {
      'import-arquivo': {
        operation: 'import/url',
        url: docxUrl,
        filename: nomeArquivo,
      },
      'converter': {
        operation: 'convert',
        input: 'import-arquivo',
        output_format: 'pdf',
        input_format: 'docx',
      },
      'exportar': {
        operation: 'export/url',
        input: 'converter',
      },
    },
  })

  const jobFinalizado = await cloudconvert.jobs.wait(job.id)

  const exportTask = jobFinalizado.tasks.find(
    (t) => t.name === 'exportar' && t.status === 'finished'
  )

  if (!exportTask?.result?.files?.[0]?.url) {
    throw new Error('CloudConvert nao retornou URL do PDF.')
  }

  return exportTask.result.files[0].url
}


---

## ENDPOINTS COMPLETOS

--- GET /api/health/route.ts (publico, sem auth) ---

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch {
    return Response.json(
      { status: 'unhealthy', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}


--- GET /api/health/detailed/route.ts (requer ADMIN_GERAL ou PREFEITO) ---

import { autenticar, resposta401, resposta403 } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const usuario = await autenticar(req as any).catch(() => null)
  if (!usuario) return resposta401('Token invalido.')
  if (!['ADMIN_GERAL', 'PREFEITO'].includes(usuario.role))
    return resposta403('Acesso negado.')

  const inicio = Date.now()

  const [db, storage, auth, stuckJobs] = await Promise.allSettled([

    // 1. Verificar banco de dados
    (async () => {
      const t = Date.now()
      await prisma.$queryRaw`SELECT 1`
      return { nome: 'Banco de Dados (Supabase)', status: 'healthy', latenciaMs: Date.now() - t, detalhe: 'Conexao ativa' }
    })(),

    // 2. Verificar Storage
    (async () => {
      const t = Date.now()
      const { error } = await supabaseAdmin.storage.getBucket('docs-cataguases')
      if (error) throw error
      return { nome: 'Storage de Arquivos', status: 'healthy', latenciaMs: Date.now() - t, detalhe: 'Bucket acessivel' }
    })(),

    // 3. Verificar Auth
    (async () => {
      const t = Date.now()
      const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
      if (error) throw error
      return { nome: 'Autenticacao', status: 'healthy', latenciaMs: Date.now() - t, detalhe: 'Auth operante' }
    })(),

    // 4. Verificar jobs travados
    (async () => {
      const DEZ_MINUTOS = 10 * 60 * 1000
      const limite = new Date(Date.now() - DEZ_MINUTOS)
      const presas = await prisma.portaria.findMany({
        where: { status: 'PROCESSANDO', updatedAt: { lt: limite } },
        select: { id: true, numeroOficial: true, updatedAt: true },
      })
      return {
        nome: 'Fila de Processamento',
        status: presas.length > 0 ? 'degraded' : 'healthy',
        latenciaMs: 0,
        detalhe: presas.length > 0
          ? `${presas.length} portaria(s) presa(s) ha mais de 10 minutos`
          : 'Nenhum job travado',
        portariasPresas: presas,
      }
    })(),
  ])

  // 5. Verificar CloudConvert separadamente (pode ser lento)
  let cloudconvertStatus = {
    nome: 'CloudConvert API',
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    latenciaMs: 0,
    detalhe: '',
  }
  try {
    const t = Date.now()
    const res = await fetch('https://api.cloudconvert.com/v2/users/me', {
      headers: { Authorization: `Bearer ${process.env.CLOUDCONVERT_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    const latencia = Date.now() - t
    cloudconvertStatus = {
      nome: 'CloudConvert API',
      status: !res.ok ? 'unhealthy' : latencia > 1000 ? 'degraded' : 'healthy',
      latenciaMs: latencia,
      detalhe: !res.ok ? `Erro HTTP ${res.status}` : latencia > 1000 ? 'Latencia alta' : 'API respondendo',
    }
  } catch (e) {
    cloudconvertStatus = {
      nome: 'CloudConvert API',
      status: 'unhealthy',
      latenciaMs: 5000,
      detalhe: 'API nao respondeu em 5 segundos',
    }
  }

  const mapear = (resultado: PromiseSettledResult<any>) =>
    resultado.status === 'fulfilled'
      ? resultado.value
      : { nome: 'Desconhecido', status: 'unhealthy', latenciaMs: 0, detalhe: String(resultado.reason) }

  const servicos = [db, storage, auth, stuckJobs].map(mapear)
  servicos.push(cloudconvertStatus)

  const geral = servicos.some(s => s.status === 'unhealthy')
    ? 'unhealthy'
    : servicos.some(s => s.status === 'degraded')
    ? 'degraded'
    : 'healthy'

  const alertas = servicos
    .filter(s => s.status !== 'healthy')
    .map(s => ({
      nivel: s.status === 'unhealthy' ? 'CRITICAL' : 'WARNING',
      mensagem: `${s.nome}: ${s.detalhe}`,
    }))

  return Response.json(
    {
      geral,
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - inicio,
      servicos,
      alertas,
    },
    { status: geral === 'unhealthy' ? 503 : 200 }
  )
}


--- POST /api/auth/login/route.ts ---

import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { resposta400 } from '@/lib/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return resposta400('Payload invalido.')

  const { email, password } = parsed.data

  const usuario = await prisma.user.findUnique({ where: { email } })
  if (!usuario) return resposta400('E-mail ou senha incorretos.')
  if (!usuario.ativo) return resposta400('Usuario desativado. Contate o administrador.')

  const senhaOk = await bcrypt.compare(password, usuario.password)
  if (!senhaOk) return resposta400('E-mail ou senha incorretos.')

  const token = await new SignJWT({ sub: usuario.id, role: usuario.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '8h')
    .sign(JWT_SECRET)

  return Response.json({
    token,
    usuario: {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      ativo: usuario.ativo,
      permissoesExtra: usuario.permissoesExtra,
      secretariaId: usuario.secretariaId,
      setorId: usuario.setorId,
    },
  })
}


--- GET + POST /api/portarias/route.ts ---

import { autenticar, resposta401, resposta400 } from '@/lib/auth'
import { buildAbility } from '@/lib/abac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const criarSchema = z.object({
  titulo: z.string().min(10).max(200),
  modeloId: z.string().min(1),
  dadosFormulario: z.record(z.string(), z.string()),
})

export async function GET(req: Request) {
  const usuario = await autenticar(req as any).catch(() => null)
  if (!usuario) return resposta401('Token invalido.')

  const ability = buildAbility(usuario)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') ?? 1)
  const pageSize = Number(searchParams.get('pageSize') ?? 10)
  const status = searchParams.get('status') ?? undefined
  const busca = searchParams.get('busca') ?? undefined

  // ABAC: limita secretaria conforme permissao
  const filtroSecretaria = ability.can('gerenciar', 'all')
    ? undefined
    : { secretariaId: usuario.secretariaId ?? '' }

  const where = {
    ...filtroSecretaria,
    ...(status ? { status } : {}),
    ...(busca ? { titulo: { contains: busca, mode: 'insensitive' as const } } : {}),
  }

  const [data, total] = await Promise
