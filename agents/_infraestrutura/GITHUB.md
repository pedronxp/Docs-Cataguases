# 🤖 SISTEMA: AGENTIC GIT WORKFLOW (DEVOPS EDITION)
> **Contexto:** Projeto Doc's Cataguases (Ambiente Colaborativo)
> **Autoridade Máxima:** Usuário Local / Tech Lead
> **Leia junto com:** `AGENTS_PROGRESS.md`, `PROGRESS.md` e `GUIA_EQUIPE.md`
> **Objetivo:** Definir o comportamento da IA para versionamento seguro, criação de branches (Epics/Main) e colaboração no GitHub.
> **Em caso de erro ou conflito:** Consulte o `GUIA_EQUIPE.md` antes de forçar qualquer comando Git.

---

## 0. PROTOCOLO DE COMUNICAÇÃO E SEGURANÇA (CRÍTICO)
- **Descoberta de Identidade:** Na sua PRIMEIRA resposta neste chat, pergunte: *"Olá! Como você gostaria que eu o chamasse durante nosso trabalho?"*. Guarde esse nome e use-o em todas as interações seguintes substituindo a tag `[Nome do Usuário]`.
- **Idioma:** Interaja, explique ações e redija commits **exclusivamente em Português do Brasil (pt-BR)**.
- **Autonomia Restrita:** Você (IA) NUNCA tem permissão para alterar o histórico remoto (`git push`, `git commit`, `git checkout -b`, `git rebase`, `git merge`) sem a prévia e explícita aprovação do [Nome do Usuário].
- **Transparência de Comandos:** Antes de executar qualquer comando Git que altere o estado, informe ao [Nome do Usuário] qual comando exato pretende rodar.

### 🚫 REGRA ANTI-MAIN (OBRIGATÓRIA)
- É **proibido** desenvolver (editar arquivos) estando na branch `main`.
- A branch `main` só pode ser usada para: `git checkout main` + `git pull origin main` (sincronizar), e mais nada.
- Se eu (IA) detectar que estou na `main` e o pedido envolver codar/alterar arquivos, devo parar e pedir autorização para:
  1. Criar uma branch no padrão `<tipo>/<matriz>/<tarefa>`, e
  2. Só então continuar a codificação.
- **Check obrigatório antes de codar:** `git branch --show-current`. Se retornar `main`, não avance com alterações de código.

---

## 1. O MAPA DE MATRIZES E NOMENCLATURA
Toda nova branch deve usar rigorosamente o padrão: `<tipo>/<matriz>/<tarefa-em-kebab-case>`

### 1.1 Taxonomia das Matrizes (Módulos do Sistema)
- ⚙️ **`core`**: Roteamento (Next.js), Componentes globais (Shadcn), Zustand global, Configurações Supabase, Banco mock e Layout base. *Regra: Se um componente é usado por mais de um módulo, ele pertence ao `core`.*
- 🔐 **`auth`**: Telas de Login, Registro, Recuperação de Senha, Onboarding e integração Auth.
- 🪄 **`wizard`**: O motor de geração de Portarias (formulário 3 passos e preview).
- 🛠️ **`admin`**: Área restrita, Gestão de Modelos de Portarias e Variáveis Dinâmicas.
- 📂 **`acervo`**: Busca de documentos, filtros e listagem.

### 1.2 Tipos Permitidos (Conventional Commits & Epics)
- `epic` 🗂️: **Branch Pai (Agrupadora).** Branch de longa duração que recebe PRs das filhas. Não recebe commits diretos.
- `feat` ✨: Adição de nova funcionalidade, tela ou componente.
- `fix` 🐛: Correção de um bug ou erro.
- `chore` 🔧: Manutenção, atualização de dependências, refatoração sem mudança visual.

---

## 2. O PIPELINE DE DEVOPS (GIT LOOP)
Execute as etapas abaixo na exata ordem cronológica. **Nunca pule passos.**

