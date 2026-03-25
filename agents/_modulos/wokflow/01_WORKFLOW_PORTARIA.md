# WORKFLOW PORTARIA COMPLETO - Docs Cataguases

## Objetivo
Definir o fluxo de criação, revisão, assinatura e numeração de Portarias, garantindo trilha de auditoria (logs humanos) e flexibilidade na assinatura (digital ou manual com anexo).

## ETAPA 1: RASCUNHO [Role: OPERADOR]
1. Cria nova portaria, seleciona modelo e preenche variáveis (`formData`).
2. Status inicial: `RASCUNHO`.
3. Ao clicar "Enviar para Revisão":
   - Status muda para: `EM_REVISAO_ABERTA`.
   - Gera notificação para todos os revisores da secretaria.
   - `feedAtividade`: "Portaria enviada para revisão por [Nome do Operador]".

## ETAPA 2: REVISÃO [Role: REVISOR]
1. O primeiro REVISOR que clicar em "Aceitar Revisão":
   - Assume exclusividade: `portarias.revisorAtualId = seu id`.
   - Status muda para: `EM_REVISAO_ATRIBUIDA`.
   - `feedAtividade`: "Portaria atribuída para revisão a [Nome do Revisor]".
2. Ações permitidas ao Revisor:
   - **Aprovar**: Status muda para `AGUARDANDO_ASSINATURA`.
   - **Rejeitar**: Exige campo de observação. Status volta para `CORRECAO_NECESSARIA`. Incrementa `revisoesCount`. `feedAtividade`: "Rejeitada por [Nome]: '[Observação]'".
   - **Passar**: Libera a exclusividade (`revisorAtualId = null`), volta para `EM_REVISAO_ABERTA`.
3. **Escalada**: Se `revisoesCount >= 3`, o sistema notifica e escala automaticamente para o SECRETARIO (role de editor).

## ETAPA 3: ASSINATURA [Roles: SECRETARIO / PREFEITO]
Status: `AGUARDANDO_ASSINATURA`.
Existem 3 caminhos possíveis. Só avança para a Etapa 4 se `assinaturaStatus != 'NAO_ASSINADA'`.

- **Caminho A: Assinatura Digital (Padrão)**
  - O Prefeito/Secretário clica em assinar.
  - `assinaturaStatus = 'ASSINADA_DIGITAL'`.
  - Atualiza `assinadoPorId` e `assinadoEm`.
  - `feedAtividade`: "Assinada digitalmente por [Nome]".

- **Caminho B: Assinatura Manual (Exceção)**
  - Secretário seleciona "Registrar Assinatura Manual".
  - Obrigatório preencher justificativa e fazer upload do PDF assinado fisicamente.
  - `assinaturaStatus = 'ASSINADA_MANUAL'`.
  - Grava `assinaturaJustificativa` e `assinaturaComprovanteUrl`.
  - `feedAtividade`: "Assinatura manual registrada por [Nome do Secretário]. Justificativa: '[Texto]'. Arquivo anexado."

- **Caminho C: Dispensada com Justificativa (Raro)**
  - Secretário seleciona "Publicar sem assinatura".
  - Obrigatório preencher justificativa longa (e opcional upload de despacho).
  - `assinaturaStatus = 'DISPENSADA_COM_JUSTIFICATIVA'`.
  - `feedAtividade`: "Assinatura dispensada por [Nome]. Justificativa: '[Texto]'."

## ETAPA 4: FILA JORNAL [Roles: SECRETARIO / PREFEITO / ADMIN_GERAL / JORNALISTA]
1. Portarias aprovadas na Etapa 3 entram na fila do Jornal.
2. Responsável visualiza a portaria e o status/comprovante de assinatura.
3. O sistema sugere o próximo número baseado na tabela `livroNumeracao` (Ex: "007/2026").
4. O usuário confirma a publicação. A numeração é alocada **automaticamente e de forma atômica** pelo sistema (garantindo ausência de gaps ou duplicidades).
5. Ao confirmar:
   - `numeroOficial = alocado pelo sistema`.
   - Status muda para: `PUBLICADA`.
   - `dataPublicacao = now()`.
   - `feedAtividade`: "Portaria publicada com número [Número] por [Nome]."

## ETAPA 5: CANCELAMENTO (EXCEÇÃO)
- A qualquer momento ANTES da publicação oficial (Etapa 4), o Autor original ou Administrador podem cancelar o fluxo.
- Status muda para `CANCELADA`.
- Justificativa é obrigatória e gravada no log de auditoria.
