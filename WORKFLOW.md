# Workflow de Portarias — Doc's Cataguases

> Documentação técnica do fluxo completo de criação, revisão, assinatura e publicação de portarias oficiais.
> **Versão:** 0.02 | **Atualizado:** 2026-02-27

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Roles e Permissões](#2-roles-e-permissões)
3. [Estados da Portaria](#3-estados-da-portaria)
4. [Fluxo Completo](#4-fluxo-completo)
5. [Endpoints de API](#5-endpoints-de-api)
6. [Regras de Negócio](#6-regras-de-negócio)
7. [Numeração Oficial](#7-numeração-oficial)
8. [Feed de Atividades](#8-feed-de-atividades)
9. [Decisões de Arquitetura](#9-decisões-de-arquitetura)

---

## 1. Visão Geral

O sistema gerencia portarias da **Prefeitura Municipal de Cataguases/MG**. O ciclo de vida de um documento passa por etapas de elaboração, revisão interna (ida-e-volta), assinatura e publicação com número oficial no formato `PORT-{N}/CATAGUASES`.

### Princípios Adotados

- **Numeração atômica no momento da publicação** — zero números reservados sem uso
- **Locking pessimista** (`SELECT FOR UPDATE`) — sem duplicatas mesmo com requisições simultâneas
- **Revisão iterativa** — Operador ↔ Revisor podem trocar N vezes antes da aprovação
- **Auditoria automática** — todo estado é registrado no `FeedAtividade` com autor e timestamp

---

## 2. Roles e Permissões

| Role | Descrição | Permissões sobre Portaria |
|------|-----------|--------------------------|
| `ADMIN_GERAL` | Administrador do sistema | Tudo (`manage all`) |
| `PREFEITO` | Chefe do executivo | Ler, Assinar, Publicar |
| `SECRETARIO` | Secretário de pasta | Ler (da secretaria), Aprovar, Rejeitar, Publicar |
| `REVISOR` | Revisor de documentos do setor | Ler (do setor), Aprovar, Rejeitar |
| `OPERADOR` | Elaborador de documentos | Criar, Ler (próprias), Editar (rascunho), Submeter |
| `PENDENTE` | Aguardando ativação | Nenhuma |

> **Nota:** `REVISOR` é o rename de `GESTOR_SETOR` implementado na Versão 0.02.

---

## 3. Estados da Portaria

```
RASCUNHO
   │
   │ [OPERADOR] submete DOCX editado
   ▼
EM_REVISAO_ABERTA
   │
   │ [REVISOR/SECRETARIO/ADMIN/PREFEITO] assume revisão
   ▼
EM_REVISAO_ATRIBUIDA ──┐
   │                    │ [Revisor] rejeita com observação
   │ [Revisor] aprova   ▼
   │            CORRECAO_NECESSARIA
   │                    │
   │                    │ [OPERADOR] corrige e submete novamente
   │                    └──────────────────────────────► EM_REVISAO_ABERTA
   ▼
AGUARDANDO_ASSINATURA
   │
   │ [PREFEITO/ADMIN] assina (digital ou manual)
   ▼
PRONTO_PUBLICACAO
   │
   │ [PREFEITO/SECRETARIO/ADMIN] publica → aloca número oficial
   ▼
PUBLICADA
```

### Tabela de Status

| Status | Descrição | Quem pode agir |
|--------|-----------|----------------|
| `RASCUNHO` | Portaria criada, aguardando elaboração | OPERADOR (autor) |
| `EM_REVISAO_ABERTA` | Submetida, aguardando revisor assumir | REVISOR, SECRETARIO, ADMIN, PREFEITO |
| `EM_REVISAO_ATRIBUIDA` | Revisor assumiu, em análise | Revisor atual |
| `CORRECAO_NECESSARIA` | Devolvida ao autor com observação | OPERADOR (autor) |
| `AGUARDANDO_ASSINATURA` | Aprovada na revisão, aguarda assinatura | PREFEITO, ADMIN |
| `PRONTO_PUBLICACAO` | Assinada, aguarda publicação oficial | PREFEITO, SECRETARIO, ADMIN, JORNALISTA |
| `PUBLICADA` | Número oficial alocado, publicada | (imutável) |
| `CANCELADA` | Fluxo interrompido (antes da publicação) | OPERADOR (autor), ADMIN |
| `ARQUIVADA` | Portaria inativada ou deprecada | ADMIN |

---

## 4. Fluxo Completo

### Etapa 1 — Criação (Wizard)

**Quem:** OPERADOR
**Rota Frontend:** `/administrativo/portarias/novo`
**API:** `POST /api/portarias`

1. Operador acessa o Wizard de 3 passos:
   - **Passo 1:** Seleciona o Modelo de Documento
   - **Passo 2:** Preenche as variáveis do modelo (formulário dinâmico)
   - **Passo 3:** Confere os dados
2. Ao finalizar, a API cria a portaria com status `RASCUNHO`
3. Frontend redireciona automaticamente para a página de submissão (`/revisao/$id`)

---

### Etapa 2 — Elaboração e Submissão

**Quem:** OPERADOR
**Rota Frontend:** `/administrativo/portarias/revisao/$id`
**API:** `GET /api/portarias/$id/docx` + `POST /api/portarias/$id/submeter`

1. Operador **baixa o DOCX template** (gerado a partir do modelo da portaria)
2. Edita o arquivo no Word, verificando que as variáveis estão corretas
3. Faz **upload do DOCX editado** na interface
4. Clica em "Submeter Documento Oficial"
5. Backend:
   - Salva o DOCX no Supabase Storage (`portarias/{id}/rascunho-{ts}.docx`)
   - Substitui `{{variavel}}` no HTML do modelo com os valores de `formData`
   - Gera hash SHA-256 do HTML final (`hashIntegridade`)
   - Converte HTML → PDF via **CloudConvert** com rotação de chaves
   - Salva o PDF no Supabase Storage (`portarias/{id}/documento-{ts}.pdf`)
   - Atualiza status para `EM_REVISAO_ABERTA`
   - Registra evento `DOCUMENTO_SUBMETIDO` no FeedAtividade
6. Frontend redireciona para `/administrativo/portarias/$id`

> **Se `docxEditadoBase64` não for enviado:** O PDF ainda é gerado a partir do HTML do modelo + formData. O DOCX editado é opcional.

---

### Etapa 3 — Revisão (ida-e-volta)

**Quem:** REVISOR / SECRETARIO / ADMIN_GERAL / PREFEITO
**Rota Frontend:** `/administrativo/portarias/$id`
**API:** `PATCH /api/portarias/$id/fluxo`

#### 3.1 — Assumir Revisão

| Campo | Valor |
|-------|-------|
| Action | `ASSUMIR_REVISAO` |
| De | `EM_REVISAO_ABERTA` |
| Para | `EM_REVISAO_ATRIBUIDA` |
| Efeito | `revisorAtualId = session.id` |

- Bloqueia edição pelo Operador enquanto a revisão está atribuída
- Outros revisores veem "Portaria sob revisão de outro usuário"

#### 3.2 — Aprovar Revisão

| Campo | Valor |
|-------|-------|
| Action | `APROVAR_REVISAO` |
| De | `EM_REVISAO_ATRIBUIDA` |
| Para | `AGUARDANDO_ASSINATURA` |
| Efeito | `revisorAtualId = null` |
| Guard | Apenas o `revisorAtualId` atual (ou ADMIN_GERAL) |

#### 3.3 — Rejeitar / Devolver para Correção

| Campo | Valor |
|-------|-------|
| Action | `REJEITAR_REVISAO` |
| De | `EM_REVISAO_ATRIBUIDA` |
| Para | `CORRECAO_NECESSARIA` |
| Efeito | `revisorAtualId = null`, `revisoesCount += 1` |
| Guard | Apenas o `revisorAtualId` atual (ou ADMIN_GERAL) |
| Obrigatório | Campo `observacao` com o motivo |

- O Operador recebe notificação e vê a observação no feed
- Pode editar campos via `PATCH /api/portarias/$id` e submeter novamente
- Ciclo volta para `EM_REVISAO_ABERTA`

---

### Etapa 4 — Assinatura (três modalidades)

**Quem:** SECRETARIO / PREFEITO / ADMIN_GERAL
**Rota Frontend:** `/administrativo/portarias/$id` (modal de assinatura)
**API:** `POST /api/portarias/$id/assinar`

Em todos os casos: status → `PRONTO_PUBLICACAO`, entrada criada/atualizada no `JornalQueue`, evento registrado no `FeedAtividade` com texto em linguagem natural.

#### 4.1 — Assinatura Digital (rito padrão)

**Campo:** `tipoAssinatura: 'DIGITAL'`

| Campo | Valor |
|-------|-------|
| `assinaturaStatus` | `ASSINADA_DIGITAL` |
| `assinadoPorId` | `session.id` (signatário) |
| Justificativa | Não obrigatória |
| Comprovante | Não necessário |

**Log:** `"Portaria assinada digitalmente por [Nome] (PREFEITO) em DD/MM/AAAA HH:MM."`

---

#### 4.2 — Assinatura Manual Substituta (exceção)

**Cenário:** O Prefeito/responsável assinou fisicamente o documento impresso, mas não no sistema.

**Campo:** `tipoAssinatura: 'MANUAL'`

| Campo | Valor |
|-------|-------|
| `assinaturaStatus` | `ASSINADA_MANUAL` |
| `assinadoPorId` | Secretário que registrou a informação |
| `assinaturaJustificativa` | Texto obrigatório (quem assinou, quando, em qual processo físico) |
| `assinaturaComprovanteUrl` | Upload obrigatório — PDF/imagem do documento assinado fisicamente, salvo no Supabase Storage |
| Comprovante base64 | Enviado pelo frontend, convertido e salvo pela API |

**Log:** `"Portaria marcada como assinada manualmente. Responsável pelo registro: Daniel (SECRETARIO). Justificativa: 'Prefeito assinou fisicamente no processo nº 123/2026 em 26/02/2026'. Comprovante digitalizado anexado."`

---

#### 4.3 — Publicação sem Assinatura — Decisão Formal (exceção extrema)

**Cenário:** Por decisão formal (portaria normativa, calamidade, etc.), o documento segue sem qualquer assinatura.

**Campo:** `tipoAssinatura: 'DISPENSADA'`

| Campo | Valor |
|-------|-------|
| `assinaturaStatus` | `DISPENSADA_COM_JUSTIFICATIVA` |
| `assinadoPorId` | Responsável que registrou a dispensa |
| `assinaturaJustificativa` | Texto obrigatório com embasamento legal (número do ato normativo) |
| Comprovante | Opcional (despacho/ato formal) |

**Log:** `"Assinatura dispensada por decisão formal. Registrado por: Daniel (SECRETARIO). Justificativa: 'Dispensada conforme Portaria Normativa nº X/2026...'"`

---

#### 4.4 — Guard na Publicação

A rota `POST /api/portarias/$id/publicar` **bloqueia** portarias com `assinaturaStatus === 'NAO_ASSINADA'`, retornando erro 400:

> *"Esta portaria não possui registro de assinatura. Registre uma assinatura (digital, manual ou dispensada com justificativa) antes de publicar."*

Isso garante que **nenhuma portaria pode ser publicada sem um registro explícito** de assinatura — mesmo que seja a modalidade de dispensa.

#### 4.5 — Exibição no Jornal / Tela de Publicação

O card "Pronto para Publicação" exibe o status de assinatura de forma visual:

| `assinaturaStatus` | Exibição |
|-------------------|----------|
| `ASSINADA_DIGITAL` | Badge verde: "Assinada digitalmente" |
| `ASSINADA_MANUAL` | Badge âmbar: justificativa + "Comprovante anexado" |
| `DISPENSADA_COM_JUSTIFICATIVA` | Badge cinza: justificativa da dispensa |

---

### Etapa 5 — Publicação

**Quem:** PREFEITO / SECRETARIO / ADMIN_GERAL
**Rota Frontend:** `/administrativo/portarias/$id`
**API:** `POST /api/portarias/$id/publicar`

1. Responsável clica em "Publicar Portaria"
2. Backend valida role e status (`PRONTO_PUBLICACAO` obrigatório)
3. Chama `NumeracaoService.alocarNumeroPortaria()`:
   - `SELECT FOR UPDATE` no `LivrosNumeracao` ativo
   - Lê `proximo_numero`, formata: `PORT-{N:04d}/CATAGUASES`
   - Incrementa `proximo_numero + 1`
   - Registra log de auditoria no JSON do livro
4. Atualiza portaria: `status = PUBLICADA`, `numeroOficial`, `dataPublicacao`
5. Marca entrada do `JornalQueue` como `CONCLUIDA`
6. Registra evento `PUBLICADA` no FeedAtividade

---

## 5. Endpoints de API

### Portarias

| Método | Endpoint | Descrição | Roles Permitidas |
|--------|----------|-----------|-----------------|
| `GET` | `/api/portarias` | Listar portarias | Autenticado |
| `POST` | `/api/portarias` | Criar rascunho | OPERADOR, ADMIN |
| `GET` | `/api/portarias/:id` | Buscar portaria (com modelo+variaveis) | Autenticado |
| `PATCH` | `/api/portarias/:id` | Editar campos (whitelist) | Autor, ADMIN |
| `DELETE` | `/api/portarias/:id` | Excluir portaria | ADMIN_GERAL |
| `PATCH` | `/api/portarias/:id/fluxo` | Transições de estado | Varia por action |
| `POST` | `/api/portarias/:id/submeter` | Submeter DOCX + gerar PDF | Autor, ADMIN |
| `GET` | `/api/portarias/:id/docx` | Download DOCX (URL assinada) | Autenticado |
| `POST` | `/api/portarias/:id/publicar` | Publicar com número oficial | PREFEITO, SECRETARIO, ADMIN |
| `POST` | `/api/portarias/:id/assinar` | Assinar portaria | PREFEITO, ADMIN |
| `GET` | `/api/portarias/:id/pdf` | Obter URL do PDF | Autenticado |

### Actions do `/fluxo`

| Action | De → Para | Quem |
|--------|-----------|------|
| `ENVIAR_REVISAO` | `RASCUNHO` / `CORRECAO_NECESSARIA` → `EM_REVISAO_ABERTA` | Autor |
| `ASSUMIR_REVISAO` | `EM_REVISAO_ABERTA` → `EM_REVISAO_ATRIBUIDA` | REVISOR, SECRETARIO, ADMIN, PREFEITO |
| `APROVAR_REVISAO` | `EM_REVISAO_ATRIBUIDA` → `AGUARDANDO_ASSINATURA` | Revisor atual (ou ADMIN) |
| `REJEITAR_REVISAO` | `EM_REVISAO_ATRIBUIDA` → `CORRECAO_NECESSARIA` | Revisor atual (ou ADMIN) |

### Segurança do PATCH `/api/portarias/:id`

Campos editáveis por **OPERADOR** (autor):
- `titulo`, `descricao`, `formData`, `docxRascunhoUrl`

Campos extras para **ADMIN_GERAL**:
- `pdfUrl`, `status`

Condições:
- Apenas o autor da portaria pode editar (ou ADMIN_GERAL)
- Status deve ser `RASCUNHO` ou `CORRECAO_NECESSARIA`

---

## 6. Regras de Negócio

### Edição de Portarias
- Portaria só pode ser editada nos status `RASCUNHO` ou `CORRECAO_NECESSARIA`
- Apenas o autor pode editar (exceto ADMIN_GERAL)
- Campos sensíveis (`numeroOficial`, `hashIntegridade`, `status`) não estão na whitelist de PATCH

### Revisão
- Para rejeitar, o campo `observacao` é obrigatório
- O campo `revisoesCount` contabiliza quantas vezes a portaria foi devolvida
- Apenas o revisor que assumiu pode aprovar/rejeitar (exceto ADMIN_GERAL)
- Quando uma portaria é aprovada ou rejeitada, `revisorAtualId` volta a `null`

### Submissão de DOCX
- O DOCX editado é **opcional** — o sistema sempre gera o PDF a partir do HTML do modelo
- Se o CloudConvert falhar, a portaria ainda avança para `EM_REVISAO_ABERTA` (sem bloquear o fluxo)
- O PDF pode ser regenerado manualmente depois

### Publicação
- Somente a partir de `PRONTO_PUBLICACAO`
- O número é alocado **atomicamente** — impossível duplicar mesmo com concorrência
- Uma vez publicada, a portaria não pode mais ser editada

---

## 7. Numeração Oficial

### Formato
```
PORT-{N:04d}/CATAGUASES
Exemplo: PORT-0001/CATAGUASES
         PORT-0042/CATAGUASES
```

### Mecanismo (Livro Único)

```sql
BEGIN;
SELECT id, proximo_numero, formato_base
FROM "LivrosNumeracao"
WHERE ativo = true
LIMIT 1
FOR UPDATE;  -- Lock pessimista

-- Aloca o número atual
-- Incrementa proximo_numero + 1
-- Registra log de auditoria no JSON do livro
COMMIT;
```

### Log de Auditoria (JSON no LivrosNumeracao)
```json
{
  "numero": "0001",
  "portaria_id": "clxxx...",
  "aprovador": "user_id",
  "data": "2026-02-27T10:00:00.000Z",
  "ip": "192.168.1.1"
}
```

---

## 8. Feed de Atividades

Todos os eventos do ciclo de vida são registrados na tabela `FeedAtividade`:

| `tipoEvento` | Descrição |
|-------------|-----------|
| `DOCUMENTO_SUBMETIDO` | Operador submeteu DOCX e gerou PDF |
| `MUDANCA_STATUS_ENVIAR_REVISAO` | Enviado para revisão |
| `MUDANCA_STATUS_ASSUMIR_REVISAO` | Revisor assumiu a portaria |
| `MUDANCA_STATUS_APROVAR_REVISAO` | Revisão aprovada |
| `MUDANCA_STATUS_REJEITAR_REVISAO` | Revisão rejeitada com observação |
| `PUBLICADA` | Portaria publicada com número oficial |

Cada registro inclui: `autorId`, `portariaId`, `secretariaId`, `mensagem`, `metadata` (JSON livre), `createdAt`.

---

## 9. Decisões de Arquitetura

### Por que numerar apenas na publicação?

**Problema:** Números alocados em rascunhos são desperdiçados se o documento for cancelado.
**Decisão:** Alocar o número oficial somente no momento da publicação (`PRONTO_PUBLICACAO → PUBLICADA`).
**Resultado:** Zero gaps na sequência; numeração sempre contínua.

### Por que o DOCX editado é opcional no `/submeter`?

O sistema sempre gera o PDF a partir do **HTML do modelo** com as variáveis do `formData`. O DOCX editado pelo usuário é armazenado como backup e rascunho. Isso garante que o PDF oficial seja sempre consistente com os dados do sistema, independente de edições manuais no Word.

### Por que usar CASL no frontend E no backend?

- **Frontend (CASL):** Esconde elementos de UI irrelevantes para o role do usuário
- **Backend (verificações manuais + CASL conceitual):** Garante que a segurança nunca dependa apenas do cliente

Ambas as camadas são necessárias — nunca confiar apenas no frontend.

### Rename GESTOR_SETOR → REVISOR (v0.02)

O nome `GESTOR_SETOR` era ambíguo (poderia ser confundido com gestão administrativa). O novo nome `REVISOR` comunica exatamente a função: revisar e aprovar documentos antes da assinatura. A mudança foi aplicada em todas as 8+ ocorrências no codebase (schema, abilities, routes, types, labels de UI).

---

## Apêndice — Diagrama de Sequência (Caso de Uso Completo)

```
Operador          Sistema (API)         Revisor            Prefeito
   │                   │                   │                   │
   │──[Wizard]────────►│                   │                   │
   │  POST /portarias  │                   │                   │
   │◄──────────────────│ (RASCUNHO)        │                   │
   │                   │                   │                   │
   │──[Upload DOCX]───►│                   │                   │
   │  POST /submeter   │                   │                   │
   │◄──────────────────│ (EM_REVISAO_ABERTA, PDF gerado)      │
   │                   │                   │                   │
   │                   │◄──[Assume]────────│                   │
   │                   │  ASSUMIR_REVISAO  │                   │
   │                   │──────────────────►│ (EM_REVISAO_ATRIBUIDA)
   │                   │                   │                   │
   │                   │──[Rejeita]───────►│                   │
   │                   │  REJEITAR_REVISAO │                   │
   │◄──────────────────│ (CORRECAO_NECESSARIA + observação)    │
   │                   │                   │                   │
   │──[Corrige]───────►│                   │                   │
   │  POST /submeter   │                   │                   │
   │◄──────────────────│ (EM_REVISAO_ABERTA novamente)         │
   │                   │                   │                   │
   │                   │◄──[Assume]────────│                   │
   │                   │◄──[Aprova]────────│                   │
   │                   │  APROVAR_REVISAO  │                   │
   │◄──────────────────│ (AGUARDANDO_ASSINATURA)               │
   │                   │                   │                   │
   │                   │◄──────────────────────────[Assina]────│
   │                   │  POST /assinar    │                   │
   │◄──────────────────│ (PRONTO_PUBLICACAO)                   │
   │                   │                   │                   │
   │                   │◄──────────────────────────[Publica]───│
   │                   │  POST /publicar   │                   │
   │◄──────────────────│ (PUBLICADA, PORT-0001/CATAGUASES)     │
```
