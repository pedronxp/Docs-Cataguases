# agents/_modulos/AUDITORIA_LOTE.en.md — BATCH SIGNATURE AND AUDIT
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_modulos/ASSINATURA.en.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file specifies two advanced features:
1. **Batch Signature:** Productivity for Top Management to sign multiple documents simultaneously
2. **Audit Trail:** Technical log of all critical system actions

---

## 1. BATCH SIGNATURE (PRODUCTIVITY)

### 1.1. Problem and Solution

**Problem:** Mayor/Secretary cannot open 50 portarias one by one to sign.

**Solution:** New tab in "Portarias" screen called "Awaiting My Signature" with multi-select checkboxes.

### 1.2. CASL Permission

No new permission needed. If user has `can('publicar', 'Portaria')`, they have access to batch functionality.

### 1.3. UI Changes: "Portarias List" Screen

**Route:** `/_sistema/administrativo/portarias`

**Add Tabs:**
- Tab 1: "All Portarias" (existing standard table)
- Tab 2: "Awaiting My Signature" (appears only if user has documents where `assinanteId === usuario.id`)

### 1.4. Batch Business Logic

**Expected behavior:**
1. User selects multiple portarias with `status = 'AGUARDANDO_ASSINATURA'`
2. Clicks "Sign Batch" → opens confirmation modal
3. Types password → backend validates (Cycle 1: mock `'123456'`, Cycle 3: Supabase Auth)
4. Backend iterates over ID array:
   - Validates each portaria is in `AGUARDANDO_ASSINATURA`
   - Generates SHA-256 hash: `hash = SHA256(pdfBinary)` (Cycle 3) or mock (Cycle 1)
   - Updates: `status = 'PUBLICADA'`, `hashAssinatura = hash`, `updatedAt = now()`
5. Returns result: `{ sucesso: string[], falha: string[] }`
6. Frontend shows toast with summary
7. Invalidates query and resets checkboxes

---

## 2. AUDIT TRAIL (SECURITY)

### 2.1. Problem and Solution

**Problem:** `FeedAtividade` is for end users, doesn't record technical data or deletions for legal audit.

**Solution:** `AuditLog` table invisible to common users, accessible only by `ADMIN_GERAL` in new screen.

### 2.2. Prisma Model (Cycle 3)

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String   // Who did it
  action    String   // E.g., UPDATE_USER_ROLE, DELETE_PORTARIA, SIGN_LOTE
  entity    String   // Affected table: Usuario, Portaria, Modelo
  entityId  String   // Affected record ID
  oldData   Json?    // Previous state (null for CREATE)
  newData   Json?    // New state (null for DELETE)
  ipAddress String?  // Request IP
  userAgent String?  // Browser/client used
  createdAt DateTime @default(now())

  user Usuario @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

### 2.3. Audited Actions

| Action | When | Recorded Data |
|---|---|---|
| `CREATE_PORTARIA` | New portaria created | `newData`: complete portaria |
| `UPDATE_PORTARIA` | Portaria edited | `oldData` + `newData`: diff |
| `DELETE_PORTARIA` | Portaria deleted | `oldData`: complete portaria |
| `SIGN_PORTARIA` | Individual signature | `newData`: hash, status |
| `SIGN_LOTE` | Batch signature | `newData`: array of IDs |
| `UPDATE_USER_ROLE` | Permission change | `oldData.role` + `newData.role` |
| `DEACTIVATE_USER` | User deactivated | `oldData.ativo` + `newData.ativo` |
| `CREATE_MODELO` | New template created | `newData`: complete template |
| `UPDATE_MODELO` | Template edited | `oldData` + `newData`: diff |

### 2.4. New Screen: Audit

**Route:** `/_sistema/admin/auditoria`

**Permission:** `ability.can('gerenciar', 'all')` (ADMIN_GERAL only)

**Features:**
- Filters by user, action, period
- Pagination of 50 items per page
- Click row opens modal with complete JSON diff (`oldData` vs. `newData`)
- "Export" button generates CSV of filtered query
- Search by IP or UserAgent

### 2.5. Backend Endpoint (Cycle 3)

```
GET /api/auditoria
  Query:   userId?, action?, entity?, dataInicio?, dataFim?, page, pageSize
  Auth:    Requires gerenciar:all (ADMIN_GERAL)
  Returns: PaginatedResponse<AuditLog>

GET /api/auditoria/export
  Query:   Same filters
  Auth:    Requires gerenciar:all
  Returns: CSV file (Content-Type: text/csv)
```

---

## 3. ACCEPTANCE CRITERIA

### Batch Signature
- [ ] "Awaiting My Signature" tab visible only for those with `publicar:Portaria`
- [ ] Badge with pending counter on tab
- [ ] Multi-select checkboxes working
- [ ] Floating bar appears when selecting 1+ documents
- [ ] "Sign Batch" button opens confirmation modal
- [ ] Modal requires password and shows document count
- [ ] Batch signature works correctly (mock service)
- [ ] Success/failure toast displayed
- [ ] Query invalidated and checkboxes reset after signature

### Audit
- [ ] Screen accessible only to `ADMIN_GERAL`
- [ ] 403 redirect for other roles
- [ ] Filters by user, action, period working
- [ ] Table with 50-item pagination
- [ ] Click row opens modal with JSON diff
- [ ] "Export" button generates CSV (mock)
- [ ] Logs sorted by descending date

---

## 4. COMPLETION CHECKLIST (Cycle 1)

### Batch Signature
- [ ] "Awaiting My Signature" tab added to Portarias screen
- [ ] `AssinaturaLoteTable.tsx` created
- [ ] `ModalAssinaturaLote.tsx` created
- [ ] `assinarLote` service in `assinatura.service.ts` (already in MOCKS.md)
- [ ] Checkbox and multi-select logic implemented
- [ ] Floating bar with counter implemented
- [ ] Confirmation modal with password input implemented
- [ ] Success/failure toast implemented
- [ ] Query invalidation after signature implemented

### Audit
- [ ] `AuditLog` model added to Prisma schema (Cycle 3 preparation)
- [ ] `src/services/auditoria.service.ts` created with mocks
- [ ] TypeScript interfaces: `AuditLog`, `AuditoriaFiltro`
- [ ] `src/routes/_sistema/admin/auditoria.tsx` created
- [ ] Table with filters implemented
- [ ] JSON diff modal implemented
- [ ] "Export CSV" button implemented (mock)
- [ ] ABAC control (gerenciar:all) applied
- [ ] "Audit" item added to sidebar (Admin section)
- [ ] 50-item pagination working
