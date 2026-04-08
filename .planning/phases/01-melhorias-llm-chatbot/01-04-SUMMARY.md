---
phase: "01"
plan: "04"
subsystem: "performance-manutenibilidade"
tags: ["useMemo", "tool-filtering", "rbac", "executeToolCall", "handlers", "refactor", "gitignore"]
dependency_graph:
  requires: ["01-01-004", "01-03-002"]
  provides: ["tool-role-filtering", "modular-handlers", "markdown-cache"]
  affects:
    - apps/web/src/components/chat/FloatingChat.tsx
    - apps/api/src/lib/llm-tools.ts
    - apps/api/src/lib/llm-tools/handlers/
    - apps/api/src/app/api/llm/chat/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
    - apps/api/tests/llm-tools.spec.ts
    - .gitignore
tech_stack:
  added: []
  patterns:
    - "useMemo com dependência [msg.content] para memoização de HTML sanitizado"
    - "Chain of Responsibility para executeToolCall (HANDLERS array)"
    - "TOOL_ROLE_REQUIREMENTS: whitelist por ferramenta → filterToolsByRole(role)"
    - "Defense-in-depth: filtro de tools no server antes de enviar ao LLM"
key_files:
  created:
    - apps/api/src/lib/llm-tools/handlers/_shared.ts
    - apps/api/src/lib/llm-tools/handlers/secretarias.ts
    - apps/api/src/lib/llm-tools/handlers/setores.ts
    - apps/api/src/lib/llm-tools/handlers/portarias.ts
    - apps/api/src/lib/llm-tools/handlers/usuarios.ts
    - apps/api/src/lib/llm-tools/handlers/modelos.ts
    - apps/api/tests/llm-tools.spec.ts
  modified:
    - apps/web/src/components/chat/FloatingChat.tsx
    - apps/api/src/lib/llm-tools.ts
    - apps/api/src/app/api/llm/chat/route.ts
    - apps/api/src/app/api/llm/chat-session/route.ts
    - .gitignore
decisions:
  - "Cache DOCX movido para _shared.ts para evitar dependência circular com handlers"
  - "Ferramentas de leitura (listar_*) omitidas do TOOL_ROLE_REQUIREMENTS — passam por padrão para qualquer role incluindo desconhecidas"
  - "executeToolCall mantém compatibilidade total — import de llm-tools não precisa mudar nos consumidores"
  - "Entradas de gitignore para build logs colocadas após !apps/** para ter precedência correta"
metrics:
  duration: "~35 min"
  completed_date: "2026-04-08"
  tasks_completed: 4
  tasks_total: 4
  files_created: 7
  files_modified: 5
---

# Phase 01 Plan 04: Performance e Manutenibilidade Summary

**One-liner:** useMemo para markdown cache no FloatingChat, filterToolsByRole com 6 testes (RBAC defense-in-depth), executeToolCall refatorado em 5 handlers modulares via chain of responsibility, e .gitignore corrigido para build logs.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 01-04-001 | Cache sanitização markdown com useMemo | d1438a2 | Completo |
| 01-04-002 | Filtrar LLM_TOOLS por role (filterToolsByRole) | 8f75024 | Completo |
| 01-04-003 | Refatorar executeToolCall em handlers modulares | 8b9143a | Completo |
| 01-04-004 | Limpar .gitignore e remover build logs | 92b31f3 | Completo |

## Test Results

| Suite | Arquivo | Testes |
|-------|---------|--------|
| API — Novo | tests/llm-tools.spec.ts | 6/6 passaram |
| API — Regressão | suite completa (8 arquivos) | 37/37 passaram |

## Security Controls Applied (ASVS L1)

| Threat ID | Categoria STRIDE | Mitigação | Arquivo |
|-----------|-----------------|-----------|---------|
| T-04-P1 | Elevation of Privilege | filterToolsByRole exclui ferramentas admin da lista enviada ao LLM para OPERADOR | llm-tools.ts, chat/route.ts, chat-session/route.ts |
| T-04-P3 | DoS | useMemo com [msg.content] evita rerenderização O(n*m) de DOMPurify + renderMarkdown | FloatingChat.tsx |

**T-04-P2 (Information Disclosure):** aceito — verificarPermissao() já valida por email no DB em cada handler.

