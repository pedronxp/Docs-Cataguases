# Design: Página de Permissões de Usuário

**Data:** 2026-02-28
**Status:** Aprovado para implementação

---

## Objetivo

Substituir o botão `+` dropdown da lista de usuários por uma **página dedicada** `/admin/usuarios/:id` com configuração completa de role, lotação e permissões especiais — com descrições claras para admins que não participaram da programação do sistema.

---

## Decisões

| Questão | Decisão |
|---|---|
| Escopo das permissões | Admin escolhe: global ou escopado à secretaria do usuário |
| Interface | Página dedicada `/admin/usuarios/$usuarioId` |
| Schema do banco | Sem mudança — `permissoesExtra String[]` mantido |
| Formato de escopo | Terceiro segmento no string: `"acao:Subject:secretaria"` |

---

## Catálogo de Permissões

### Portarias

| Permissão (valor) | Label | Descrição | Escopo |
|---|---|---|---|
| `aprovar:Portaria` | Aprovar Portarias | Permite aprovar portarias que estão em revisão. | Global ou Secretaria |
| `rejeitar:Portaria` | Rejeitar Portarias | Devolve portarias ao operador com comentário de correção. | Global ou Secretaria |
| `publicar:Portaria` | Publicar Portarias | Publica no diário oficial após assinatura. | Global ou Secretaria |
| `deletar:Portaria` | Excluir Portarias ⚠ | Remove portarias permanentemente do sistema. Ação irreversível. | Sempre global |
| `assinar:Portaria` | Assinar Portarias | Coloca assinatura digital na portaria. Normalmente reservado ao Prefeito. | Sempre global |

### Revisão

| Permissão (valor) | Label | Descrição | Escopo |
|---|---|---|---|
| `claim:Revisao` | Pegar Portarias para Revisão | Permite assumir portarias da fila de revisão para analisar. | Sempre global |
| `transferir:Revisao` | Transferir Revisão | Passa uma revisão em andamento para outro revisor disponível. | Sempre global |

### Dados e Relatórios

| Permissão (valor) | Label | Descrição | Escopo |
|---|---|---|---|
| `ler:Analytics` | Ver Painel de Analytics | Acessa gráficos e estatísticas de uso do sistema. | Sempre global |

### Administração

| Permissão (valor) | Label | Descrição | Escopo |
|---|---|---|---|
| `gerenciar:ModeloDocumento` | Gerenciar Modelos de Documento | Cria, edita e exclui modelos de portaria usados em todo o sistema. | Sempre global |

---

## Formato no Banco

```
permissoesExtra: String[]

Exemplos:
  "aprovar:Portaria"            → global (formato legado, compatível)
  "aprovar:Portaria:secretaria" → escopado à secretaria do usuário
  "ler:Analytics"               → global
  "deletar:Portaria"            → global
```

---

## Mudança no `buildAbility` (frontend + backend)

```ts
// Substituir o loop atual em ability.ts (ambos os lados)
for (const permissao of user.permissoesExtra) {
  const [action, subject, escopo] = permissao.split(':') as [Actions, Subjects, string?]

  if (escopo === 'secretaria' && user.secretariaId) {
    can(action, subject, { secretariaId: user.secretariaId } as any)
  } else {
    can(action, subject)
  }
}
```

---

## Layout da Página

```
/admin/usuarios/$usuarioId

┌─────────────────────────────────────────────────────────────┐
│  ← Voltar para Usuários                                     │
│                                                             │
│  [Avatar]  Nome completo                    ● Status        │
│            email@dominio.com                               │
│            Desde dd/mm/aaaa                                 │
├─────────────────────────────────────────────────────────────┤
│  DADOS DE ACESSO                                            │
│  [Nível de Acesso ▼]  [Secretaria ▼]  [Setor ▼]            │
├─────────────────────────────────────────────────────────────┤
│  PERMISSÕES ESPECIAIS                                       │
│  Permissões extras além do que o nível de acesso já garante │
│                                                             │
│  PORTARIAS                                                  │
│  [ ] Aprovar Portarias                                      │
│      Permite aprovar portarias que estão em revisão.        │
│      Escopo: (•) Somente sua secretaria  ( ) Global         │
│                                                             │
│  [ ] Rejeitar Portarias                                     │
│      Devolve portarias ao operador com comentário.          │
│      Escopo: (•) Somente sua secretaria  ( ) Global         │
│  ...                                                        │
│                                                             │
│  REVISÃO / DADOS / ADMINISTRAÇÃO                            │
│  [ ] [permissão]                                            │
│      [descrição]                                            │
│      Escopo: Global (não pode ser restrito)                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [🗑 Desativar conta]    [Cancelar]  [Salvar alterações]    │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### Rotas

| Camada | Rota | Ação |
|---|---|---|
| Frontend | `/admin/usuarios` | Lista (existente) — adicionar link para detalhe |
| Frontend | `/admin/usuarios/$usuarioId` | **NOVA** página de detalhe/permissões |
| Backend | `GET /api/admin/users/:id` | **NOVO** endpoint busca usuário por ID |
| Backend | `PATCH /api/admin/users/:id` | Existente — já aceita `permissoesExtra` |

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `apps/web/src/routes/_sistema.admin.usuarios.$usuarioId.tsx` | Criar — página de detalhe |
| `apps/web/src/lib/ability.ts` | Modificar — suporte ao escopo no buildAbility |
| `apps/api/src/lib/ability.ts` | Modificar — idem no backend |
| `apps/api/src/app/api/admin/users/[id]/route.ts` | Adicionar `GET` handler |
| `apps/web/src/routes/_sistema.admin.usuarios.tsx` | Adicionar link/botão para a página de detalhe |
| `apps/web/src/services/usuario.service.ts` | Adicionar `buscarUsuario(id)` |
| `apps/web/src/routeTree.gen.ts` | Atualizado automaticamente pelo TanStack Router |

### Fluxo de dados

```
1. Usuário clica em "Configurar" na lista → navega para /admin/usuarios/:id
2. Página carrega: GET /api/admin/users/:id
3. Admin altera role / secretaria / setor / permissões
4. Admin clica "Salvar" → PATCH /api/admin/users/:id
5. Backend valida, salva, gera FeedAtividade (auditoria automática)
6. Frontend invalida cache TanStack Query e retorna para a lista
```

---

## Sem mudança no schema do banco

O campo `permissoesExtra String[]` continua igual. A lógica de escopo é interpretada no `buildAbility` via terceiro segmento do string — totalmente backward compatible com permissões existentes.
