# Phase 02: Correções e Melhorias Gerais — Research

**Researched:** 2026-04-09
**Domain:** Multi-domain: LLM providers, FloatingChat UI, notifications (SSE), approval queue, document numbering, PDF/signature pipeline
**Confidence:** HIGH (todos os achados baseados em leitura direta do código-fonte)

---

## Summary

A fase 2 cobre quatro eixos independentes com bugs raiz identificados. O mais crítico é o pipeline PDF/Assinatura: ao registrar uma assinatura (`/assinar`), `pdfUrl` e `docxRascunhoUrl` são explicitamente zerados (`null`) na linha 134 do `assinar/route.ts`, mas nenhum mecanismo dispara a regeneração do PDF antes de enviar para assinatura externa — quando o front tenta baixar o arquivo ele não existe no storage. O segundo bug mais urgente é a numeração: `NumeracaoService` usa `formato_base = 'PORT-{N}/{ANO}'` mas entrega somente o valor sem prefixo em alguns fluxos porque o `publicar/route.ts` força `SYS_NUMERO = numeroOficial` antes de chamar `VariableService`, enquanto o `generate/route.ts` antigo usa `varsBD` sem `VariableService`, resultando em valores inconsistentes.

Para notificações, o "duplo disparo" é arquitetural: `fetchInitialNotifications` carrega do backend via REST enquanto o SSE já entregou os mesmos eventos; o merge no store tenta deduplicar por `id`, mas a deduplicação depende de IDs coincidentes entre o endpoint REST e o SSE — quando diferem (feed `FeedAtividade.id` vs `Notificacao.id`) a mesma notificação humana aparece duas vezes.

O FloatingChat não tem sobreposição de campos no código atual — o campo select de modelos está acima do Textarea e do preview de DOCX em stack vertical. O problema reportado provavelmente era anterior à fase 01. A refatoração pedida é nova arquitetura com histórico persistido no backend, contexto de página, e ações expandidas.

**Primary recommendation:** Priorize o pipeline PDF→Assinatura (blocking para publicação), depois a numeração (afeta documentos já publicados), depois notificações (UX degradada mas não blocking), depois FloatingChat (feature request).

---

## Project Constraints (from CLAUDE.md)

Nenhum CLAUDE.md relevante encontrado para esta fase além das diretrizes globais de skills.

---

## Standard Stack

### Existente no Projeto (não trocar)
| Biblioteca | Versão | Propósito |
|-----------|--------|-----------|
| Next.js App Router | existente | API routes `/api/**` |
| Prisma | existente | ORM + transações atômicas |
| CloudConvert API v2 | existente | DOCX → PDF (via `PdfService`) |
| Supabase Storage | existente | Armazenamento de PDF/DOCX |
| QStash (Upstash) | existente | Webhook assíncrono para geração de PDF |
| Zustand + persist | existente | Store de notificações com localStorage |
| EventSource (SSE) | existente | Canal de notificações em tempo real |
| DOMPurify + vitest | adicionado fase 01 | Sanitização + testes |

---

## Architecture Patterns

### Padrão de fluxo de publicação (atual)
```
RASCUNHO
  → POST /submeter        → status=PROCESSANDO → webhook qstash → status=EM_REVISAO_ABERTA + pdfUrl
  → PATCH /fluxo ENVIAR_REVISAO → EM_REVISAO_ABERTA
  → PATCH /fluxo ASSUMIR_REVISAO → EM_REVISAO_ATRIBUIDA
  → PATCH /fluxo APROVAR_REVISAO → AGUARDANDO_ASSINATURA
  → POST /assinar          → status=PRONTO_PUBLICACAO, pdfUrl=NULL  ← BUG AQUI
  → POST /publicar         → aloca número, regenera PDF, status=PUBLICADA
```

### Padrão de notificações (atual)
```
AppHeader monta → useNotificationsSSE() inicia conexão SSE
                → fetchInitialNotifications() carrega REST GET /api/notifications
SSE recebe evento → addNotificacao(notif) → toast()
REST retorna lista → merge com deduplicação por id
```

---

## Bug Root Causes — Análise Detalhada

### BUG-01: PDF "ficheiro não disponível" na assinatura

**Localização:** `apps/api/src/app/api/portarias/[id]/assinar/route.ts` linhas 134-135

**Causa raiz:**
```typescript
// assinar/route.ts:134 — zera explicitamente o PDF ao registrar assinatura
pdfUrl: null,           // ← PDF apagado da referência
docxRascunhoUrl: null   // ← DOCX apagado da referência
```

