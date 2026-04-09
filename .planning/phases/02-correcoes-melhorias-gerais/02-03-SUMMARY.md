---
phase: "02"
plan: "03"
title: "Providers LLM — Cerebras, Mistral, Groq, OpenRouter"
status: complete
completed_date: "2026-04-09"
duration_minutes: 10
tasks_completed: 3
tasks_total: 3
files_created: 0
files_modified: 2
key_decisions:
  - "contextWindow do deepseek-r1-distill-llama-70b corrigido de 128000 para 32768 (valor real na Groq)"
  - "max_tokens Cerebras aumentado para 8192 com lógica condicional por provider"
  - "OpenRouter 404 tratado sem cooldown na chave API para preservar disponibilidade"
requires: []
provides: ["llm-provider-catalog-v2", "cerebras-max-tokens-8192", "openrouter-404-graceful"]
affects: ["apps/api/src/services/llm.service.ts", "apps/web/src/components/chat/FloatingChat.tsx"]
tech_stack:
  added: []
  patterns: ["provider-specific-defaults", "graceful-degradation-404"]
key_files:
  modified:
    - apps/api/src/services/llm.service.ts
    - apps/web/src/components/chat/FloatingChat.tsx
tags: ["llm", "providers", "groq", "cerebras", "openrouter", "frontend-catalog"]
---

# Phase 02 Plan 03: Providers LLM — Cerebras, Mistral, Groq, OpenRouter Summary

Ajustes pontuais nos providers LLM: remoção de modelo Groq descontinuado, correção de contextWindow, aumento de max_tokens para Cerebras e tratamento correto de 404 no OpenRouter sem penalizar a chave API.

## Tasks Completed

| Task | Description | Files |
|------|-------------|-------|
| 1 | Remover qwen-2.5-32b, corrigir contextWindow DeepSeek R1, aumentar max_tokens Cerebras | llm.service.ts |
| 2 | Tratamento de 404 OpenRouter sem cooldown na chave | llm.service.ts |
| 3 | Sincronizar catálogo de modelos no FloatingChat | FloatingChat.tsx |

## Changes Made

### `apps/api/src/services/llm.service.ts`

- Removido `qwen-2.5-32b` do GROQ_MODELS (descontinuado)
- `deepseek-r1-distill-llama-70b`: contextWindow corrigido de 128000 para 32768
- max_tokens: `provider === 'cerebras' ? 8192 : 2048` — evita truncamento em respostas longas
- OpenRouter 404: retorna sem cooldown na chave — chave permanece disponível para outros modelos

### `apps/web/src/components/chat/FloatingChat.tsx`

- Removido `deepseek-r1-distill-llama-70b` (Groq) do seletor manual
- Adicionado `google/gemma-3-27b-it:free` (OpenRouter) como opção selecionável
- Adicionado `deepseek/deepseek-r1:free` (OpenRouter) como opção selecionável

## Deviations from Plan

None.

## Known Stubs

None.