## API/Function Exports Unchanged

`import { LLM_TOOLS, executeToolCall, filterToolsByRole, setDocxAnalise, getDocxAnalise, clearDocxAnalise } from '@/lib/llm-tools'` continua funcionando sem alteração nos consumidores.

## Decisions Made

1. **Cache DOCX em _shared.ts:** O módulo `modelos.ts` precisa de `getDocxAnalise`/`clearDocxAnalise`. Importar de `llm-tools.ts` criaria dependência circular (llm-tools.ts → handlers → llm-tools.ts). Solução: mover o cache para `_shared.ts` e re-exportar de `llm-tools.ts`.

2. **Ferramentas de leitura sem restrição no TOOL_ROLE_REQUIREMENTS:** O teste "role desconhecida recebe ferramentas de leitura" exige que roles não mapeadas ainda obtenham `listar_*`. Omitir ferramentas de leitura do mapa faz com que o filtro as inclua por padrão (safe default explícito no código).

3. **Entradas de gitignore após !apps/\*\*:** A regra `!apps/**` na linha 44 do .gitignore original un-ignora tudo sob apps/. Entradas específicas de log precisam vir após essa negação para ter precedência — gitignore processa regras de cima para baixo, a última que corresponde vence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ferramentas de leitura excluídas para roles desconhecidas**
- **Found during:** Task 01-04-002 — teste "role desconhecida recebe apenas ferramentas de leitura" falhou (5/6 passando)
- **Issue:** Incluir `listar_*` no TOOL_ROLE_REQUIREMENTS com lista explícita de roles excluía roles não mapeadas
- **Fix:** Omitir ferramentas de leitura do mapa — o filtro as inclui por padrão (`if (!allowedRoles) return true`)
- **Files modified:** `apps/api/src/lib/llm-tools.ts`
- **Commit:** 8f75024

**2. [Rule 1 - Bug] Dependência circular ao importar cache DOCX nos handlers**
- **Found during:** Task 01-04-003 — modelos.ts importava de `../../llm-tools` criando ciclo
- **Fix:** Mover `setDocxAnalise`/`getDocxAnalise`/`clearDocxAnalise` para `_shared.ts`, re-exportar de `llm-tools.ts`
- **Files modified:** `apps/api/src/lib/llm-tools/handlers/_shared.ts`, `apps/api/src/lib/llm-tools.ts`
- **Commit:** 8b9143a

**3. [Rule 1 - Bug] Regra !apps/** no .gitignore sobrepassava entradas de build log**
- **Found during:** Task 01-04-004 — `git check-ignore` mostrou que `!apps/**` em linha 44 cancelava as entradas de log
- **Fix:** Mover entradas específicas de build log para depois da linha `!apps/**`
- **Files modified:** `.gitignore`
- **Commit:** 92b31f3

## Known Stubs

None — todas as funcionalidades implementadas estão completas e funcionais.

## Threat Flags

None — nenhuma nova superfície de ataque introduzida. filterToolsByRole reduz a superfície enviada ao LLM para roles não-admin.

## Self-Check: PASSED

- [x] `FloatingChat.tsx` importa `useMemo` e usa `sanitizedHtml` com dependência `[msg.content]`
- [x] `filterToolsByRole('OPERADOR')` exclui `criar_secretaria`, `deletar_secretaria`, `criar_usuario`, `alterar_papel`, `alterar_lotacao`
- [x] `filterToolsByRole('ADMIN_GERAL')` retorna array completo (`length === LLM_TOOLS.length`)
- [x] `chat/route.ts` usa `filteredTools` (baseado em `userAuth?.role`)
- [x] `chat-session/route.ts` usa `filteredTools` (baseado em `dbUser.role`)
- [x] `executeToolCall` distribuído em 5 handlers: secretarias, setores, portarias, usuarios, modelos
- [x] `import { LLM_TOOLS, executeToolCall, filterToolsByRole } from '@/lib/llm-tools'` funcionando
- [x] `.gitignore` ignora `apps/api/build.log` e `apps/api/ts-error.log` (verificado com `git check-ignore`)
- [x] 37/37 testes passando
- [x] `npx tsc --noEmit` sem erros novos em llm-tools.ts ou handlers
- [x] Commits: d1438a2, 8f75024, 8b9143a, 92b31f3