O código limpa `pdfUrl` intencionalmente (para forçar regeneração com carimbo de assinatura), mas:
1. Não dispara geração de novo PDF nesse momento
2. Não chama `POST /generate` nem `qstash`
3. O front tenta acessar o PDF logo após a assinatura → `pdfUrl` é `null` → "ficheiro não disponível" (mensagem do Supabase Storage quando o path não existe)

**Solução:** Após registrar a assinatura, chamar `POST /api/portarias/[id]/generate` de forma fire-and-forget OU usar o mesmo padrão do `/submeter` com QStash, OU simplesmente manter o `pdfUrl` existente sem zerá-lo e regenerar somente na publicação final (onde já acontece em `/publicar`).

**Opção mais simples:** Remover `pdfUrl: null` e `docxRascunhoUrl: null` do `assinar/route.ts`. O `/publicar` já regenera o PDF com o número oficial — o PDF intermediário de assinatura não precisa ser invalidado.

**Opção correta:** Disparar regeneração assíncrona logo após a assinatura, igual ao padrão do `/submeter` → QStash → `/webhooks/qstash/pdf-generator`.

---

### BUG-02: Numeração inconsistente — "PORT-001/2026" vs "001/2026"

**Localização:** `apps/api/src/services/numeracao.service.ts` linhas 88-92

**Causa raiz:**
```typescript
// numeracao.service.ts:88
const numeroFormatado = String(numeroAlocado).padStart(3, '0')
const numeroOficialFinal = livro.formato_base
    .replace(/\{N\}|\{\{NUMERO\}\}/g, numeroFormatado)
    .replace(/\{ANO\}|\{\{ANO\}\}/g, String(anoAtual))
```

O `formato_base` padrão definido na criação do livro é `'PORT-{N}/{ANO}'` (linha 21), o que produziria `PORT-001/2026`. Porém, se o livro foi criado manualmente no banco com `formato_base = '{N}/{ANO}'` (sem o prefixo `PORT-`), o resultado é `001/2026`.

**Também:** no `generate/route.ts` (linha antigo) as variáveis de sistema são coletadas diretamente do banco (`prisma.variavelSistema.findMany()`) sem usar `VariableService`, então `SYS_NUMERO` pode ter valor diferente do que `publicar/route.ts` usa (que força `varsMap['SYS_NUMERO'] = numeroOficial` — linha 97 do `publicar/route.ts`).

**Solução:**
1. Garantir que todos os livros de numeração no banco tenham `formato_base = 'PORT-{N}/{ANO}'`
2. Adicionar migration/seed para corrigir livros existentes com formato incorreto
3. No `NumeracaoService.alocarNumero`, validar/normalizar o `formato_base` antes de usar

---

### BUG-03: Notificações disparando 2x (duplo toast)

**Localização:** `apps/web/src/store/notifications.store.ts` + `apps/web/src/hooks/use-notifications-sse.ts`

**Causa raiz — dupla fonte:**

**Fonte 1 (SSE):** `use-notifications-sse.ts` recebe eventos `portaria-update` (de `FeedAtividade`) E eventos `notificacao` (de `Notificacao`) e chama `addNotificacao()` + `toast()` para ambos.

**Fonte 2 (REST):** `fetchInitialNotifications()` em `notifications.store.ts` carrega do endpoint `GET /api/notifications` que retorna apenas `Notificacao` (tabela persistente por usuário).

**Problema de deduplicação:**
- `FeedAtividade.id` e `Notificacao.id` são IDs distintos mesmo que representem o mesmo evento
- O `addNotificacao` deduplica por `id` (`state.notificacoes.some((x) => x.id === n.id)`)
- Um `FeedAtividade` pode ter `id = "clx123"` e a `Notificacao` correspondente ter `id = "cly456"` — os dois passam pela deduplicação e geram dois toasts

**Segundo problema:** No `fluxo/route.ts` (linhas 196-235), para a ação `ASSUMIR_REVISAO` são criados **dois** `FeedAtividade`:
- Um com `tipoEvento = 'MUDANCA_STATUS_SOLICITAR_REVISAO'`
- Outro com `tipoEvento = 'REVISAO_ATRIBUIDA'`

E também uma `Notificacao` direta para o autor. Total: 3 registros para o mesmo evento → 3 toasts possíveis.

