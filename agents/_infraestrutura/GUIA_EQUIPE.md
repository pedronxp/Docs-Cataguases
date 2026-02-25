# 🏢 MANUAL DEFINITIVO DE INTEGRAÇÃO E TRABALHO EM EQUIPE
> **Contexto:** Projeto Doc's Cataguases
> **Autoridade:** Gestão Ágil e Arquitetura DevOps (Multiplayer)
> **Objetivo:** Estabelecer a "Fonte da Verdade" para o trabalho em equipe, integração de código paralelo, resolução de conflitos e boas práticas.
> **Leia também:** `agents/_infraestrutura/GITHUB.md` (Para regras estritas de versionamento e nomenclaturas).

---

## 🤖 0. NOSSO ECOSSISTEMA DE AGENTES

| Arquivo | Papel | Quando Usar |
|---|---|---|
| `AGENTS_GITHUB.md` | O DevOps | Ao criar branches (`nova`, `corrige`, `tarefa`, `modulo`), commitar e abrir PRs |
| `AGENTS_PROGRESS.md` | O Product Manager | Ao finalizar uma tarefa e planejar a próxima |
| `PROGRESS.md` | O Backlog | Para ver o que está pendente e o que foi concluído |

---

## ⚠️ 0.1 PROTEÇÕES OBRIGATÓRIAS NO GITHUB
> **Atenção Gestor:** Sem isso, nenhuma regra dos nossos `.md` tem valor técnico real.

Acesse: **GitHub → Repositório → Settings → Branches → Add Rule → Branch name: `main`**

- ✅ **Require a pull request before merging** — Ninguém faz merge direto na `main`.
- ✅ **Require at least 1 approval** — Revisões em equipe são obrigatórias.
- ✅ **Do not allow bypassing the above settings** — Sem exceções.

---

## 🔄 1. O RITUAL DIÁRIO (DAILY SYNC)
Todo desenvolvedor deve executar esta rotina assim que ligar o computador no início do trabalho:

```bash
git fetch --all --prune
git checkout main
git pull origin main
npm install
```

Isso garante que você não vai começar a trabalhar em cima de um código que já estava velho no dia anterior.

---

## 🏗️ 2. DOUTRINA DO TRABALHO PARALELO (FRONT vs BACK)

Trabalhamos em paralelo usando as regras de prefixos do `GITHUB.md` (`nova`, `corrige`, `tarefa`, `modulo`).

### Como evitar quebras se Pedro e Paulo trabalharem na mesma feature?

**❌ Erro Comum:** Editar a `main` ou criar branches com espaços como `design login feito`.

**✅ Padrão Correto:**
- Pedro (Frontend) cria uma sub-branch via Agente: `nova/auth/design-login`
- Paulo (Backend) cria sua própria sub-branch via Agente: `nova/auth/api-login`

**O Ciclo de Vida do Trabalho:**
1. Pedro e Paulo trabalham isolados em suas branches. O código de um é invisível para o outro por enquanto.
2. Quando terminam, cada um abre um Pull Request (PR) individual.
3. A equipe revisa. O Gestor aprova e faz o Merge para a `main` (ou para um grande `modulo/`).

**Como Pedro testa a API do Paulo localmente ANTES de ir para a main?**
Simples! O Pedro baixa a branch do Paulo no VS Code dele por alguns minutos para testar:
```bash
git fetch origin
git checkout nova/auth/api-login
npm run dev
```

---

## ⚔️ 3. RESOLUÇÃO DE CONFLITOS (MERGE CONFLICTS)

Um "Conflito de Merge" acontece quando duas pessoas modificam a **mesma linha de código do mesmo arquivo**. O Git não sabe qual das duas manter e pede ajuda. **Nunca entre em pânico.**

**Passo a passo infalível: O que fazer ao se deparar com um conflito?**
1. O terminal avisará que houve conflito (ex: `Automatic merge failed; fix conflicts and then commit the result`).
2. Abra o seu **VS Code**. Ele ficará verde/azul e mostrará claramente os arquivos conflitantes na aba lateral de Source Control.
3. Abra o arquivo que está quebrando. O VS Code mostrará marcações óbvias (`<<<<<<< HEAD`, `=======`).
4. **Acima da linha do conflito no VS Code**, clique em uma dessas quatro opções textuais que aparecerão (Use apenas o mouse):
   * `Accept Current Change` (Manter o MEU código)
   * `Accept Incoming Change` (Manter o código DELE/da ORIGEM)
   * `Accept Both Changes` (Manter os dois, um embaixo do outro)
   * `Compare Changes` (Olhar lado a lado)
5. Após clicar na opção certa, salve o arquivo (`Ctrl+S`).
6. O conflito sumiu. Agora basta rodar no terminal: `git add .` e então `git commit --no-edit` (para usar a mensagem de merge automática).
7. Pronto! 

> **Regra de Ouro:** Se bater o desespero e você achar que quebrou tudo durante um rebase longo ou merge complexo, aborte tudo com `git merge --abort` ou `git rebase --abort` e seu código voltará ao normal intacto.

