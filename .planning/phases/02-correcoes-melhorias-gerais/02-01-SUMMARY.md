---
phase: "02"
plan: "01"
title: "PDF/Assinatura + Numeração"
status: complete
completed_at: "2026-04-09T16:23:34Z"
duration_minutes: 15
tasks_completed: 3
tasks_total: 3
files_modified: 2
files_created: 1
commits:
  - hash: "70e7b2c"
    message: "fix(02-01): remover zeragem de pdfUrl e docxRascunhoUrl na rota de assinatura"
  - hash: "a91d20c"
    message: "fix(02-01): normalizar formato_base sem prefixo PORT- no NumeracaoService"
  - hash: "b0b1df4"
    message: "test(02-01): adicionar testes unitários para fix de pdfUrl e normalização PORT-"
key_decisions:
  - "Normalização do formato_base em memória (sem migration obrigatória) para compatibilidade com livros legados"
  - "Remoção das linhas pdfUrl/docxRascunhoUrl do update de assinatura — PDF válido até publicação"
subsystem: "api"
tags: ["bugfix", "pdf", "assinatura", "numeracao", "tests"]
depends_on: []
provides: ["pdfUrl-preserved-after-signature", "normalized-PORT-numbering"]
affects: ["portaria-lifecycle", "numbering-service"]
tech_stack:
  patterns: ["in-memory normalization", "pure function extraction for unit testing"]
key_files:
  modified:
    - apps/api/src/app/api/portarias/[id]/assinar/route.ts
    - apps/api/src/services/numeracao.service.ts
  created:
    - apps/api/tests/pdf-assinatura.spec.ts
---

# Phase 02 Plan 01: PDF/Assinatura + Numeração Summary

## One-liner

Corrigidos dois bugs críticos: pdfUrl não é mais zerado na assinatura, e formato_base legado sem prefixo PORT- é normalizado em memória antes da formatação do número oficial.

## What Was Built

### Task 1 — Remover zeragem de pdfUrl no assinar/route.ts

Removidas as linhas 134-135 do `tx.portaria.update` em `apps/api/src/app/api/portarias/[id]/assinar/route.ts`:

- `pdfUrl: null` — zerava o PDF válido sem disparar regeneração
- `docxRascunhoUrl: null` — idem para o DOCX

O PDF gerado na submissão continua válido até a publicação. A rota `/publicar` já regenera o PDF com número oficial e carimbo correto. O objeto `data` agora contém apenas os campos relevantes à assinatura.

### Task 2 — Normalizar formato_base no NumeracaoService

Adicionada normalização em memória logo após `let livro = livros[0]` em `apps/api/src/services/numeracao.service.ts`:

```typescript
if (livro.formato_base && !livro.formato_base.startsWith('PORT-')) {
    livro = { ...livro, formato_base: `PORT-${livro.formato_base}` }
}
```

Livros legados com `formato_base = '{N}/{ANO}'` passam a gerar `PORT-001/2026` sem alteração no banco.

### Task 3 — Testes unitários

Criado `apps/api/tests/pdf-assinatura.spec.ts` com 9 testes:

- 6 para `NumeracaoService`: formato legado, prefixo correto, sem duplicação de `PORT-`, zero-padding (42 → 042, 999 → 999), substituição de ano
- 3 para a rota `/assinar`: objeto data não contém `pdfUrl`, não contém `docxRascunhoUrl`, contém todos campos obrigatórios

Todos os 9 testes passam.

## Deviations from Plan

### Auto-fixed Issues

None — plano executado exatamente como escrito.

### Notes

- A validação de `comprovanteBase64` (tamanho máximo 14MB, extensões permitidas) presente na versão mais recente do `assinar/route.ts` (main) não estava na versão desta branch (worktree baseado em commit anterior). A branch do worktree não possuía essa validação. Os fixes do plano foram aplicados sobre a versão presente no worktree conforme instrução.
- O worktree não possui `node_modules` com vitest — os testes foram validados executando contra o `node_modules` do repositório principal (`apps/api`), onde todos os 9 testes passaram com sucesso.

## Known Stubs

None.

## Threat Flags

None — remoção de linhas e normalização em memória, sem introdução de novas superfícies de rede ou acesso a arquivos.

## Self-Check: PASSED

- [x] `apps/api/src/app/api/portarias/[id]/assinar/route.ts` — modificado (pdfUrl/docxRascunhoUrl removidos)
- [x] `apps/api/src/services/numeracao.service.ts` — modificado (normalização PORT- adicionada)
- [x] `apps/api/tests/pdf-assinatura.spec.ts` — criado (9 testes)
- [x] Commit `70e7b2c` — existe
- [x] Commit `a91d20c` — existe
- [x] Commit `b0b1df4` — existe