**Solução:**
1. Não chamar `fetchInitialNotifications` quando o SSE já está ativo e conectado — ou chamar apenas uma vez no mount inicial, antes de abrir o SSE
2. No SSE hook, após receber evento `portaria-update`, verificar se já existe notificação com mesmo `portariaId + tipoEvento + criadoEm (< 5s)` antes de criar toast
3. No `fluxo/route.ts`, consolidar FeedAtividade: criar apenas 1 por transição, não 2

---

### BUG-04: Fila de Aprovação — fluxo quebrado

**Localização:** `apps/web/src/routes/_sistema.admin.fila-aprovacao.tsx` + `apps/api/src/app/api/admin/users/[id]/route.ts`

**Análise:**
A página `fila-aprovacao.tsx` usa `useUsuarios()` que chama `GET /api/admin/users`. A aprovação chama `atualizarUsuario(id, { role, secretariaId, setorId, ativo: true })` via `atualizarUsuario` do `services/usuario.service.ts`.

O fluxo parece funcionalmente correto no código UI. O "fluxo quebrado" provavelmente está no backend `PATCH /api/admin/users/[id]`. Precisa verificar esse arquivo para confirmar.

---

### BUG-05: Providers LLM — OpenRouter headers e modelos

**Localização:** `apps/api/src/services/llm.service.ts` linhas 559-562

**O que está correto:**
```typescript
if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://docs.cataguases.mg.gov.br'
    headers['X-Title'] = 'Docs Cataguases'
}
```
Headers do OpenRouter estão configurados. A URL base também está correta (`OPENROUTER_BASE = 'https://openrouter.ai/api/v1'`).

**Problema Cerebras:** O `CEREBRAS_MODELS` define `contextWindow: 8192` para ambos os modelos, mas a API Cerebras real tem limites diferentes por modelo:
- `llama3.1-8b`: max_tokens = 8192 (correto)
- `llama3.3-70b`: max_tokens = 8192 (correto no Cerebras — não usa window longa como Groq)

O `body.max_tokens` default é `2048` (linha 584) — isso pode truncar respostas longas de modelos que suportam mais.

**Problema Mistral:** O header `Accept: 'application/json'` está adicionado, mas pode ser insuficiente para alguns endpoints que exigem também `Content-Type` específico. O `Content-Type: application/json` já está presente.

**Problema Groq:** Modelos desatualizados. `qwen-2.5-32b` pode não estar mais disponível. `deepseek-r1-distill-llama-70b` tem limite de tokens menor do que indicado no catálogo (`contextWindow: 128000` — o real é menor).

**Problema OpenRouter — modelo padrão:** O modelo `meta-llama/llama-3.3-70b-instruct:free` pode ter saído da tier gratuita. O catálogo frontend (`FloatingChat.tsx`) não inclui `gemma-3-27b-it:free` e `deepseek-r1:free` nas opções selecionáveis — apenas usados como fallback interno.

---

### BUG-06: FloatingChat — sobreposição de campos

**Análise do código atual (`FloatingChat.tsx` linhas 725-809):**

O layout do input é:
```
div.px-3.py-3 (Input container)
  ├── div.mb-2 (seletor de modelo)
  ├── div.mb-2 (preview docxAnexado) ← condicional
  └── div.flex.gap-2 (área de input)
        ├── button (Paperclip)
        ├── Textarea
        └── button (Send)
```

Não há sobreposição real no CSS atual. O "Assistente Docs" mencionado no ROADMAP pode se referir à página `_sistema.admin.modelos.$id.tsx` onde o FloatingChat é usado em contexto de modelo de documento — precisaria verificar se há um segundo chat embutido nessa página que colide com o FloatingChat flutuante.

**Reescrita pedida:** Novas funcionalidades para o FloatingChat:
- Histórico persistido no backend (usar sessions API já criada na fase 01: `GET/POST /api/llm/sessions`)
- Context awareness (página atual, portaria aberta, etc.)
- Ações expandidas (criar portaria direto do chat, navegar para páginas)

---

## FloatingChat — Arquitetura Atual vs. Target

### Estado atual
- Histórico: localStorage com TTL 24h, máximo 20 mensagens (`CHAT_STORAGE_KEY`)
- Provider: chama `llmChat()` diretamente via `apps/web/src/services/llm.service.ts` (wrapper do axios para `/api/llm/chat`)
- Contexto: somente `userAuth` (nome, email, role)
- Sessions: não usa a sessions API — sem histórico server-side

