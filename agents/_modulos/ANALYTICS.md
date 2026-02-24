# agents/_modulos/ANALYTICS.md — PAINEL DE ANALYTICS
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também ANALYTICS.en.md

---

## IDENTIDADE

Este arquivo especifica a Tela de Analytics (`/_sistema/admin/analytics`).
Painel administrativo de alto nível para Alta Gestão e Prefeito.
Exibe métricas e volume documental orgânico gerado pela Prefeitura.

---

## 1. CONTROLE DE ACESSO (ABAC)

**Permissão necessária:** `ability.can('gerenciar', 'all')`

**Quem acessa:**
- `ADMIN_GERAL`
- `PREFEITO`

**Não acessam:**
- `SECRETARIO`, `OPERADOR`, `GESTOR_SETOR`

Se usuário sem permissão tentar acessar, redirecionar para `/403` ou Dashboard.

---

## 2. ROTA

```
/_sistema/admin/analytics
```

Adicionar no sidebar, seção "Administração", visível apenas para `ADMIN_GERAL` e `PREFEITO`:

```typescript
{
  to: '/_sistema/admin/analytics',
  label: 'Analytics',
  icon: BarChart3,
  action: 'gerenciar',
  subject: 'all'
}
```

---

## 3. FUNCIONALIDADES DE FILTRAGEM (HEADER)

No topo da página, dois seletores (Select - shadcn/ui):

### 3.1. Filtro "Todas as Secretarias"

- Popula dinamicamente via `listarSecretarias()` (secretaria.service.ts)
- Permite visualizar:
  - **Macro:** números consolidados de toda a prefeitura
  - **Específico:** restringir a uma secretaria (ex: "Saúde", "Educação")

### 3.2. Filtro "Todos os Setores"

- **Estado inicial:** `disabled` (inativo)
- **Habilitado quando:** usuário seleciona uma Secretaria específica no filtro 1
- Refina visualização para um subsetor da secretaria selecionada

### Comportamento Dinâmico (React Effect)

Sempre que um filtro é alterado:
1. Dispara nova consulta: `buscarDadosAnalytics({ secretariaId, setorId })`
2. Exibe Skeleton nos cards durante carregamento
3. Atualiza KPIs e gráficos

---

## 4. INDICADORES CHAVE (KPI CARDS)

Grade de 4 cards de destaque:

### 4.1. Total Produzido

- **Métrica:** Volume total de portarias/documentos redigidos (todos os status)
- **Subtexto:** Crescimento percentual vs. mês anterior (ex: `+12.5%`)
- **Ícone:** `FileText`

### 4.2. Taxa de Publicação

- **Métrica:** Percentual de portarias que chegaram ao status `PUBLICADA`
- **Fórmula:** `(PUBLICADAS / TOTAL) * 100`
- **Objetivo:** Medir eficiência do funil (retenção vs. empacados)
- **Ícone:** `TrendingUp`

### 4.3. Acervo Oficial

- **Métrica:** Total de documentos com `status = 'PUBLICADA'`
- **Equivalência:** Documentos assinados e indexados de forma imutável
- **Ícone:** `Archive`

### 4.4. Órgão Mais Ativo (Destaque)

- **Estilo:** Card visualmente distinto (cores indigo-Gov)
- **Métrica:** Secretaria com maior volume de movimentação recente
- **Exibe:** Sigla/Nome + quantidade
- **Ícone:** `Award`

---

## 5. GRÁFICOS VISUAIS (RECHARTS)

Biblioteca: `recharts`

### 5.1. Evolução Histórica (AreaChart)

```typescript
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
```

**Configuração:**
- **Tipo:** Área fluida com gradiente base azul-gov
- **Eixo X:** Timeline dos últimos 6 meses (Jan, Fev, Mar...)
- **Eixo Y:** Volume de documentos por período
- **Interatividade:** Tooltip com dados exatos no hover
- **Gradiente:**
  ```tsx
  <defs>
    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#1351B4" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#1351B4" stopOpacity={0}/>
    </linearGradient>
  </defs>
  <Area 
    type="monotone" 
    dataKey="volume" 
    stroke="#1351B4" 
    fillOpacity={1} 
    fill="url(#colorVolume)" 
  />
  ```

### 5.2. Distribuição por Status (PieChart Donut)

```typescript
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
```

