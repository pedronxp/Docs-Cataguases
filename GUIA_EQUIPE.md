# 🏢 MANUAL DEFINITIVO DE INTEGRAÇÃO E GITFLOW EMPRESARIAL
> **Contexto:** Projeto Doc's Cataguases
> **Autoridade:** Gestão Ágil e Arquitetura DevOps (Multiplayer)
> **Objetivo:** Estabelecer a "Fonte da Verdade" para o trabalho em equipe, integração de código paralelo, resolução de conflitos e uso correto dos Agentes de IA do repositório.
> **Em caso de erro ou conflito:** Consulte a **Seção 3 (Troubleshooting)** antes de forçar qualquer comando Git.
> **Leia junto com:** `AGENTS_GITHUB.md`, `AGENTS_PROGRESS.md` e `PROGRESS.md`

---

> 📅 **Última Atualização do Backlog:** [Preenchida automaticamente pelo `AGENTS_PROGRESS.md`]

---

## 🤖 0. NOSSO ECOSSISTEMA DE AGENTES

Nossa equipe não faz gestão manual. Utilizamos 3 arquivos centrais para automatizar o projeto. Antes de executar qualquer comando, lembre-se:

| Arquivo | Papel | Quando Usar |
|---|---|---|
| `AGENTS_GITHUB.md` | O DevOps | Ao criar branches, commitar e abrir PRs |
| `AGENTS_PROGRESS.md` | O Product Manager | Ao finalizar uma tarefa e planejar a próxima |
| `PROGRESS.md` | O Backlog | Para ver o que está pendente e o que foi concluído |

---

## ⚠️ 0.1 PROTEÇÕES OBRIGATÓRIAS NO GITHUB (CONFIGURAÇÃO ÚNICA)
> **Atenção Gestor:** Sem isso, nenhuma regra dos nossos `.md` tem valor técnico real.

Acesse: **GitHub → Repositório → Settings → Branches → Add Rule → Branch name: `main`**

- ✅ **Require a pull request before merging** — Ninguém faz merge direto na `main`, nem o dono do repositório.
- ✅ **Require at least 1 approval** — O Gestor precisa revisar e aprovar o PR antes do merge.
- ✅ **Do not allow bypassing the above settings** — Sem exceções. Nem o admin burla essa regra.

---

## 🔄 1. O RITUAL DIÁRIO (DAILY SYNC)
Todo desenvolvedor deve executar esta rotina assim que ligar o computador:

```bash
git fetch --all --prune
git checkout main
git pull origin main
npm install
```

> 💡 *Mentalidade DevOps: "O código na minha máquina envelhece a cada hora. O GitHub é a única fonte da verdade."*

---

## 🏗️ 2. ARQUITETURA DE TRABALHO PARALELO (FRONT vs BACK)

### Q1: Dois desenvolvedores (ex: um de Frontend e outro de Backend) trabalham na mesma funcionalidade. Como evitar quebras?

**❌ Erro Comum:** Criar branches com espaços como `design login feito`. Espaços quebram automações e o nome não identifica o módulo.

**✅ Padrão Correto (via `AGENTS_GITHUB.md`):**
- Dev Frontend cria: `feat/auth/design-login`
- Dev Backend cria: `feat/auth/api-login`

**Como funciona o trabalho paralelo:**
1. Cada um trabalha isolado na sua branch. O código de um é invisível para o outro.
2. Quando terminam, cada um abre um PR via `AGENTS_GITHUB.md`.
3. O Gestor revisa, aprova e faz o Merge para a `main`.
4. O Gestor aciona o `AGENTS_PROGRESS.md`: *"Atualize o backlog."*

**Como o Dev Frontend testa a API do Backend ANTES do merge:**
```bash
git fetch origin
git checkout feat/auth/api-login
```
Testa localmente e volta para a sua branch sem commitar nada:
```bash
git checkout feat/auth/design-login
```

> ⚠️ **Atenção:** Pedro e Paulo são nomes fictícios usados como exemplo. Substitua pelos nomes reais da equipe.

---

## ✅ 2.1 CHECKLIST DO REVISOR (Obrigatório antes de qualquer Merge)
Antes de clicar em **"Merge Pull Request"** no GitHub, o Gestor deve confirmar:

