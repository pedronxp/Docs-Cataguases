# Design Document: Admin Livros Numeracao (Gov Standard)

## Overview
This document outlines the redesign of the `/admin/livros` (Livros de Numeração) page to align with the "gov" standard established in the SistemKT design system (specifically mirroring the aesthetic and interaction patterns of the `organograma` page).

## Goals
- Strip away the heavy, dark "hacker-like" aesthetic (`bg-slate-900`, high-saturation colored buttons).
- Adopt a clean, high-density, management-oriented layout (Management Table).
- Improve data scannability by moving from large disjointed cards to a structured, sortable list.
- Standardize interactions (Dialogs and side Sheets) to match the rest of the updated administrative portal.

## UI/UX Changes by Section

### 1. Page Header (Top Section)
- **Current:** Large black text with a colorful gradient aesthetic and a bright blue `Plus` button.
- **New Pattern:** Minimalist header. 
  - Title: "Livros de Numeração" (smaller, bold `text-slate-800` without emojis).
  - Subtitle: "Gestão centralizada de numeração de documentos oficiais." (`text-slate-500`).
  - Actions (Right-aligned): A Ghost `RefreshCw` button for manual syncing, followed by a primary `gov-blue` button (`bg-primary`) for "Novo Livro" with a `Plus` icon.

### 2. Main Data Display: The Management Table
- **Current:** A grid of massive dark cards.
- **New Pattern:** A single unifying `Card` acting as a container for a Data Table or a highly structured styled list (similar to the Secretarias list in Organograma).
- **Table Container:** `bg-white` with a `CardHeader` (`bg-slate-50/50`) housing a Search input (`Search` icon) to filter books by name or format.
- **Columns (or Flex Row format):**
  - **Identificação:** Name of the book + Badge showing the Base Format (`PORT-{N}/CATAGUASES`).
  - **Status:** Badge indicating if it's active.
  - **Próximo Número:** Highlighted number showing what the next document will receive.
  - **Total Alocado:** Computed number `(proximo - inicial)` showing usage.
  - **Ações Rápidas (Right-aligned):** A clean set of ghost buttons that only appear on hover (`group-hover:opacity-100`), or a stable dropdown `...` menu, containing:
    - `Editar` (Pencil icon)
    - `Reset Contador` (Refresh icon)
    - `Histórico/Logs` (FileText/History icon)
    - `Excluir` (Trash icon)

### 3. Modals (Dialogs)
- **Current:** High contrast overlays, red alert texts directly in normal inputs.
- **New Pattern:** Clean, slate-based Dialogs.
  - **Novo Livro / Editar Livro:** Removal of heavy icons in the title. Standardized inputs with `text-sm` labels. Save buttons use standard `bg-primary`.
  - **Reset Contador / Excluir:** Keep the warning context but use system-standard alert colors (Amber/Red 50 backgrounds for the warning boxes) rather than overwhelming the whole modal.

### 4. Audit Logs (Auditoria)
- **Current:** A sub-section inside the main card showing the last 3 logs, clicking opens a giant central Dialog.
- **New Pattern:** A right-side `Sheet` component (Drawer).
  - When clicking the `Histórico` action on a row, a `Sheet` slides in from the right.
  - Contains a vertical timeline or scrollable list of the specific book's audit logs.
  - Shows specific details (Approver, Date, IP, Doc ID) in a clean, compact format without crowding the main table view.

## Component Strategy
- **Container:** `max-w-5xl` or `max-w-6xl` instead of `min-w-full` if appropriate, or keep it fluid based on standard container sizes.
- **Shadcn UI Updates needed:** Ensure `Sheet` is available if not already used (it is used in organograma, so it is available). Ensure `DropdownMenu` is used for actions if space gets tight on mobile.

## Next Steps
With this design approved, the next step is to generate the technical implementation plan using the `writing-plans` workflow and commence code refactoring.
