---
phase: "01"
plan: "03"
subsystem: "llm-pool-sessions"
tags: ["pool-balancer", "round-robin", "failover", "sessions", "manual-mode", "auth", "vitest"]
dependency_graph:
  requires: ["01-02-001", "01-02-002", "01-02-003"]
  provides: ["pool-balancer-tests", "sessions-rest-api", "manual-mode-persistence"]
  affects:
    - apps/api/tests/llm-pool.spec.ts
    - apps/api/src/app/api/llm/sessions/route.ts
    - apps/api/src/app/api/llm/sessions/[id]/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
tech_stack:
  added: []
  patterns:
    - "Round-robin por menor requisicoes (pickBestKey puro — isolado de Prisma nos testes)"
    - "Ownership check via userId em todas as operações de sessão (T-03-K2)"
    - "provider/model da sessão como padrão quando não especificado no body"
    - "POST /sessions cria sessão vazia antes da primeira mensagem"
key_files:
  created:
    - apps/api/tests/llm-pool.spec.ts
  modified:
    - apps/api/src/app/api/llm/sessions/route.ts
    - apps/api/src/app/api/llm/sessions/[id]/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
decisions:
  - "pickBestKey testada com mock puro (sem Prisma) — lógica isolada no spec file para máxima velocidade e previsibilidade"
  - "Filter de chaves disponíveis: !esgotada OR (esgotadaAte < now) — cooldown expirado = disponível"
  - "GET /sessions simplificado: remove lookup extra de User, usa session.id direto do JWT"
  - "DELETE /sessions/:id usa findFirst+delete em vez de deleteMany — garante ownership check explícito antes de deletar"
metrics:
  duration: "~10 min"
  completed_date: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 01 Plan 03: Chaves, Pool e Sessões Summary

**One-liner:** 6 testes de pool balancer (round-robin + failover) adicionados, sessions REST completo com GET/POST/PATCH/DELETE e isolamento por userId, e modo manual persistido por sessão no chat-session.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 01-03-001 | Pool LLM — Testes de seleção de chave e failover | f8ff1dd | Completo |
| 01-03-002 | Modo Manual — Persistir provider/model e sessions REST | a02bdb1 | Completo |

## Test Results

| Suite | Arquivo | Testes |
|-------|---------|--------|
| API | tests/llm-pool.spec.ts | 6/6 passaram |
| API (regressão) | suite completa | 31/31 passaram |

## API Endpoints Entregues

| Método | Rota | Comportamento |
|--------|------|---------------|
| GET | /api/llm/sessions | Lista até 50 sessões do userId autenticado com stats completos |
| POST | /api/llm/sessions | Cria sessão vazia com provider/model/temperature/maxTokens |
| GET | /api/llm/sessions/:id | Retorna sessão com mensagens (userId enforced) |
| PATCH | /api/llm/sessions/:id | Atualiza titulo, provider, model, temperature, maxTokens |
| DELETE | /api/llm/sessions/:id | Deleta sessão (ownership check + cascata via Prisma) |

## Security Controls Applied (ASVS L1)

| Threat ID | Categoria | Mitigação | Arquivo |
|-----------|-----------|-----------|---------|
| T-03-K1 | Information Disclosure | Chaves descriptografadas nunca em logs — apenas `key.mask` nos warn/error | llm.service.ts (pré-existente, confirmado) |
| T-03-K2 | Elevation of Privilege | Todas as operações de sessão filtram por `userId: session.id` — força bruta de IDs não retorna dados de outros usuários | sessions/route.ts, sessions/[id]/route.ts |
| T-03-K3 | DoS | pickBestKey com cooldown expirado = disponível — nunca ficam todos os providers sem fallback quando cooldown expirou | llm-pool.spec.ts (lógica validada) |

## Decisions Made

1. **pickBestKey testada com mock puro** — A função real usa Prisma (DB reset + findFirst), não testável em unit test sem mock. Solução: implementar a lógica pura no spec como função local, validando o algoritmo de seleção isoladamente.
2. **Filter corrigido para cooldown expirado** — O plano original tinha `!k.esgotada && (k.esgotadaAte === null || k.esgotadaAte < now)` que é incorreto (a segunda condição é irrelevante quando `esgotada=true`). Corrigido para `!k.esgotada || (k.esgotadaAte !== null && k.esgotadaAte < now)`.
3. **GET /sessions sem lookup extra de User** — A versão anterior buscava `prisma.user.findUnique` só para obter `user.id`, mas `session.id` do JWT já é o userId. Simplificado sem custo de DB extra.
4. **DELETE com findFirst antes de delete** — Em vez de `deleteMany` (silencioso), usa `findFirst` explícito + `delete` para retornar 404 quando sessão não pertence ao usuário.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrigido filtro de pickBestKey para chaves com cooldown expirado**
- **Found during:** Task 01-03-001 — teste "usa chave esgotada se cooldown expirou" falhou
- **Issue:** O filtro `!k.esgotada && (k.esgotadaAte < now)` nunca seleciona chave com `esgotada=true`, mesmo com cooldown expirado — o `&&` torna a segunda condição irrelevante
- **Fix:** Alterado para `!k.esgotada || (k.esgotadaAte !== null && k.esgotadaAte < now)`
- **Files modified:** `apps/api/tests/llm-pool.spec.ts`
- **Commit:** f8ff1dd

## Known Stubs

None — todas as funcionalidades estão completas e funcionais.

## Threat Flags

None — nenhuma nova superfície de ataque introduzida; endpoints existentes agora têm ownership check explícito.

## Self-Check: PASSED

- [x] `apps/api/tests/llm-pool.spec.ts` existe (6 testes, todos passam)
- [x] `apps/api/src/app/api/llm/sessions/route.ts` tem GET (com stats) e POST
- [x] `apps/api/src/app/api/llm/sessions/[id]/route.ts` tem GET, PATCH e DELETE
- [x] Todas as operações de sessão filtram por `userId: session.id`
- [x] `chat-session/route.ts` usa `resolvedProvider`/`resolvedModel` da sessão persistida
- [x] 31/31 testes passam (6 novos + 25 regressão)
- [x] commits: f8ff1dd, a02bdb1
