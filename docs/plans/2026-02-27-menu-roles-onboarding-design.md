# Design: Menu por Role, Fluxo REVISOR e Onboarding
**Data:** 2026-02-27
**Branch:** Versao-0.02
**Status:** Aprovado — pronto para implementação

---

## 1. Roles do Sistema

| Role | Descrição |
|---|---|
| `ADMIN_GERAL` | Acesso total ao sistema |
| `PREFEITO` | Assina e publica portarias, visão gerencial |
| `SECRETARIO` | Gerencia portarias da própria secretaria |
| `REVISOR` | Revisa portarias antes do secretário (claim-based) |
| `OPERADOR` | Cria e submete portarias |
| `PENDENTE` | Recém cadastrado — aguarda aprovação do admin |

---

## 2. Fluxo de Aprovação de Portaria

```
OPERADOR cria → [submete]
    → notifica TODOS os REVISORs da secretaria
        → 1º REVISOR que aceitar → fica atribuído (claim)
            → outros REVISORs → só visualizam (read-only)
        → REVISOR atribuído pode:
            a) Aprovar → status: APROVADA → notifica SECRETARIO
            b) Rejeitar + comentário → status: RASCUNHO → notifica OPERADOR
            c) Transferir para outro REVISOR + justificativa obrigatória → logado
    → SECRETARIO aprova → status: APROVADA (sec)
        → PREFEITO assina → status: ASSINADO
            → PUBLICADO
```

**Regras do claim:**
- Portaria entra na fila como `status = PENDENTE` sem `revisorAtualId`
- Ao aceitar: `revisorAtualId = user.id` + log no `FeedAtividade`
- Card desaparece da fila dos outros REVISORs em tempo real (via SSE)
- Transferência requer justificativa obrigatória e gera log

---

## 3. Estrutura de Menu por Role

| Grupo | Item | Rota | ADMIN | PREFEITO | SECRETARIO | REVISOR | OPERADOR |
|---|---|---|---|---|---|---|---|
| Fluxo | Dashboard | `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fluxo | Portarias | `/administrativo/portarias` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fluxo | Fila de Revisão | `/revisao/fila` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Fluxo | Minhas Revisões | `/revisao/minhas` | ❌ | ❌ | ❌ | ✅ | ❌ |
| Fluxo | Acompanhamento | `/acompanhamento` | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fluxo | Diário Oficial | `/jornal` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acervo | Acervo Documental | `/acervo` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acervo | Modelos | `/admin/modelos` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Acervo | Tutorial | `/tutorial` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | Institucional | `/admin/gestao` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Secretarias/Setores | `/admin/organograma` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Variáveis Globais | `/admin/variaveis` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Config. Cloud | `/admin/cloudconvert` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Numeração/Livros | `/admin/livros` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Painel Analytics | `/admin/analytics` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin | Usuários | `/admin/usuarios` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | Permissões Órgão | `/admin/usuarios-orgao` | ✅ | ❌ | ❌ | ❌ | ❌ |

**PENDENTE:** sem acesso ao menu → redirecionado para `/aguardando`

---

## 4. Telas Exclusivas do REVISOR

### 4.1 Fila de Revisão (`/revisao/fila`)
- Lista portarias `status = PENDENTE` onde `revisorAtualId = null`
- Filtradas pela `secretariaId` do REVISOR logado
- Botão **Aceitar** → POST `/api/portarias/:id/claim`
- Atualização em tempo real via SSE quando outro REVISOR aceitar primeiro
- Badge no menu com contagem de portarias livres

### 4.2 Minhas Revisões (`/revisao/minhas`)
- Lista portarias onde `revisorAtualId = user.id`
- Abas: **Em andamento** | **Concluídas**
- Ações por portaria:
  - **Aprovar** → PATCH `/api/portarias/:id/fluxo` `{ acao: 'aprovar' }`
  - **Rejeitar** → modal com comentário obrigatório → `{ acao: 'rejeitar', comentario }`
  - **Transferir** → modal com seleção de REVISOR + justificativa obrigatória → `{ acao: 'transferir', revisorId, justificativa }`

### 4.3 Modal de Transferência
- Campos: `revisorId` (select — REVISORs ativos da mesma secretaria) + `justificativa` (textarea obrigatória)
- Ao confirmar: `revisorAtualId` atualizado + entrada no `FeedAtividade`

---

## 5. Onboarding do Usuário PENDENTE

### 5.1 Fluxo
```
Usuário se registra → role = PENDENTE (automático)
    → redirecionado para /aguardando
    → ADMIN recebe notificação: "Novo usuário aguardando aprovação"

ADMIN acessa /admin/usuarios → filtra PENDENTES
    → clica Aprovar → Modal: define role + secretaria
    → salva → usuário notificado: "Acesso liberado"
    → próximo login → menu correto pelo role
```

### 5.2 Tela `/aguardando`
- Exibe nome, e-mail e status do usuário
- Mensagem informando que aguarda aprovação do admin
- Botão Sair

### 5.3 Modal de Aprovação (em `/admin/usuarios`)
- Campo `role` (select obrigatório): OPERADOR, REVISOR, SECRETARIO, PREFEITO, ADMIN_GERAL
- Campo `secretariaId` (select): obrigatório para OPERADOR, REVISOR, SECRETARIO — oculto para PREFEITO e ADMIN_GERAL
- Ao salvar: `role` atualizado + `ativo = true` + notificação ao usuário

### 5.4 Regras de negócio
| Situação | Comportamento |
|---|---|
| PENDENTE tenta acessar rota do sistema | Redirecionado para `/aguardando` |
| ADMIN tenta aprovar sem secretaria (quando obrigatória) | Bloqueado com erro de validação |
| PREFEITO / ADMIN_GERAL aprovados | `secretariaId` não obrigatório |
| Usuário aprovado faz login | Menu renderizado pelo novo role |

---

## 6. Alterações Técnicas Necessárias

### 6.1 ability.ts (frontend e backend)
- Adicionar `ler FeedAtividade` para `REVISOR` e `OPERADOR` → habilita Dashboard
- Adicionar subject `Revisao` com ações `claim`, `transferir` para `REVISOR`

### 6.2 AppSidebar.tsx
- Adicionar itens **Fila de Revisão** e **Minhas Revisões** com subject `Revisao`
- Corrigir item Tutorial duplicado
- PREFEITO: adicionar acesso a `Analytics`

### 6.3 Rotas frontend (novas)
- `_sistema.revisao.fila.tsx`
- `_sistema.revisao.minhas.tsx`

### 6.4 Rotas backend (novas)
- `POST /api/portarias/:id/claim` — REVISOR aceita portaria
- `POST /api/portarias/:id/transferir` — REVISOR transfere com justificativa

### 6.5 Schema Prisma
- Confirmar que `revisorAtualId` / relação `RevisorAtual` já está no model `Portaria`
- Nenhuma migração adicional necessária (campo já existe)

### 6.6 Proteção de rotas
- Garantir que `PENDENTE` é redirecionado para `/aguardando` no router guard
- Rotas `/revisao/*` bloqueadas para qualquer role que não seja `REVISOR`
