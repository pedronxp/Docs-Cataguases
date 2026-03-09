# Design: Melhorias admin/usuarios e admin/organograma
**Data:** 2026-02-28
**Branch:** Versao-0.02
**Status:** Aprovado — implementação em andamento

---

## Contexto

Páginas de administração de usuários e estrutura organizacional do sistema GovTech Doc's Cataguases.
Brainstorm realizado com base na leitura completa dos arquivos de rota, hooks, serviços e APIs.

**Princípio de design:** Toda mudança visual deve seguir o padrão GOV.br existente (azul `#1351b4`, cards e tabelas no padrão atual).

---

## Problemas Identificados

| # | Problema | Arquivo | Severidade |
|---|---------|---------|-----------|
| 1 | Endpoint `/toggle-status` chamado no frontend mas não existe no backend | `apps/api/src/app/api/admin/users/[id]/` | Crítico |
| 2 | `auth_debug.log` sendo gravado em produção no GET /users | `apps/api/src/app/api/admin/users/route.ts` | Segurança |
| 3 | Sem toast de erro nas mutations do `useUsuarios` | `apps/web/src/hooks/use-usuarios.ts` | Médio |
| 4 | Sem validação de secretaria obrigatória no backend para REVISOR/OPERADOR/SECRETARIO | `apps/api/src/app/api/admin/users/[id]/route.ts` | Médio |
| 5 | Modal de aprovação não permite selecionar setor (setorId fica null) | `apps/web/src/routes/_sistema.admin.usuarios.tsx` | Médio |

---

## Sprint 1 — Correções Críticas

### 1. Criar endpoint `toggle-status`
**Arquivo novo:** `apps/api/src/app/api/admin/users/[id]/toggle-status/route.ts`
- PATCH sem body
- Busca usuário atual, inverte `ativo`
- Retorna usuário atualizado
- Requer sessão ADMIN_GERAL

### 2. Remover auth_debug.log
**Arquivo:** `apps/api/src/app/api/admin/users/route.ts`
- Remover as linhas de import `fs` e escrita do log de sessão

### 3. Toasts de erro no useUsuarios
**Arquivo:** `apps/web/src/hooks/use-usuarios.ts`
- Nos catches das mutations: `toast.error('Erro ao ...')`
- Usar o toast do shadcn/ui já presente no projeto

### 4. Validação de secretaria no backend
**Arquivo:** `apps/api/src/app/api/admin/users/[id]/route.ts`
- No schema Zod, adicionar refine: se role IN [REVISOR, OPERADOR, SECRETARIO] → secretariaId obrigatório

### 5. Setor no modal de aprovação
**Arquivo:** `apps/web/src/routes/_sistema.admin.usuarios.tsx`
- Após selecionar secretaria no modal, carregar setores via `secretaria.service.listarSetores()`
- Adicionar segundo dropdown de setor (opcional)

---

## Sprint 2 — Melhorias de UX

### 6. Coluna Lotação na tabela de usuários
- Nova coluna: "Secretaria / Setor" mostrando `secretaria.nome` e `setor.nome` se existirem
- Backend: incluir `secretaria: { select: { nome: true } }` e `setor: { select: { nome: true } }` no GET /users

### 7. Filtros na busca
- Dropdown de Role ao lado da busca
- Dropdown de Secretaria (carregado da API)
- Ambos são filtros adicionais opcionais

### 8. Editar Secretaria e Setor
- Botão Editar no card de secretaria → abre mesmo formulário de criação preenchido
- Botão Editar em cada setor no drawer
- PUT endpoint para secretaria e setor

### 9. Proteção ao deletar secretaria com usuários
- Antes de deletar, verificar `User.count({ where: { secretariaId } })`
- Se > 0, retornar 409 com mensagem clara
- Frontend mostra o erro como toast

### 10. Cor da secretaria como borda visual
- No card da secretaria: `border-l-4` com a cor do campo `cor`
- Padrão GOV.br mantido

---

## Sprint 3 — Novas Features

### 11. Auditoria via FeedAtividade
- Em toda ação admin (alterar role, ativar/desativar, aprovar): criar registro no `FeedAtividade`
- Campos: `tipo: 'ACAO_ADMIN'`, `descricao: 'Admin X alterou role de Y: OPERADOR → REVISOR'`, `usuarioId: adminId`, `targetId: userId`
- Visível no drawer do usuário e no feed global

### 12. Notificação SSE ao aprovar usuário
- Após aprovação, disparar notificação via `/api/notifications`
- Mensagem: "Seu acesso foi liberado! Você agora é OPERADOR na Secretaria de Saúde."
- Usuário vê no NotificationBell ao fazer login

### 13. Usuários no drawer de secretaria (organograma)
- No drawer de cada secretaria, além de setores: listar usuários vinculados
- Mostrar nome, role e setor de cada usuário
- Sem mudança de design: lista simples no padrão GOV.br atual

---

## Fora do Escopo (por ora)

- Organograma em árvore visual SVG/D3 (mudança grande de design)
- Exportar CSV de usuários
- Drawer de detalhes do usuário com histórico completo
- Transferência rápida de secretaria pelo organograma

---

## Arquivos Envolvidos

**Frontend:**
- `apps/web/src/routes/_sistema.admin.usuarios.tsx`
- `apps/web/src/routes/_sistema.admin.organograma.tsx`
- `apps/web/src/hooks/use-usuarios.ts`
- `apps/web/src/services/usuario.service.ts`
- `apps/web/src/services/secretaria.service.ts`

**Backend:**
- `apps/api/src/app/api/admin/users/route.ts`
- `apps/api/src/app/api/admin/users/[id]/route.ts`
- `apps/api/src/app/api/admin/users/[id]/toggle-status/route.ts` ← a criar
- `apps/api/src/services/usuario.service.ts`

---

## Ordem de Implementação Recomendada

```
Sprint 1 (bugs): 1 → 2 → 3 → 4 → 5
Sprint 2 (UX):   6 → 7 → 8 → 9 → 10
Sprint 3 (feat): 11 → 12 → 13
```
