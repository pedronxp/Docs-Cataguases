---
phase: "01"
plan: "01"
subsystem: "security"
tags: ["security", "jwt", "ssl", "xss", "rate-limit", "pii", "vitest"]
dependency_graph:
  requires: []
  provides: ["test-infrastructure", "jwt-secure-sse", "ssl-secure-prisma", "xss-safe-chat", "rate-limit-frontend", "email-masking-llm"]
  affects: ["apps/api/src/app/api/notifications/sse/route.ts", "apps/api/src/lib/prisma.ts", "apps/api/src/lib/llm-sanitizer.ts", "apps/web/src/components/chat/FloatingChat.tsx"]
tech_stack:
  added: ["vitest ^4.1.3", "@vitest/ui", "@testing-library/react", "@testing-library/jest-dom", "dompurify ^3.3.3", "jsdom"]
  patterns: ["unit tests with vitest", "DOMPurify HTML sanitization", "fail-loud env guard", "rate limit state machine"]
key_files:
  created:
    - apps/api/vitest.config.ts
    - apps/api/tsconfig.test.json
    - apps/api/tests/setup.ts
    - apps/api/tests/fixtures/index.ts
    - apps/api/tests/sse-token.spec.ts
    - apps/api/tests/prisma-ssl.spec.ts
    - apps/api/tests/llm-sanitizer.spec.ts
    - apps/web/vitest.config.ts
    - apps/web/src/tests/setup.ts
    - apps/web/src/tests/FloatingChat.spec.tsx
    - apps/web/src/tests/rate-limit.spec.ts
  modified:
    - apps/api/package.json
    - apps/api/src/app/api/notifications/sse/route.ts
    - apps/api/src/lib/prisma.ts
    - apps/api/src/lib/llm-sanitizer.ts
    - apps/web/package.json
    - apps/web/src/components/chat/FloatingChat.tsx
decisions:
  - "Usar vitest (não jest) como framework de testes — já no ecossistema Vite do Web, suporte nativo a ESM"
  - "DOMPurify para sanitização XSS — biblioteca madura com allowlist de tags/attrs explícita"
  - "Rate limit via estado React (não middleware) — mantém lógica no componente sem nova infra"
  - "Email regex aplicado antes de CPF no sanitizer — evita conflito entre padrões numéricos e emails"
metrics:
  duration: "~15 min"
  completed_date: "2026-04-08"
  tasks_completed: 6
  tasks_total: 6
  files_created: 11
  files_modified: 6
---

# Phase 01 Plan 01: Segurança (5 fixes) Summary

**One-liner:** Infraestrutura vitest criada + 5 vulnerabilidades de segurança corrigidas: JWT SSE sem fallback hardcoded, SSL Prisma rejectUnauthorized:true, DOMPurify no chat, rate limit 429 no frontend e mascaramento de emails no sanitizer LLM.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 01-01-001 | Wave 0 — Infraestrutura de Testes (vitest) | 13307ed | Completo |
| 01-01-002 | S2 — Remover fallback hardcoded JWT_SECRET no SSE | 5fd7af6 | Completo |
| 01-01-003 | S4 — Corrigir SSL rejectUnauthorized no Prisma | f3191f7 | Completo |
| 01-01-004 | S3 — Substituir dangerouslySetInnerHTML por DOMPurify | 0343b57 | Completo |
| 01-01-005 | S1 — Quota de tokens respeitada no FloatingChat | 87b101b | Completo |
| 01-01-006 | S5 — Mascaramento de emails no llm-sanitizer | 9aba3e8 | Completo |

## Test Results

| Suite | Arquivo | Testes |
|-------|---------|--------|
| API | tests/sse-token.spec.ts | 3/3 passaram |
| API | tests/prisma-ssl.spec.ts | 2/2 passaram |
| API | tests/llm-sanitizer.spec.ts | 7/7 passaram |
| Web | src/tests/FloatingChat.spec.tsx | 4/4 passaram |
| Web | src/tests/rate-limit.spec.ts | 4/4 passaram |
| **Total** | | **20/20 passaram** |

## Security Controls Applied (ASVS L1)

| Threat ID | Categoria | Mitigação | Arquivo |
|-----------|-----------|-----------|---------|
| T-01-S1 | Spoofing | JWT_SECRET sem fallback — lança erro se ausente | sse/route.ts |
| T-01-S2 | Tampering | SSL rejectUnauthorized:true + suporte a CA via env | prisma.ts |
| T-01-S3 | XSS | DOMPurify.sanitize() com allowlist de tags/attrs | FloatingChat.tsx |
| T-01-S4 | DoS | rateLimited state com resetAt desabilita input/botão | FloatingChat.tsx |
| T-01-S5 | Information Disclosure | Email regex → [EMAIL_OMITIDO] antes de envio ao LLM | llm-sanitizer.ts |

## Decisions Made

1. **vitest em vez de jest** — alinhado com Vite (Web) e suporte nativo a ESM, sem configuração extra de transformers.
2. **DOMPurify com allowlist explícita** — tags: p, strong, em, code, pre, ul, ol, li, br, a, h1-h3, blockquote, hr, span; attrs: href, target, class, rel; ALLOW_DATA_ATTR: false.
3. **Rate limit como estado React local** — detectado no catch do axios (`e.response?.status === 429`); não requer nova infra de middleware.
4. **Email regex antes de CPF** — padrão `\b[A-Za-z0-9._%+\-]+@[...]` aplicado primeiro para evitar que sequências numéricas de email (usuário com números) acionem o padrão CPF.

## Deviations from Plan

None — plano executado exatamente como escrito.

## Known Stubs

None — todas as funcionalidades estão completas e funcionais.

## Threat Flags

None — nenhuma nova superfície de ataque introduzida; apenas redução de superfície existente.

## Self-Check: PASSED

- [x] `apps/api/vitest.config.ts` existe
- [x] `apps/web/vitest.config.ts` existe
- [x] `sse/route.ts` não contém `'secret-key-docs-cataguases-2024'`
- [x] `sse/route.ts` lança erro se `JWT_SECRET` ausente
- [x] `prisma.ts` não contém `rejectUnauthorized: false`
- [x] `FloatingChat.tsx` importa `DOMPurify` e sanitiza antes do `dangerouslySetInnerHTML`
- [x] `FloatingChat.tsx` desabilita input após 429 até `resetAt`
- [x] `llm-sanitizer.ts` mascara emails com `[EMAIL_OMITIDO]`
- [x] 20/20 testes passam (12 API + 8 Web)
