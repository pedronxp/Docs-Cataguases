# Admin Livros Numeracao Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the `/admin/livros` page to use a clean Management Table layout (SistemKT "gov" standard), moving audit logs to a right-side drawer (Sheet) and removing dark generic cards.

**Architecture:** We will replace the current map of `Card` components per book with a single unified `Card` containing an administrative list/table. Audit logs will be moved entirely into a `Sheet` component that opens dynamically when requested via the row actions. Actions will be consolidated into a modern `DropdownMenu` or grouped icon buttons on the right side of each item.

**Tech Stack:** React (Vite), Tailwind CSS, shadcn/ui components (`Card`, `Sheet`, `Dialog`, `Button`, `Badge`, `Input`, `Label`), Lucide-react icons.

---

### Task 1: Add necessary shadcn/ui components
*Note: Depending on the workspace, `Sheet` and `DropdownMenu` might already exist, but if not they must be added to the project, as they are crucial for the new design.*

**Steps:**
1. Check if `Sheet` component or imports exist. (We saw `Sheet` is already used in Organograma page, so it exists in the codebase).
2. Check if `DropdownMenu` exists. If not, the easiest replacement for row-actions is standard ghost buttons with icons, which we will use for simplicity to match Organograma.

**Execution:** No new files needed. Use existing components in `components/ui`.

---

### Task 2: Refactor Page Header and Structure

**Files:**
- Modify: `c:/Users/User/Desktop/Projeto/Doc's prefeitura/apps/web/src/routes/_sistema.admin.livros.tsx`

**Step 1: Update Header and Layout Container**
- Change the main wrapping div width and replace the text titles to be simpler and cleaner.

**Execution Outline:**
- Replace `bg-[#1351B4]` with `bg-primary` for the "Novo Livro" button to use centralized tokens.
- Add a ghost button for "Atualizar" (`RefreshCw` icon) next to "Novo Livro".
- Change text sizes and borders to match `organograma` (`text-2xl font-bold`, text-slate-800).

---

### Task 3: Build the Main Data List (Management Table format)

**Files:**
- Modify: `c:/Users/User/Desktop/Projeto/Doc's prefeitura/apps/web/src/routes/_sistema.admin.livros.tsx`

**Step 1: Replace the grid of Cards with a Single Data Card**
- Implement the `Card` wrapper with a `CardHeader` that contains a Search Input.
- Under `CardContent`, iterate over the `livros` (filtered by the new search input).
- Render each book as a flex row (similar to the set of rows in Organograma's `Secretarias`), showing Name, Next Number, Format, and Total Allocated.

**Implementation detail:**
- Include a state `const [searchQuery, setSearchQuery] = useState('')`
- Filter books: `const filtered = livros.filter(l => l.nome.toLowerCase().includes(searchQuery.toLowerCase()))`

---

### Task 4: Move Audit Logs to Sheet Component

**Files:**
- Modify: `c:/Users/User/Desktop/Projeto/Doc's prefeitura/apps/web/src/routes/_sistema.admin.livros.tsx`

**Step 1: Replace the `Dialog` for Logs with `Sheet`**
- Change the `Dialog` that currently opens for `viewLogs` to a `Sheet` (`import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'`)
- Ensure it slides from the right, showing the history timeline cleanly without an overpowering modal overlay.

---

### Task 5: Clean up Creation and Edit Dialogs

**Files:**
- Modify: `c:/Users/User/Desktop/Projeto/Doc's prefeitura/apps/web/src/routes/_sistema.admin.livros.tsx`

**Step 1: Simplify Dialog Styles**
- Remove heavy styling from the Dialog Headers (e.g., remove specific colored text on icons, uppercase tracking, make labels standard sentence case).
- Ensure buttons use standard `bg-primary` for primary actions, and standard red/amber combinations for destructive actions as seen in Organograma.

---

### Verification Plan
- **Pre-check:** Ensure `npm run dev` in `apps/web` compiles successfully without type errors.
- **Manual Verification:** Open `http://localhost:XXXX/admin/livros` in the browser.
- **Visual Check 1:** Verify the background is standard and no large dark cards appear.
- **Visual Check 2:** Ensure the search bar works to filter the list.
- **Visual Check 3:** Click "Logs Completos" or the equivalent action button and verify the right-side `Sheet` slides in properly instead of a center Dialog.
- **Visual Check 4:** Open the "Novo Livro" and "Editar" dialogs to ensure forms remain functional and use the updated clean aesthetic.
