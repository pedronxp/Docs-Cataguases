# agents/_modulos/ASSINATURA.en.md — DIGITAL SIGNATURE FLOW
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_gestao/PROGRESS.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.
# This file COMPLEMENTS AGENTS.md. Do not replace existing content — only add to it.

---

## IDENTITY

This file specifies the digital signature flow for official orders (portarias).
Introduces the `AGUARDANDO_ASSINATURA` status, the signer selection component,
and the send/sign endpoints.
Never allow a user who is not the designated `assinanteId` to sign the document.

---

## 1. UPDATED STATE MACHINE

> This version REPLACES the state machine in AGENTS.md. Update `domain.ts` accordingly.

```
RASCUNHO (numeroOficial: null)
  → [Submit] → PROCESSANDO (number atomically written BEFORE PDF generation)
    → [PDF OK]    → PENDENTE
    → [PDF fails] → FALHA_PROCESSAMENTO (reuses number, never generates new one)
      → [Retry]   → PROCESSANDO (same number)
PENDENTE
  → [Manager approves] → APROVADA
  → [Manager rejects]  → RASCUNHO
APROVADA
  → [Manager sends for signature + selects signer]
  → Writes assinanteId + enviadoParaAssinaturaEm
  → Creates FeedAtividade PORTARIA_ENVIADA_ASSINATURA
  → AGUARDANDO_ASSINATURA (NEW STATUS)
AGUARDANDO_ASSINATURA
  → [Signer clicks "Sign and Publish"]
  → Writes hashAssinatura (SHA-256 of PDF binary in hex) + assinadoEm
  → PUBLICADA (IMMUTABLE — no field ever editable again)
```

> Supabase Realtime (live notifications) will be added in **Cycle 4**.
> In Cycle 3, the frontend uses 30s polling to update the sidebar badge.

---

## 2. CHANGES IN `src/types/domain.ts`

```typescript
// Replace STATUS_PORTARIA with this complete version
export const STATUS_PORTARIA = {
  RASCUNHO:               'RASCUNHO',
  PROCESSANDO:            'PROCESSANDO',
  PENDENTE:               'PENDENTE',
  APROVADA:               'APROVADA',
  AGUARDANDO_ASSINATURA:  'AGUARDANDO_ASSINATURA',  // NEW
  PUBLICADA:              'PUBLICADA',
  FALHA_PROCESSAMENTO:    'FALHA_PROCESSAMENTO',
} as const
export type StatusPortaria = (typeof STATUS_PORTARIA)[keyof typeof STATUS_PORTARIA]

// Replace TIPO_EVENTO_FEED with this complete version
export const TIPO_EVENTO_FEED = {
  PORTARIA_CRIADA:             'PORTARIA_CRIADA',
  PORTARIA_SUBMETIDA:          'PORTARIA_SUBMETIDA',
  PORTARIA_APROVADA:           'PORTARIA_APROVADA',
  PORTARIA_REJEITADA:          'PORTARIA_REJEITADA',
  PORTARIA_ENVIADA_ASSINATURA: 'PORTARIA_ENVIADA_ASSINATURA',  // NEW
  PORTARIA_PUBLICADA:          'PORTARIA_PUBLICADA',
  PORTARIA_FALHA:              'PORTARIA_FALHA',
  PORTARIA_RETRY:              'PORTARIA_RETRY',               // NEW
} as const
export type TipoEventoFeed = (typeof TIPO_EVENTO_FEED)[keyof typeof TIPO_EVENTO_FEED]

// Add these new fields to the Portaria interface (preserve existing ones)
export interface Portaria {
  // ... existing fields ...
  hashAssinatura:          string | null  // SHA-256 of PDF binary in hex (64 chars). Never null after PUBLICADA.
  assinanteId:             string | null  // NEW — id of the user designated to sign
  enviadoParaAssinaturaEm: string | null  // NEW — ISO timestamp when sent for signature
  assinadoEm:              string | null  // NEW — ISO timestamp when signed
  assinante?: Pick<Usuario, 'id' | 'name' | 'role'>  // NEW — signer's data (include)
}
```

---

