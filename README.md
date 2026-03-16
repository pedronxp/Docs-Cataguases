# Doc's Cataguases

Sistema de Gestao de Documentos e Portarias da Prefeitura de Cataguases-MG.

## Sobre o Projeto

O Doc's Cataguases e uma plataforma completa para criacao, tramitacao, revisao, assinatura e publicacao de documentos oficiais (Portarias, Memorandos, Oficios, Leis) do municipio. O sistema implementa um fluxo de trabalho completo com controle de acesso granular, assistente de IA multi-provider e numeracao automatica atomica.

## Stack Tecnologica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, TanStack Router, Tailwind CSS, shadcn/ui, Zustand, CASL/React |
| **Backend** | Next.js App Router, Prisma ORM, JWT Auth, CASL |
| **Banco de Dados** | PostgreSQL (Supabase), Supabase Storage |
| **IA** | Cerebras (primario), Mistral, Groq, OpenRouter — fallback chain com circuit breaker |
| **Infra** | CloudConvert (DOCX->PDF), LibreOffice (fallback local), SSE (notificacoes), Puppeteer |

## Funcionalidades

**Fluxo de Documentos**
- Wizard de criacao em 3 etapas com modelos DOCX e variaveis dinamicas
- Revisao claim-based com SLA visual e timeline de acompanhamento
- Assinatura digital, manual ou dispensada (com justificativa)
- Numeracao automatica atomica via SELECT FOR UPDATE (PORT-001/2026)
- Publicacao com hash SHA-256 de integridade

**Assistente de IA**
- Smart Router: seleciona modelo ideal por complexidade da mensagem
- 12 ferramentas (tool calling): listar secretarias, criar portarias, resumir documentos, etc.
- Circuit breaker com rotacao de chaves e fallback automatico entre providers
- Sanitizacao de dados sensiveis (CPFs, CNPJs) antes do envio

**Administracao**
- RBAC com 6 roles: ADMIN_GERAL, PREFEITO, SECRETARIO, REVISOR, OPERADOR, PENDENTE
- Permissoes extras dinamicas por usuario (formato acao:Subject:escopo)
- Gestao de secretarias, setores, modelos, variaveis, livros de numeracao
- Logs de auditoria com KPIs, busca textual e exportacao CSV

**Notificacoes e Monitoramento**
- Feed de atividades em tempo real via SSE (Server-Sent Events)
- Dashboard personalizado com KPIs e feed do usuario logado
- Sidebar com badges dinamicos (fila de revisao, assinaturas pendentes)
- Analytics com graficos e tendencias

## Fluxo da Portaria

```
RASCUNHO --> EM_REVISAO_ABERTA --> EM_REVISAO_ATRIBUIDA
                                        |
                          Aprovar -------+------- Rejeitar
                            |                        |
                 AGUARDANDO_ASSINATURA     CORRECAO_NECESSARIA
                            |                        |
                    PRONTO_PUBLICACAO         (Corrigir e resubmeter)
                            |
                        PUBLICADA (imutavel)
```

## Roles e Permissoes

| Role | Acesso |
|------|--------|
| **ADMIN_GERAL** | Acesso total — gerencia usuarios, secretarias, modelos, LLM, livros |
| **PREFEITO** | Assina documentos (digital/manual/lote), publica portarias |
| **SECRETARIO** | Cria portarias, gerencia revisao, aprova/rejeita, publica na secretaria |
| **REVISOR** | Assume revisoes na fila, aprova/rejeita com parecer |
| **OPERADOR** | Cria rascunhos, edita documentos proprios, submete para revisao |
| **PENDENTE** | Sem permissoes — aguarda ativacao por admin |

## Estrutura do Projeto

```
apps/
  web/                      # Frontend React
    src/
      routes/               # 45+ paginas (TanStack Router)
      components/           # Componentes UI (shared, portarias, features, ui)
      hooks/                # 12 custom hooks (useDashboard, usePortarias, etc.)
      services/             # Clientes API
      store/                # Zustand (auth, UI)
      lib/                  # Ability (CASL), utils
  api/                      # Backend Next.js
    src/
      app/api/              # 65+ endpoints REST
      services/             # 18 servicos de negocio
      lib/                  # Auth, Prisma, LLM prompts, sanitizer
    prisma/
      schema.prisma         # 12 modelos de banco de dados
      seed.ts               # Dados iniciais (livros, variaveis)
```

## API Endpoints Principais

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/auth/login` | Autenticacao |
| GET/POST | `/api/portarias` | Listar/Criar portarias |
| POST | `/api/portarias/[id]/fluxo` | Transicao de estado |
| POST | `/api/portarias/[id]/assinar` | Assinar documento |
| POST | `/api/portarias/[id]/publicar` | Publicar com numeracao |
| POST | `/api/admin/modelos/analisar` | Analisar DOCX e extrair variaveis |
| POST | `/api/llm/chat` | Chat com assistente IA |
| POST | `/api/pdf/extract` | Extrair texto/tabelas de PDF |
| GET | `/api/notifications/sse` | Stream de notificacoes |
| GET | `/api/sidebar-counts` | Contadores para badges |

## Como Iniciar

```bash
# 1. Clonar
git clone https://github.com/pedronxp/Docs-Cataguases.git
cd Docs-Cataguases

# 2. Instalar dependencias
npm install

# 3. Configurar ambiente
cp apps/api/.env.example apps/api/.env
# Editar .env com suas credenciais (Supabase, CloudConvert, etc.)

# 4. Gerar Prisma Client
cd apps/api && npx prisma generate

# 5. Rodar seed (dados iniciais)
npx prisma db seed

# 6. Executar em desenvolvimento
cd ../.. && npm run dev
```

## Variaveis de Ambiente

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
NEXTAUTH_SECRET=...
CLOUDCONVERT_API_KEY_1=...
CLOUDCONVERT_API_KEY_2=...
JWT_EXPIRES_IN=8h
```

Chaves de LLM (Cerebras, Mistral, Groq, OpenRouter) sao gerenciadas pelo painel administrativo e armazenadas criptografadas no banco.

## Documentacao

- `Documentacao_Sistema_Docs_Cataguases.pdf` — Documentacao tecnica completa com fluxogramas, organograma, correcoes e plano de atualizacao
- `agents/` — Documentacao de modulos e infraestrutura para agentes de IA
- `WORKFLOW.md` — Ciclo de vida completo da portaria

---

Desenvolvido para a Prefeitura Municipal de Cataguases-MG.
