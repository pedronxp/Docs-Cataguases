# agents/_modulos/VALIDACAO_PUBLICA.en.md — PUBLIC VALIDATION PAGE
# Read alongside: agents/_base/AGENTS.md | agents/_infraestrutura/BACKEND.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file specifies the public `/validar/[hash]` page and the `GET /api/validar/[hash]` endpoint.
Fully public access — no login, no JWT token, no ABAC.
Any citizen with a document hash can verify its authenticity.

---

## 1. CONCEPT

Every published portaria receives a `hashAssinatura` (SHA-256 of the PDF binary in hex).
Any citizen who receives a printed or digital copy can access:

```
https://docs.cataguases.mg.gov.br/validar/[hashAssinatura]
```

And the system instantly confirms whether the document is legitimate.

---

## 2. FRONTEND ROUTE (`/validar`)

**File:** `src/routes/validar.$hash.tsx` (public route — outside the authenticated layout)

**Behavior:**
- Does not require login. Guard Router does not block.
- On mount, calls `GET /api/validar/[hash]`
- While loading: centered skeleton loader
- If found: shows green confirmation block
- If not found / invalid hash: shows red alert block

---

## 3. UI — DOCUMENT FOUND

- Background: `bg-green-50`, border: `border-green-200`, icon: green `✓`
- Shows: title, numeroOficial, publication date, signer name, secretaria name, full SHA-256 hash
- Button "View Official PDF" opens `pdfUrl` in new tab
- Button "Back to Home" redirects to `/`

---

## 4. UI — DOCUMENT NOT FOUND

- Background: `bg-red-50`, border: `border-red-200`, icon: red `✕`
- Message: hash not found in the system, verify it was copied correctly

---

## 5. BACKEND ENDPOINT (Cycle 3)

```
GET /api/validar/[hash]
  Auth:      NOT required (public)
  ABAC:      NOT applied
  Validates: hash format (Zod: 64-char hex string or mock prefix)
  Query:     SELECT id, titulo, numeroOficial, assinadoEm, pdfUrl,
                    assinante { name }, secretaria { nome }
             FROM Portaria
             WHERE hashAssinatura = hash AND status = 'PUBLICADA'
  200 Return:
    {
      id, titulo, numeroOficial,
      assinadoEm,   // ISO timestamp
      pdfUrl,       // public Supabase Storage link
      assinante: { name },
      secretaria: { nome }
    }
  404 Return: { error: 'Document not found.' }
  400 Return: { error: 'Invalid hash.' }
```

**Important:** Do NOT expose sensitive fields (CPF, form data, autorId).

---

## 6. FOOTER SEAL IN PDF

The DOCX template must include the `{{SYS_CHANCELA_RODAPE}}` tag in the footer.
The backend replaces it with:

```
Electronic document published by Doc's Cataguases System.
Verify authenticity at: https://docs.cataguases.mg.gov.br/validar/[hashAssinatura]
SHA-256 Hash: [hashAssinatura]
```

Font: size 8, gray, centered.

---

## 7. COMPLETION CHECKLIST (Cycle 3)

- [ ] `GET /api/validar/[hash]` returns correct data without authentication
- [ ] `GET /api/validar/[hash]` returns 404 for unknown hash
- [ ] `GET /api/validar/[hash]` returns 400 for malformed hash
- [ ] `/validar/[hash]` page accessible without login (Guard Router does not block)
- [ ] Green block with complete data of published document
- [ ] Red block for hash not found
- [ ] "View Official PDF" button opens PDF in new tab
- [ ] `SYS_CHANCELA_RODAPE` correctly substituted in final PDF
