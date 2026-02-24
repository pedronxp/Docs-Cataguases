# agents/_modulos/TUTORIAL.en.md — HELP CENTER AND TUTORIALS
# Read alongside: agents/_base/AGENTS.md | agents/_base/MOCKS.md
# AI: This is the English version for better technical comprehension. Always RESPOND in pt-BR.

---

## IDENTITY

This file defines the interactive and dynamic Help Center of the system.
Searchable tutorials, role-based, with FAQs and visual step-by-step guides.

---

## 1. HELP CENTER CONCEPT (GOVTECH)

**Problem:** 50-page PDF manuals don't work.

**Solution:** Modern Help Center with:

### 1.1. Features

1. **Searchable:** Top search bar that filters instantly
2. **Role-Based:**
   - "Administration" tab ONLY appears for `ADMIN_GERAL` or `PREFEITO`
   - "Operation" tab appears for everyone (create portaria, upload)
3. **Visual:** Cards simulating "Short Videos" and "Step by Step"
4. **Dynamic FAQ:** `Accordion` component (Shadcn) for frequent questions
5. **Contextual:** Specific tutorials per functionality

---

## 2. ROUTE AND SIDEBAR

### 2.1. New Route

```
/_sistema/tutorial
```

### 2.2. Sidebar Update

```typescript
import { HelpCircle } from 'lucide-react'

// At end of items array, separated:
{
  separador: true, // Adds divider line
},
{
  to: '/_sistema/tutorial',
  label: 'Central de Ajuda',
  icon: HelpCircle,
  action: 'ler',
  subject: 'all', // Everyone has access
}
```

---

## 3. PAGE STRUCTURE

### 3.1. General Layout

- Header with search bar
- Tabs: "Operation" (all) + "Administration" (admins only)
- Video tutorials section (cards with play icons)
- FAQ section (expandable accordion)
- Step-by-step guides section (clickable list)

---

## 4. MOCK CONTENT (Cycle 1)

### 4.1. Operation Tutorials

- How to create a portaria
- Digitally sign portarias
- Consult official archive
- Upload external documents

### 4.2. Administration Tutorials

- Manage users and permissions
- Create and edit document templates
- Configure secretarias and sectors
- Analytics dashboard
- Audit trail

---

## 5. FUTURE IMPROVEMENTS (Cycle 3)

### 5.1. Real Videos

- Vimeo or YouTube integration for video embeds
- Screencast recording with narration
- Subtitles and transcriptions

### 5.2. Advanced Search

- Full-text search with Algolia or ElasticSearch
- Auto-suggestions (autocomplete)
- Search history

### 5.3. User Feedback

- "Helpful" / "Not helpful" buttons on each FAQ
- Comment system
- Suggest new tutorials

### 5.4. Interactive Guides

- Step-by-step with interface highlights
- Contextual tooltips
- Onboarding tours with Shepherd.js or similar

---

## 6. ACCEPTANCE CRITERIA

- [ ] Page `/_sistema/tutorial` accessible to all users
- [ ] "Help Center" item added to sidebar (footer)
- [ ] Search bar working with instant filter
- [ ] "Operation" tab visible to all
- [ ] "Administration" tab visible only to `ADMIN_GERAL` and `PREFEITO`
- [ ] Video tutorial cards rendered (placeholder for now)
- [ ] FAQs displayed with working Accordion
- [ ] Step-by-step guides listed with links
- [ ] Search filters tutorials, FAQs and guides simultaneously
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] No real videos in Cycle 1 (placeholders only)

---

## 7. COMPLETION CHECKLIST (Cycle 1)

- [ ] `src/routes/_sistema/tutorial.tsx` created
- [ ] `CardVideoTutorial.tsx` component created
- [ ] `FAQSection.tsx` component created
- [ ] `GuiasList.tsx` component created
- [ ] `src/data/tutoriais.ts` created with mock data
- [ ] Arrays: `TUTORIAIS_OPERACAO`, `TUTORIAIS_ADMIN`, `FAQS_OPERACAO`, `FAQS_ADMIN`, `GUIAS_OPERACAO`, `GUIAS_ADMIN`
- [ ] "Help Center" item added to sidebar
- [ ] `HelpCircle` icon from Lucide used
- [ ] Tabs implemented with conditional visibility
- [ ] Search bar with working filter
- [ ] Responsive layout tested
- [ ] Shadcn Accordion working in FAQs
