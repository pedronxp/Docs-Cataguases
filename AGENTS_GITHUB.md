# 🤖 SISTEMA: AGENTIC GIT WORKFLOW (TEAM EDITION)
> **Contexto:** Projeto Doc's Cataguases (Ambiente Colaborativo)
> **Autoridade Máxima:** Usuário Local / Tech Lead
> **Leia junto com:** `AGENTS.md` e `PROGRESS.md`
> **Objetivo:** Definir o comportamento da IA para versionamento seguro, rastreabilidade na matriz do projeto e colaboração em equipe no GitHub.

---

## 0. PROTOCOLO DE COMUNICAÇÃO E SEGURANÇA (CRÍTICO)
- **Descoberta de Identidade:** Na sua PRIMEIRA resposta neste chat, antes de iniciar qualquer código ou análise, pergunte: *"Olá! Como você gostaria que eu o chamasse durante nosso trabalho juntos?"*. Guarde esse nome na sua memória de contexto e use-o em todas as interações seguintes substituindo a tag `[Nome do Usuário]`.
- **Idioma:** Interaja, explique ações, faça perguntas e redija commits **exclusivamente em Português do Brasil (pt-BR)**.
- **Autonomia Restrita:** Você (IA) NUNCA tem permissão para alterar o histórico remoto (`git push`, `git commit`, `git checkout -b`, `git rebase`, `git merge`) sem a prévia e explícita aprovação do [Nome do Usuário].
- **Transparência de Comandos:** Antes de executar qualquer comando Git que altere o estado local ou remoto, informe ao [Nome do Usuário] qual comando exato pretende rodar.

### 🚫 REGRA ANTI-MAIN (OBRIGATÓRIA)
- É **proibido** desenvolver (editar arquivos) estando na branch `main`.
- A branch `main` só pode ser usada para: `git checkout main` + `git pull origin main` (sincronizar), e mais nada.
- Se eu (IA) detectar que estou na `main` e o pedido envolver codar/alterar arquivos, devo parar e pedir autorização para:
  1. Criar uma branch no padrão `<tipo>/<matriz>/<tarefa>`, e
  2. Só então continuar a codificação.
- **Check obrigatório antes de codar:** `git branch --show-current`. Se retornar `main`, não avance com alterações de código.

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

### 1.2 Tipos Permitidos (Conventional Commits & Epics)
- `epic` 🗂️: **Branch Pai (Agrupadora).** Uma branch de longa duração que vai receber várias branches filhas (Ex: `epic/frontend-rework`). Não recebe commits diretos, apenas PRs das filhas. Use para organizar grandes blocos de trabalho.
- `feat` ✨: Adição de nova funcionalidade, tela ou componente.
- `fix` 🐛: Correção de um bug, erro de compilação ou comportamento inesperado.
- `chore` 🔧: Manutenção, atualização de dependências, refatoração de código sem mudança visual.

---

## 2. O PIPELINE DE EQUIPE (AGENT LOOP)
Sempre que o usuário solicitar o início, salvamento ou finalização de uma tarefa, execute as etapas abaixo na exata ordem cronológica. **Nunca pule passos.**

### 🛑 PASSO 1: MAPEAMENTO AUTOMÁTICO (TEAM SYNC)
Antes de falar com o usuário, atualize o contexto silenciosamente:
1. Execute `git fetch origin`.
2. Execute `git branch -a` (Lista todas as branches locais, remotas, filhas e Epics ativos).
3. Execute `git status` para garantir que a branch atual está limpa.
4. Execute `git log -1 --format="%s" <branch>` nas 3 branches mais ativas do projeto.
5. Identifique e separe na sua memória as **Branches Pai (epic/)** das **branches filhas** para exibir na Topologia.

### 🛑 PASSO 2: O QUIZ DE ARQUITETURA E HIERARQUIA
Apresente no chat o formulário interativo abaixo e aguarde as respostas:

> "[Nome do Usuário], vamos iniciar a próxima tarefa: **[Nome da Tarefa]**.
> 
> 🧠 **MOMENTO ARQUITETURA E HIERARQUIA:**
> Lembrete: Componentes multi-telas = `core`. Telas específicas = matriz do módulo.
> 
> **Q1: Qual a Categoria (Tipo) e a Matriz desta tarefa?**
> - [1] **`feat`** (<matriz>) ➡️ *Use para:* Novas telas, botões ou funcionalidades inéditas.
> - [2] **`fix`** (<matriz>) ➡️ *Use para:* Consertar um bug, travamento ou comportamento inesperado.
> - [3] **`chore`** (<matriz>) ➡️ *Use para:* Instalar bibliotecas, atualizar pacotes ou refatorar código interno.
> - [4] **`epic`** (<matriz>) ➡️ *Use para:* Criar uma **Branch Pai** de longa duração que vai agrupar várias tarefas futuras.
> 
> **Q2: Qual é o tamanho/hierarquia dessa tarefa? (De onde ela nasce?)**
> - [0] **Tarefa Independente (Vai para a `main`)** ➡️ *Escolha isso se a tarefa for pequena, rápida e puder ir direto para produção sem quebrar nada.*
> - [1] **Tarefa de um Epic (Branch Filha)** ➡️ *Escolha isso se a tarefa faz parte de um módulo gigante que ainda está sendo construído. O código vai nascer da branch `epic/` e o PR voltará para ela, mantendo a `main` segura.*
> 
> *(Branches ativas no projeto agora — escolha uma como base se necessário):*
> - [2] `[Nome Branch Ativa / Epic 1]` -> Último commit: [IA: Descreva o log aqui]
> - [3] `[Nome Branch Ativa / Epic 2]` -> Último commit: [IA: Descreva o log aqui]
> 
> Digite sua resposta (Ex: Q1: 1 core, Q2: 0)."

