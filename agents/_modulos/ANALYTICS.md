# AGENTS_ANALYTICS.md — DOCUMENTACAO DA TELA DE ANALYTICS (PAINEL DE DESEMPENHO)
# Leia junto com AGENTS.md, MOCKS.md e os demais complementos.
# Esta documentacao descreve as funcionalidades, os componentes e a arquitetura 
# visual da pagina de Analytics do Admin (/_sistema/admin/analytics.tsx).

---

## 📌 VISAO GERAL
A pagina de Analytics e um painel administrativo de alto nivel voltado para a Alta Gestao e Prefeito. 
Seu objetivo e exibir de forma visual as metricas e o volume documental organico gerado pela Prefeitura e suas respectivas Secretarias.

O painel foi construido focado em UI limpa, graficos responsivos (Recharts) e acessibilidade rapida para tomadas de decisao, consumindo a paleta de cores padrao Gov.br.

---

## 🎛️ FUNCIONALIDADES DE FILTRAGEM (HEADER)

No topo da pagina, ao lado do titulo principal, existem dois seletores (Select - shadcn/ui) responsaveis por afunilar a visualizacao de TODO o escopo de documentos.

1. Filtro de "Todas as Secretarias"
   - Popula dinamicamente a partir de listarSecretarias() (secretaria.service.ts).
   - Permite visualizar os numeros macro da prefeitura ou restringir a visualizacao a uma pasta especifica (Ex: "Saude", "Educacao").

2. Filtro de "Todos os Setores"
   - Este filtro possui tratamento hierarquico: ele inicia no estado disabled (inativo).
   - So e liberado (habilitado) SE o usuario tiver selecionado obrigatoriamente uma Secretaria especifica no primeiro filtro.
   - Refina a visualizacao dos KPIs e graficos para apenas um subsetor.

Comportamento Dinamico (React Effect):
Sempre que um filtro e alterado, e disparada uma mutacao nos hooks assincronos que reconsultam a funcao buscarDadosAnalytics({ secretariaId, setorId }), repopulando temporariamente os cards com loadings (Skeleton).

---

## 📊 INDICADORES CHAVE DE DESEMPENHO (KPI CARDS)

Uma grade de quatro caixas de destaque imediato:

1. Total Produzido
   - Exibe a volumetria completa de todas as Portarias e Documentos ja redigidos (independentemente do status).
   - Inclui um subtexto de crescimento percentual (ex: +12.5% em relacao ao mes anterior).
   
2. Taxa de Publicacao
   - Exibe o percentual do total de portarias produzidas que conseguiu cruzar o funil e ser de fato "Publicada".
   - Serve para medir retencao, burocracia ou documentos empacados.

3. Acervo Oficial
   - Equivalente matematico a metrica de documentos "Status = PUBLICADA". Quantos ja foram assinados e indexados de forma imutavel.

4. Orgao Mais Ativo (Destaque)
   - Um card visualmente distinto (cores do indigo-Gov) que calcula qual Secretaria detem a maior taxa de postagem e movimentacao recente.
   - Fornece a Sigla/Nome no titulo principal e a quantidade no subtitulo.

---

## 📈 GRAFICOS VISUAIS (RECHARTS)

O Dashboard consome pacotes da biblioteca `recharts` para as representacoes graficas visuais interativas:

### 1. Grafico de Evolucao Historica (AreaChart)
- Tipo: Area Fluida com gradiente base azul-gov.
- Eixo X: Timeline dos ultimos 6 Meses (Janeiro, Fevereiro, etc).
- Eixo Y: Valor/Volume de documentos por aquele periodo temporal.
- Interatividade: Fornece um "Tooltip" com dados exatos em texto caso o mouse flutue sobre as extremidades da area gerada. 

### 2. Status do Acervo Atual (PieChart / Rosca Donut)
- Tipo: Grafico de Pizza centralizado e vazado em formato de Rosca (innerRadius={60}).
- Conteudo: Distribuicao em fatias por cores correspondendo ao "Estagio de Vida" atual daquele grupo de documentos.
  - 🟩 Verde (Emerald): Portarias ja "Publicadas".
  - 🟦 Azul: Documentos em estado de "Processamento" (CloudConvert).
  - ⬜️ Cinza (Slate): Documentos "Rascunhos" (pendentes do autor).
  - 🟧 Laranja (Amber): Aguardando Assinatura / Pendente.
- Legenda: Abaixo do grafico e renderizado de forma mapeada cada cor, texto e total de contagem bruta, criando um resumo exato numerico pra quem nao quer deduzir fatias.

---

## ⚙️ INTEGRACAO BACK-END & SERVICO DE DADOS (MOCK)

Crie o arquivo `src/services/analytics.service.ts` com o conteudo abaixo para o Ciclo 1. 
Ele serve o payload padronizado que o frontend espera.

```typescript
import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

export interface KpiMetrics {
  totalProduzido: number
  crescimentoPercentual: number
  taxaPublicacao: number
  acervoOficial: number
  orgaoMaisAtivo: { nome: string; quantidade: number }
}

export interface HistoricoItem {
  mes: string
  volume: number
}

export interface ChartData {
  kpis: KpiMetrics
  evolucaoMensal: HistoricoItem[]
  distribuicaoStatus: { status: string; count: number; fill: string }[]
  secretariasTop: { nome: string; count: number }[]
}

export interface AnalyticsFiltro {
  secretariaId?: string
  setorId?: string
}

export async function buscarDadosAnalytics(filtro?: AnalyticsFiltro): Promise<Result<ChartData>> {
  await mockDelay(800)
  
  // No Ciclo 2, isso sera substituido por Prisma.groupBy
  return ok({
    kpis: {
      totalProduzido: 342,
      crescimentoPercentual: 12.5,
      taxaPublicacao: 84.2,
      acervoOficial: 288,
      orgaoMaisAtivo: { nome: 'Secretaria de RH', quantidade: 145 }
    },
    evolucaoMensal: [
      { mes: 'Jan', volume: 45 }, { mes: 'Fev', volume: 52 },
      { mes: 'Mar', volume: 38 }, { mes: 'Abr', volume: 65 },
      { mes: 'Mai', volume: 48 }, { mes: 'Jun', volume: 94 }
    ],
    distribuicaoStatus: [
      { status: 'Publicadas', count: 288, fill: '#10b981' }, // emerald-500
      { status: 'Processando', count: 12, fill: '#3b82f6' }, // blue-500
      { status: 'Rascunhos', count: 24, fill: '#64748b' },   // slate-500
      { status: 'Aguard. Assinatura', count: 18, fill: '#f59e0b' } // amber-500
    ],
    secretariasTop: [
      { nome: 'RH', count: 145 },
      { nome: 'Obras', count: 82 },
      { nome: 'Saúde', count: 64 },
      { nome: 'Educação', count: 51 }
    ]
  })
}
