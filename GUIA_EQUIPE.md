# 🏢 MANUAL DEFINITIVO DE INTEGRAÇÃO E GITFLOW EMPRESARIAL
> **Contexto:** Projeto Doc's Cataguases
> **Autoridade:** Gestão Ágil e Arquitetura DevOps (Multiplayer)
> **Objetivo:** Estabelecer a "Fonte da Verdade" para o trabalho em equipe, integração de código paralelo, resolução de conflitos e uso correto dos Agentes de IA do repositório.
> **Em caso de erro ou conflito:** Consulte a **Seção 3 (Troubleshooting)** antes de forçar qualquer comando Git.
> **Leia junto com:** `AGENTS_GITHUB.md`, `AGENTS_PROGRESS.md` e `PROGRESS.md`

---

> 📅 **Última Atualização do Backlog:** [Preenchida automaticamente pelo AGENTS_PROGRESS.md]

---

## 🤖 0. NOSSO ECOSSISTEMA DE AGENTES

| Arquivo | Papel | Quando Usar |
|---|---|---|
| `AGENTS_GITHUB.md` | O DevOps | Ao criar branches, commitar e abrir PRs |
| `AGENTS_PROGRESS.md` | O Product Manager | Ao finalizar uma tarefa e planejar a próxima |
| `PROGRESS.md` | O Backlog | Para ver o que está pendente e o que foi concluído |

---

## ⚠️ 0.1 PROTEÇÕES OBRIGATÓRIAS NO GITHUB (CONFIGURAÇÃO ÚNICA)
> **Atenção Gestor:** Sem isso, nenhuma regra dos nossos `.md` tem valor técnico real.

Acesse: **GitHub → Repositório → Settings → Branches → Add Rule → Branch name: `main`**

- ✅ **Require a pull request before merging** — Ninguém faz merge direto na `main`.
- ✅ **Require at least 1 approval** — O Gestor precisa aprovar o PR antes do merge.
- ✅ **Do not allow bypassing the above settings** — Sem exceções. Nem o admin burla essa regra.

---

## 🔄 1. O RITUAL DIÁRIO (DAILY SYNC)
Todo desenvolvedor deve executar esta rotina assim que ligar o computador:

```bash
git fetch --all --prune
git checkout main
git pull origin main
npm install

---

## 🏗️ 2. ARQUITETURA DE TRABALHO PARALELO (FRONT vs BACK)

### Q1: Pedro (Frontend) e Paulo (Backend) trabalham na mesma funcionalidade. Como evitar quebras?

**❌ Erro Comum:** Criar branches com espaços como `design login feito`. Espaços quebram automações.

**✅ Padrão Correto:**
- Pedro cria via Agente:

---

## 🏗️ 2. ARQUITETURA DE TRABALHO PARALELO (FRONT vs BACK)

### Q1: Pedro (Frontend) e Paulo (Backend) trabalham na mesma funcionalidade. Como evitar quebras?

**❌ Erro Comum:** Criar branches com espaços como `design login feito`. Espaços quebram automações.

**✅ Padrão Correto:**
- Pedro cria via Agente: `feat/auth/design-login`
- Paulo cria via Agente: `feat/auth/api-login`

**Como funciona o trabalho paralelo:**
1. Cada um trabalha isolado na sua branch. O código de um é invisível para o outro.
2. Quando terminam, cada um abre um PR via `AGENTS_GITHUB.md`.
3. O Gestor revisa, aprova e faz o Merge para a `main`.
4. O Gestor aciona o `AGENTS_PROGRESS.md`: "Atualize o backlog."

**Como Pedro testa a API do Paulo ANTES do merge:**
```bash
git fetch origin
git checkout feat/auth/api-login
