---
phase: "02"
plan: "04"
title: "Refatoração FloatingChat — Histórico Backend + Context Awareness + Ações Básicas"
status: complete
completed_date: "2026-04-09"
duration_minutes: 20
tasks_completed: 4
tasks_total: 4
files_created: 2
files_modified: 1
key_decisions:
  - "localStorage mantido como fallback — persistência no backend é aditiva, não substitutiva"
  - "Sessão nova a cada abertura do chat (sessionIdRef resetado no handleClear)"
  - "systemContext injetado a cada mensagem (não apenas na primeira) para manter contexto atualizado"
  - "saveSessionMessages com slice(-50) para evitar payload excessivo na API"
requires: ["02-03"]
provides: ["floating-chat-session-api", "floating-chat-page-context", "floating-chat-quick-actions"]
affects:
  - apps/web/src/components/chat/FloatingChat.tsx
  - apps/web/src/hooks/use-chat-session.ts
  - apps/web/src/hooks/use-page-context.ts
tech_stack:
  added: []
  patterns: ["custom-hook-extraction", "fire-and-forget-persistence", "context-injection-llm"]
key_files:
  created:
    - apps/web/src/hooks/use-chat-session.ts
    - apps/web/src/hooks/use-page-context.ts
  modified:
    - apps/web/src/components/chat/FloatingChat.tsx
tags: ["chat", "sessions-api", "context-awareness", "portaria", "hooks", "frontend"]
---

# Phase 02 Plan 04: Refatoração FloatingChat — Histórico Backend + Context Awareness Summary

Migração do FloatingChat de localStorage para a Sessions API (Phase 01) com context awareness da portaria aberta e botões de ação rápida contextuais — implementado via dois novos hooks customizados e integração cirúrgica no componente existente.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Criar hook useChatSession para lifecycle da sessão | ea8b5d3 | use-chat-session.ts (novo) |
| 2 | Criar hook usePageContext para context awareness de portaria | d7d16a1 | use-page-context.ts (novo) |
| 3 | Integrar hooks no FloatingChat e migrar persistência para backend | 6ea67c7 | FloatingChat.tsx |
| 4 | Adicionar botões de ação rápida contextuais (Ver portaria / Nova portaria) | 9ac80ed | FloatingChat.tsx |

## Changes Made

### `apps/web/src/hooks/use-chat-session.ts` (novo)

- `createSession(provider?, model?)`: POST /api/llm/sessions com título datado — retorna sessionId ou null em falha
- `saveMessages(sessionId, messages)`: PATCH /api/llm/sessions/:id com slice(-50) das mensagens — falha silenciosa via console.warn
- Estado `isCreating` exposto para uso futuro (loading indicator)

### `apps/web/src/hooks/use-page-context.ts` (novo)

- Detecta rotas `/portarias/:id` e `/portarias/revisao/:id` via `useLocation` do @tanstack/react-router
- Busca dados da portaria via GET /api/portarias/:id (título, status, numeroOficial, tipoDocumento, secretaria)
- Retorna `systemContext` (string formatada para injeção no prompt) e `portariaId` (para ações rápidas)
- Falha silenciosa — sem portaria acessível, systemContext fica null

### `apps/web/src/components/chat/FloatingChat.tsx`

- Importados `useNavigate`, `useChatSession` e `usePageContext`
- `sessionIdRef` (useRef) armazena o ID da sessão atual sem re-render
- Sessão criada ao abrir o chat (`open = true`) se `sessionIdRef.current` é null e usuário existe
- Após cada resposta do assistente: `saveSessionMessages` chamado fire-and-forget
- `sendMessage`: `history` agora construído via array `contextMessages` (systemContext + docx se presente)
- `handleClear`: reseta `sessionIdRef.current = null` para nova sessão na próxima abertura
- Botões de ação rápida renderizados quando `portariaId !== null`, acima do preview de DOCX
- localStorage mantido intacto como fallback de carregamento inicial

## Deviations from Plan

None — plano executado exatamente como especificado.

## Known Stubs

None.

## Self-Check

### Files exist:
- FOUND: apps/web/src/hooks/use-chat-session.ts
- FOUND: apps/web/src/hooks/use-page-context.ts
- FOUND: apps/web/src/components/chat/FloatingChat.tsx (modificado)

### Commits exist:
- FOUND: ea8b5d3 — feat(02-04): criar hook useChatSession
- FOUND: d7d16a1 — feat(02-04): criar hook usePageContext
- FOUND: 6ea67c7 — feat(02-04): integrar hooks no FloatingChat
- FOUND: 9ac80ed — feat(02-04): adicionar botões de ação rápida

### TypeScript: npx tsc --noEmit em apps/web — sem erros

## Self-Check: PASSED