## 3. PRISMA SCHEMA CHANGES (`apps/api/prisma/schema.prisma`)

Add new fields to the existing Portaria model:

```prisma
model Portaria {
  // existing fields ...
  assinanteId              String?   // NEW
  enviadoParaAssinaturaEm  DateTime? // NEW
  assinadoEm               DateTime? // NEW

  // relations
  autor     Usuario  @relation("AutorPortaria",     fields: [autorId],     references: [id])
  assinante Usuario? @relation("AssinantePortaria", fields: [assinanteId], references: [id])
}
```

---

## 4. ABILITY CHANGES (`src/lib/ability.ts`)

```typescript
// Add 'enviar-assinatura' to the Actions type
type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
               'aprovar' | 'rejeitar' | 'assinar' | 'publicar' |
               'enviar-assinatura' | 'gerenciar'

// SECRETARIO block — add:
can('enviar-assinatura', 'Portaria', { secretariaId: user.secretariaId! })

// GESTOR_SETOR block — add:
can('enviar-assinatura', 'Portaria', { setorId: user.setorId! })
```

---

## 5. STATUS BADGE CHANGES (`src/components/shared/StatusBadge.tsx`)

```typescript
const STATUS_CONFIG: Record<StatusPortaria, { label: string; className: string }> = {
  RASCUNHO:               { label: 'Draft',               className: 'bg-slate-100 text-slate-700 border-slate-300' },
  PROCESSANDO:            { label: 'Processing…',         className: 'bg-blue-100 text-blue-700 border-blue-300' },
  PENDENTE:               { label: 'Awaiting Review',      className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  APROVADA:               { label: 'Approved',             className: 'bg-green-100 text-green-700 border-green-300' },
  AGUARDANDO_ASSINATURA:  { label: 'Awaiting Signature',   className: 'bg-purple-100 text-purple-700 border-purple-300' },
  PUBLICADA:              { label: 'Published',            className: 'bg-green-700 text-white border-green-700' },
  FALHA_PROCESSAMENTO:    { label: 'PDF Error',            className: 'bg-red-100 text-red-700 border-red-300' },
}
```

> Note: Labels in the pt-BR version use Portuguese. Use English labels only in this file.

---

## 6. BACKEND ENDPOINTS (Cycle 3)

```
PATCH /api/portarias/[id]/enviar-assinatura
  ABAC:      ability.can('enviar-assinatura', 'Portaria', { secretariaId })
  Validates: status === 'APROVADA'
  Validates: assinanteId exists and has can('assinar', 'Portaria')
  Action:    Write assinanteId + enviadoParaAssinaturaEm, status → AGUARDANDO_ASSINATURA
  Feed:      tipoEvento = 'PORTARIA_ENVIADA_ASSINATURA'
  Cycle 4:   Trigger Supabase Realtime to signer's channel

PATCH /api/portarias/[id]/assinar  (already exists — VALIDATE implementation)
  ABAC:      ability.can('assinar', 'Portaria')
  Validates: status === 'AGUARDANDO_ASSINATURA'
  Validates: usuario.id === portaria.assinanteId (only the designated signer)
  Action:    Generate hashAssinatura = SHA-256 of PDF binary in hex, write assinadoEm
  Status:    PUBLICADA (IMMUTABLE)
  Feed:      tipoEvento = 'PORTARIA_PUBLICADA'
  Cycle 4:   Trigger Supabase Realtime to secretaria channel
```

---

## 7. ACCEPTANCE CRITERIA

**portarias/$id screen:**
- [ ] "Send for Signature" button appears only for can('enviar-assinatura') and status === APROVADA
- [ ] Dialog lists only users with signing permission
- [ ] After sending: status → AGUARDANDO_ASSINATURA, purple block shows name and elapsed time
- [ ] "Sign and Publish" button appears only for the exact `assinanteId`
- [ ] After signing: green block shows name, date, and SHA-256 hash

**Dashboard:**
- [ ] Purple card appears for can('assinar') when pending documents exist
- [ ] Card does not appear when there are no pending items

**Sidebar:**
- [ ] Purple badge appears on Portarias item with correct count
- [ ] Badge disappears when no pending items exist