### 🛑 PASSO 3: SINCRONIZAÇÃO DEFENSIVA E PLANO DE AÇÃO
Após a resposta do [Nome do Usuário]:
1. Faça checkout na base escolhida (`git checkout <base>`).
2. **Crucial:** Sincronize com a equipe ANTES de criar a nova branch: `git pull --rebase origin <base>`.
3. Crie a branch: `git checkout -b <tipo>/<matriz>/<tarefa>`.
4. Escreva um **Plano de Ação numerado** detalhando os arquivos a criar ou alterar e peça aprovação para codar.

### 🛑 PASSO 4: EVOLUÇÃO DO PROGRESS, RECOMENDAÇÕES E VERIFICAÇÃO
Quando a codificação terminar e o [Nome do Usuário] pedir para salvar:
1. **Evolução Contínua do `PROGRESS.md` (Documento Vivo):**
   - Marque a tarefa atual como concluída com `[x]`.
   - **Geração de Novos Ciclos:** Se foram descobertos novos requisitos, bugs secundários ou débitos técnicos durante o desenvolvimento, adicione novas tarefas `[ ]` ou um novo bloco de ciclo no final do `PROGRESS.md`.
   - **Recomendações Técnicas:** Analise o que acabou de ser construído com base na stack do projeto (Next.js 15, Supabase, Zustand, Shadcn). Adicione no final do `PROGRESS.md` um bloco `### 💡 Recomendações Técnicas` com sugestões focadas no *Doc's Cataguases* (Ex: RLS no Supabase, cache com `revalidateTag`, persistência de estado, UX/Acessibilidade).
2. **Verificação de Código:** Se houver erros visíveis de Lint ou TypeScript, corrija-os autonomamente. Não faça commit de código quebrado.
3. **Verificação de Segurança:** Rode `git status`. Se existirem arquivos `.env`, chaves de API, senhas ou pastas `.next/` listadas, adicione-os ao `.gitignore` imediatamente.

### 🛑 PASSO 5: BACKUP PROTEGIDO (COMMIT & PUSH)
NUNCA execute `git commit` direto. Apresente este formulário:

> "Chegou a hora de fazer o backup do código (Commit e Push).
> - **Autor do Commit:** [Nome do Usuário].
> - **Mensagens Sugeridas:**
>   - [1] `feat(<matriz>): <descrição curta em pt-br>`
>   - [2] `feat(<matriz>): <descrição muito detalhada em pt-br>`
> 
> Escolha a opção ou digite a sua mensagem personalizada."

Após a resposta, execute exatamente nesta ordem:
1. `git add .`
2. `git commit -m "<mensagem escolhida>"`
3. **Sincronização Final da Equipe:** `git pull --rebase origin <branch_atual>`.
4. `git push -u origin <branch_atual>`.

### 🛑 PASSO 6: GERAÇÃO DE PULL REQUEST (PR) E ALVO CORRETO
Ao finalizar totalmente a tarefa da branch:
1. **NUNCA** faça `git merge` localmente para a `main` ou para o Epic. Em times, o código passa por Code Review.
2. Identifique a **Branch Alvo (Target)** correta com base na resposta da Q2 do Passo 2:
   - Se Q2 foi `[0]` (direto na main): o PR aponta para `main`.
   - Se Q2 foi `[1]` (filha de epic): o PR aponta para a branch `epic/<nome>`, **não para a main**.
3. Gere o template de PR abaixo no chat, destacando claramente a Branch Alvo:

```markdown
## 🎯 Objetivo do PR
[Resumo de 1 a 2 linhas em pt-BR sobre o propósito principal]

⚠️ **ATENÇÃO AO MERGE — BRANCH ALVO (TARGET):**
Este PR deve ser apontado para: `[main OU epic/<nome-do-epic>]`
NÃO faça merge para a main se esta for uma branch filha de um epic!

## 🛠️ Mudanças Realizadas
- [Mudança 1]
- [Mudança 2]

## 🧪 Como Testar
1. Faça o pull desta branch (`git pull origin <branch>`).
2. Rode a aplicação.
3. [Explique onde clicar para ver a mudança funcionando].

## 🔗 Rastreamento
Resolve #[número da issue, se existir]
