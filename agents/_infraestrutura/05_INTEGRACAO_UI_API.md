# INTEGRAÇÃO API E COMPONENTES - WORKFLOW DE PORTARIA

Com o `schema.prisma` atualizado (tabela `JornalQueue` e colunas de `assinaturaStatus` criadas), precisamos plugar o fluxo no Next.js (App Router).

## 1. Atualizações de API (Next.js App Router)
**Objetivo:** Criar os endpoints que manipulam os novos status.

**Caminho sugerido:** `/app/api/portarias/[id]/fluxo/route.ts` (Método PATCH)
- Este endpoint deve receber um body contendo a `action` do workflow:
  - `action: 'ENVIAR_REVISAO'` -> Muda status para `EM_REVISAO_ABERTA`, adiciona log em `FeedAtividade`.
  - `action: 'ASSUMIR_REVISAO'` -> Seta `revisorAtualId = session.user.id`, muda para `EM_REVISAO_ATRIBUIDA`.
  - `action: 'APROVAR_REVISAO'` -> Muda para `AGUARDANDO_ASSINATURA`.
  - `action: 'REJEITAR_REVISAO'` -> Incrementa `revisoesCount`, salva `observacao` no log, volta para `CORRECAO_NECESSARIA`.

**Caminho sugerido:** `/app/api/portarias/[id]/assinar/route.ts` (Método POST)
- Body: `{ tipoAssinatura: 'DIGITAL' | 'MANUAL' | 'DISPENSADA', justificativa?: string, comprovanteUrl?: string }`
- **Se DIGITAL**: Fluxo padrão.
- **Se MANUAL/DISPENSADA**: Grava o status e a URL.
- **Transição Automática**: Se o status passar de `NAO_ASSINADA`, criar imediatamente um registro em `JornalQueue` conectando o `portariaId`.

**Caminho sugerido:** `/app/api/jornal/route.ts` (Método GET e POST)
- **GET**: Retorna todas as entradas de `JornalQueue` com `status = 'PENDENTE'`, populando com os dados da `Portaria` relacionada.
- **POST**: Recebe `{ queueId, numeroFinal }`. Atualiza a Portaria com o `numeroFinal`, marca a queue como `CONCLUIDA` e salva no log.

## Regras para a IDE:
1. Comece criando os arquivos de API (backend) primeiro.
2. Certifique-se de usar o `prisma` de `/lib/prisma` (ou equivalente no projeto).
3. Todas as ações DEVEM inserir um novo registro na tabela `FeedAtividade` (em português claro).
