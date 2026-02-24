# agents/_modulos/LAYOUT_ASSINATURA.en.md — SIGNATURE POSITIONING IN DOCX
# Read alongside: agents/_base/AGENTS.md | agents/_modulos/ASSINATURA.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file ensures the electronic signature is rendered in the correct position
within the document, following the Official Writing Manual (Manual de Redação Oficial).
The responsibility for WHERE the signature appears belongs to the `.docx` template, not the code.

---

## 1. THE LAYOUT PROBLEM

Systems that try to "inject" a signature on top of a rendered PDF often break the layout,
overlap text, or generate blank pages.
In public agencies, signature alignment (right, center) is strict and regulated.

---

## 2. THE SOLUTION: SSOT IN WORD

The Admin inserts the tags below at the exact location in Microsoft Word where
the signature should appear (centered, right-aligned, with or without a top line).

### SYS_ Signature Tags

| Tag | Replaced with |
|---|---|
| `{{SYS_ASSINANTE_NOME}}` | `user.name` of the signer |
| `{{SYS_ASSINANTE_CARGO}}` | Formatted `user.role` (e.g., Mayor) |
| `{{SYS_DATA_ASSINATURA}}` | Timestamp of the signing click (e.g., Jan 10, 2026) |
| `{{SYS_CHANCELA_RODAPE}}` | Legal text + SHA-256 hash (font size 8, footer) |

> In Cycle 1: add these keys to the System Variables screen table
> so the Admin knows they must be used in templates.

---

## 3. BACKEND FLOW ON SIGNING (Cycle 3)

When `PATCH /api/portarias/[id]/assinar` is called:

```
1. Backend downloads the .docx draft from Supabase Storage
2. Performs replace() of SYS_ASSINANTE_* tags with the signer's real data
3. Replaces SYS_CHANCELA_RODAPE with legal text + generated hashAssinatura
4. Sends the final .docx to CloudConvert
5. CloudConvert returns the immutable PDF
6. PDF saved to Supabase Storage as the official final version
7. Database updated: pdfUrl → final PDF URL, status → PUBLICADA
```

---

## 4. PREVIEW BEFORE SIGNING

**Problem:** The signer needs to see where their signature will appear before confirming.
They must not see raw tags like `{{SYS_ASSINANTE_NOME}}`.

**Solution:** Two distinct PDFs per portaria.

### Preview PDF (generated when transitioning RASCUNHO → PROCESSANDO)
Backend replaces signature tags with friendly placeholders:

| Original tag | Preview placeholder |
|---|---|
| `{{SYS_ASSINANTE_NOME}}` | `[ Electronic Signature Location ]` |
| `{{SYS_DATA_ASSINATURA}}` | `[ Date and Time of Signature ]` |
| `{{SYS_CHANCELA_RODAPE}}` | `[ Validation seal with Hash will be inserted here ]` |

This is the PDF shown in statuses `PENDENTE`, `APROVADA`, and `AGUARDANDO_ASSINATURA`.

### Final PDF (generated at the moment of signing)

```
1. Backend fetches the original .docx draft (ignores the preview PDF)
2. Replaces tags with real, cryptographic, final data
3. Generates new PDF via CloudConvert
4. Overwrites pdfUrl in the database with the definitive PDF link
```

> In Cycle 1: the frontend iframe shows only a mock PDF.
> The developer uses sample PDFs with signature design to simulate the visual experience.

---

## 5. COMPLETION CHECKLIST (Cycle 3)

- [ ] Preview PDF generated with placeholders on operator submit
- [ ] Final PDF generated with real data on signing click
- [ ] `pdfUrl` overwritten after signing
- [ ] `SYS_CHANCELA_RODAPE` with hash and public validation URL
- [ ] Frontend iframe shows correct PDF according to status
