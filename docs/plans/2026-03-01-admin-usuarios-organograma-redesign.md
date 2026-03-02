# Redesign: Admin Usuários + Organograma
**Data:** 2026-03-01
**Status:** Aprovado

## Objetivo
Refatorar completamente as páginas `/admin/usuarios` e `/admin/organograma` unificando 4 rotas em 2, adotando TanStack Query, Sheet lateral para detalhes e AlertDialog para confirmações.

## Arquivos Afetados

### Criados
- `apps/web/src/lib/usuarios-constants.ts` — constantes compartilhadas (ROLE_LABELS, ROLE_COLORS, getInitials)
- `apps/web/src/routes/_sistema.admin.usuarios.tsx` — página unificada de gestão

### Refatorados
- `apps/web/src/routes/_sistema.admin.organograma.tsx` — com abas Estrutura + Lotação

### Deletados
- `apps/web/src/routes/_sistema.admin.usuarios.index.tsx`
- `apps/web/src/routes/_sistema.admin.usuarios.$usuarioId.tsx`
- `apps/web/src/routes/_sistema.admin.usuarios-orgao.tsx`

## Arquitetura da Página 1: `/admin/usuarios`

### Componentes
- `UsuariosPage` — root, gerencia Sheet aberto e modal de aprovação
- `UsuariosFiltros` — barra de busca + selects de role/secretaria/status
- `UsuariosTable` — tabela com TanStack Query
- `UsuarioDetalheSheet` — Sheet lateral com dados de acesso + permissões especiais
- `ModalAprovacao` — Dialog para aprovar usuários PENDENTE

### Queries TanStack Query
```typescript
// Lista todos usuários
useQuery({ queryKey: ['admin', 'usuarios'], queryFn: listarUsuarios })

// Lista secretarias (para filtros e selects)
useQuery({ queryKey: ['secretarias'], queryFn: listarSecretarias })

// Setores de uma secretaria (só quando aberto)
useQuery({ queryKey: ['setores', secretariaId], queryFn: () => listarSetores(secretariaId), enabled: !!secretariaId })
```

### Mutations
```typescript
useMutation({ mutationFn: atualizarUsuario, onSuccess: () => queryClient.invalidateQueries(['admin', 'usuarios']) })
useMutation({ mutationFn: toggleAtivo, onSuccess: () => queryClient.invalidateQueries(['admin', 'usuarios']) })
```

## Arquitetura da Página 2: `/admin/organograma`

### Componentes
- `OrganogramaPage` — root com Tabs (Estrutura | Lotação)
- `EstruturaTab` — lista de secretarias com Sheet de setores
- `SetoresSheet` — drawer com CRUD de setores + lista de servidores
- `LotacaoTab` — diretório de pessoal com filtros (absorve usuarios-orgao)
- `AlertDialogExcluir` — confirmação de exclusão de secretaria/setor

### Queries
```typescript
useQuery({ queryKey: ['secretarias'], queryFn: listarSecretarias })
useQuery({ queryKey: ['admin', 'usuarios'], queryFn: listarUsuarios })
useQuery({ queryKey: ['setores', secId], queryFn: () => listarSetores(secId), enabled: !!secId })
```

## Decisões Técnicas

| Decisão | Antes | Depois |
|---------|-------|--------|
| Data fetching | useState + useEffect manual | TanStack Query |
| Detalhes usuário | Rota separada `/usuarios/$id` | Sheet lateral |
| Lotação | Rota separada `/usuarios-orgao` | Aba em `/organograma` |
| Confirmação exclusão | `confirm()` do browser | AlertDialog shadcn/ui |
| Refetch após mutation | `setTimeout` + refetch | `queryClient.invalidateQueries` |
| Constantes duplicadas | Em cada arquivo | `lib/usuarios-constants.ts` |

## Funcionalidades Novas
1. **Filtro por status** (Ativo/Inativo) na lista de usuários
2. **Sheet lateral** para editar usuário sem trocar de página
3. **AlertDialog** com nome da entidade ao confirmar exclusão
4. **Tabs na lotação** agrupando por secretaria quando nenhum filtro selecionado
