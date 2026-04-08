# Phase 01: Melhorias LLM/Chatbot — Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Source:** User-provided scope

<domain>
## Phase Boundary

Análise e melhoria dos componentes de IA e comunicação do sistema Docs-Cataguases, com foco em quatro eixos funcionais:

1. **Funcionalidades de IA e Comunicação** — Chatbots, assistência de IA, integrações via API e sistemas de notificações em tempo real (SSE).
2. **Gerenciamento de Prompts LLM** — Sistema atual de estruturação e envio de prompts para os modelos.
3. **Gerenciamento de Sessões de Chat** — Módulos de controle de chat (chat session, chat manage).
4. **Gerenciamento de Chaves e Serviços LLM** — Configuração de chaves (LLM API Key), troca/balanceamento de serviços LLM (LLM service), balanceamento de pool (pool balance) e configurações de modo manual.

</domain>

<decisions>
## Implementation Decisions

### Funcionalidades de IA e Comunicação
- Corrigir quota de tokens no FloatingChat (bypass atual permite tráfego ilimitado)
- Corrigir JWT_SECRET hardcodeado no SSE route
- Remover dangerouslySetInnerHTML sem sanitização no frontend do chat
- Desativar SSL rejectUnauthorized: false no cliente HTTP
- Corrigir sanitizer que não mascara emails
- Unificar rotas de chat (alinhamento frontend/backend)

### Gerenciamento de Prompts LLM
- Revisar estrutura atual de system prompt e prompt templates
- Garantir que variáveis de sistema (SYS_*) e LINHA_ASSINATURA não vazem para prompts do usuário
- Avaliar e corrigir formatação/envio de prompts para os provedores

### Gerenciamento de Sessões de Chat
- Tipar ChatSession e ChatMessage no Prisma schema
- Garantir persistência de stats LLM (atualmente em memória — se processo reiniciar, perde tudo)
- Limpar módulos de chat session/manage para separação clara de responsabilidades

### Gerenciamento de Chaves e Serviços LLM
- Revisar configuração e armazenamento de LLM API Keys (criptografia em repouso)
- Implementar/melhorar balanceamento de pool de serviços LLM
- Suportar configuração de modo manual (usuário escolhe modelo/provedor)
- Refatorar executeToolCall (função com 1200+ linhas) para módulos menores

### Claude's Discretion
- Ordem de prioridade de sub-tarefas dentro de cada eixo
- Estratégia de migração de dados para persistência de stats LLM
- Escolha de biblioteca de sanitização para o chat frontend

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### LLM e Chatbot
- `apps/api/src/services/llm.service.ts` — Serviço principal de LLM, balanceamento e chamadas
- `apps/api/src/services/workflow.service.ts` — Orquestração de fluxo e ferramentas
- `apps/api/src/app/api/notifications/sse/route.ts` — Rota SSE (JWT hardcoded aqui)

### Prompts e Contexto
- `apps/api/src/services/modelo.service.ts` — Geração de documentos e uso de variáveis de sistema
- `apps/api/src/lib/prisma.ts` — Cliente Prisma (schema de sessão/chat)

### Chaves e Configuração
- `apps/api/src/services/assinatura-icp.service.ts` — Serviço de assinatura (usa chaves)
- `apps/api/src/lib/encryption.ts` — Utilitário de criptografia para chaves
- `apps/api/src/lib/rate-limit.ts` — Rate limiting (pool/quota)
- `apps/api/src/services/rate-limit.service.ts` — Serviço de rate limit

### Frontend Chat
- `apps/web/src/components/shared/NotificationBell.tsx` — Notificações em tempo real
- `apps/web/src/store/notifications.store.ts` — Estado de notificações

### ROADMAP
- `.planning/ROADMAP.md` — Fase 1: 14 problemas identificados em 4 eixos

</canonical_refs>

<specifics>
## Specific Ideas

- O balanceamento de pool (pool balance) deve suportar round-robin e failover entre provedores LLM
- O modo manual deve persistir a escolha do usuário por sessão
- Stats LLM (tokens consumidos, custo estimado) devem ser persistidos no banco via Prisma
- A refatoração do executeToolCall deve manter compatibilidade com ferramentas existentes (sem quebrar portarias)

</specifics>

<deferred>
## Deferred Ideas

- Suporte a novos provedores LLM além dos já configurados (v2)
- Interface de administração avançada para pool de chaves (v2)

</deferred>

---

*Phase: 01-melhorias-llm-chatbot*
*Context gathered: 2026-04-08*
