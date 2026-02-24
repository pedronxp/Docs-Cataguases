# agents/_modulos/PAPEL_TIMBRADO.en.md — LETTERHEAD MANAGEMENT
# Read alongside: agents/_base/AGENTS.md | agents/_modulos/GESTAO_MODELOS.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file defines the architectural rule for how the system handles
logos, headers and footers of different secretarias (Letterhead).

---

## 1. GOLDEN RULE: WORD IS THE SINGLE SOURCE OF TRUTH (SSOT)

**Architectural Principle:**

The Doc's Cataguases system **DOES NOT HAVE** functionality to upload secretaria logos
for dynamic injection over PDF. This would cause:
- Broken margins
- Content misalignment
- Unnecessary image positioning complexity
- Visual inconsistency between documents

**Solution:**

All fixed visual elements (City Hall Logo, Secretaria Logo, footer address,
watermark, base typography) MUST come **natively embedded inside the .docx file**
created by the Administrator in Microsoft Word.

---

## 2. ADVANTAGES OF THIS APPROACH

### 2.1. Full Design Control

- City Hall designer has pixel-perfect control in Word
- No position or size limitations imposed by the system
- Can use advanced Word features (watermark, different header/footer per section)

### 2.2. No Complex Rendering Logic

- System doesn't need to manipulate images
- No margin or overlay calculations
- CloudConvert/LibreOffice receives complete `.docx` and generates faithful PDF

### 2.3. Scalability

- Each Secretaria can have multiple templates with different designs
- Oficios, Memos, Portarias: all use the same engine
- Design update: just re-upload `.docx` (no deploy required)

### 2.4. Compatibility

- Any logo/image/font supported by Word works
- No format or resolution restrictions

---

## 3. HOW IT WORKS IN PRACTICE

### 3.1. Template Creation (Admin in Word)

**Step 1:** Admin opens Microsoft Word

**Step 2:** Creates letterhead:
- Insert → Header: City Hall Logo (left) + Secretaria Logo (right)
- Insert → Footer: Address, Phone, Website
- Configure adequate margins
- Define title, paragraph styles

**Step 3:** Adds placeholders (fill tags):
```
PORTARIA Nº {{numero}}

The Secretary of {{secretaria}}, in use of their legal powers...

R E S O L V E S:

Art. 1º - {{artigo_1}}

Art. 2º - This Portaria takes effect on its publication date.

{{cidade}}, {{data}}

_______________________________
{{nome_assinante}}
{{cargo_assinante}}
```

**Step 4:** Saves as `portaria-nomeacao-saude.docx`

### 3.2. Upload in Screen 9 (Templates Management)

**Route:** `/_sistema/admin/modelos`

Admin clicks "New Template" and fills:

| Field | Value | Description |
|---|---|---|
| **Name** | `Appointment Portaria - Health` | Friendly name for operators |
| **Type** | `PORTARIA` | Document category |
| **File** | `portaria-nomeacao-saude.docx` | Created `.docx` upload |
| **Visibility** | `Health Secretaria` | Restricted to this secretaria |
| **Active** | `☑️ Yes` | Available for use |

**Result:**
- Stored file: `/storage/modelos/portaria-nomeacao-saude.docx`
- Only Health Secretaria users see this template in Wizard

---

## 4. VISIBILITY STRUCTURE

### 4.1. General Template (secretariaId = null)

**Who sees:** All users, regardless of secretaria

**Typical use:**
- Mayor's Office Portarias
- Generic templates for common use
- Standard City Hall letterhead

### 4.2. Specific Template (secretariaId != null)

**Who sees:** Only users with `usuario.secretariaId === modelo.secretariaId`

**Typical use:**
- Secretaria's personalized letterhead
- Templates with specific fields for a department
- Different layout per agency

---

## 5. FILTERING LOGIC (BACKEND)

```typescript
export async function listarModelosDisponiveis(): Promise<Result<Modelo[]>> {
  const usuarioAtual = obterUsuarioAutenticado()
  
  // Fetch general templates + user's secretaria templates
  const modelos = await prisma.modelo.findMany({
    where: {
      ativo: true,
      OR: [
        { secretariaId: null }, // General templates
        { secretariaId: usuarioAtual.secretariaId }, // Secretaria templates
      ],
    },
    orderBy: { nome: 'asc' },
  })
  
  return ok(modelos)
}
```

---

## 6. SUPPORT FOR OFICIOS AND MEMOS

### 6.1. Agnosticism Principle

Since visual responsibility belongs to the `.docx` file, the system **is already 100% ready**
to generate Oficios, Memos, Decrees, etc.

### 6.2. Flow to Add New Type

**Step 1:** Admin creates `.docx` with Oficio layout in Word

**Step 2:** Uploads in Screen 9, selecting `Type: OFICIO`

**Step 3:** System stores normally

**Step 4:** Operator uses Wizard (same Portaria flow)

**Step 5:** Fill engine:
- Reads `.docx`
- Replaces tags `{{campo}}`
- Sends to CloudConvert
- Generates final PDF

**No code difference.** Engine is design-agnostic.

---

## 7. TECHNICAL SPECIFICATIONS

### 7.1. File Upload

| Property | Value |
|---|---|
| Accepted format | `.docx` (Microsoft Word 2007+) |
| Max size | 5MB |
| Storage | `/storage/modelos/` or Supabase Storage |
| Validation | Magic bytes: `50 4B 03 04` (ZIP) |

### 7.2. Prisma Model

```prisma
model Modelo {
  id           String   @id @default(cuid())
  nome         String
  tipo         TipoDocumento // PORTARIA, OFICIO, MEMORANDO, DECRETO
  arquivoUrl   String
  secretariaId String?
  ativo        Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  secretaria Secretaria? @relation(fields: [secretariaId], references: [id])
  portarias  Portaria[]

  @@index([secretariaId])
  @@index([tipo])
}

enum TipoDocumento {
  PORTARIA
  OFICIO
  MEMORANDO
  DECRETO
}
```

---

## 8. ACCEPTANCE CRITERIA

- [ ] "Visibility" field in New Template modal
- [ ] "General" option creates template with `secretariaId = null`
- [ ] "Specific" option requires Secretaria selection
- [ ] `.docx` upload accepts only Word files
- [ ] Max size validation (5MB)
- [ ] Templates list automatically filtered by user's secretaria
- [ ] General templates (secretariaId = null) visible to all
- [ ] Specific templates visible only to correct secretaria
- [ ] Admin can deactivate templates without deleting
- [ ] Portaria Wizard lists only active and visible templates
- [ ] Template upload with embedded letterhead works without PDF modification
- [ ] CloudConvert preserves logos and formatting from original `.docx`

---

## 9. COMPLETION CHECKLIST (Cycle 1)

- [ ] `Modelo` model in Prisma Schema with optional `secretariaId` field
- [ ] `TipoDocumento` enum created (PORTARIA, OFICIO, MEMORANDO, DECRETO)
- [ ] `src/services/modelo.service.ts` with visibility filtering logic
- [ ] `ModalNovoModelo.tsx` with "Visibility" field (General vs. Specific)
- [ ] RadioGroup to choose visibility type
- [ ] Conditional Secretarias Select (appears only if Specific)
- [ ] Upload validation: `.docx` only, max 5MB
- [ ] Endpoint `GET /api/modelos` with automatic secretaria filter
- [ ] Endpoint `POST /api/modelos` with file upload
- [ ] Filtering tests: user sees only allowed templates
- [ ] Admin documentation on how to create letterhead in Word
