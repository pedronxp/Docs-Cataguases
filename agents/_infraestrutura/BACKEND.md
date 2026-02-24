# agents/_infraestrutura/BACKEND.md — MOTOR DO CICLO 2
# Doc's Cataguases — Backend: Next.js App Router + Prisma + CASL ABAC
# IA: Leia este arquivo ANTES de criar ou editar qualquer arquivo em apps/api/
# Leia também: agents/_base/AGENTS.md (tipos de domínio e regras invioláveis)

---

## IDENTIDADE

Você é um Engenheiro Backend Sênior. Sua missão é construir os endpoints do Ciclo 2
seguindo este arquivo como lei. Nunca improvise padrões. Nunca coloque lógica de
negócio dentro de route.ts. Nunca gere novo número para uma portaria em retry.

---

## DECISÃO DE ARQUITETURA (DEFINITIVA — NÃO DISCUTA)

| Decisão | Escolha | Motivo |
|---|---|---|
| ORM | Prisma (`src/lib/prisma.ts`) | Já configurado e singleton |
| Autorização | CASL ABAC no código (`buildAbility`) | `permissoesExtra[]` dinâmicas inviabilizam RLS |
| RLS Supabase | DESABILITADO | Segurança feita no código (middleware + CASL) |
| Segurança do banco | Middleware JWT + CASL + IP Allowlist Vercel | Equivalente ao RLS |
| Validação | Zod em todos os endpoints | Rejeitar request malformada antes do banco |
| Linguagem de commits | Português | Padrão do projeto |

---

## PADRÃO OBRIGATÓRIO DE ROUTE HANDLER

Todo handler DEVE seguir este pipeline. Não pule etapas, não inverta a ordem.

```
1. getAuthUser(req)        → 401 se sem token ou token inválido
2. buildAbility(usuario)   → 403 se sem permissão CASL
3. schema.safeParse(body)  → 400 se dados inválidos (Zod)
4. prisma.$transaction()   → lógica de negócio isolada no service
5. feed.criarEvento()      → auditoria de toda mutação
6. NextResponse.json()     → resposta tipada e padronizada
```

```typescript
// TEMPLATE BASE — copie e adapte para cada route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  campo: z.string().min(1),
})

export async function POST(req: NextRequest) {
  // 1. AUTH
  const usuario = await getAuthUser(req)
  if (!usuario)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // 2. ABAC
  const ability = buildAbility(usuario)
  if (!ability.can('criar', 'Portaria'))
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // 3. VALIDAÇÃO
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // 4. PRISMA (via service — nunca direto no route.ts)
  const resultado = await portariaService.criar(parsed.data, usuario)

  // 5. FEED (embutido no service ou chamado aqui)
  await prisma.feedAtividade.create({
    data: {
      tipoEvento: 'PORTARIA_CRIADA',
      mensagem: `Portaria "${resultado.titulo}" criada`,
      portariaId: resultado.id,
      autorId: usuario.id,
      secretariaId: usuario.secretariaId!,
      setorId: usuario.setorId,
      metadata: {},
    },
  })

  // 6. RESPOSTA
  return NextResponse.json(resultado, { status: 201 })
}
```

---

## TRANSAÇÃO ATÔMICA DE NUMERAÇÃO (REGRA DE OURO)

Número duplicado é um erro irreversível de documento oficial.
Prisma não tem SELECT FOR UPDATE nativo — use $queryRaw dentro de $transaction.

```typescript
// apps/api/src/services/numeracao.service.ts
import { prisma } from '@/lib/prisma'

export async function alocarNumero(
  secretariaId: string,
  setorId: string | null
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE — trava a linha até o fim da transação
    const [livro] = await tx.$queryRaw<
      Array<{ id: string; proximoNumero: number; formato: string }>
    >`
      SELECT id, "proximoNumero", formato
      FROM "LivroNumeracao"
      WHERE "secretariaId" = ${secretariaId}
        AND "setorId" IS NOT DISTINCT FROM ${setorId}
        AND ano = ${new Date().getFullYear()}
      FOR UPDATE
    `

    if (!livro)
      throw new Error(
        `LivroNumeracao não encontrado: secretariaId=${secretariaId} setorId=${setorId}`
      )

    // Incrementa atomicamente
    await tx.$executeRaw`
      UPDATE "LivroNumeracao"
      SET "proximoNumero" = "proximoNumero" + 1
      WHERE id = ${livro.id}
    `

    // Aplica o formato: ex. "001/2026/SEMAD"
    return livro.formato
      .replace('{N}', String(livro.proximoNumero).padStart(3, '0'))
      .replace('{ANO}', String(new Date().getFullYear()))
  })
}
```

> REGRA ABSOLUTA:
> `alocarNumero()` é chamada UMA ÚNICA VEZ — na criação da portaria (status PROCESSANDO).
> No endpoint /retry, o número já existe em `portaria.numeroOficial`.
> NUNCA chame `alocarNumero()` dentro de /retry. Apenas regenere o PDF.

