# ROADMAP

## v1.0 — Melhorias LLM/Chatbot

### Phase 2 — Correções e Melhorias Gerais

Corrigir bugs críticos e melhorar o sistema em 4 eixos:

**Providers LLM:**
- Reajustar integração Cerebras, Mistral e Groq (modelos, limites, fallback)
- Configurar OpenRouter corretamente (rota, headers, modelo padrão)

**Assistente Bot:**
- Corrigir sobreposição de campos no Assistente Docs
- Refazer FloatingChat com novas funcionalidades (histórico, contexto, ações expandidas)
- Tornar o bot mais inteligente (system prompt aprimorado, context awareness)

**Bugs de Sistema:**
- Fila de aprovação: corrigir fluxo quebrado
- Notificações: eliminar disparo duplo (SSE + polling batendo 2x)
- Numeração de documento: normalizar para formato correto "PORT-001/2026"

**PDF/Assinatura:**
- Corrigir geração de PDF para assinatura ("ficheiro não disponível")
- Garantir que DOCX → PDF pipeline funciona antes de enviar para assinatura

### Phase 1 — Melhorias LLM/Chatbot

Corrigir 14 problemas identificados na análise profunda do sistema LLM/Chatbot em 4 eixos:

**Segurança:**
- Quota de tokens no FloatingChat (bypass atual)
- JWT_SECRET hardcodeado no SSE
- dangerouslySetInnerHTML sem sanitização
- SSL rejectUnauthorized: false
- Sanitizer não mascara emails

**Arquitetura:**
- Unificar/alinhar rotas de chat
- Stats LLM persistentes (atualmente em memória)
- Tipar ChatSession/ChatMessage no Prisma
- Alinhar modelos frontend/backend

**Performance:**
- Indexes SSE + ajuste de polling
- Cache de sanitização
- Tool filtering por role

**Manutenabilidade:**
- Refatorar executeToolCall (1200+ linhas)
- Limpar .gitignore (build logs)
