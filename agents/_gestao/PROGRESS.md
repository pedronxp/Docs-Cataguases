# agents/_gestao/PROGRESS.md — STATUS DE DESENVOLVIMENTO (DOC'S CATAGUASES)
# IA: Leia agents/_gestao/AGENTS_PROGRESS.md antes de alterar este arquivo.
# Atualize marcando [x] SOMENTE quando a tarefa estiver 100% concluída e testada.

---

## 🟢 CICLO 1: FRONTEND + MOCKS (CONCLUÍDO)

### 1. CONFIGURAÇÃO BASE
- [x] Configurar Vite + Tailwind + Shadcn UI + Paths (`@/*`)
- [x] Configurar roteamento (TanStack Router)
- [x] Criar tipos base em `src/types/domain.ts` e `api.ts`
- [x] Criar camada de CASL (ABAC) em `src/lib/ability.ts`
- [x] Criar Store de Autenticação (`auth.store.ts`)
- [x] Configurar layout base (`PageLayout`, `AppSidebar`, `AppHeader`)
- [x] Configurar banco mockado (`_mock.helpers.ts`)

### 2. ONBOARDING E ACESSO PÚBLICO
- [x] Tela: Registro de Servidor (`/_auth/registro`)
- [x] Tela: Informar Lotação (`/_auth/onboarding`)
- [x] Tela: Quarentena/Aguardando (`/_auth/aguardando`)
- [x] Lógica: Guard Router bloqueando acesso de role === 'PENDENTE'
- [x] Tela: Validação Pública do Cidadão (`/validar`) sem login

### 3. WIZARD E TELAS OPERACIONAIS
- [x] Tela: Login (`/_auth/login`)
- [x] Tela: Dashboard (`/_sistema/dashboard`)
- [x] Tela: Nova Portaria - Motor/Wizard 3 Etapas (`/_sistema/administrativo/portarias/novo`)
- [x] Lógica: Input com máscaras (react-imask) para CPF e Moeda no Formulário Dinâmico
- [x] Tela: Revisão / Upload DOCX (`/_sistema/administrativo/portarias/revisao/$id`)
- [x] Tela: Visualização e Aprovação (`/_sistema/administrativo/portarias/$id`)
- [x] Tela: Central de Ajuda / Tutorial (`/_sistema/tutorial`)

### 4. GESTÃO DE PORTARIAS E ASSINATURA
- [x] Tela: Lista de Portarias (`/_sistema/administrativo/portarias`)
- [x] UI: Aba "Aguardando Minha Assinatura" (Seleção em Lote)
- [x] UI: Modal de Confirmação de Assinatura com Senha
- [x] Mock: Funções `enviarParaAssinatura` e `assinarPublicar` (Hash curto)

### 5. ACERVO DOCUMENTAL
- [x] Tela: Acervo Documental (`/_sistema/acervo`) com painel de pastas
- [x] Mock: Função `buscarAcervo` com filtros ABAC (`visualizar:PortariaGlobal`)

### 6. TELAS ADMINISTRATIVAS
- [x] Tela: Gestão de Usuários (com Abas "Ativos" e "Fila de Aprovação")
- [x] Tela: Modelos de Documento (Upload de DOCX com papel timbrado/tags e tipos de variáveis CPF/Moeda)
- [x] Tela: Fluxo de Numeração
- [x] Tela: Variáveis de Sistema
- [x] Tela: Gestão Municipal (com painel lateral/Drawer de Setores)
- [x] Tela: Log de Auditoria / Trilha Oculta (`/_sistema/admin/auditoria`)

### 7. ANALYTICS E MONITORAMENTO
- [x] Tela: Analytics (`/_sistema/admin/analytics`) usando Recharts
- [x] Tela: Status do Sistema (`/_sistema/admin/status`)

---

## 🟢 CICLO 2: INFRAESTRUTURA E CORE API (CONCLUÍDO)
*Cobertura atual do backend: 60% — Portarias, Acervo e Gestão de Usuários operacionais em tempo real.*