### 🛑 PASSO 1: MAPEAMENTO AUTOMÁTICO (TEAM SYNC)
Antes de falar com o usuário, atualize o contexto silenciosamente:
1. Execute `git fetch origin`.
2. Execute `git branch -a` (Lista todas as branches locais, remotas e Epics ativos).
3. Execute `git status` para garantir que a branch atual está limpa.
4. Identifique e separe na sua memória as **Branches Pai (epic/)** das **branches filhas** para exibir na Topologia.

### 🛑 PASSO 2: O QUIZ DE ARQUITETURA E HIERARQUIA
Apresente no chat o formulário interativo abaixo:

> "[Nome do Usuário], vamos preparar a branch para a tarefa: **[Nome da Tarefa]**.
>
> 🧠 **MOMENTO ARQUITETURA E HIERARQUIA:**
> Lembrete: Componentes multi-telas = `core`. Telas específicas = matriz do módulo.
>
> **Q1: Qual a Categoria (Tipo) e a Matriz desta tarefa?**
> - [1] **`feat`** (<matriz>) ➡️ *Novas telas, botões ou funcionalidades.*
> - [2] **`fix`** (<matriz>) ➡️ *Consertar um bug ou erro.*
> - [3] **`chore`** (<matriz>) ➡️ *Instalar bibliotecas ou refatorar código.*
> - [4] **`epic`** (<matriz>) ➡️ *Criar uma **Branch Pai** agrupadora de longa duração.*
>
> **Q2: Qual é o tamanho/hierarquia dessa tarefa? (De onde ela nasce?)**
> - [0] **Tarefa Independente (Vai para a `main`)** ➡️ *Tarefa pequena, vai direto para produção.*
> - [1] **Tarefa de um Epic (Branch Filha)** ➡️ *Nasce da branch `epic/` e o PR volta para ela, mantendo a `main` segura.*
>
> *(Branches ativas no projeto agora — escolha uma como base se necessário):*
> - [2] `[Nome Branch Ativa / Epic 1]`
> - [3] `[Nome Branch Ativa / Epic 2]`
>
> Digite sua resposta (Ex: Q1: 1 core, Q2: 0)."

### 🛑 PASSO 3: SINCRONIZAÇÃO DEFENSIVA E PLANO DE AÇÃO
Após a resposta do [Nome do Usuário]:
1. Faça checkout na base escolhida (`git checkout <base>`).
2. Sincronize com a equipe ANTES de criar a nova branch: `git pull --rebase origin <base>`.
3. Crie a branch: `git checkout -b <tipo>/<matriz>/<tarefa>`.
4. Escreva um **Plano de Ação numerado** detalhando os arquivos a alterar e peça aprovação para codar.

### 🛑 PASSO 4: VERIFICAÇÃO PRÉ-COMMIT E SEGURANÇA
Quando a codificação terminar e o [Nome do Usuário] pedir para salvar o código:
1. **Verificação de Código:** Se houver erros visíveis de Lint ou TypeScript, corrija-os autonomamente. Não faça commit de código quebrado.
2. **Verificação de Segurança:** Rode `git status`. Se existirem arquivos `.env`, chaves de API, senhas ou pastas `.next/` listadas, adicione-os ao `.gitignore` imediatamente.

### 🛑 PASSO 5: BACKUP PROTEGIDO (COMMIT & PUSH)
NUNCA execute `git commit` direto. Apresente este formulário:

> "Chegou a hora de fazer o backup do código (Commit e Push).
> - **Autor do Commit:** [Nome do Usuário].
> - **Mensagens Sugeridas:**
>   - [1] `feat(<matriz>): <descrição curta em pt-br>`
>   - [2] `feat(<matriz>): <descrição muito detalhada em pt-br>`
>
> Escolha a opção ou digite a sua mensagem personalizada."

Após a resposta, execute nesta ordem:
1. `git add .`
2. `git commit -m "<mensagem escolhida>"`
3. `git pull --rebase origin <branch_atual>`
4. `git push -u origin <branch_atual>`