---

## ESTRUTURA DE SERVIÇOS OBRIGATÓRIA

Nunca coloque lógica de negócio em route.ts. Toda lógica fica nos services.

```
apps/api/src/services/
├── numeracao.service.ts   ← alocarNumero() — SELECT FOR UPDATE obrigatório
├── pdf.service.ts         ← gerarPDF() — CloudConvert ou Puppeteer
├── portaria.service.ts    ← criar, aprovar, rejeitar, retry, assinar
├── feed.service.ts        ← criarEvento() — chamado após toda mutação
├── modelo.service.ts      ← CRUD de modelos e variáveis dinâmicas
└── usuario.service.ts     ← toggleAtivo, updateRole, permissoesExtra
```

---

## MAPA COMPLETO DE ENDPOINTS

### ✅ JÁ IMPLEMENTADOS (12)

| Endpoint | Arquivo |
|---|---|
| POST /api/auth/login | auth/login/route.ts |
| GET /api/auth/me | auth/me/route.ts |
| GET + POST /api/portarias | portarias/route.ts |
| GET /api/portarias/[id] | portarias/[id]/route.ts |
| POST /api/portarias/[id]/assinar | portarias/[id]/assinar/route.ts |
| POST /api/portarias/[id]/generate | portarias/[id]/generate/route.ts |
| GET /api/acervo | acervo/route.ts |
| GET /api/acervo/export | acervo/export/route.ts |
| GET /api/admin/users | admin/users/route.ts |
| PATCH /api/admin/users/[id] | admin/users/[id]/route.ts |
| GET + POST /api/admin/livros | admin/livros/route.ts |
| GET + POST /api/admin/config/secretarias | admin/config/secretarias/route.ts |

### ❌ FALTANDO — IMPLEMENTAR NESTA ORDEM (8)

| # | Prioridade | Endpoint | Arquivo a criar |
|---|---|---|---|
| 1 | 🔴 CRÍTICO | PATCH /api/portarias/[id]/aprovar | portarias/[id]/aprovar/route.ts |
| 2 | 🔴 CRÍTICO | PATCH /api/portarias/[id]/rejeitar | portarias/[id]/rejeitar/route.ts |
| 3 | 🔴 CRÍTICO | PATCH /api/portarias/[id]/retry | portarias/[id]/retry/route.ts |
| 4 | 🟡 ALTO | GET /api/feed | feed/route.ts |
| 5 | 🟡 ALTO | GET + POST /api/admin/modelos | admin/modelos/route.ts |
| 6 | 🟡 ALTO | GET + PATCH + DELETE /api/admin/modelos/[id] | admin/modelos/[id]/route.ts |
| 7 | 🟡 ALTO | GET + POST + PATCH /api/admin/variaveis | admin/variaveis/route.ts |
| 8 | 🟢 MÉDIO | GET /api/validar/[hash] | validar/[hash]/route.ts |

---

## ESPECIFICAÇÃO DE CADA ENDPOINT FALTANTE

### 1. PATCH /api/portarias/[id]/aprovar
```
Branch:     feat/wizard/endpoint-aprovar
ABQC:       ability.can('aprovar', 'Portaria', { secretariaId: portaria.secretariaId })
Transição:  PENDENTE → APROVADA (erro se status atual != PENDENTE)
Body:       { observacao?: string }
Feed:       tipoEvento = 'PORTARIA_APROVADA'
Roles:      SECRETARIO (própria secretaria), GESTOR_SETOR (próprio setor), ADMIN_GERAL
```

### 2. PATCH /api/portarias/[id]/rejeitar
```
Branch:     feat/wizard/endpoint-rejeitar
ABAC:       ability.can('rejeitar', 'Portaria', { secretariaId: portaria.secretariaId })
Transição:  PENDENTE → RASCUNHO (limpa pdfUrl, mantém numeroOficial: null)
Body:       { observacao: string } — obrigatório
Feed:       tipoEvento = 'PORTARIA_REJEITADA'
Roles:      SECRETARIO (própria secretaria), ADMIN_GERAL
```

### 3. PATCH /api/portarias/[id]/retry
```
Branch:     feat/wizard/endpoint-retry
ABAC:       ability.can('editar', 'Portaria', { autorId: portaria.autorId })
Transição:  FALHA_PROCESSAMENTO → PROCESSANDO
CRÍTICO:   NÃO chamar alocarNumero(). Usar portaria.numeroOficial já existente.
Ação:       Apenas chamar pdf.service.gerarPDF() com o número já alocado
Feed:       tipoEvento = 'PORTARIA_RETRY'
```

### 4. GET /api/feed
```
Branch:     feat/core/endpoint-feed
ABAC:       Filtrar por secretariaId ou setorId do usuário logado
Params:     ?page=1&pageSize=20
Include:    autor { id, name }, portaria { id, titulo, numeroOficial }
Ordem:      createdAt DESC
Roles:      Todos os autenticados (cada um vê o feed do seu escopo)
```

