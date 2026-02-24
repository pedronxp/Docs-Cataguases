# AGENTS_HEALTH.md — COMPLEMENTO: HEALTH CHECK E STATUS DO SISTEMA
# Leia junto com AGENTS.md, MOCKS.md e os demais complementos.
# Adiciona a tela 14: Status do Sistema e a arquitetura de monitoramento.

---

## O PROBLEMA

O sistema depende de múltiplos serviços externos (Supabase DB, Supabase Storage, 
Supabase Auth, CloudConvert API). Além disso, documentos podem ficar presos no 
status "PROCESSANDO" se houver falha silenciosa na conversão do PDF.
Precisamos de um monitoramento ativo (Health Check) para o Admin.

---

## NOVA ROTA FRONTEND

Adicione em src/routes/_sistema/:

/_sistema/admin/status  → Painel de Status do Sistema (Tela 14)

---

## NOVA PERMISSÃO — adicionar em src/lib/ability.ts

Adicione na lista de Subjects:
  'Sistema'

Adicione na lista de Actions:
  'monitorar'

No bloco do PREFEITO, adicione:
  can('monitorar', 'Sistema') // Prefeito vê visão geral

O ADMIN_GERAL já tem acesso via `can('gerenciar', 'all')`.

---

## ADICIONAR NO SIDEBAR (AppSidebar.tsx)

Adicione o item de Status na lista NAV_ITEMS (dentro do grupo Admin):

{
  to: '/_sistema/admin/status',
  label: 'Status do Sistema',
  icon: Activity,
  action: 'monitorar',
  subject: 'Sistema'
}

Importar ícone:
  import { Activity } from 'lucide-react'

---

## NOVO SERVIÇO MOCK: src/services/health.service.ts

Crie este arquivo para o Ciclo 1 (simulará o endpoint real do backend):

import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export interface ServicoStatus {
  nome: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latenciaMs: number
  detalhe: string
}

export interface SistemaStatus {
  geral: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  servicos: ServicoStatus[]
  alertas: {
    nivel: 'WARNING' | 'CRITICAL'
    mensagem: string
    acao?: string
  }[]
}

export async function verificarStatus(): Promise<Result<SistemaStatus>> {
  await mockDelay(800)

  // Simula portarias presas em PROCESSANDO
  const portariasPresas = mockDB.portarias.filter(p => p.status === 'PROCESSANDO')

  const servicos: ServicoStatus[] = [
    { nome: 'Banco de Dados (Supabase)', status: 'healthy', latenciaMs: 12, detalhe: 'Conexão ativa' },
    { nome: 'Autenticação', status: 'healthy', latenciaMs: 8, detalhe: 'Token JWT validado' },
    { nome: 'Storage (Arquivos)', status: 'healthy', latenciaMs: 45, detalhe: 'Bucket acessível' },
    { nome: 'CloudConvert API', status: 'degraded', latenciaMs: 1250, detalhe: 'Latência alta na API externa' },
  ]

  const alertas = []
  if (portariasPresas.length > 0) {
    alertas.push({
      nivel: 'WARNING',
      mensagem: `${portariasPresas.length} portaria(s) presa(s) em PROCESSANDO há mais de 10 minutos.`,
      acao: 'Verificar fila de conversão'
    })
  }

  const geral = alertas.length > 0 || servicos.some(s => s.status !== 'healthy') 
    ? 'degraded' 
    : 'healthy'

  return ok({
    geral,
    timestamp: new Date().toISOString(),
    servicos,
    alertas
  })
}

---

## ENDPOINTS BACKEND REAIS (Ciclo 2+)

GET /api/health
  → Endpoint público/rápido para uptime bots (UptimeRobot, Pingdom).
  → Retorna apenas { status: "healthy" } em < 200ms.

GET /api/health/detailed
  → Endpoint protegido (requer JWT de ADMIN_GERAL ou PREFEITO).
  → Executa `Promise.allSettled` consultando DB, Storage, e CloudConvert.
  → Busca no Prisma: `status === 'PROCESSANDO' AND updatedAt < (now - 10min)`.
  → Retorna o JSON completo.

---

## TELA 14 — STATUS DO SISTEMA (STITCH_PROMPT)

Copie este bloco e adicione ao seu arquivo `AGENTS_DESIGN.md` (ou rode direto no Stitch):

STITCH_PROMPT:
Design a system health and status dashboard for a government application.
Layout: same sidebar and header. Page title: "Status do Sistema".
Header action: "Atualizado ha 1 minuto" text + [Atualizar Agora] outline button with refresh icon.
Top summary banner bg-amber-50 border-amber-200 rounded-md p-4 mb-6:
  Warning icon + "Sistema operando com lentidao em servicos externos (CloudConvert)."
Services grid (2 columns):
  Card 1 (white border rounded-md p-4):
    Row: Green dot icon + "Banco de Dados (Supabase)" bold + "12ms" slate-500 right
    Subtext: "Conexao ativa e respondendo normalmente."
  Card 2 (white border rounded-md p-4):
    Row: Green dot icon + "Autenticacao" bold + "8ms" slate-500 right
    Subtext: "Servico de login e sessoes operante."
  Card 3 (white border rounded-md p-4):
    Row: Green dot icon + "Storage de Arquivos" bold + "45ms" slate-500 right
    Subtext: "Upload e download de PDFs operantes."
  Card 4 (bg-amber-50 border-amber-200 rounded-md p-4):
    Row: Yellow dot icon + "CloudConvert API" bold + "1250ms" slate-500 right
    Subtext: "Latencia alta detectada na API externa de conversao."
Section title "Alertas Ativos" with separator.
Alerts list (white cards border rounded-md border-l-4 border-l-amber-500 p-4):
  "⚠️ 3 portarias presas em PROCESSANDO ha mais de 10 minutos."
  Button below: [Ver Fila de Processamento] outline small
Style: Brazilian Gov.br sober. Clean, technical, and trustworthy interface. Monospace fonts for milliseconds.

---

## CRITÉRIOS DE ACEITAÇÃO

- Tela acessível apenas para usuários com permissão `monitorar:Sistema` (Admin e Prefeito).
- Chamada ao `verificarStatus()` roda no carregamento da tela.
- Skeleton exibido durante o carregamento (simulação do ping).
- Exibe os 4 serviços base (DB, Auth, Storage, CloudConvert) com cores corretas (Verde/Amarelo/Vermelho) baseadas no status.
- Alertas só aparecem na tela se o array `alertas` for maior que zero.
- Botão de "Atualizar Agora" faz refetch no TanStack Query (`queryClient.invalidateQueries`).

---

## INSTRUÇÃO PARA A IDE

Leia este arquivo AGENTS_HEALTH.md e adicione estas instruções ao seu contexto.
Execute na seguinte ordem:
1. Atualize o `ability.ts` com o subject 'Sistema' e action 'monitorar'.
2. Adicione o item "Status do Sistema" no `AppSidebar.tsx`.
3. Crie o arquivo `src/services/health.service.ts` com o mock fornecido.
4. Gere o layout da Tela 14 no Stitch MCP usando o STITCH_PROMPT fornecido.
5. Após aprovação do layout, implemente a rota `_sistema/admin/status.tsx`.
6. Marque com ✅ ao concluir.