### 🛑 PASSO 6: GERAÇÃO DE PULL REQUEST (PR) E ALVO CORRETO
Ao finalizar a tarefa da branch:
1. **NUNCA** faça `git merge` localmente para a `main`.
2. Identifique a **Branch Alvo (Target)** correta:
   - Se Q2 foi `[0]`: o PR aponta para `main`.
   - Se Q2 foi `[1]`: o PR aponta para a branch `epic/<nome>`, **nunca para a main**.
3. Gere o template de PR abaixo no chat:

```
## 🎯 Objetivo do PR
[Resumo de 1 a 2 linhas em pt-BR sobre o propósito principal]

⚠️ ATENÇÃO AO MERGE — BRANCH ALVO (TARGET):
Este PR deve ser apontado para: [main OU epic/<nome-do-epic>]

## 🛠️ Mudanças Realizadas
- [Mudança 1]
- [Mudança 2]

## 🧪 Como Testar
1. Faça o pull desta branch (git pull origin <branch>).
2. Rode a aplicação.
3. [Explique onde clicar para ver a mudança funcionando].
```

### 🛑 PASSO 7: STATUS, LIMPEZA E HANDOFF PARA O PM
Após confirmar que o PR foi aprovado e mergeado no GitHub:
1. Limpe o ambiente local:
   - `git checkout main`
   - `git pull origin main`
   - `git branch -d <branch_concluida>`
2. Imprima no chat o relatório final:

> 📊 **STATUS FINAL DO GITHUB:** Tarefa enviada. Backup remoto 100% sincronizado.
>
> 🌳 **TOPOLOGIA ATUAL DA EQUIPE:**
> ```
> main (Produção — Atualizada)
> ├── epic/[nome-do-epic] (Branch Pai)
> │   └── feat/[matriz]/[tarefa] (Filha — Concluída e deletada)
> ```
>
> 🧠 **HANDOFF PARA O PRODUCT MANAGER:**
> Meu trabalho de versionamento terminou! Por favor, abra um novo chat, acione o `AGENTS_PROGRESS.md` e diga *"Atualize o progresso"*. Ele dará baixa na tarefa, criará novos ciclos se necessário e dirá qual é a próxima missão!

---

## 3. TRATAMENTO DE ERROS E RECUPERAÇÃO (FAULT TOLERANCE)
A IA deve identificar o tipo de falha e aplicar a estratégia correspondente. Nunca force ações destrutivas. Consulte também o `GUIA_EQUIPE.md` para referência completa.

### 3.1 Falha: Conflito de Merge
**Gatilho:** O Git retorna "Merge conflict" ou "Automatic merge failed".
**Protocolo:**
1. **TRAVE O PROCESSO.** Não edite os marcadores de conflito autonomamente.
2. **PROIBIDO:** Não use `--force`, `--hard` ou `git merge --abort` sem permissão.
3. Comunique: *"🚨 Detectei um Conflito de Merge. Operação pausada. Use a interface da IDE para resolver os conflitos e me avise para finalizar."*

### 3.2 Falha: Mudanças Locais Impedem Troca de Branch
**Gatilho:** O Git bloqueia `checkout` com "Your local changes would be overwritten".
**Protocolo:**
1. Avise: *"Existem modificações não salvas que impedem a transição de branch."*
2. Ofereça: *"Como deseja isolar estas mudanças? [1] Stash (Recomendado) | [2] Commit WIP | [3] Descartar (Hard Reset)."*

### 3.3 Falha: Rejeição de Push (Non-Fast-Forward)
**Gatilho:** O Git bloqueia o push com "Updates were rejected".
**Protocolo:**
1. Não force o push.
2. Comunique: *"⚠️ O envio falhou porque outro membro atualizou esta branch. Vou executar `git pull --rebase origin <branch>` e tentarei novamente."*

### 3.4 Falha: Branch Filha Apontada para a Main por Engano
**Gatilho:** A IA detecta PR de branch filha de epic apontando direto para a `main`.
**Protocolo:**
1. **ALERTE:** *"⚠️ Esta branch é filha do Epic `epic/<nome>`. O PR deve ser apontado de volta para o Epic, e não para a `main`. Confirma o redirecionamento?"*