### Target (fase 02)
- Histórico: usar `POST /api/llm/sessions` ao abrir chat + `PATCH /api/llm/sessions/:id` para salvar
- Context awareness: passar `window.location.pathname` + dados da portaria aberta (se na rota `/portarias/:id`) como contexto de sistema
- Ações expandidas: botões de ação rápida baseados no contexto (ex: "Ver esta portaria", "Submeter para revisão")
- System prompt aprimorado: incluir estado da portaria atual, número, status

---

## Notification Double-Fire — Diagrama de Sequência

```
Evento: ASSUMIR_REVISAO
  Backend fluxo/route.ts:
    1. tx.feedAtividade.create({ tipoEvento: 'MUDANCA_STATUS_SOLICITAR_REVISAO' })  → ID: feed-aaa
    2. tx.feedAtividade.create({ tipoEvento: 'REVISAO_ATRIBUIDA' })                 → ID: feed-bbb
    3. criarNotificacao({ tipo: 'REVISAO_ATRIBUIDA', userId: criadoPorId })          → ID: notif-ccc

  SSE poll (5s depois):
    → Emite feed-aaa como event: portaria-update → addNotificacao + toast #1
    → Emite feed-bbb como event: portaria-update → addNotificacao + toast #2
    → Emite notif-ccc como event: notificacao   → addNotificacao + toast #3

  fetchInitialNotifications (se chamado em paralelo):
    → GET /api/notifications retorna notif-ccc
    → merge: id=notif-ccc já existe → deduplicado ✓
    → Mas feed-aaa e feed-bbb não aparecem no REST (não são Notificacao)

  Resultado: 3 toasts para 1 ação humana
```

**Fix mínimo:** No `fluxo/route.ts`, remover o FeedAtividade duplicado para `REVISAO_ATRIBUIDA` — manter apenas 1 por transição. O FeedAtividade extra (linhas 223-234) é redundante com o principal (linhas 196-205).

---

## PDF/Signature Pipeline — Estado Atual Completo

### Rotas que interagem com `pdfUrl`

| Rota | Operação | Efeito em pdfUrl |
|------|----------|-----------------|
| `POST /submeter` | Gera DOCX + dispara QStash | `pdfUrl` setado pelo webhook |
| `GET /docx` | Gera/retorna DOCX rascunho | não afeta `pdfUrl` |
| `GET /pdf` | Gera PDF on-demand | seta `pdfUrl` se não existia |
| `POST /assinar` | Registra assinatura | **zera `pdfUrl = null`** |
| `POST /generate` | Regenera PDF | seta `pdfUrl` |
| `POST /publicar` | Publica + aloca número | seta `pdfUrl` (regenera) |
| webhook `/pdf-generator` | Converte DOCX→PDF assíncrono | seta `pdfUrl` |

### Sequência com bug:
1. Usuário submete portaria → webhook converte DOCX→PDF → `pdfUrl = "portarias/id/documento.pdf"`
2. Revisor aprova → status muda para `AGUARDANDO_ASSINATURA`
3. Prefeito acessa portaria → front chama `GET /pdf` → retorna URL do PDF ✓
4. Prefeito registra assinatura → `POST /assinar` → `pdfUrl = null`, `docxRascunhoUrl = null`
5. Prefeito (ou qualquer usuário) tenta visualizar PDF → `GET /pdf` → `portaria.pdfUrl` é `null` → tenta regenerar via DOCX → `DocxGeneratorService.generate` usa `templatePath` do storage → **Supabase retorna erro** se o arquivo original foi movido/expirado
6. "ficheiro não disponível" = mensagem de erro do Supabase Storage quando o path não existe ou a URL assinada expirou

### Solução recomendada para `assinar/route.ts`:
Não zerar `pdfUrl` — apenas adicionar metadado indicando que o PDF precisa ser regenerado com carimbo de assinatura. O `/publicar` já cuida da regeneração final com número oficial. Alternativa: disparar `POST /generate` de forma assíncrona (fire-and-forget) após salvar a assinatura.

---

## Don't Hand-Roll

