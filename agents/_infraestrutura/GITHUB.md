# 🤖 SISTEMA: AGENTIC GIT WORKFLOW (DEVOPS EDITION)
> **Contexto:** Projeto Doc's Cataguases (Ambiente Colaborativo)
> **Autoridade Máxima:** Usuário Local / Tech Lead
> **Leia junto com:** `AGENTS_PROGRESS.md`
> **Objetivo:** Definir o comportamento da IA para versionamento seguro, criação de branches (Epics/Main) e colaboração no GitHub.

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
- ⚙️ **`core`**: Roteamento (Next.js), Componentes globais (Shadcn), Zustand global, Configurações Supabase, Banco mock, e Layout base.
- 🔐 **`auth`**: Telas de Login, Registro, Recuperação de Senha, Onboarding e integração Auth.
- 🪄 **`wizard`**: O motor de geração de Portarias (formulário 3 passos e preview).
- 🛠️ **`admin`**: Área restrita, Gestão de Modelos de Portarias e Variáveis Dinâmicas.
- 📂 **`acervo`**: Busca de documentos, filtros e listagem.

### 1.2 Tipos Permitidos (Conventional Commits & Epics)
- `modulo` 🗂️: **Branch Pai (Agrupadora).** Branch de longa duração que vai receber branches filhas (Ex: `modulo/auth-api`). Não recebe commits diretos, apenas PRs das filhas.
- `nova` ✨: Adição de nova funcionalidade, tela ou componente.
- `corrige` 🐛: Correção de um bug ou erro.
- `tarefa` 🔧: Manutenção, atualização de dependências, refatoração de código sem mudança visual.

---

## 2. O PIPELINE DE DEVOPS (GIT LOOP)
Execute as etapas abaixo na exata ordem cronológica. **Nunca pule passos.**

### 🛑 PASSO 1: MAPEAMENTO E BUSCA DE PREEXISTÊNCIA (TEAM SYNC)
Antes de falar com o [Nome do Usuário], atualize o contexto silenciosamente e **verifique se o código já não existe**:
1. Execute `git fetch origin`.
2. Execute `git branch -a` para entender a árvore remota.
3. Execute `git status` para garantir que a branch atual está limpa.
4. **Busca de Preexistência (Obrigatório):** Se o usuário pediu "Criar tela de Cadastro", use ferramentas como `find_by_name`, `list_dir` ou `grep_search` para vasculhar `apps/web/src/routes` e `apps/api/src/`. **Verifique se a UI ou o Backend já foram criados por outro dev no passado para não recriar a roda redigitada.**
5. Identifique e separe na sua memória as **Branches Pai (epic/ ou modulo/)** ativas.

### 🛑 PASSO 2: O QUIZ DE ARQUITETURA E HIERARQUIA
Apresente no chat o formulário interativo abaixo:

> "[Nome do Usuário], vamos preparar a branch para a tarefa: **[Nome da Tarefa]**.
> 
> 🧠 **MOMENTO ARQUITETURA E HIERARQUIA:**
> 
> **Q1: Qual a Categoria (Tipo) e a Matriz desta tarefa?**
> - [1] **`nova`** (<matriz>) ➡️ *Novas telas, botões ou funcionalidades.*
> - [2] **`corrige`** (<matriz>) ➡️ *Consertar um bug ou erro.*
> - [3] **`tarefa`** (<matriz>) ➡️ *Instalar bibliotecas ou refatorar código.*
> - [4] **`modulo`** (<matriz>) ➡️ *Criar uma **Branch Pai** agrupadora de longa duração.*
> 
> **Q2: Qual o Escopo Arquitetural da Tarefa? (Front, Back, DB)**
> - [0] **Frontend (UI/UX)** ➡️ *Apenas telas, componentes React, Tailwind, validação Zod no cliente.*
> - [1] **Backend (API/Server)** ➡️ *Apenas rotas de API, Controllers, Services e regras de negócio do servidor.*
> - [2] **Banco de Dados (DB/Integracao)** ➡️ *Schemas do Prisma, Migrations, ou conexão profunda entre Front e Back.*
> - [3] **Fullstack** ➡️ *Modificações amplas e simultâneas (Geralmente Evitado em sub-branches ágeis).*
> 
> **Q3: Qual é o tamanho/hierarquia dessa tarefa? (De onde ela nasce?)**
> - [0] **Tarefa Independente (Vai para a `main`)** ➡️ *Tarefa pequena, vai direto para produção.*
> - [1] **Tarefa de um Modulo (Branch Filha)** ➡️ *Nasce da branch `modulo/` e o PR volta para ela, mantendo a `main` segura.*
> 
> *(Branches ativas no projeto agora — escolha uma como base se necessário):*
> - [2] `nova/auth/api-sistema-cadastro` (Atual / Full Refinement)
> - [3] `main` (Produção)
> 
> Digite sua resposta (Ex: Q1: 1 core, Q2: 0, Q3: 1).

