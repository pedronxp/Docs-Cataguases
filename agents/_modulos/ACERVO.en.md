# agents/_modulos/ACERVO.en.md — DOCUMENT ARCHIVE
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_modulos/ASSINATURA.en.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file specifies the Document Archive screen (`/_sistema/acervo`).
The Archive is a historical repository of published portarias, with advanced search and filters.
DO NOT confuse with the Portarias List (operational work queue).

---

## 1. DIFFERENCE: LIST vs. ARCHIVE

### Portarias List (`/_sistema/administrativo/portarias`)
- Operational work queue
- Shows: RASCUNHO, PROCESSANDO, PENDENTE, APROVADA, AGUARDANDO_ASSINATURA, FALHA_PROCESSAMENTO
- Purpose: manage in-progress documents
- Actions: submit, approve, reject, send for signature, sign

### Document Archive (`/_sistema/acervo`)
- Historical consultation repository
- Shows: PUBLICADA (default), APROVADA, PENDENTE (optional by filter)
- Purpose: search, consult and download official published documents
- Actions: view PDF, download, see details

---

## 2. ABAC RULES — DATA ISOLATION

| Role | Access |
|---|---|
| `OPERADOR` | Portarias from own `secretariaId` |
| `GESTOR_SETOR` | Portarias from own `setorId` within `secretariaId` |
| `SECRETARIO` | All portarias from own `secretariaId` |
| `SECRETARIO` with `visualizar:PortariaGlobal` | **All secretarias** (e.g., Secretary of Administration) |
| `ADMIN_GERAL`, `PREFEITO` | Everything (via `gerenciar: all`) |

**NEVER show:** `RASCUNHO`, `PROCESSANDO`, `FALHA_PROCESSAMENTO`.

---

## 3. NEW PERMISSION: `visualizar:PortariaGlobal`

In `src/lib/ability.ts`, add to `Subjects`:

```typescript
export type Subjects =
  | 'all'
  | 'Usuario'
  | 'Portaria'
  | 'PortariaGlobal'  // NEW
  | 'Modelo'
  // ...
```

The permission is automatically covered by the existing `permissoesExtra` loop in `buildAbility`.
`ADMIN_GERAL` can add `"visualizar:PortariaGlobal"` to a user's `permissoesExtra` array.

### In User Management Screen

Add checkbox:

```typescript
const PERMISSOES_DISPONIVEIS = [
  { value: 'deletar:Portaria',          label: 'Delete Portarias' },
  { value: 'aprovar:Portaria',          label: 'Approve Portarias' },
  { value: 'publicar:Portaria',         label: 'Sign and Publish Portarias' },
  { value: 'gerenciar:Modelo',          label: 'Manage Document Templates' },
  { value: 'visualizar:PortariaGlobal', label: 'View archive of ALL Secretarias' }, // NEW
]
```

---

## 4. SCREEN LAYOUT

Folders panel (left side):
- **Without `visualizar:PortariaGlobal`:** panel hidden, shows only own secretaria's portarias
- **With `visualizar:PortariaGlobal` or `ADMIN_GERAL`/`PREFEITO`:** panel visible with all secretarias
- Clicking a folder filters portarias on the right
- Badge shows total published documents per folder

---

## 5. AVAILABLE FILTERS

| Filter | Type | Description |
|---|---|---|
| Search | text | Searches in: `numeroOficial`, `titulo`, `dadosFormulario` values |
| Year | select | Filters by `numeroOficial` year (e.g., 2025) |
| Setor | select | Filters by `setorId` (only in active secretaria) |
| Status | checkbox | `PUBLICADA` (default active), `APROVADA`, `PENDENTE` |

---

## 6. TABLE COLUMNS

| Column | Visibility | Description |
|---|---|---|
| Official Number | always | e.g., `042/2025` |
| Title | always | Portaria title |
| Secretaria | `visualizar:PortariaGlobal` only | Secretaria name/acronym |
| Setor | optional | Issuing setor |
| Publication Date | always | Formatted `updatedAt` |
| Actions | always | [View PDF] [Details] |

---

## 7. ABAC LOGIC IN FRONTEND

```typescript
// src/routes/_sistema/acervo/index.tsx (summary)

const ability = useAbility(AbilityContext)
const { usuario } = useAuthStore()

const podeVerTodasSecretarias =
  ability.can('gerenciar', 'all') ||
  ability.can('visualizar', 'PortariaGlobal')

const [secretariaAtivaId, setSecretariaAtivaId] = useState<string>(
  podeVerTodasSecretarias ? '' : (usuario?.secretariaId ?? '')
)
```

---

## 8. BACKEND ENDPOINTS (Cycle 3)

```
GET /api/acervo
  Query:   secretariaId, busca, ano, setorId, page, pageSize, status[]
  ABAC:    buildFiltroSeguranca applied first
           If user lacks visualizar:PortariaGlobal → force secretariaId = usuario.secretariaId
  Returns: PaginatedResponse<Portaria>

GET /api/acervo/contadores
  Returns: Record<secretariaId, total> for folder badges
  ABAC:    Respecting isolation (no visualizar:PortariaGlobal → only own secretaria)
```

---

## 9. COMPLETION CHECKLIST (Cycle 1)

- [ ] `'PortariaGlobal'` added to `Subjects` in `src/lib/ability.ts`
- [ ] Checkbox `visualizar:PortariaGlobal` in User Management screen
- [ ] `src/services/acervo.service.ts` created with `buscarAcervo` and `contarPorSecretaria`
- [ ] `src/components/features/acervo/PastaSecretaria.tsx` created
- [ ] `src/components/features/acervo/AcervoTable.tsx` created
- [ ] `src/components/features/acervo/AcervoPagination.tsx` created
- [ ] `src/routes/_sistema/acervo/index.tsx` created
- [ ] "Acervo" item added to `AppSidebar.tsx` with `Archive` icon
- [ ] Mocks updated: 3+ `PUBLICADA` portarias from different secretarias in `mockDB.portarias`
- [ ] ABAC logic tested: user without permission sees only own secretaria
- [ ] ABAC logic tested: user with `visualizar:PortariaGlobal` sees all secretarias