---

## 🧐 4. CODE REVIEW E PULL REQUESTS (PRs)

O objetivo do Code Review não é apontar o dedo, é aprender, garantir a qualidade e compartilhar conhecimento. 

**Como pedir um PR (Quem Fatorou o Código):**
1. Copie o template do arquivo `GITHUB.md` (Passo 6).
2. Explique com transparência o que for complexo: "Atenção aqui: usei `useMemo` porque a renderização estava pesada".
3. Anexe Prints de tela (Screenshots) se a sua alteração mudou algo visual!

**Como Revisar um PR (O Revisor / Tech Lead):**
1. Não olhe apenas a sintaxe. Faça checkout local na branch da pessoa e rode o projeto. Funciona? O layout quebra no mobile?
2. Sempre seja cordial. Use "O que acha de extrairmos essa função para um arquivo separado?" em vez de "Isso está mal codado".
3. **Regra de Escoteiro:** Se você vir um aviso pequeno (Lint ou console.log esquecido), avise no comentário, mas se for a única falha, aproveite para arrumar você mesmo com um mini-commit se tiver permissão, para não travar o amigo.

---

## 💬 5. COMUNICAÇÃO ASSÍNCRONA

Se não está escrito, não existe. A comunicação por voz ou Whatsapp é ótima para debater ideias, mas péssima para rastreabilidade técnica do sistema.

**Diretrizes da Equipe:**
1. **Reporte de Bug:** Não grite "O login quebrou!!". Abra um card/issue documentando: O que você fez, o que você esperava que acontecesse, e o que apareceu na tela (coloque prints).
2. **Pedindo ajuda à equipe/Tech Lead:** Sempre forneça antes o histórico. "Estou há 1 hora tentando o comando X e dá o erro Y".
3. **Links absolutos:** Parem de referenciar "aquele componente de listagem". Acostumem-se a enviar o caminho exato do arquivo (ex: `apps/web/src/components/ListagemGeral.tsx:L45`).

---

## 🧠 6. O GRANDE QUIZ DA EQUIPE (SITUAÇÕES PRÁTICAS)

Vamos treinar! Responda mentalmente antes de ler o gabarito.

**Q1: Estou no meio da minha branch `nova/pagamentos-admin` e o chefe pede para eu parar tudo e arrumar um erro de digitação urgente na home pública. O que eu faço?**
> **R:** Primeiro, crie um commit temporário do seu progresso local para não perdê-lo (`git add .` -> `git commit -m "WIP"`). Vá para a branch principal (`git checkout main`), puxe atualizações (`git pull origin main`), crie uma nova branch para a urgência (`git checkout -b corrige/home-texto`), conserte, commite e suba pro PR. Depois, volte à primeira branch (`git checkout nova/pagamentos-admin`) e continue a vida tranquilamente.

**Q2: Duas pessoas no time acabaram mudando o arquivo de traduções ao mesmo tempo. João foi ligeiro e fez o Merge do PR dele pra `main`. A Maria, ao tentar terminar a parte dela e dar o Push, recebeu um aviso de conflito. Maria deve jogar o trabalho dela fora?**
> **R:** De jeito nenhum! Maria fará `git pull origin main` enquanto está na branch dela. O conflito aparecerá no VS Code. Ela usará a aba de Code Lens do VS Code e clicará pacientemente em `Accept Both Changes` e depois arrumará os colchetes/vírgulas finais manualmente. Salva, digita `git commit` e PR resolvido em 2 minutos.

**Q3: Terminei minha task e a branch estava como `nova/auth-modal`. Gerei o PR apontando pra `main`. O Tech lead pediu mudanças no botão vermelho. Tenho que fechar esse PR e criar outra branch `nova/auth-modal-botoes`?**
> **R:** Nunca! Não encerre o PR! Mantenha-se na sua branch atual (`nova/auth-modal`), troque a cor do botão, e basta dar um novo `git add .`, commit e `git push...` O Push que você efetua em uma branch que já tem PR aberto atualiza aquele mesmo PR simultaneamente e notifica os avaliadores no GitHub automaticamente de que você consertou!

**Q4: A equipe combinou de implementar o Módulo inteiro de Processos Licitatórios. São várias tabelas, interfaces, regras e semanas de trabalho. A gente joga tudo no fluxo normal da `main`?**
> **R:** Arriscado demais quebrar a versão local de todo mundo no meio de tanto código imaturo. Acione a Regra de Agrupamento: crie a grande branch agrupadora pai `modulo/licitacoes`. Toda a equipe continuará criando sub-branches tipo `nova/licitacoes/botao-novo` ou `corrige/licitacoes/erro-tela`. Porém, quando essas branches rodarem os PRs delas, os PRs serão apontados/mergeados todos SOMENTE para dentro do grande `modulo/licitacoes`. Quando tudo estiver estável daqui a algumas semanas, a equipe pega a gigantesca e perfeitinha `modulo/licitacoes` e faz um mega Pull Request abençoado de volta para a sacrosanta `main`.