- [ ] O código compila sem erros de TypeScript ou ESLint?
- [ ] Existe tratamento de erro (`try/catch`) em todas as chamadas ao Supabase?
- [ ] Nenhuma chave de API, senha ou arquivo `.env` foi exposto?
- [ ] O nome da branch segue o padrão `tipo/matriz/tarefa`?
- [ ] O PR está apontando para a branch alvo correta?
- [ ] A descrição do PR está preenchida com o template do `AGENTS_GITHUB.md`?

---

## 🚨 3. RESOLUÇÃO DE CENÁRIOS CRÍTICOS (TROUBLESHOOTING)

### Q2: Erro de Sobreposição — *"Your local changes would be overwritten by checkout"*
**Cenário:** Você tentou mudar de branch, mas o Git bloqueou porque você tem alterações locais não salvas.

**Opção A — Segura (Guarda temporariamente):**
```bash
git stash
git checkout <branch-alvo>
git pull origin <branch-alvo>
git stash pop
```

**Opção B — Destrutiva (Apaga alterações locais e força a cópia do GitHub):**
```bash
git reset --hard
git checkout <branch-alvo>
git pull origin <branch-alvo>
```
> ⚠️ A Opção B apaga permanentemente o que você fez localmente. Use apenas se tiver certeza absoluta.

---

### Q3: O Pesadelo da Equipe — *"Merge Conflict"*
**Cenário:** Dois desenvolvedores editaram a **mesma linha exata** do mesmo arquivo. O Git trava com: *CONFLICT (content): Merge conflict...*

**Protocolo Empresarial:**
1. **NÃO USE** `--force`, `--hard` ou qualquer comando destrutivo.
2. Abra a IDE (VS Code/Cursor). Os arquivos conflitantes estarão em vermelho.
3. O arquivo exibirá os blocos de conflito:
```text
<<<<<<< HEAD (seu código atual)
const x = "versão do Dev A"
=======
const x = "versão do Dev B"
>>>>>>> feat/auth/api-login (código que está chegando)
```
4. Acione a IA no chat: *"Me ajude a resolver este conflito de merge."*
5. Após resolver, finalize:
```bash
git add .
git commit -m "fix(auth): resolve conflito de merge no login"
```

---

### Q4: Rejeição de Push — *"Updates were rejected because the remote contains work that you do not have locally"*
**Cenário:** Você tentou fazer o Push, mas o GitHub recusou porque seu colega já havia enviado código para essa mesma branch antes de você.

```bash
git pull --rebase origin <sua-branch>
git push origin <sua-branch>
```

---

### Q5: O Erro de Principiante — *"Commitei na `main` por engano localmente"*
**Cenário:** Você programou direto na `main`, fez o commit local, mas ainda não deu Push.

```bash
# 1. Crie a branch correta e leve o commit junto
git checkout -b feat/<matriz>/<tarefa>

# 2. Volte para a main e iguale-a ao GitHub
git checkout main
git reset --hard origin/main

# 3. Volte para sua nova branch e continue com segurança
git checkout feat/<matriz>/<tarefa>
```

---

### Q6: Branch Órfã — *"Fiz o Push mas esqueci de abrir o PR"*
**Cenário:** Você fez o commit e o push da branch, mas nunca abriu o Pull Request.

Acione o `AGENTS_GITHUB.md` no chat:
> *"Preciso abrir o PR da branch `feat/auth/design-login`."*

> ⚠️ **Regra do Gestor:** Branches sem PR aberto por mais de **48 horas** após o último commit serão consideradas abandonadas e poderão ser deletadas pelo Gestor sem aviso.

---

### Q7: Não Sei Qual Foi a Última Branch Atualizada pelo Time
**Cenário:** Seu colega disse que subiu o código, mas você não sabe em qual branch.

```bash
git fetch --all --prune
git branch -r --sort=-committerdate
```
A primeira branch da lista (excluindo a `main`) é a mais recente. Entre nela com:
```bash
git checkout <nome-da-branch>
git pull origin <nome-da-branch>
```

---

## 🎯 4. A REGRA DE OURO DO TIME
> Na dúvida, **pare**. Não force nenhum comando. Abra o chat da IDE, acione o `@AGENTS_GITHUB.md` e descreva o erro que está vendo na tela. Nossa inteligência de repositório foi treinada para resolver o problema sem destruir o histórico do time.
