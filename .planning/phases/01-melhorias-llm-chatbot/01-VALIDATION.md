---
phase: 1
slug: melhorias-llm-chatbot
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (a instalar — Wave 0) |
| **Config file** | `apps/api/vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npm run test -- --run <file>.spec.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds (unit) / ~90 seconds (integration) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run <modified>.spec.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite deve estar verde + `npm audit`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-S1 | 01 | 1 | Quota tokens FloatingChat | T-01-S1 | Bloqueia após N tokens por sessão | unit | `npm run test -- --run rate-limit.spec` | ❌ W0 | ⬜ pending |
| 01-S2 | 01 | 1 | JWT_SECRET SSE | T-01-S2 | SSE rejeita token inválido/expirado | unit | `npm run test -- --run sse-token.spec` | ❌ W0 | ⬜ pending |
| 01-S3 | 01 | 1 | dangerouslySetInnerHTML | T-01-S3 | HTML malicioso é escapado no chat | unit | `npm run test -- --run FloatingChat.spec` | ❌ W0 | ⬜ pending |
| 01-S4 | 01 | 1 | SSL rejectUnauthorized | T-01-S4 | Conexão DB rejeita certs inválidos | unit | `npm run test -- --run prisma.spec` | ❌ W0 | ⬜ pending |
| 01-S5 | 01 | 1 | Sanitizer emails | T-01-S5 | Emails mascarados em respostas LLM | unit | `npm run test -- --run llm-sanitizer.spec` | ❌ W0 | ⬜ pending |
| 01-A1 | 01 | 2 | Rotas chat unificadas | — | POST /api/llm/chat aceita sessionId opcional | integration | `npm run test -- --run chat-routes.spec` | ❌ W0 | ⬜ pending |
| 01-A2 | 01 | 2 | Stats LLM persistentes | — | Stats sobrevivem restart do processo | integration | `npm run test -- --run llm-stats.spec` | ❌ W0 | ⬜ pending |
| 01-A3 | 01 | 2 | ChatSession/ChatMessage tipados | — | Prisma schema tem modelos corretos | unit | `npx prisma validate` | ✅ | ⬜ pending |
| 01-P1 | 01 | 3 | Indexes SSE + polling | — | SSE query usa índice em FeedAtividade | unit | `npm run test -- --run sse-perf.spec` | ❌ W0 | ⬜ pending |
| 01-P2 | 01 | 3 | Cache sanitização | — | Sanitização cacheada por conteúdo | unit | `npm run test -- --run sanitize-cache.spec` | ❌ W0 | ⬜ pending |
| 01-P3 | 01 | 3 | Tool filtering por role | — | Ferramentas filtradas por permissão | unit | `npm run test -- --run llm-tools.spec` | ❌ W0 | ⬜ pending |
| 01-M1 | 01 | 4 | Refatorar executeToolCall | — | Módulos independentes, sem regressão | unit | `npm run test -- --run llm-tools.spec` | ❌ W0 | ⬜ pending |
| 01-M2 | 01 | 4 | LLM provider fallback chain | — | Fallback para próximo provider em erro | integration | `npm run test -- --run llm.service.spec` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/vitest.config.ts` — configurar vitest para Next.js/TypeScript
- [ ] `apps/api/tsconfig.test.json` — tsconfig separado para arquivos de teste
- [ ] `apps/api/package.json` — adicionar deps: `vitest`, `@vitest/ui`, `@testing-library/react`
- [ ] `apps/api/tests/setup.ts` — setup global (mocks Prisma, env vars)
- [ ] `apps/api/tests/fixtures/` — dados de mock (LLM responses, chat messages, users)
- [ ] `apps/web/vitest.config.ts` — configurar vitest para React (FloatingChat tests)
- [ ] `apps/web/package.json` — adicionar deps: `@testing-library/react`, `@testing-library/user-event`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE token expira e reconecta | S2 | Requer timing real-time | Abrir chat, aguardar 1h, verificar reconexão automática |
| Pool LLM faz failover em produção | A (pool balance) | Requer desativar provider real | Remover chave do provedor ativo, enviar mensagem |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
