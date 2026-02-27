# REGRAS PARA ROTAS DE API (Next.js Route Handlers)

## 1. Aprovação de Revisão e Transição para Assinatura
`POST /api/portarias/[id]/aprovar-revisao`
- Verificar se `user.role === 'REVISOR'` e se `revisorAtualId === user.id`.
- Mudar status para `AGUARDANDO_ASSINATURA`.
- Gravar evento no `FeedAtividade`.

## 2. Salvar Assinatura (Atualizado com Manuais)
`POST /api/portarias/[id]/assinar`
- Receber body com `tipoAssinatura` ('DIGITAL', 'MANUAL', 'DISPENSADA').
- Se 'MANUAL' ou 'DISPENSADA', validar obrigatoriedade de `justificativa` e URL do anexo.
- Atualizar banco:
  - `assinaturaStatus`
  - `assinaturaJustificativa`
  - `assinaturaComprovanteUrl`
- Mudar status para `PRONTO_PUBLICACAO`.
- **Trigger**: Criar registro automático na tabela `JornalQueue`.
- Gravar evento em português claro no `FeedAtividade`.

## 3. Publicação pelo Jornal
`POST /api/jornal/publicar`
- Receber `portariaId` e `numeroFinal`.
- Atualizar `Portaria.numeroOficial = numeroFinal`, `Portaria.status = 'PUBLICADA'`, `Portaria.dataPublicacao = now()`.
- Marcar `JornalQueue.status = 'CONCLUIDA'`.
- Incrementar o `proximoNumero` na tabela `LivroNumeracao` daquela secretaria/ano.
- Gravar evento no `FeedAtividade`: "Numerada como [Número] e publicada no Diário Oficial".
