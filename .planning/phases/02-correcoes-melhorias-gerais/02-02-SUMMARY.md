---
phase: "02"
plan: "02"
title: "Notificações + Fila de Aprovação"
status: complete
completed_date: "2026-04-09"
duration_minutes: 12
tasks_completed: 3
tasks_total: 3
files_changed: 3

dependency_graph:
  requires: []
  provides:
    - dedup-semantica-notificacoes
    - fila-aprovacao-otimista
  affects:
    - apps/api/src/app/api/portarias/[id]/fluxo/route.ts
    - apps/web/src/store/notifications.store.ts
    - apps/web/src/routes/_sistema.admin.fila-aprovacao.tsx

tech_stack:
  patterns:
    - Remoção otimista de cache via queryClient.setQueryData (TanStack Query)
    - Deduplicação semântica com janela temporal de 10s no Zustand store

key_files:
  modified:
    - apps/api/src/app/api/portarias/[id]/fluxo/route.ts
    - apps/web/src/store/notifications.store.ts
    - apps/web/src/routes/_sistema.admin.fila-aprovacao.tsx

decisions:
  - "Remover FeedAtividade duplicado no backend (fonte do problema) em vez de só tratar no frontend"
  - "Manter criarNotificacao após transação — é notificação persistente direcionada ao autor, não duplicata"
  - "Deduplicação semântica como segunda camada de defesa contra toasts duplicados de origens SSE distintas"
  - "Usar queryClient.setQueryData para remoção otimista em vez de estado local, pois usuarios vem de useQuery"

metrics:
  duration: 12
  completed_date: "2026-04-09"
  tasks: 3
  files: 3
---

# Phase 02 Plan 02: Notificações + Fila de Aprovação — Summary

## One-liner

Eliminou 3 toasts por ação ASSUMIR_REVISAO removendo FeedAtividade duplicado no backend e adicionou deduplicação semântica por portariaId+tipoEvento+janela-10s no store; corrigiu UX da fila de aprovação com remoção otimista via TanStack Query cache.

## What Was Built

### BUG-03: Notificações 3x por ASSUMIR_REVISAO

Uma única ação `ASSUMIR_REVISAO` gerava 3 eventos SSE distintos:
1. `FeedAtividade` principal com `tipoEvento: MUDANCA_STATUS_SOLICITAR_REVISAO` (correto)
2. `FeedAtividade` duplicado com `tipoEvento: REVISAO_ATRIBUIDA` (dentro da mesma transação — removido)
3. `Notificacao` persistente direcionada ao autor (mantida — é direcionada por usuário)

**Fix aplicado:** Removido o bloco `if (action === 'SOLICITAR_REVISAO' || action === 'ASSUMIR_REVISAO')` que criava o segundo `FeedAtividade` desnecessário dentro da transação Prisma.

**Segunda camada de defesa:** Adicionada deduplicação semântica no `notifications.store.ts` — se uma notificação com mesmo `portariaId + tipoEvento` chegar dentro de 10 segundos de uma já existente, é descartada silenciosamente. Isso protege contra casos futuros onde FeedAtividade e Notificacao representam o mesmo evento humano mas têm IDs distintos.

### BUG-04: Fila de Aprovação — UX quebrada

O backend e service foram confirmados como corretos. O problema era de estado no frontend: após aprovar/rejeitar um usuário, o `refetch()` re-executava a query mas o TanStack Query podia servir cache stale, mantendo o usuário na lista por um instante ou até o próximo revalidation cycle.

**Fix aplicado:** Antes de fechar o modal (após toast de sucesso), é chamado `queryClient.setQueryData(['admin-usuarios'], ...)` para remover otimisticamente o usuário da lista. O `refetch()` existente é mantido para sincronização com o servidor.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Remover FeedAtividade duplicado em fluxo/route.ts | c59964a |
| 2 | Deduplicação semântica em notifications.store.ts | 1c61433 |
| 3 | Remoção otimista de cache na fila de aprovação | ec4349a |

## Deviations from Plan

None — plano executado exatamente como escrito. A análise do `useUsuarios` hook confirmou que `usuarios` vem de `useQuery` com key `['admin-usuarios']`, o que guiou a escolha de `queryClient.setQueryData` como previsto no item 5 da Task 3.

## Known Stubs

None — todas as funcionalidades estão completamente implementadas.

## Self-Check

### Files exist:
- `apps/api/src/app/api/portarias/[id]/fluxo/route.ts` — FOUND
- `apps/web/src/store/notifications.store.ts` — FOUND
- `apps/web/src/routes/_sistema.admin.fila-aprovacao.tsx` — FOUND

### Commits exist:
- c59964a — FOUND
- 1c61433 — FOUND
- ec4349a — FOUND

## Self-Check: PASSED
