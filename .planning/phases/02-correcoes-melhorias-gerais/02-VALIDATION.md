---
phase: 02
slug: correcoes-melhorias-gerais
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (API)** | Vitest |
| **Framework (Web)** | Vitest + Testing Library |
| **Config API** | `apps/api/vitest.config.ts` |
| **Config Web** | `apps/web/vitest.config.ts` |
| **Quick run (API)** | `cd apps/api && npx vitest run` |
| **Quick run (Web)** | `cd apps/web && npx vitest run` |
| **Full suite** | `cd apps/api && npx vitest run && cd ../web && npx vitest run` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick suite for the affected app (api ou web)
- **After each plan completes:** Run full suite (both apps)
- **Before PR:** Full suite must pass with 0 failures

---

## Wave 0 — Test Infrastructure

> Wave 0 is already complete — test infra was set up in Phase 01 (01-01).

- [x] Vitest configured in `apps/api` (`vitest.config.ts`, `tests/setup.ts`)
- [x] Vitest configured in `apps/web` (`vitest.config.ts`, `tests/setup.ts`)
- [x] Baseline: 37+ tests in API, 8+ tests in Web

---

## Per-Plan Validation Requirements

### Plan 02-01 — PDF/Assinatura + Numeração

**New tests to create:**
- `apps/api/tests/pdf-assinatura.spec.ts`
  - `NumeracaoService` retorna `PORT-001/2026` para livro com `formato_base = '{N}/{ANO}'`
  - `NumeracaoService` não duplica prefixo para `formato_base = 'PORT-{N}/{ANO}'`

**Regression checks:**
- `npx vitest run tests/numeracao.test.ts` — testes existentes devem continuar passando
- TypeScript: `npx tsc --noEmit` em `apps/api` sem erros em `assinar/route.ts` e `numeracao.service.ts`

**Manual smoke test:**
- Submeter portaria → assinar → verificar `pdfUrl` não nulo via `GET /api/portarias/:id`

---

### Plan 02-02 — Notificações + Fila de Aprovação

**New tests to create:**
- `apps/web/src/tests/notifications-dedup.spec.ts`
  - Store descarta notificação com mesmo `portariaId + tipoEvento` em janela de 10s
  - Store aceita notificações com `portariaId` diferente no mesmo período
  - Store aceita notificações com mesmo `portariaId` mas `tipoEvento` diferente

**Regression checks:**
- `npx vitest run` em `apps/web` — testes existentes devem continuar passando
- TypeScript: `npx tsc --noEmit` em `apps/web` sem erros em `notifications.store.ts`

**Manual smoke test:**
- Executar `ASSUMIR_REVISAO` → confirmar 1 toast (não 3)
- Aprovar usuário PENDENTE na fila → usuário desaparece imediatamente da lista

---

### Plan 02-03 — Providers LLM

**New tests to create:**
- `apps/api/tests/llm-providers.spec.ts`
  - OpenRouter 404 não marca chave como esgotada
  - Cerebras usa `max_tokens = 8192` quando `options.maxTokens` não especificado
  - Groq não inclui `qwen-2.5-32b` no catálogo

**Regression checks:**
- `npx vitest run tests/llm-pool.spec.ts` — 6 testes do pool devem continuar passando
- TypeScript: `npx tsc --noEmit` em `apps/api` e `apps/web`

---

### Plan 02-04 — FloatingChat Refatoração

**New tests to create:**
- `apps/web/src/tests/use-chat-session.spec.ts`
  - `createSession` chama `POST /api/llm/sessions` e retorna ID
  - `saveMessages` chama `PATCH /api/llm/sessions/:id` com mensagens formatadas
  - Falha no backend não lança exceção (graceful degradation)
- `apps/web/src/tests/use-page-context.spec.ts`
  - Retorna `portariaId` e `systemContext` em rota `/portarias/:id`
  - Retorna `null` em rota sem portaria

**Regression checks:**
- `npx vitest run` em `apps/web` — testes existentes devem continuar passando
- TypeScript: `npx tsc --noEmit` em `apps/web` sem erros nos arquivos novos e modificados

---

## Phase Completion Gate

Antes de marcar a fase como completa, todos os itens abaixo devem estar verdes:

- [ ] `cd apps/api && npx vitest run` — 0 failures
- [ ] `cd apps/web && npx vitest run` — 0 failures
- [ ] `cd apps/api && npx tsc --noEmit` — 0 errors
- [ ] `cd apps/web && npx tsc --noEmit` — 0 errors
- [ ] Smoke tests manuais dos 4 planos executados
- [ ] Nenhum `console.error` novo introduzido (grep antes do PR)
