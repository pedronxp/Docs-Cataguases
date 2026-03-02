# Design: Página de Variáveis Globais — Melhorias

**Data:** 2026-03-01
**Status:** Aprovado — pronto para implementação

---

## Decisões

| Pergunta | Decisão |
|---|---|
| Objetivo | Tudo: corrigir bugs + melhorar |
| Campo `tipo` | Cosmético apenas (exibido na tabela, não salvo no banco) |
| Importação em lote | Script de seed separado (`prisma/seed.ts`) |
| Confirmação de exclusão | Dialog do shadcn/ui (substituir `confirm()` nativo) |
| Audit log | Página `/admin/logs` consumindo `FeedAtividade` |

---

## O que muda

### 1. Página `/admin/variaveis`
- **Busca funcional**: filtro em memória por `chave` e `descricao`
- **Dialog de exclusão**: substitui `confirm()` nativo, mostra aviso de risco
- **Bloqueio de variáveis automáticas**: `resolvidaAutomaticamente=true` → campos disabled + banner amarelo no modal
- **Badge de tipo**: exibe tipo visual na tabela (sem salvar no banco)

### 2. Novos estados
```ts
const [searchQuery, setSearchQuery] = useState('')
const [deleteTarget, setDeleteTarget] = useState<VariavelSistema | null>(null)
const [deleting, setDeleting] = useState(false)
```

### 3. Audit log no backend
Novos `tipoEvento` no `FeedAtividade`:
- `VARIAVEL_CRIADA`
- `VARIAVEL_EDITADA`
- `VARIAVEL_EXCLUIDA`

Registrado nas rotas `POST`, `PATCH` e `DELETE` de `/api/admin/variaveis`.

### 4. Nova rota `/api/admin/feed`
GET com query params: `tipoEvento`, `autorId`, `dias` (7/30/90).
Retorna lista paginada do `FeedAtividade`.

### 5. Nova página `/admin/logs`
- Filtros: tipo de ação, usuário, período
- Lista cronológica com avatar do autor, mensagem e timestamp
- Botão "Exportar CSV"
- Visível apenas para `ADMIN_GERAL`

### 6. Script de seed
`apps/api/prisma/seed.ts` — insere 12 variáveis sugeridas via `upsert`.
Executar com: `npx tsx prisma/seed.ts`

---

## Arquivos afetados

| Arquivo | Tipo |
|---|---|
| `apps/web/src/routes/_sistema.admin.variaveis.tsx` | Modificar |
| `apps/web/src/types/domain.ts` | Modificar (novos tipoEvento) |
| `apps/web/src/routes/_sistema.admin.logs.tsx` | Criar |
| `apps/web/src/routeTree.gen.ts` | Modificar |
| `apps/web/src/services/feed.service.ts` | Criar |
| `apps/web/src/components/shared/AppSidebar.tsx` | Modificar (link logs) |
| `apps/api/src/app/api/admin/variaveis/route.ts` | Modificar (audit log) |
| `apps/api/src/app/api/admin/variaveis/[id]/route.ts` | Modificar (audit log) |
| `apps/api/src/app/api/admin/feed/route.ts` | Criar |
| `apps/api/prisma/seed.ts` | Criar |