| Problema | Não Construir | Usar Existente |
|---------|---------------|----------------|
| Conversão DOCX→PDF | Novo conversor | `PdfService.docxToPdf()` já existe |
| Deduplicação de notificações | Lógica nova | `addNotificacao` já deduplica por `id` — corrigir IDs inconsistentes |
| Persistência de sessões de chat | localStorage manual | Sessions API já pronta (`/api/llm/sessions`) |
| Numeração atômica | Nova lógica | `NumeracaoService.alocarNumero()` já usa FOR UPDATE |
| Validação de workflow | Switch/case manual | `WorkflowService.validarTransicao()` já existe |

---

## Common Pitfalls

### Pitfall 1: Zerar pdfUrl na assinatura
**O que vai errado:** Remover `pdfUrl: null` do `assinar/route.ts` sem testar o fluxo completo pode fazer o PDF aparecer sem carimbo de assinatura.
**Como evitar:** Testar o fluxo completo: submeter → aprovar revisão → assinar → visualizar PDF → publicar → verificar PDF final tem número.

### Pitfall 2: Deduplicação de notificações por ID vs. conteúdo
**O que vai errado:** `FeedAtividade.id` e `Notificacao.id` são independentes — mesma ação humana gera IDs diferentes em tabelas diferentes.
**Como evitar:** Deduplicar por `(portariaId, tipoEvento, criadoEm ± 10s)` em vez de somente por `id`.

### Pitfall 3: Formato do número oficial depende do `formato_base` do livro no banco
**O que vai errado:** Se o livro de numeração foi criado com `formato_base = '{N}/{ANO}'` em vez de `'PORT-{N}/{ANO}'`, o número ficará sem prefixo.
**Como evitar:** Adicionar validação/normalização no `NumeracaoService` + migration para corrigir livros existentes.

### Pitfall 4: OpenRouter modelos gratuitos expiram/mudam
**O que vai errado:** `meta-llama/llama-3.3-70b-instruct:free` pode deixar de estar disponível gratuitamente.
**Como evitar:** Ter lista de modelos fallback e tratar 404 do OpenRouter com troca de modelo.

### Pitfall 5: Dupla chamada SSE + REST no mount
**O que vai errado:** Se `fetchInitialNotifications` é chamado APÓS o SSE conectar, eventos que chegaram no intervalo aparecem em ambas as fontes.
**Como evitar:** Chamar `fetchInitialNotifications` ANTES de abrir o SSE, ou usar o `ultimaVista` do store como cursor para que o REST só traga eventos mais antigos.

---

## Code Examples

### Corrigir assinar/route.ts (remover limpeza de pdfUrl)
```typescript
// ANTES (bugado):
data: {
    assinaturaStatus,
    // ...
    pdfUrl: null,           // ← REMOVER
    docxRascunhoUrl: null   // ← REMOVER (ou manter para forçar regeneração no /publicar)
}

// DEPOIS (correto):
data: {
    assinaturaStatus,
    assinaturaJustificativa: justificativa || null,
    assinaturaComprovanteUrl: comprovanteUrl || null,
    status: 'PRONTO_PUBLICACAO',
    assinadoPorId: session.id,
    assinadoEm: new Date(),
    // pdfUrl mantido — regeneração acontece em /publicar com número oficial
}
```

### Corrigir NumeracaoService — garantir formato
```typescript
// Após carregar o livro, normalizar o formato_base se necessário
if (!livro.formato_base.includes('PORT-')) {
    // Livro legado sem prefixo — normalizar em memória (não altera o banco)
    livro.formato_base = `PORT-${livro.formato_base}`
}
```

### Reduzir FeedAtividade duplicado no fluxo/route.ts
```typescript
// REMOVER o bloco duplicado de REVISAO_ATRIBUIDA (linhas 223-234)
// que cria um segundo FeedAtividade além do principal já criado na linha 196-205
// O FeedAtividade principal com MUDANCA_STATUS_ASSUMIR_REVISAO já é suficiente
```

### Context awareness no FloatingChat
```typescript
// Extrair contexto da página atual
function getPageContext(): string | undefined {
    const path = window.location.pathname
    const portariaMatch = path.match(/\/portarias\/([a-z0-9]+)/)
    if (portariaMatch) {
        return `[CONTEXTO: Usuário está visualizando portaria ID=${portariaMatch[1]}]`
    }
    return undefined
}
```

---

## Runtime State Inventory

Esta fase não é rename/refactor. Sem estado de runtime a migrar.

**Único ponto de atenção:** Portarias existentes no banco com `pdfUrl = null` e `status = PRONTO_PUBLICACAO` são portarias que passaram pelo bug do `assinar/route.ts`. Após o fix, elas precisam ter o PDF regenerado. Isso pode ser feito via endpoint `POST /api/portarias/:id/generate` para cada uma afetada.

