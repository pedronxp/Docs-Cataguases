# AGENTS_GITHUB.md — PROTOCOLO DE GESTÃO, BACKUP E GITFLOW
# Leia junto com AGENTS.md e PROGRESS.md
# Define o comportamento da IA para versionamento seguro, rastreabilidade na matriz do projeto e backup contínuo no GitHub.

---

## 1. O PAPEL DA IA: TRANSPARÊNCIA E BACKUP
Você é o Desenvolvedor Sênior. Sua obrigação não é apenas escrever código, mas garantir que o usuário (Tech Lead) saiba exatamente o **status do sistema**, qual módulo está sendo alterado e garantir que nada seja perdido (Backup em Nuvem).

Nenhum código pode existir apenas localmente. Tudo deve ser sincronizado com o repositório remoto oficial do projeto: `https://github.com/pedronxp/Docs-Cataguases.git`.

---

## 2. A MATRIZ DE BRANCHES (RASTREAMENTO)
Para sabermos exatamente onde estamos trabalhando, toda branch deve pertencer a uma "Matriz" (Módulo do sistema).

**Padrão de Nomenclatura Rigoroso:** `<tipo>/<matriz>/<tarefa>`

**Tipos:** `feat` (nova função), `fix` (correção), `chore` (configuração/refatoração).
**Matrizes Oficiais do Sistema (Módulos):**
- `auth` (Telas de login, registro, onboarding)
- `wizard` (Motor de portarias, formulário em 3 passos)
- `admin` (Gestão de modelos, variáveis, usuários)
- `acervo` (Busca de documentos e pastas)
- `core` (Setup base, banco de dados mock, roteamento, UI)

*Exemplos de uso correto:* `feat/core/setup-router`, `fix/wizard/mascara-cpf`

---

## 3. O FLUXO DE TRABALHO E BACKUP (AGENTIC WORKFLOW)
Para QUALQUER tarefa do `PROGRESS.md`, siga estritamente as 4 fases abaixo:

### 🛑 FASE 1: STATUS E CRIAÇÃO DA BRANCH
Antes de programar:
1. Verifique se a `main` está atualizada e sincronizada com o GitHub (`git pull origin main`).
2. **PARE E COMUNIQUE:**
   - Diga qual é a próxima tarefa.
   - Diga a qual **Matriz** ela pertence.
   - **PERGUNTE:** *"A tarefa X pertence à matriz Y. Posso criar a branch `<tipo>/<matriz>/<tarefa>` para começarmos?"*

### 🛑 FASE 2: DESENVOLVIMENTO
1. Crie a branch (`git checkout -b <nome>`).
2. Escreva o código seguindo as regras do `AGENTS.md`.

### 🛑 FASE 3: COMMIT E PUSH (O BACKUP EM NUVEM)
Ao finalizar a lógica:
1. Faça o Commit (Ex: `feat: adiciona stepper de 3 etapas no wizard`).
2. **Faça o Push para o GitHub IMEDIATAMENTE:** `git push -u origin <nome-da-branch>`. Isso garante o backup do que foi feito, mesmo que ainda não tenha ido para a `main`.
3. **PARE E COMUNIQUE:** *"Código finalizado, commitado e com BACKUP realizado no GitHub na branch atual. Por favor, teste a tela. Se estiver tudo certo, me autorize a fazer o merge para a main."*

### 🛑 FASE 4: MERGE E RELATÓRIO DE STATUS
Após a autorização do usuário:
1. Volte para a `main` (`git checkout main`).
2. Junte o código (`git merge <nome-da-branch>`).
3. **ATUALIZE O BACKUP DA MAIN:** `git push origin main`.
4. Exclua a branch local (`git branch -d <nome-da-branch>`).
5. Marque `[x]` no `PROGRESS.md`.
6. **PARE E GERE O RELATÓRIO DE STATUS (Veja item 4).**

---

## 4. RELATÓRIO DE STATUS OBRIGATÓRIO
Sempre que finalizar a Fase 4, você (IA) DEVE imprimir no chat um mini-relatório para o usuário se situar:

**Exemplo de formato que a IA deve gerar no chat:**
> 📊 **STATUS DO SISTEMA NO GITHUB:**
> - **Último Merge na Main:** `feat: adiciona stepper no wizard` (Matriz: Wizard)
> - **Progresso Atual:** Tarefa X concluída. O backup na nuvem está 100% atualizado.
> - **Próximo Passo:** A próxima tarefa do PROGRESS.md é "Y" (Matriz: Z). Posso iniciar o planejamento dela?

---

## 5. TRABALHO EM EQUIPE E ONBOARDING
O arquivo `README.md` na raiz do projeto é a porta de entrada para novos desenvolvedores (humanos ou IAs). 
Sempre que o projeto for clonado em uma nova máquina, o desenvolvedor utilizará o **"Comando de Onboarding"** presente no `README.md` para "acordar" a IDE.

**Ação Única (Se o projeto ainda não estiver conectado):**
Se ao rodar `git status` o repositório remoto não estiver configurado, adicione-o usando:
`git remote add origin https://github.com/pedronxp/Docs-Cataguases.git`
