# AGENTS_TUTORIAL.md — COMPLEMENTO: CENTRAL DE AJUDA E TUTORIAIS
# Leia junto com AGENTS.md, AGENTS_DESIGN.md e PROGRESS.md
# Este arquivo define a Central de Ajuda interativa e dinâmica do sistema.

---

## 1. O CONCEITO DA CENTRAL DE AJUDA (GOVTECH)

Manuais em PDF de 50 páginas não funcionam. A Central de Ajuda do Doc's Cataguases deve ser:
1. **Pesquisável:** Uma barra de busca no topo que filtra as dúvidas instantaneamente.
2. **Baseada em Cargos (Role-Based):** 
   - A aba "Administração" SÓ aparece para quem tem a role `ADMIN_GERAL` ou `PREFEITO`.
   - A aba "Operação" aparece para todos, ensinando o básico (criar portaria, fazer upload).
3. **Visual:** Uso de Cards simulando "Vídeos Curtos" e "Passo a Passo".
4. **FAQ Dinâmico:** Uso do componente `Accordion` (Shadcn) para expandir as dúvidas frequentes.

---

## 2. NOVA ROTA E SIDEBAR

**Nova Rota:** `apps/web/src/routes/_sistema/tutorial.tsx`

**Atualização no Sidebar (AppSidebar.tsx):**
Adicione um separador visual na parte inferior do Sidebar e coloque o item de Ajuda fixo no rodapé:
```tsx
{
  to: '/_sistema/tutorial',
  label: 'Central de Ajuda',
  icon: HelpCircle, // import { HelpCircle } from 'lucide-react'
  action: 'ler',
  subject: 'all' // Todos têm acesso à central
}