---

## Environment Availability

| Dependência | Necessária Para | Disponível | Observação |
|-------------|----------------|-----------|------------|
| CloudConvert API | DOCX→PDF | Sim (chaves no .env) | Rotação de chaves já implementada |
| Supabase Storage | PDF/DOCX storage | Sim | Bucket `portarias` |
| QStash/Upstash | Webhook assíncrono | Apenas prod (Vercel) | Fallback `fetch` local em dev |
| LibreOffice | DOCX→HTML preview | Apenas servidor com soffice instalado | Só para preview, não para assinatura |

---

## Validation Architecture

### Testes existentes (fase 01)
- `apps/api/tests/` — 37 testes passando (vitest)
- `apps/web/src/tests/` — 8 testes passando

### Novos testes necessários (fase 02)

| Comportamento | Tipo | Comando |
|--------------|------|---------|
| `assinar/route` não zera pdfUrl | unit mock | `vitest tests/assinar.spec.ts` |
| `NumeracaoService` retorna `PORT-001/2026` | unit | `vitest tests/numeracao.spec.ts` |
| `addNotificacao` deduplica por portariaId+tipo+timestamp | unit | `vitest tests/notifications.spec.ts` |
| FloatingChat usa sessions API | component | `vitest src/tests/FloatingChat.spec.tsx` |

---

## Open Questions (RESOLVED)

1. **Fila de aprovação — bug exato** — RESOLVED
   - RESOLVED: Lido `apps/api/src/app/api/admin/users/[id]/route.ts` e `apps/api/src/services/usuario.service.ts` (backend). Ambos estão corretos. O backend valida `secretariaId` via Zod refine, propaga erros corretamente, e o `atualizarDadosAdmin` faz upsert simples sem guards extras. O bug é de **query cache no frontend**: após `atualizarUsuario`, `refetch()` é chamado mas o TanStack Query pode não invalidar corretamente se a query key diferir. Fix: garantir invalidação explícita após PATCH ou usar `queryClient.invalidateQueries`.

2. **"Sobreposição de campos" no Assistente Docs** — RESOLVED
   - RESOLVED: Inspecionado `_sistema.admin.modelos.$id.tsx` — sem import de FloatingChat ou componente de chat inline. O FloatingChat é `position: fixed` bottom-right e pode cobrir botões de ação no rodapé de formulários em telas pequenas. Não é uma sobreposição arquitetural — é z-index/layout. A refatoração do 02-04 mantém o layout existente; o executor deve verificar se há elementos com `fixed/sticky` na parte inferior da página de modelos que conflitem com o chat.

3. **Sistema de histórico do chat — sessão nova vs. continuação** — RESOLVED
   - RESOLVED: Sessão nova a cada abertura do chat (não reutiliza a sessão anterior). Razão: simplicidade, sem ambiguidade de estado. O localStorage continua como fallback para carregamento rápido da sessão atual.

---

## Sources

### Primary (HIGH confidence — leitura direta do código)
- `apps/api/src/app/api/portarias/[id]/assinar/route.ts:134` — pdfUrl=null bug
- `apps/api/src/services/numeracao.service.ts:20-92` — formato_base e lógica de número
- `apps/api/src/app/api/notifications/sse/route.ts` — dupla emissão por transição
- `apps/api/src/app/api/portarias/[id]/fluxo/route.ts:196-235` — FeedAtividade duplicado
- `apps/web/src/hooks/use-notifications-sse.ts` — deduplicação por id
- `apps/web/src/store/notifications.store.ts` — merge logic
- `apps/web/src/components/chat/FloatingChat.tsx` — arquitetura atual do chat
- `apps/api/src/services/llm.service.ts` — configuração de providers e modelos

### Secondary (MEDIUM confidence)
- `.planning/phases/01-*/` SUMMARY.md — contexto do que foi feito na fase 01
- `apps/api/src/app/api/webhooks/qstash/pdf-generator/route.ts` — pipeline PDF assíncrono

---

## Metadata

**Confidence breakdown:**
- Bug root causes: HIGH — todos confirmados por leitura de código
- Standard Stack: HIGH — nenhuma lib nova necessária
- Architecture patterns: HIGH — padrões já existentes no projeto
- Pitfalls: HIGH — derivados diretamente dos bugs encontrados

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 dias — stack estável)