### 🛑 PASSO 3: CRIAÇÃO DE SUB-BRANCHES ESTRITAMENTE CLASSIFICADAS
Após a resposta do [Nome do Usuário], crie a branch usando o prefixo da matriz, mas **adicione o escopo logo depois se for uma sub-branch**.
*Exemplos de Nomenclaturas Arquiteturais:*
- **Frontend:** `nova/auth/ui-tela-registro` ou `corrige/wizard/frontend-botao-salvar`
- **Backend:** `nova/auth/api-registro-endpoint` ou `corrige/wizard/backend-regra-timeout`
- **Database:** `tarefa/core/db-migracao-auth`

**Plano de Ação para a criação:**
1. Faça checkout na base escolhida (`git checkout <base>`).
2. Sincronize com a equipe ANTES de criar a nova branch: `git pull --rebase origin <base>`.
3. Crie a branch: `git checkout -b <tipo>/<matriz>/<escopo>-<tarefa>`.
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
>   - [1] `nova(<matriz>): <descrição curta em pt-br>`
>   - [2] `nova(<matriz>): <descrição muito detalhada em pt-br>`
> 
> Escolha a opção ou digite a sua mensagem personalizada."

Após a resposta, execute a ordem: `git add .` -> `git commit -m "..."` -> `git pull --rebase origin <branch_atual>` -> `git push -u origin <branch_atual>`.

### 🛑 PASSO 6: GERAÇÃO DE PULL REQUEST (PR) E ALVO CORRETO
Ao finalizar a tarefa da branch:
1. **NUNCA** faça `git merge` localmente para a `main`.
2. Identifique a **Branch Alvo (Target)** correta (Se Q2=0, target é `main`. Se Q2=1, target é o respectivo `modulo/`).
3. Gere o template de PR abaixo no chat:

```text
## 🎯 Objetivo do PR
[Resumo de 1 a 2 linhas em pt-BR sobre o propósito principal]

⚠️ **ATENÇÃO AO MERGE — BRANCH ALVO (TARGET):**
Este PR deve ser apontado para: `[main OU modulo/<nome-do-modulo>]`

## 🛠️ Mudanças Realizadas
- [Mudança 1]
- [Mudança 2]

## 🧪 Como Testar
1. Faça o pull desta branch (`git pull origin <branch>`).
2. Rode a aplicação.
```
 
---

## 3. 💡 Quiz: Como fica na prática? (Perguntas e Respostas)

**Q1: Se eu for criar uma nova página de perfil para os usuários, qual branch eu devo criar?**
> **R:** `nova/auth/pagina-de-perfil`. (Antes seria `feat/auth/pagina-de-perfil`).

**Q2: Encontrei um erro crítico na exibição do PDF na página de acervo. Qual branch eu crio para corrigir?**
> **R:** `corrige/acervo/erro-exibicao-pdf`. (Antes seria `fix/acervo/erro-exibicao-pdf`).

**Q3: Vou apenas atualizar a versão do React no `package.json`. Qual tipo usar na branch e no commit?**
> **R:** Tipo `tarefa`. Exemplo de branch: `tarefa/core/atualiza-react`. Exemplo de commit: `tarefa(core): atualiza react para v19`. (Antes seria `chore`).

**Q4: A equipe decidiu que precisamos reformular todo o sistema de Autenticação. Serão semanas de trabalho agrupando várias funcionalidades menores. Qual nome base damos a essa iniciativa?**
> **R:** Usamos a branch agrupadora (branch pai): `modulo/auth-reformulacao`. Todo o trabalho de "novas" e "corriges" feitos depois serão enviadas (via PR) para cá antes de ir para a `main`. (Antes seria `epic/auth-reformulacao`).
