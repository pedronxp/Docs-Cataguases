---
phase: "01"
plan: "02"
subsystem: "schema"
tags: ["prisma", "schema", "llm-stats", "chat-session", "toolcalls", "indexes", "vitest"]
dependency_graph:
  requires: ["01-01-001"]
  provides: ["chat-session-stats", "llm-statistic-db", "tool-calls-persistence", "sse-indexes", "model-map-complete"]
  affects:
    - apps/api/prisma/schema.prisma
    - apps/api/src/services/llm.service.ts
    - apps/api/src/app/api/llm/chat/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
tech_stack:
  added: []
  patterns:
    - "Prisma upsert diário para stats LLM (provider+date unique)"
    - "fire-and-forget com setImmediate para persistência assíncrona de stats"
    - "Transação Prisma com incremento de counters (tokensInputTotal, tokensOutputTotal, requestsCount)"
    - "Índices compostos Prisma para otimização de queries SSE"
key_files:
  created:
    - apps/api/tests/schema-validation.spec.ts
    - apps/api/tests/llm-stats.spec.ts
    - apps/api/tests/chat-routes.spec.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/services/llm.service.ts
    - apps/api/src/app/api/llm/chat/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
decisions:
  - "flushStatsToDB via setImmediate (fire-and-forget) — nunca bloqueia o response path"
  - "LlmStatistic com @@unique([provider, date]) — upsert diário sem duplicatas"
  - "toolCalls separado de metadata no ChatMessage — campo dedicado para tool_calls array"
  - "Stats de sessão incrementados na mesma transação do salvamento de mensagens — atomicidade garantida"
metrics:
  duration: "~12 min"
  completed_date: "2026-04-08"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 4
---

# Phase 01 Plan 02: Schema e Arquitetura Summary

**One-liner:** Schema Prisma expandido com stats de sessão, toolCalls dedicado, modelo LlmStatistic para histórico diário por provider, índices SSE em FeedAtividade/Notificacao, e persistência fire-and-forget de stats LLM via setImmediate.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 01-02-001 | A3 — Expandir schema ChatSession/ChatMessage com stats e toolCalls | 5924a52 | Completo |
| 01-02-002 | A2 — Persistir stats LLM em banco (LlmStatistic) e alinhar model map | eea69a5 | Completo |
| 01-02-003 | A1 — Unificar chat-session com salvamento de toolCalls e stats da sessão | 2e66bac | Completo |

## Test Results

| Suite | Arquivo | Testes |
|-------|---------|--------|
| API | tests/schema-validation.spec.ts | 7/7 passaram |
| API | tests/llm-stats.spec.ts | 3/3 passaram |
| API | tests/chat-routes.spec.ts | 3/3 passaram |
| API (regressão) | suite completa | 25/25 passaram |

## Schema Changes Applied

| Modelo | Alteração |
|--------|-----------|
| ChatSession | +temperature, +maxTokens, +tokensInputTotal, +tokensOutputTotal, +requestsCount, +@@index([userId, createdAt]) |
| ChatMessage | +toolCalls Json?, @@index([sessionId, createdAt]), metadata mantido separado de toolCalls |
| FeedAtividade | +@@index([createdAt, secretariaId, setorId]) — otimiza queries SSE de feed |
| Notificacao | +@@index([userId, criadoEm]) — otimiza queries SSE de notificações |
| LlmStatistic | novo modelo com upsert diário por provider (unique: provider+date) |

`npx prisma db push` aplicado com sucesso em todos os passos.

## Security Controls Applied (ASVS L1)

| Threat ID | Categoria | Mitigação | Arquivo |
|-----------|-----------|-----------|---------|
| T-02-A1 | Information Disclosure | toolCalls em campo dedicado — separado de metadata genérico; acesso via ownership enforced (ChatSession.userId) | schema.prisma |
| T-02-A2 | DoS | @@index([createdAt, secretariaId, setorId]) elimina full table scan no SSE a cada 5s | schema.prisma |
| T-02-A3 | Tampering | MODEL_TO_PROVIDER agora cobre todos 15 modelos do catálogo — provider sempre derivado corretamente | chat/route.ts |

## Decisions Made

1. **fire-and-forget com setImmediate** — `flushStatsToDB` é chamado via `setImmediate` dentro de `trackSuccess`, garantindo que a persistência de stats nunca adicione latência ao response path do LLM.
2. **LlmStatistic com @@unique([provider, date])** — upsert diário por provider sem duplicatas; granularidade de dia é suficiente para análise de uso e custo.
3. **toolCalls separado de metadata** — campo dedicado `toolCalls Json?` no ChatMessage para armazenar o array de tool_calls intermediários; `metadata` mantido para durationMs, fallbackUsed, toolLoops.
4. **Stats de sessão na mesma transação** — `tokensInputTotal`, `tokensOutputTotal`, `requestsCount` incrementados atomicamente junto com o salvamento das mensagens.

## Deviations from Plan

None — plano executado exatamente como escrito.

## Known Stubs

None — todos os campos são funcionais e persistidos no banco.

## Threat Flags

None — nenhuma nova superfície de ataque introduzida; apenas redução de superfície (índices, ownership).

## Self-Check: PASSED

- [x] `apps/api/tests/schema-validation.spec.ts` existe
- [x] `apps/api/tests/llm-stats.spec.ts` existe
- [x] `apps/api/tests/chat-routes.spec.ts` existe
- [x] `ChatSession` tem `tokensInputTotal`, `tokensOutputTotal`, `requestsCount`, `temperature`, `maxTokens`, `@@index([userId, createdAt])`
- [x] `ChatMessage` tem `toolCalls Json?` e `@@index([sessionId, createdAt])`
- [x] `FeedAtividade` tem `@@index([createdAt, secretariaId, setorId])`
- [x] `Notificacao` tem `@@index([userId, criadoEm])`
- [x] `LlmStatistic` existe no schema com @@unique([provider, date])
- [x] `flushStatsToDB` existe em llm.service.ts e é chamado via `setImmediate` em `trackSuccess`
- [x] `MODEL_TO_PROVIDER` cobre 15 modelos incluindo os 3 OpenRouter free
- [x] `chat-session` salva `toolCalls` e atualiza stats da sessão na mesma transação
- [x] `npx prisma validate` retorna sem erros
- [x] 25/25 testes passam
- [x] commits: 5924a52, eea69a5, 2e66bac
