# agents/_modulos/WIZARD_PORTARIA.en.md — PORTARIA CREATION ENGINE & WIZARD
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_gestao/PROGRESS.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file specifies the 3-step Portaria (Official Order) creation wizard engine.
Covers both the frontend (Cycle 1 — complete) and real backend integration (Cycle 3 — in progress).
Never skip the Review step. Never generate the official number on the frontend.

---

## 1. WIZARD CONCEPT (STEPPER)

The creation of an official document is split into 3 steps to reduce errors and ensure traceability:

```
[ 1. Select Template ] → [ 2. Fill in Data ] → [ 3. Review & Submit ]
```

Visual component: Stepper at the top of the page with active step indicator.

---

## 2. STEP 1: TEMPLATE SELECTION

**Data source (Cycle 1 — Mock):** `listarModelos()`
**Data source (Cycle 3 — Real):** `GET /api/admin/modelos`

**Visibility rules by role:**

| Role | Templates visible |
|---|---|
| `OPERADOR` | City-wide templates (`secretariaId: null`) + own secretaria |
| `GESTOR_SETOR` | City-wide templates (`secretariaId: null`) + own setor |
| `SECRETARIO` | City-wide + own secretaria |
| `PREFEITO` | All templates |
| `ADMIN_GERAL` | All templates |

**UI:**
- Clickable card grid (Shadcn Card with hover effect)
- Selecting a card enables the [Next →] button
- Display template name, description, and icon

---

## 3. STEP 2: DYNAMIC FORM

The form adapts itself by reading `variaveis: ModeloVariavel[]` from the selected template.
Never hardcode fields. The Admin configures, the system renders.

**Variable types and their rendered components:**

| `tipo` | Rendered component |
|---|---|
| `texto` | `<Input type="text" />` |
| `numero` | `<Input type="number" />` |
| `data` | `<Input type="date" />` |
| `moeda` | `<Input />` with `R$ 0,00` mask (react-imask) |
| `cpf` | `<Input />` with `000.000.000-00` mask (react-imask) |
| `select` | Shadcn `<Select>` using configured `opcoes[]` |

**Rules:**
1. Red asterisk `*` on labels where `obrigatorio === true`
2. On-the-fly Zod validation — do not advance if required field is empty or CPF/currency is incomplete
3. Variables prefixed with `SYS_` (e.g. `SYS_PREFEITO_NOME`) are auto-filled by the system — do NOT render them in the form
4. Buttons: [← Back] and [Next →]

---

## 4. STEP 3: REVIEW & SUBMIT

**UI:**
1. Light gray card with key/value list of filled data
2. Amber alert: *"Review your data carefully. After generating the draft, these values will be injected into the official document."*
3. Buttons: [← Edit Data] and **[ ✅ Generate Document Draft ]** (gov-blue, wide)

**Payload sent on click:**
```json
{
  "titulo": "Portaria de Nomeação - João da Silva",
  "modeloId": "uuid-of-template",
  "dadosFormulario": {
    "NOME_SERVIDOR": "João da Silva",
    "CPF_SERVIDOR": "123.456.789-00",
    "CARGO": "Assistente Administrativo"
  }
}
```

---

## 5. REAL BACKEND INTEGRATION — CYCLE 3

### Flow after clicking "Generate Draft"

```
1. Frontend calls POST /api/portarias
      ↓ immediate response:
   { id, status: 'PROCESSANDO', numeroOficial: '001/2026/SEMAD' }

2. Frontend redirects to /portarias/revisao/$id

3. Revision screen starts polling:
   GET /api/portarias/[id] every POLLING_INTERVAL_MS (5,000ms)
   Maximum POLLING_MAX_ATTEMPTS (60 attempts = 5 minutes)

4. When status changes:
   → PENDENTE              : show generated PDF + approval button
   → FALHA_PROCESSAMENTO   : show error alert (see section below)
```

### FALHA_PROCESSAMENTO state on the revision screen

When `status === 'FALHA_PROCESSAMENTO'`:
- Show destructive alert (red): *"An error occurred while generating the document. Number {{numeroOficial}} has been reserved and will be reused."*
- Show button **[ 🔄 Try Again ]**
- On click: call `PATCH /api/portarias/[id]/retry`
- Backend regenerates PDF only. **Never generates a new number.**
- Status returns to PROCESSANDO → polling restarts

---

## 6. COMPLETION CHECKLIST (Cycle 3 — Wizard)

- [ ] `POST /api/portarias` returns `{ id, status: 'PROCESSANDO', numeroOficial }`
- [ ] 5s polling working on the revision screen
- [ ] 5-minute timeout shows user-friendly error message
- [ ] `FALHA_PROCESSAMENTO` shows alert and retry button
- [ ] `PATCH /api/portarias/[id]/retry` regenerates PDF without a new number
- [ ] `GET /api/admin/modelos` replaces mock `listarModelos()`
- [ ] `SYS_*` variables auto-filled, not shown in the form
- [ ] `GESTOR_SETOR` sees only own setor templates + city-wide templates
