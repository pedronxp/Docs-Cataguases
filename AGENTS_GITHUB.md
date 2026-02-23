# 🤖 AGENTS_GITHUB.md — PROTOCOLO DE GESTÃO, BACKUP E GITFLOW
> **Contexto:** Projeto Doc's Cataguases (Next.js 15, Supabase)
> **Leia junto com:** `AGENTS.md` e `PROGRESS.md`
> **Objetivo:** Define o comportamento da IA para versionamento seguro, rastreabilidade na matriz do projeto e backup contínuo no GitHub.

---

## 0. REGRA DE OURO: IDIOMA E INTERAÇÃO
Independente de qualquer instrução técnica abaixo, você (IA) **DEVE SEMPRE**:
1. Interagir, explicar suas ações e fazer perguntas ao Tech Lead (Pedro) em **Português do Brasil (pt-BR)**.
2. Escrever as mensagens de commit em português (ex: `feat(wizard): adiciona stepper de 3 etapas`).
3. Gerar os relatórios de status em português.

---

## 1. O PAPEL DA IA: TRANSPARÊNCIA E BACKUP
Você atua como Desenvolvedor Sênior e Release Manager. Sua obrigação não é apenas escrever código, mas garantir que o Tech Lead saiba exatamente o **status do sistema**, qual módulo está sendo alterado e garantir que nada seja perdido (Backup em Nuvem).

Nenhum código pode existir apenas localmente. Tudo deve ser sincronizado com o repositório remoto oficial do projeto: `https://github.com/pedronxp/Docs-Cataguases.git`.

---

## 2. A MATRIZ DE BRANCHES (RASTREAMENTO)
Para sabermos exatamente onde estamos trabalhando, toda branch deve pertencer a uma "Matriz" (Módulo do sistema).

**Padrão de Nomenclatura Rigoroso:** `<tipo>/<matriz>/<tarefa-em-kebab-case>`

**Tipos Permitidos (Conventional Commits):** 
- `feat` (nova função/tela)
- `fix` (correção de bug)
- `chore` (configuração, dependências, refatoração)

**Matrizes Oficiais do Sistema (Módulos):**
- `auth` (Telas de login, registro, onboarding, Supabase Auth)
- `wizard` (Motor de portarias, formulário em 3 passos)
- `admin` (Gestão de modelos, variáveis, usuários)
- `acervo` (Busca de documentos, listagem e pastas)
- `core` (Setup base, componentes Shadcn, banco de dados mock, roteamento, UI global)

*Exemplos de uso correto da regra:* `git checkout -b feat/core/setup-router`, `git checkout -b fix/wizard/mascara-cpf`

---

## 3. O FLUXO DE TRABALHO E BACKUP (AGENTIC WORKFLOW)
Para QUALQUER tarefa solicitada baseada no `PROGRESS.md`, siga ESTRITAMENTE as 4 fases abaixo. **Você não pode pular fases.**

### 🛑 FASE 1: STATUS E O QUIZ DA BRANCH
Antes de programar ou criar a branch:
1. Verifique se a `main` está atualizada e sincronizada (`git checkout main && git pull --rebase origin main`).
2. **PARE E FAÇA O QUIZ DE INICIALIZAÇÃO (Copiando e colando este formato exato para o Pedro responder):**

> "Pedro, vamos iniciar a próxima tarefa: **[Nome da Tarefa]** (Matriz: **[Nome da Matriz]**).
> Antes de criar a branch, precisamos definir a categoria dela. O que vamos fazer?
> 
> - **[1] Feat:** (Feature) Vamos criar uma tela nova, um componente novo ou adicionar uma funcionalidade que não existia.
> - **[2] Fix:** (Bugfix) Vamos corrigir um erro, um travamento ou um comportamento inesperado em algo que já existe.
> - **[3] Chore:** (Manutenção) Vamos apenas instalar bibliotecas, configurar lint, refatorar código interno ou atualizar documentação sem mudar o sistema visualmente.
> 
> Digite o número ou o tipo (feat/fix/chore) para eu criar a branch no padrão `<tipo>/<matriz>/<tarefa>`."

3. Apenas **APÓS** a resposta do Pedro, crie a branch corretamente (`git checkout -b <nome>`).

### 🛑 FASE 2: DESENVOLVIMENTO & VERIFICAÇÃO DE ESTADO (SELF-CORRECTION)
1. Escreva o código na nova branch seguindo as regras do `AGENTS.md`.
2. **VERIFICAÇÃO DE ESTADO (Obrigatório):**
   - Antes de considerar o código pronto, certifique-se de que não há erros visíveis de TypeScript ou lint.
3. **CHECKLIST DE SEGURANÇA (Obrigatório antes do commit):**
   - [ ] Verifique se o arquivo `.env` ou chaves do Supabase NÃO estão no `git status`.
   - [ ] Verifique se não há tokens hardcoded no código.

### 🛑 FASE 3: APROVAÇÃO, COMMIT E PUSH (O BACKUP EM NUVEM)
Ao finalizar a lógica e passar no checklist, **você (IA) NUNCA deve rodar o `git commit` direto**. 

**1. PARE E PEÇA APROVAÇÃO EXATA (Copiando e colando este formato de pergunta):**
> "Chegou a hora de fazer o backup do código (Commit). 
> - **Autor do Commit:** Vai ficar no seu nome, Pedro (ou o configurado no seu Git local). 
> - Aqui estão algumas sugestões de mensagem baseadas no que fizemos:
>   - **Opção 1:** `feat(<matriz>): <descrição direta>`
>   - **Opção 2:** `feat(<matriz>): <descrição mais detalhada>`
>   - **Opção 3:** `<Outro tipo se aplicável>(<matriz>): <descrição>`
> 
> Qual opção você aprova? Ou prefere ditar uma nova mensagem?"

**2. APÓS A RESPOSTA DO PEDRO:**
- Execute: `git add .` e o `git commit -m "Mensagem aprovada"`.
- Faça o Push para o GitHub IMEDIATAMENTE: `git push -u origin <nome-da-branch>`.
- Comunique: *"Backup realizado com sucesso no GitHub. Por favor, teste a tela."*

### 🛑 FASE 4: PULL REQUEST E RELATÓRIO DE STATUS
Após a autorização do Tech Lead (Pedro) de que o código local está bom:
1. **NÃO FAÇA MERGE LOCAL NA MAIN.** (Isto bypassa o Code Review).
2. Gere um Resumo do PR no chat usando ESTRITAMENTE o template abaixo para o Pedro colar no GitHub:
   ```markdown
   ## 🎯 Objetivo do PR
   [Resumo de 1 linha em pt-BR do que foi feito]

   ## 🛠️ Mudanças Realizadas
   - [Lista de mudanças]

   ## 🧪 Como Testar
   [Passo a passo rápido para validar a branch localmente]
