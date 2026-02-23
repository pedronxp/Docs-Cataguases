# 🤖 SISTEMA: AGENTIC GIT WORKFLOW (TEAM EDITION)
> **Contexto:** Projeto Doc's Cataguases (Ambiente Colaborativo)
> **Autoridade Máxima:** Tech Lead (Pedro)
> **Leia junto com:** `AGENTS.md` e `PROGRESS.md`
> **Objetivo:** Definir o comportamento da IA para versionamento seguro, rastreabilidade na matriz do projeto e colaboração em equipe no GitHub.

---

## 0. PROTOCOLO DE COMUNICAÇÃO E SEGURANÇA (CRÍTICO)
- **Idioma:** Interaja, explique ações, faça perguntas e redija commits **exclusivamente em Português do Brasil (pt-BR)**.
- **Autonomia Restrita:** Você (IA) NUNCA tem permissão para alterar o histórico remoto (`git push`, `git commit`, `git checkout -b`, `git rebase`, `git merge`) sem a prévia e explícita aprovação do Tech Lead.
- **Transparência de Comandos:** Antes de executar qualquer comando Git que altere o estado local ou remoto, informe ao usuário qual comando exato pretende rodar.

---

## 1. O MAPA DE MATRIZES E NOMENCLATURA
Para garantir a rastreabilidade, toda nova branch deve usar rigorosamente o padrão:
`<tipo>/<matriz>/<tarefa-em-kebab-case>`

### 1.1 Taxonomia das Matrizes (Módulos do Sistema)
- ⚙️ **`core`**: Roteamento (Next.js), Componentes globais (Shadcn UI), Zustand global, Configurações do Supabase, Banco mock global, e Layout base. *Regra: Se um componente é usado por mais de um módulo, ele obrigatoriamente pertence ao `core`.*
- 🔐 **`auth`**: Telas de Login, Registro, Recuperação de Senha, Onboarding e integração com Supabase Auth.
- 🪄 **`wizard`**: O motor de geração de Portarias. Inclui o formulário em 3 passos, validações e tela de preview.
- 🛠️ **`admin`**: Área restrita. Gestão de Modelos de Portarias, configuração de Variáveis Dinâmicas e controle de permissões.
- 📂 **`acervo`**: A biblioteca do sistema. Busca de documentos, filtros, listagem e organização em pastas.

### 1.2 Tipos Permitidos (Conventional Commits)
- `feat`: Adição de nova funcionalidade, tela ou componente.
- `fix`: Correção de um bug, erro de compilação ou comportamento inesperado.
- `chore`: Manutenção, atualização de dependências, refatoração de código sem mudança visual.

---

## 2. O PIPELINE DE EQUIPE (AGENT LOOP)
Sempre que o usuário solicitar o início, salvamento ou finalização de uma tarefa, execute as etapas abaixo na exata ordem cronológica. **Nunca pule passos.**

### 🛑 PASSO 1: MAPEAMENTO AUTOMÁTICO (TEAM SYNC)
Antes de falar com o usuário, atualize o contexto silenciosamente:
1. Execute `git fetch origin`.
2. Execute `git branch -a`.
3. Execute `git status` para garantir que a branch atual está limpa.
4. Execute `git log -1 --format="%s" <branch>` nas 3 branches mais ativas do projeto.

### 🛑 PASSO 2: O QUIZ DE ARQUITETURA
Apresente no chat o formulário interativo abaixo e aguarde as respostas:

> "Pedro, vamos iniciar a próxima tarefa: **[Nome da Tarefa]**.
> 
> 🧠 **MOMENTO ARQUITETURA:**
> Lembrete: Componentes multi-telas pertencem à matriz `core`. Telas específicas pertencem à matriz do módulo.
> 
> **Q1: Qual a Categoria e a Matriz desta tarefa?**
> - [1] feat (<matriz>)
> - [2] fix (<matriz>)
> - [3] chore (<matriz>)
> 
> **Q2: Qual será a Branch Base? (De onde esse código vai nascer?)**
> - [0] `main` (Recomendado para tarefas independentes).
> 
> *(Ou escolha uma pendente abaixo):*
> - [1] `[Nome Branch Ativa 1]` -> Último commit: [IA: Descreva o último log aqui]
> - [2] `[Nome Branch Ativa 2]` -> Último commit: [IA: Descreva o último log aqui]
> 
> Digite sua resposta (Ex: Q1: 1 core, Q2: 0)."

### 🛑 PASSO 3: SINCRONIZAÇÃO DEFENSIVA E PLANO DE AÇÃO
Após a resposta do Pedro:
1. Faça checkout na base escolhida (`git checkout <base>`).
2. **Crucial:** Sincronize com a equipe ANTES de criar a branch: `git pull --rebase origin <base>`.
3. Crie a branch: `git checkout -b <tipo>/<matriz>/<tarefa>`.
4. Escreva um **Plano de Ação numerado** detalhando os arquivos a alterar e peça aprovação para codar.

### 🛑 PASSO 4: VERIFICAÇÃO PRÉ-COMMIT (SELF-CORRECTION)
Quando a codificação terminar e o usuário pedir para salvar:
1. **Verificação de Código:** Se houver erros de Lint ou TypeScript, corrija-os autonomamente. Não faça commit de código quebrado.
2. **Verificação de Segurança:** Rode `git status`. Se existirem arquivos `.env`, chaves de API, senhas ou pastas `.next/` listadas, adicione-os ao `.gitignore` imediatamente.

### 🛑 PASSO 5: BACKUP PROTEGIDO (COMMIT & PUSH)
NUNCA execute `git commit` direto. Apresente este formulário:

> "Chegou a hora de fazer o backup do código (Commit e Push).
> - **Autor:** Pedro.
> - **Mensagens Sugeridas:**
>   - [1] `feat(<matriz>): <descrição curta em pt-br>`
>   - [2] `feat(<matriz>): <descrição muito detalhada em pt-br>`
> 
> Escolha a opção ou digite a sua mensagem personalizada."

Após a resposta do Pedro, execute exatamente nesta ordem:
1. `git add .`
2. `git commit -m "<mensagem escolhida>"`
3. **Sincronização Final da Equipe:** `git pull --rebase origin <branch_atual>`.
4. `git push -u origin <branch_atual>`.

### 🛑 PASSO 6: GERAÇÃO DE PULL REQUEST (PR)
Ao finalizar totalmente a tarefa da branch:
1. **NUNCA** faça `git merge` localmente para a `main`. Em times, a `main` exige Code Review.
2. Gere o template de PR abaixo no chat e instrua o usuário a abri-lo no GitHub:

```markdown
## 🎯 Objetivo do PR
[Resumo de 1 a 2 linhas em pt-BR sobre o propósito principal]

## 🛠️ Mudanças Realizadas
- [Mudança 1]
- [Mudança 2]

## 🧪 Como Testar
1. Faça o pull desta branch (`git pull origin <branch>`).
2. Rode a aplicação.
3. [Explique onde o usuário deve clicar para ver a mudança].

## 🔗 Rastreamento
Resolve #[número da issue, se existir]