### 5 + 6. CRUD /api/admin/modelos
```
Branch:     feat/admin/endpoints-modelos
GET:        Lista todos modelos, include variaveis[] ordenadas por `ordem`
POST:       Cria modelo + variaveis em transação única
PATCH:      Atualiza modelo e reorganiza ordem das variaveis
DELETE:     Soft delete — setar ativo: false (nunca deletar fisicamente)
ABAC:       GET → qualquer autenticado; mutações → ability.can('gerenciar', 'Modelo')
```

### 7. GET+POST+PATCH /api/admin/variaveis
```
Branch:     feat/admin/endpoints-variaveis
ABAC:       ability.can('gerenciar', 'VariavelSistema')
Nota:       Chaves com prefixo SYS_ são substituídas automaticamente no wizard
Exemplos:  SYS_PREFEITO_NOME, SYS_CIDADE, SYS_ANO_ATUAL
```

### 8. GET /api/validar/[hash]
```
Branch:     feat/acervo/endpoint-validacao-publica
ABAC:       NENHUMA — rota 100% pública, sem JWT, sem login
Hash:       SHA-256 do conteúdo binário do PDF em hex (64 chars)
Retorno:    { titulo, numeroOficial, dataPublicacao, secretaria, status: 'VALIDO' | 'NAO_ENCONTRADO' }
Nota:       Acessível em /validar/[hash] pelo cidadão sem conta
```

---

## COMO TROCAR MOCK → REAL NO FRONTEND

Após cada endpoint estar testado e no ar, faça a troca no frontend:

```typescript
// 1. Criar apps/web/src/lib/api.ts
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

```typescript
// 2. Em cada service, substituir chamada mock pela real

// ANTES
import { portariaService } from '@/services/portaria.service.mock'

// DEPOIS (mesmo contrato de tipos)
import { portariaService } from '@/services/portaria.service'
```

Quando TODOS os mocks forem trocados: `VITE_ENABLE_MOCKS=false` no .env.

---

## CHECKLIST DE CONCLUSÃO DO CICLO 2

> Ciclo 2 está CONCLUÍDO quando TODAS as condições forem verdadeiras:

- [ ] Os 8 endpoints faltantes implementados e testados manualmente
- [ ] `npx tsc --noEmit` sem erros em `apps/api` E `apps/web`
- [ ] `VITE_ENABLE_MOCKS=false` — zero chamadas a serviços mock
- [ ] Transação de numeração testada com 2 requests simultâneos (sem duplicata)
- [ ] Fluxo completo: RASCUNHO → PROCESSANDO → PENDENTE → APROVADA → PUBLICADA
- [ ] Fluxo de rejeição: PENDENTE → RASCUNHO funciona corretamente
- [ ] Fluxo de retry: FALHA_PROCESSAMENTO → PROCESSANDO sem gerar novo número
- [ ] Feed registra todos os eventos acima
- [ ] /validar/[hash] acessível sem login, retorna dados corretos
- [ ] Middleware JWT retorna 401 para rotas protegidas sem token
- [ ] IP Allowlist no Supabase configurado (apenas Vercel acessa o banco)
- [ ] .env no .gitignore, apenas .env.example commitado
- [ ] Deploy na Vercel (staging) sem erros de build
- [ ] ADMIN_GERAL consegue gerenciar modelos, variáveis e usuários pelo painel
- [ ] GESTOR_SETOR consegue aprovar portarias do próprio setor

---

## COMANDOS PADRÃO PARA A EQUIPE

```powershell
# === ANTES DE QUALQUER TAREFA ===
git checkout chore/core/transicao-mock-real
git pull --rebase origin chore/core/transicao-mock-real
git checkout -b feat/MATRIZ/nome-da-tarefa

# === RODAR LOCALMENTE ===
cd apps\api && npm run dev      # API na porta 3001
cd apps\web && npm run dev      # Frontend na porta 5173

# === VERIFICAR TIPOS ===
cd apps\api && npx tsc --noEmit
cd apps\web && npx tsc --noEmit

# === COMMITAR (aguardar aprovação do Tech Lead) ===
git add .
git commit -m "feat(MATRIZ): descrição do que foi feito em português"
git push -u origin feat/MATRIZ/nome-da-tarefa
# Abrir PR apontando para: chore/core/transicao-mock-real
```

---

## ORDEM DE LEITURA PARA A IA INICIAR UMA SESSÃO DE BACKEND

1. `agents/00_INDEX.md`             — estado atual do projeto
2. `agents/_base/AGENTS.md`         — tipos de domínio, regras invioláveis
3. `agents/_base/MOCKS.md`          — contratos dos serviços mock
4. `agents/_infraestrutura/BACKEND.md` — ESTE ARQUIVO
5. Acionar tarefa específica da seção "Especificação de cada endpoint faltante"
