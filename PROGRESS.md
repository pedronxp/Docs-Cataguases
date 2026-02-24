# PROGRESS.md — STATUS DE DESENVOLVIMENTO (DOC'S CATAGUASES)
# IA: Atualize este arquivo marcando com [x] sempre que concluir uma etapa 100%.

## 🟢 CICLO 1: FRONTEND + MOCKS (FASE ATUAL)

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
- [x] Lógica: Input com máscaras (react-imask ou similar) para CPF e Moeda no Formulário Dinâmico
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
- [x] Configurar Prisma e Supabase
- [x] Criar endpoints Next.js core (Auth Login, Portarias, Acervo, Users)
- [x] Transição Mocks ➡️ Real em todos os serviços frontend
- [x] Criar cliente Axios com Interceptadores JWT

---

## 🔵 CICLO 3: FINALIZAÇÃO ADMIN & MONITORAMENTO (`epic/admin-api-final`)
*Objetivo: Alcançar 100% de cobertura da API para todas as funções do frontend.*

### Fase 1: Backend & Contratos
- [ ] `feat(admin)`: Criar CRUD de Modelos de Documento (`/api/admin/modelos`)
- [ ] `feat(admin)`: Criar API de Gestão Municipal (`/api/admin/gestao`)
- [ ] `feat(core)`: Criar endpoint de Upload de Arquivos (`/api/upload`)

### Fase 2: Integração & Lógica
- [ ] `feat(admin)`: Implementar API de Analytics (`/api/admin/analytics`)
- [ ] `feat(core)`: Implementar Feed de Atividades Real (`/api/feed`)

### Fase 3: Frontend & UI
- [ ] `fix(auth)`: Ajustar fluxo de Onboarding (`/api/auth/onboarding`)

---

## 🟣 CICLO 4: REALTIME E NOTIFICAÇÕES (FUTURO)
- [ ] Supabase Realtime (Websockets)
- [ ] E-mails transacionais (Outlook/Gmail genéricos)

### 📊 Cobertura Atual do Backend: 60%
*Status: Portarias, Acervo e Gestão de Usuários 100% operais em tempo real.*
