# agents/_modulos/ONBOARDING.en.md — ONBOARDING AND SECTORS MANAGEMENT
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file specifies the Self-Registration and Onboarding flow for new servers,
including hierarchy management (Secretaria → Setores) and approval process.

---

## 1. PROBLEM (GOVTECH CONTEXT)

In city hall systems with hundreds of servers:
- Admin General cannot manually register each user
- Server needs to self-register, but cannot issue portarias immediately (security)
- City hall needs clear hierarchy management: Secretaria → Setores
- Newly registered server needs to inform which Setor they belong to

---

## 2. ARCHITECTURAL SOLUTION

### Complete Flow (5 Steps)

```
1. SELF-REGISTRATION
   Server creates account with institutional email, name and password
   ↓
2. ONBOARDING (LOTAÇÃO)
   On first login, chooses Secretaria and Setor in cascade
   ↓
3. QUARANTINE (PENDING)
   Account stays "Awaiting Release" (role: PENDENTE)
   User cannot access Dashboard
   ↓
4. APPROVAL (ADMIN)
   Admin receives alert, defines real role (OPERADOR, GESTOR_SETOR, etc.)
   ↓
5. RELEASED
   User receives email and can access system normally
```

---

## 3. DOMAIN CHANGES

### 3.1. New Role: `PENDENTE`

```typescript
export const ROLES = {
  ADMIN_GERAL: 'ADMIN_GERAL',
  PREFEITO: 'PREFEITO',
  SECRETARIO: 'SECRETARIO',
  GESTOR_SETOR: 'GESTOR_SETOR',
  OPERADOR: 'OPERADOR',
  PENDENTE: 'PENDENTE', // NEW: User who just registered
} as const
```

### 3.2. New Model: `Setor`

```typescript
export interface Setor {
  id: string
  secretariaId: string
  nome: string
  sigla?: string
  ativo: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 4. NEW ROUTES

| Route | Purpose | Access |
|---|---|---|
| `/_auth/registro` | Self-registration of new server | Public |
| `/_auth/onboarding` | Choice of Secretaria/Setor | Authenticated (PENDENTE) |
| `/_auth/aguardando` | Waiting screen post-lotação | Authenticated (PENDENTE) |
| `/_sistema/admin/usuarios` | Management + Approval Queue | ADMIN_GERAL |

---

## 5. ROUTE PROTECTION LOGIC

```typescript
if (usuario.role === 'PENDENTE') {
  if (!usuario.secretariaId) {
    // Hasn't filled lotação yet
    throw redirect({ to: '/_auth/onboarding' })
  } else {
    // Filled lotação, awaiting admin
    throw redirect({ to: '/_auth/aguardando' })
  }
}

if (!usuario.ativo) {
  // Deactivated user
  throw redirect({ to: '/_auth/login', search: { error: 'Conta desativada' } })
}

// Approved and active user → accesses normally
```

---

## 6. BACKEND ENDPOINTS (Cycle 3)

```
POST /api/auth/registro
  Body:    { name, email, password }
  Returns: { token, usuario } with role=PENDENTE

PATCH /api/auth/onboarding
  Body:    { secretariaId, setorId }
  Auth:    Requires token (role=PENDENTE)
  Returns: Updated Usuario

GET /api/usuarios/pendentes
  Auth:    Requires gerenciar:all
  Returns: Usuario[] with role=PENDENTE and secretariaId!=null

PATCH /api/usuarios/[id]/aprovar
  Body:    { role }
  Auth:    Requires gerenciar:all
  Returns: Approved Usuario (ativo=true)

DELETE /api/usuarios/[id]/recusar
  Auth:    Requires gerenciar:all
  Returns: 204 No Content

GET /api/setores?secretariaId=[id]
  Auth:    Authenticated
  Returns: Setor[]

POST /api/setores
  Body:    { secretariaId, nome }
  Auth:    Requires gerenciar:all
  Returns: Created Setor

DELETE /api/setores/[id]
  Auth:    Requires gerenciar:all
  Returns: 204 No Content
```

---

## 7. ACCEPTANCE CRITERIA

### Self-Registration
- [ ] Screen `/_auth/registro` publicly accessible
- [ ] Institutional email validation working
- [ ] Account creation with role `PENDENTE` working
- [ ] Automatic redirect to `/_auth/onboarding`

### Onboarding
- [ ] Screen `/_auth/onboarding` accessible only to `PENDENTE` without lotação
- [ ] Secretarias Select populated dynamically
- [ ] Setores Select enabled only after choosing Secretaria
- [ ] Setores cascade working (filtered by Secretaria)
- [ ] Lotação confirmation updates user
- [ ] Redirect to `/_auth/aguardando`

### Waiting
- [ ] Screen `/_auth/aguardando` accessible only to `PENDENTE` with lotação
- [ ] Displays chosen Secretaria and Setor
- [ ] Logout button working

### Approval Queue
- [ ] "Approval Queue" tab visible only to `ADMIN_GERAL`
- [ ] Badge with pending counter
- [ ] Table lists `PENDENTE` users with lotação
- [ ] "Approve" button opens modal
- [ ] Modal allows choosing final role
- [ ] Approval activates user and changes role
- [ ] "Reject" button deletes user
- [ ] Confirmation toast displayed

### Sectors Management
- [ ] "Manage Sectors" button in Secretarias table
- [ ] Drawer opens with Secretaria's Setores list
- [ ] Input + "Add" button works
- [ ] New setor created and appears in list
- [ ] "Deactivate" button works (setor disappears from list)

---

## 8. COMPLETION CHECKLIST (Cycle 1)

- [ ] Role `PENDENTE` added in `src/types/domain.ts`
- [ ] Interface `Setor` created in `src/types/domain.ts`
- [ ] `src/routes/_auth/registro.tsx` created
- [ ] `src/routes/_auth/onboarding.tsx` created
- [ ] `src/routes/_auth/aguardando.tsx` created
- [ ] "Approval Queue" tab added in `/_sistema/admin/usuarios`
- [ ] `FilaAprovacaoTable.tsx` created
- [ ] `ModalAprovarUsuario.tsx` created
- [ ] `DrawerSetores.tsx` created
- [ ] "Manage Sectors" button added in Municipal Management
- [ ] `src/services/setor.service.ts` created with mocks
- [ ] Functions `registrar`, `confirmarLotacao` added in `auth.service.ts`
- [ ] Functions `listarUsuariosPendentes`, `aprovarUsuario`, `recusarUsuario` added in `usuario.service.ts`
- [ ] Route guard for `PENDENTE` implemented in `__root.tsx`
- [ ] Secretaria → Setores cascade logic implemented
- [ ] Institutional email validation implemented