- [x] Configurar Prisma e Supabase (`apps/api/prisma/schema.prisma`)
- [x] Criar cliente Axios com interceptadores JWT (`apps/web/src/lib/api.ts`)
- [x] `POST /api/auth/login` — autenticação JWT
- [x] `GET /api/auth/me` — dados do usuário logado
- [x] `GET + POST /api/portarias` — lista e cria
- [x] `GET /api/portarias/[id]` — detalhe da portaria
- [x] `POST /api/portarias/[id]/generate` — gera PDF via CloudConvert
- [x] `POST /api/portarias/[id]/assinar` — assina e publica
- [x] `GET /api/acervo` — busca pública
- [x] `GET /api/acervo/export` — exportação
- [x] `GET /api/admin/users` — lista usuários
- [x] `PATCH /api/admin/users/[id]` — edita usuário
- [x] `GET + POST /api/admin/livros` — livros de numeração
- [x] `GET + POST /api/admin/config/secretarias` — secretarias

---

## 🔵 CICLO 3: FINALIZAÇÃO DA API E COBERTURA 100% (`epic/admin-api-final`)
*Objetivo: todos os endpoints faltantes implementados. Cobertura: 60% → 100%.*
*Leia: `agents/_infraestrutura/BACKEND.md` antes de iniciar qualquer tarefa deste ciclo.*

### Fase 1: Fluxo de Portaria (CRÍTICO — sem estes o fluxo principal está bloqueado)
- [ ] `feat(wizard)`: `PATCH /api/portarias/[id]/aprovar` — PENDENTE → APROVADA
- [ ] `feat(wizard)`: `PATCH /api/portarias/[id]/rejeitar` — PENDENTE → RASCUNHO
- [ ] `feat(wizard)`: `PATCH /api/portarias/[id]/retry` — FALHA_PROCESSAMENTO → PROCESSANDO (sem novo número)

### Fase 2: Painel Administrativo
- [ ] `feat(admin)`: `GET + POST /api/admin/modelos` — CRUD de modelos de documento
- [ ] `feat(admin)`: `GET + PATCH + DELETE /api/admin/modelos/[id]` — detalhe e edição
- [ ] `feat(admin)`: `GET + POST + PATCH /api/admin/variaveis` — variáveis de sistema (SYS_*)
- [ ] `feat(admin)`: `GET + POST /api/admin/gestao` — gestão municipal (secretarias e setores)
- [ ] `feat(core)`: `POST /api/upload` — upload de arquivos DOCX para modelos

### Fase 3: Feed e Integração
- [ ] `feat(core)`: `GET /api/feed` — timeline do dashboard filtrada por ABAC
- [ ] `feat(admin)`: `GET /api/admin/analytics` — dados reais para os gráficos

### Fase 4: Acesso Público e Finalização
- [ ] `feat(acervo)`: `GET /api/validar/[hash]` — validação pública sem login
- [ ] `fix(auth)`: Ajustar fluxo de onboarding (`/api/auth/onboarding`, `/api/auth/registro`)
- [ ] `chore(core)`: `VITE_ENABLE_MOCKS=false` — remover todos os imports mock do frontend

### Critério de Conclusão do Ciclo 3
- [ ] `npx tsc --noEmit` sem erros em `apps/api` e `apps/web`
- [ ] Fluxo completo testado: RASCUNHO → PROCESSANDO → PENDENTE → APROVADA → PUBLICADA
- [ ] GESTOR_SETOR consegue aprovar portarias do próprio setor
- [ ] `/validar/[hash]` acessível sem login
- [ ] Deploy na Vercel (staging) sem erros de build

---

## 🟣 CICLO 4: REALTIME E NOTIFICAÇÕES (FUTURO)
- [ ] Supabase Realtime (Websockets) — atualização ao vivo no dashboard
- [ ] E-mails transacionais (Outlook/Gmail) — notificação de aprovação e rejeição

---

### 📊 Cobertura Atual do Backend: 60%
*Portarias (basic), Acervo e Gestão de Usuários 100% operacionais em tempo real.*
*Faltam: aprovar, rejeitar, retry, feed, modelos, variáveis, gestao, upload, validar/[hash]*
