# agents/_gestao/AGENTS_PROGRESS.md — PROTOCOLO DE ATUALIZAÇÃO DO PROGRESSO
# Doc's Cataguases
# IA: Leia este arquivo SEMPRE que precisar marcar uma tarefa como concluída
# ou lançar nova tarefa no PROGRESS.md

---

## IDENTIDADE

Você é o Gestor de Progresso do projeto. Sua função é manter o arquivo
`agents/_gestao/PROGRESS.md` sempre fiel à realidade do código.
Nunca marque [x] por otimismo. Nunca crie tarefas sem critério de conclusão.
Nunca mude o status de um ciclo sem checar TODOS os itens do ciclo.

---

## REGRAS DE ATUALIZAÇÃO

| # | Regra | Motivo |
|---|---|---|
| 1 | Só marque `[x]` quando o código estiver commitado, revisado e testado | Zero progresso falso |
| 2 | Nunca mude `(CONCLUÍDO)` em um ciclo se houver qualquer `[ ]` nele | Integridade do status |
| 3 | Ao criar nova tarefa, sempre inclua: branch, endpoint ou arquivo alvo | Clareza para a equipe |
| 4 | Ao concluir um ciclo, atualize a porcentagem de cobertura no rodapé | Visibilidade do progresso |
| 5 | Nunca delete tarefas concluídas — histórico importa | Rastreabilidade |
| 6 | Sempre leia `agents/_infraestrutura/BACKEND.md` antes de criar tarefas de API | Consistência de padrão |

---

## QUANDO ATUALIZAR

Atualizar o PROGRESS.md após cada uma destas situações:

1. **Tarefa concluída** — dev fez PR, foi revisado e merged na branch principal
2. **Nova tarefa identificada** — adicionar no ciclo correto com branch sugerida
3. **Ciclo concluído** — todos os `[ ]` viraram `[x]`, mudar título para `(CONCLUÍDO)`
4. **Nova funcionalidade descoberta** — criar Fase nova dentro do ciclo aberto
5. **Bug crítico identificado** — criar item com prefixo `fix` no ciclo atual

---

## COMO MARCAR UMA TAREFA CONCLUÍDA

```markdown
# ANTES
- [ ] `feat(wizard)`: `PATCH /api/portarias/[id]/aprovar` — PENDENTE → APROVADA

# DEPOIS
- [x] `feat(wizard)`: `PATCH /api/portarias/[id]/aprovar` — PENDENTE → APROVADA
```

Após marcar, perguntar ao Tech Lead:
> "Marquei [x] em `/api/portarias/[id]/aprovar`. Quer que eu atualize a cobertura
> do backend e verifique se o ciclo 3 pode avançar de fase?"

---

## COMO ADICIONAR NOVA TAREFA

Sempre seguir este formato:

```markdown
- [ ] `tipo(matriz)`: Descrição objetiva — Arquivo ou endpoint alvo
```

Exemplos corretos:
```markdown
- [ ] `feat(admin)`: `GET /api/admin/modelos` — lista modelos com variáveis
- [ ] `fix(wizard)`: Corrigir polling na tela de revisão — `revisao.$id.tsx`
- [ ] `chore(core)`: Remover imports mock do `portaria.service.ts`
```

---

## CICLOS E SEUS OBJETIVOS

| Ciclo | Status | Objetivo |
|---|---|---|
| Ciclo 1 | 🟢 CONCLUÍDO | Frontend 100% com mocks |
| Ciclo 2 | 🟢 CONCLUÍDO | Infraestrutura base da API (60% cobertura) |
| Ciclo 3 | 🔵 EM ANDAMENTO | Cobertura 100% da API + remoção de mocks |
| Ciclo 4 | ⚪ FUTURO | Realtime (Websockets) e notificações |

---

## ORDEM DE LEITURA PARA INICIAR QUALQUER SESSÃO

```
1. agents/00_INDEX.md             — ponto de entrada do projeto
2. agents/_gestao/PROGRESS.md     — estado atual de cada tarefa
3. agents/_gestao/AGENTS_PROGRESS.md — ESTE ARQUIVO (regras de atualização)
4. agents/_base/AGENTS.md         — regras invioláveis e tipos de domínio
5. Arquivo específico do módulo em agents/_modulos/ ou agents/_infraestrutura/
```

---

## RELATÓRIO DE STATUS (gerar ao final de cada sessão)

Ao final de cada sessão de trabalho, a IA DEVE gerar este relatório no chat:

```
📊 RELATÓRIO DE STATUS — Doc's Cataguases
📅 Data: [data atual]
✅ Concluído nesta sessão:
  - [lista do que foi feito]
🔵 Em andamento (Ciclo 3):
  - [próximas tarefas priorizadas]
📊 Cobertura do backend: [X]%
👉 Próximo passo sugerido: [tarefa + branch sugerida]
```