**Configuração:**
- **Tipo:** Pizza centralizada vazada (Donut)
- **innerRadius:** `60`
- **Fatias por cor:**
  - 🟩 **Verde (Emerald #10b981):** `PUBLICADA`
  - 🟦 **Azul (#3b82f6):** `PROCESSANDO`
  - ⬜ **Cinza Slate (#64748b):** `RASCUNHO`
  - 🟧 **Laranja Amber (#f59e0b):** `AGUARDANDO_ASSINATURA`
- **Legenda:** Abaixo do gráfico, mapeando cor + texto + contagem

**Exemplo:**
```tsx
<PieChart>
  <Pie
    data={data.distribuicaoStatus}
    cx="50%"
    cy="50%"
    innerRadius={60}
    outerRadius={80}
    dataKey="count"
  >
    {data.distribuicaoStatus.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.fill} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

---

## 6. SERVIÇO MOCK (já incluído em `agents/_base/MOCKS.md`)

Ver seção abaixo em MOCKS.md para implementação completa.

---

## 7. ESTRUTURA DO COMPONENTE REACT

```typescript
// src/routes/_sistema/admin/analytics.tsx

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { buscarDadosAnalytics } from '@/services/analytics.service'
import { listarSecretarias } from '@/services/secretaria.service'
import { BarChart3, FileText, TrendingUp, Archive, Award } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  const ability = useAbility(AbilityContext)
  
  // Controle de acesso
  if (!ability.can('gerenciar', 'all')) {
    return <Navigate to="/403" />
  }

  const [secretariaId, setSecretariaId] = useState<string>('')
  const [setorId, setSetorId] = useState<string>('')

  const { data: secretarias } = useQuery({
    queryKey: ['secretarias'],
    queryFn: listarSecretarias,
  })

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', secretariaId, setorId],
    queryFn: () => buscarDadosAnalytics({ secretariaId, setorId }),
  })

  return (
    <PageLayout title="Analytics" icon={BarChart3}>
      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <Select value={secretariaId} onValueChange={setSecretariaId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todas as Secretarias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as Secretarias</SelectItem>
            {secretarias?.data.map((sec) => (
              <SelectItem key={sec.id} value={sec.id}>{sec.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={setorId} 
          onValueChange={setSetorId}
          disabled={!secretariaId}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos os Setores" />
          </SelectTrigger>
          <SelectContent>
            {/* Popular dinamicamente baseado na secretaria */}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard 
              title="Total Produzido" 
              value={analytics.kpis.totalProduzido}
              subtitle={`+${analytics.kpis.crescimentoPercentual}% vs. mês anterior`}
              icon={FileText}
            />
            <KpiCard 
              title="Taxa de Publicação" 
              value={`${analytics.kpis.taxaPublicacao}%`}
              icon={TrendingUp}
            />
            <KpiCard 
              title="Acervo Oficial" 
              value={analytics.kpis.acervoOficial}
              icon={Archive}
            />
            <KpiCard 
              title={analytics.kpis.orgaoMaisAtivo.nome}
              value={analytics.kpis.orgaoMaisAtivo.quantidade}
              subtitle="Órgão Mais Ativo"
              icon={Award}
              variant="highlight"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Histórica */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.evolucaoMensal}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1351B4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1351B4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#1351B4" 
                      fillOpacity={1} 
                      fill="url(#colorVolume)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.distribuicaoStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {analytics.distribuicaoStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  )
}
```

---

## 8. ENDPOINT BACKEND (Ciclo 3)

```
GET /api/analytics
  Query:   secretariaId?, setorId?
  Auth:    Requer gerenciar:all (ADMIN_GERAL, PREFEITO)
  Retorna: ChartData (KPIs + evolucaoMensal + distribuicaoStatus + secretariasTop)
  
Implementação Prisma (exemplo):
- Prisma.groupBy() para agregações por status, secretaria, mês
- Cálculos de crescimento percentual
- Ordenação por volume para "Órgão Mais Ativo"
```

---

## 9. PALETA DE CORES (GOV.BR)

| Elemento | Hex | Uso |
|---|---|---|
| Azul Gov | `#1351B4` | Gráfico de área (principal) |
| Emerald | `#10b981` | Status PUBLICADA |
| Blue | `#3b82f6` | Status PROCESSANDO |
| Slate | `#64748b` | Status RASCUNHO |
| Amber | `#f59e0b` | Status AGUARDANDO_ASSINATURA |
| Indigo | `#6366f1` | Card "Órgão Mais Ativo" |

---

## 10. DEPENDÊNCIAS

```json
{
  "recharts": "^2.10.0",
  "lucide-react": "latest",
  "@tanstack/react-query": "latest"
}
```

---

## 11. CRITÉRIOS DE ACEITAÇÃO

- [ ] Tela acessível apenas para `ADMIN_GERAL` e `PREFEITO`
- [ ] Redirecionamento 403 para usuários sem permissão
- [ ] Filtro "Secretarias" popula dinamicamente
- [ ] Filtro "Setores" desabilitado até selecionar secretaria
- [ ] Alteração de filtro dispara nova query com skeleton
- [ ] 4 KPI cards exibindo métricas corretas
- [ ] Card "Órgão Mais Ativo" visualmente destacado
- [ ] Gráfico de área com gradiente azul-gov funcionando
- [ ] Gráfico donut com cores corretas por status
- [ ] Legenda do gráfico donut exibida abaixo
- [ ] Tooltip interativo nos gráficos
- [ ] Layout responsivo (mobile, tablet, desktop)
- [ ] Skeleton exibido durante carregamento

---

## 12. CHECKLIST DE CONCLUSÃO (Ciclo 1)

- [ ] `src/services/analytics.service.ts` criado com `buscarDadosAnalytics`
- [ ] Interfaces TypeScript criadas: `KpiMetrics`, `HistoricoItem`, `ChartData`, `AnalyticsFiltro`
- [ ] `src/routes/_sistema/admin/analytics.tsx` criado
- [ ] Dependência `recharts` instalada
- [ ] 4 KPI cards implementados com ícones Lucide
- [ ] Gráfico `AreaChart` (Evolução Mensal) implementado
- [ ] Gráfico `PieChart` Donut (Distribuição Status) implementado
- [ ] Filtros de Secretaria e Setor funcionando com React state
- [ ] Lógica de habilitação condicional do filtro Setor implementada
- [ ] Controle ABAC (`ability.can('gerenciar', 'all')`) aplicado
- [ ] Item "Analytics" adicionado no sidebar (seção Admin)
- [ ] Skeleton de carregamento implementado
- [ ] Layout responsivo testado (mobile, tablet, desktop)
- [ ] Cores Gov.br aplicadas corretamente
