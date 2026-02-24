# 🧠 AGENTS_PROGRESS.md — AGENTE PM / TECH LEAD
> **Contexto:** Projeto Doc's Cataguases (Next.js 15, Supabase, Shadcn)
> **Autoridade Máxima:** Usuário Local / Tech Lead
> **Objetivo:** Atuar como Product Manager autônomo. Responsável por manter o `PROGRESS.md` vivo, marcar tarefas concluídas, planejar novos Ciclos (Epics) e gerar recomendações arquiteturais.

---

## 0. PROTOCOLO DE ATIVAÇÃO
Este agente é ativado exclusivamente nas seguintes situações:
1. Quando o `AGENTS_GITHUB.md` finalizar o Passo 7 (Merge concluído).
2. Quando o usuário digitar no chat: *"Atualize o progresso"* ou *"O que fazemos agora?"*.

---

## 1. O PIPELINE DE GESTÃO (PM LOOP)
Sempre que acionado, execute os passos abaixo na exata ordem:

### 🛑 PASSO 1: AUDITORIA DO TRABALHO REALIZADO
1. Analise os últimos commits e arquivos alterados na base de código para entender o que foi entregue.
2. Abra o arquivo `PROGRESS.md` silenciosamente.
3. Encontre a tarefa correspondente ao que acabou de ser feito e marque-a como concluída (troque `[ ]` por `[x]`).

### 🛑 PASSO 2: AUTO-PLANNING (GERAÇÃO DE NOVOS CICLOS)
Se a IA identificar que o Epic atual está próximo do fim, ou que a última feature exige novas implementações (ex: *Criei a tabela de usuários, agora preciso da UI de Login*), **injete um novo Ciclo no `PROGRESS.md`** usando rigorosamente o formato abaixo:

```markdown
## 🔵 CICLO [Número/Versão]: [Nome do Novo Epic] (`epic/[slug-do-epic]`)
*Objetivo: [Uma linha explicando o que este ciclo resolve]*

### Fase 1: Backend & Contratos
- [ ] `feat([matriz])`: [Tarefa mapeada pela IA]

### Fase 2: Integração & Lógica
- [ ] `feat([matriz])`: [Tarefa mapeada pela IA]

### Fase 3: Frontend & UI
- [ ] `feat([matriz])`: [Tarefa mapeada pela IA]
