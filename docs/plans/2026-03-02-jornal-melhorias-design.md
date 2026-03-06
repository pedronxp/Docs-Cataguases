# Design: Melhorias Dashboard Jornal - Performance, UX e Multi-Documento
**Data:** 2026-03-02
**Status:** Aprovado para implementação
**Versão:** 1.0
**Prioridades:** Performance (C), UX (B+C), Multi-Documento (A)

---

## Contexto

O Dashboard Jornal atual ([_sistema.jornal.tsx](../../apps/web/src/routes/_sistema.jornal.tsx)) funciona bem para volumes pequenos, mas apresenta oportunidades de melhoria em três áreas críticas:

1. **Performance:** Queries lentas com filas grandes (500+ documentos)
2. **UX:** Falta de preview antes de numerar e relatórios para auditoria
3. **Preparação futura:** Sistema limitado a Portarias apenas

---

## Objetivos

### Performance
- Reduzir tempo de carregamento de 2.5s para ~150ms em filas grandes
- Implementar paginação cursor-based no backend
- Adicionar virtualização no frontend (React Virtual)
- Otimizar queries com indexes estratégicos

### UX - Preview
- Permitir visualização do PDF antes de confirmar numeração
- Reduzir erros (documento errado, PDF corrompido)
- Dialog expandido com tabs: Resumo + Visualizar Documento
- Tratamento robusto de erros (PDF não disponível, timeout, etc)

### UX - Relatórios
- Exportar em 4 formatos: CSV, PDF simples, PDF analítico, JSON
- Períodos configuráveis: hoje, 7d, 30d, mês, ano, customizado
- Dados de auditoria (opcional, ADMIN_GERAL)
- Download automático via blob

### Multi-Documento
- Preparar schema para Memorando, Ofício e Lei
- Migration segura em 3 fases (zero downtime)
- API polimórfica compatível com versão atual
- UI com filtros por tipo de documento

---

## Princípios de Implementação

### Segurança
✅ **Zero Breaking Changes:** API antiga continua funcionando 100%
✅ **Migrations Reversíveis:** Todas as fases podem ser revertidas
✅ **Feature Flags:** Desabilitar funcionalidades via env vars
✅ **Backward Compatible:** Frontend atual não quebra

### Estratégia "Expand and Contract"
1. **Expand:** Adicionar novos campos/endpoints (mantém antigos)
2. **Validar:** Rodar em produção por 1-2 semanas
3. **Contract:** Remover código antigo (só após validação total)

---

## Arquitetura Proposta

```
apps/
├── api/
│   ├── src/
│   │   ├── app/api/jornal/
│   │   │   ├── route.ts              ← ATUALIZAR (compatível)
│   │   │   └── export/
│   │   │       └── route.ts          ← NOVO
│   │   ├── services/
│   │   │   ├── numeracao.service.ts  ← SEM MUDANÇAS
│   │   │   ├── jornal.service.ts     ← NOVO (extrai lógica)
│   │   │   └── jornal-export.service.ts ← NOVO (relatórios)
│   └── prisma/
│       ├── schema.prisma              ← ATUALIZAR (multi-doc)
│       └── migrations/
│           ├── add_multi_documento_phase1.sql
│           ├── add_multi_documento_phase2.sql
│           └── add_jornal_indexes.sql
│
└── web/
    └── src/
        ├── routes/
        │   ├── _sistema.jornal.tsx       ← ATUALIZAR (incremental)
        │   └── _sistema.jornal.guia.tsx  ← SEM MUDANÇAS
        ├── hooks/
        │   ├── useJornalQueue.ts         ← NOVO (paginação)
        │   └── useMetricas.ts            ← NOVO (extrai lógica)
        └── components/jornal/
            ├── VirtualizedQueueTable.tsx ← NOVO (performance)
            ├── DocumentPreviewDialog.tsx ← NOVO (UX preview)
            ├── DocumentPDFPreview.tsx    ← NOVO (UX preview)
            ├── ExportButton.tsx          ← NOVO (UX relatórios)
            └── MetricsCards.tsx          ← NOVO (componentiza)
```

---

## Seção 1: Performance - Paginação e Virtualização

### Problema
Query GET atual carrega toda a fila de uma vez:
```typescript
// Hoje: pode carregar 500+ registros (2.5s)
const fila = await prisma.jornalQueue.findMany({
  where: { status: 'PENDENTE' },
  include: { portaria: { include: { secretaria: true } } }
})
```

### Solução: Cursor-Based Pagination + React Virtual

**Backend: Service de paginação**
```typescript
// apps/api/src/services/jornal.service.ts

interface PaginationParams {
  cursor?: string
  limit?: number // default: 50
  tipo?: TipoDocumento[]
}

interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  total: number
}

export class JornalService {
  static async getFilaPaginada(params: PaginationParams): Promise<PaginatedResult<FilaItem>> {
    const { cursor, limit = 50, tipo } = params

    const items = await prisma.jornalQueue.findMany({
      take: limit + 1, // +1 para saber se tem mais
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        status: 'PENDENTE',
        tipoDocumento: tipo ? { in: tipo } : undefined
      },
      include: { portaria: { include: { secretaria: true } } },
      orderBy: { createdAt: 'asc' }
    })

    const hasMore = items.length > limit
    const resultado = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? resultado[resultado.length - 1].id : null

    // Total count com cache
    const total = await this.getTotalPendentesCache()

    return { items: resultado, nextCursor, hasMore, total }
  }
}
```

**API Endpoint (Backward Compatible)**
```typescript
// apps/api/src/app/api/jornal/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')
  const limit = parseInt(searchParams.get('limit') || '50')
  const usePagination = searchParams.has('cursor') || searchParams.has('limit')

  // COMPATIBILIDADE: sem cursor/limit = método antigo
  if (!usePagination) {
    return await getLegacyFormat() // Código atual sem mudanças
  }

  // Nova implementação paginada
  const [filaData, metricas] = await Promise.all([
    JornalService.getFilaPaginada({ cursor, limit }),
    JornalService.getMetricas()
  ])

  return NextResponse.json({
    success: true,
    data: {
      fila: filaData.items,
      pagination: { nextCursor: filaData.nextCursor, hasMore: filaData.hasMore, total: filaData.total },
      metricas
    }
  })
}
```

**Frontend: Hook com Infinite Query**
```typescript
// apps/web/src/hooks/useJornalQueue.ts

import { useInfiniteQuery } from '@tanstack/react-query'

export function useJornalQueue(options = {}) {
  const { enablePagination = true, limit = 50 } = options

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['jornal', 'fila', { enablePagination }],
      queryFn: async ({ pageParam = undefined }) => {
        if (!enablePagination) {
          const res = await api.get('/api/jornal') // Método antigo
          return { items: res.data.data.fila, nextCursor: null, hasMore: false }
        }

        const params = new URLSearchParams()
        if (pageParam) params.set('cursor', pageParam)
        params.set('limit', limit.toString())

        const res = await api.get(`/api/jornal?${params}`)
        return res.data.data
      },
      getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor ?? undefined,
      initialPageParam: undefined
    })

  const fila = data?.pages.flatMap(page => page.fila) ?? []
  const total = data?.pages[0]?.pagination?.total ?? 0

  return { fila, total, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage }
}
```

**Frontend: Virtualização**
```typescript
// apps/web/src/components/jornal/VirtualizedQueueTable.tsx

import { useVirtualizer } from '@tanstack/react-virtual'

export function VirtualizedQueueTable({ fila, fetchNextPage, hasNextPage, isFetchingNextPage, ...props }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: fila.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // altura da linha
    overscan: 10 // renderiza 10 extras acima/abaixo
  })

  // Infinite scroll
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse()
    if (!lastItem) return

    if (lastItem.index >= fila.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage, fila.length, isFetchingNextPage, rowVirtualizer.getVirtualItems()])

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = fila[virtualRow.index]
          return (
            <div key={item.id} style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}>
              <QueueTableRow item={item} {...props} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Indexes no Prisma**
```prisma
model JornalQueue {
  @@index([status, createdAt])
  @@index([id, createdAt])
  @@index([tipoDocumento, status, createdAt])
}
```

**Benchmarks Esperados**
| Cenário | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| 50 itens | 200ms | 80ms | 60% |
| 200 itens | 800ms | 120ms | 85% |
| 500 itens | 2.5s | 150ms | 94% |
| 1000 itens | 5s+ | 180ms | 96% |

---

## Seção 2: UX - Preview do Documento

### Problema
Jornalista vê apenas o título antes de numerar. Erros descobertos tarde:
- Documento trocado
- PDF incompleto/corrompido
- Assinatura ausente visualmente

### Solução: Dialog com Preview Embedado

**Componente Principal**
```typescript
// apps/web/src/components/jornal/DocumentPreviewDialog.tsx

interface DocumentPreviewDialogProps {
  item: FilaItem
  proximoNumero: string | null
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export function DocumentPreviewDialog({ item, proximoNumero, onConfirm, onCancel, isSubmitting }) {
  const [activeTab, setActiveTab] = useState<'resumo' | 'preview'>('resumo')

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Confirmar numeração</DialogTitle>
          <DialogDescription>
            O número será atribuído definitivamente. Esta operação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="preview">Visualizar Documento</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo">
            <DocumentSummaryCard item={item} proximoNumero={proximoNumero} />
          </TabsContent>

          <TabsContent value="preview">
            <DocumentPDFPreview portariaId={item.portariaId} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>Confirmar numeração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Preview com Estados (loading, error, success)**
```typescript
// apps/web/src/components/jornal/DocumentPDFPreview.tsx

export function DocumentPDFPreview({ portariaId }) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [pdfData, setPdfData] = useState<{ url: string; size: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPDF() {
      try {
        const res = await api.get(`/api/portarias/${portariaId}`)
        if (!res.data.data.pdfUrl) throw new Error('PDF_NOT_FOUND')

        setPdfData({ url: res.data.data.pdfUrl, size: 0 })
        setState('success')
      } catch (err) {
        setState('error')
        setError(err.message === 'PDF_NOT_FOUND'
          ? 'Este documento ainda não possui PDF gerado.'
          : 'Erro ao carregar documento')
      }
    }
    loadPDF()
  }, [portariaId])

  if (state === 'loading') return <LoadingSpinner />
  if (state === 'error') return <ErrorAlert error={error} onRetry={loadPDF} />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Pré-visualização do documento</span>
        <Button variant="outline" size="sm" asChild>
          <a href={pdfData.url} target="_blank" rel="noopener">Abrir em nova aba</a>
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={`${pdfData.url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
          className="w-full h-[500px]"
          title="Pré-visualização"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <Alert>
        Verifique cuidadosamente o conteúdo antes de confirmar a numeração.
      </Alert>
    </div>
  )
}
```

---

## Seção 3: UX - Relatórios

### Tipos de Relatórios

1. **CSV:** Planilha Excel com lista de publicações
2. **PDF Simples:** Lista formatada para impressão
3. **PDF Analítico:** Gráficos + métricas gerenciais
4. **JSON:** Dados estruturados para integração

### Interface

```typescript
// apps/web/src/components/jornal/ExportButton.tsx

export function ExportButton() {
  const [exporting, setExporting] = useState<string | null>(null)

  const handleExport = async (formato: string, periodo: string) => {
    setExporting(formato)
    const params = new URLSearchParams({ formato, periodo })
    const res = await api.get(`/api/jornal/export?${params}`, { responseType: 'blob' })

    // Download automático
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${formato}-${new Date().toISOString().split('T')[0]}.${formato}`
    link.click()
    setExporting(null)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">Exportar</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport('csv', 'mes-atual')}>
          CSV - Mês atual
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf', 'mes-atual')}>
          PDF - Mês atual
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf-analitico', 'mes-atual')}>
          PDF Analítico
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### API de Exportação

```typescript
// apps/api/src/app/api/jornal/export/route.ts

export async function GET(request: Request) {
  const session = await getSession()
  if (!['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const formato = searchParams.get('formato') as 'csv' | 'pdf' | 'pdf-analitico' | 'json'
  const periodo = searchParams.get('periodo') || 'mes-atual'

  const resultado = await JornalExportService.gerarRelatorio({ formato, periodo })

  return new NextResponse(resultado.buffer, {
    headers: {
      'Content-Type': resultado.mimeType,
      'Content-Disposition': `attachment; filename="${resultado.filename}"`
    }
  })
}
```

### Service de Exportação (Exemplo CSV)

```typescript
// apps/api/src/services/jornal-export.service.ts

import { Parser } from '@json2csv/plainjs'

export class JornalExportService {
  static async gerarRelatorio({ formato, periodo }) {
    const dados = await this.buscarDados(periodo)

    switch (formato) {
      case 'csv':
        return this.gerarCSV(dados)
      case 'pdf':
        return this.gerarPDF(dados)
      // ... outros formatos
    }
  }

  private static gerarCSV(dados) {
    const parser = new Parser({
      fields: [
        { label: 'Número', value: 'numero' },
        { label: 'Título', value: 'titulo' },
        { label: 'Secretaria', value: 'secretaria' },
        { label: 'Data', value: 'dataPublicacao' }
      ],
      delimiter: ';'
    })

    const csv = parser.parse(dados)
    const buffer = Buffer.from('\uFEFF' + csv, 'utf-8') // BOM para Excel

    return {
      buffer,
      filename: `relatorio-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv; charset=utf-8'
    }
  }
}
```

---

## Seção 4: Multi-Documento

### Migration em 3 Fases

**Fase 1: Adicionar campos (nullable)**
```prisma
model JornalQueue {
  // NOVOS
  documentoId     String?
  tipoDocumento   TipoDocumento?

  // ANTIGOS (manter)
  portariaId      String @unique
  portaria        Portaria @relation(...)

  @@index([tipoDocumento, status, createdAt])
  @@index([documentoId])
}
```

```sql
ALTER TABLE "JornalQueue" ADD COLUMN "documentoId" TEXT;
ALTER TABLE "JornalQueue" ADD COLUMN "tipoDocumento" "TipoDocumento";
```

**Fase 2: Migrar dados (após validar Fase 1)**
```sql
UPDATE "JornalQueue"
SET "documentoId" = "portariaId", "tipoDocumento" = 'PORTARIA'
WHERE "documentoId" IS NULL;
```

**Fase 3: Tornar obrigatório (após 2 semanas)**
```sql
ALTER TABLE "JornalQueue" ALTER COLUMN "documentoId" SET NOT NULL;
-- DROP COLUMN "portariaId" só muito depois
```

### API Polimórfica

```typescript
// GET com filtro
const fila = await prisma.jornalQueue.findMany({
  where: {
    status: 'PENDENTE',
    tipoDocumento: { in: ['PORTARIA', 'MEMORANDO'] } // filtro opcional
  }
})

// POST detecta tipo
const tipoDoc = filaItem.tipoDocumento || 'PORTARIA'

switch (tipoDoc) {
  case 'PORTARIA':
    numeroOficial = await NumeracaoService.alocarNumeroPortaria(...)
    break
  case 'MEMORANDO':
    numeroOficial = await NumeracaoService.alocarNumeroMemorando(...) // futuro
    break
}
```

### UI com Filtros

```typescript
function JornalPage() {
  const [tipoFiltro, setTipoFiltro] = useState(['PORTARIA'])

  return (
    <div>
      {/* Filtro por tipo */}
      <div className="flex gap-1">
        {['PORTARIA', 'MEMORANDO', 'OFICIO'].map(tipo => (
          <Badge
            key={tipo}
            variant={tipoFiltro.includes(tipo) ? 'default' : 'outline'}
            onClick={() => toggleTipo(tipo)}
          >
            {tipo}
          </Badge>
        ))}
      </div>

      {/* Tabela com coluna Tipo */}
      <Table>
        <TableRow>
          <TableCell><Badge>{item.tipoDocumento}</Badge></TableCell>
          {/* ... */}
        </TableRow>
      </Table>
    </div>
  )
}
```

---

## Cronograma de Implementação

### Sprint 1: Fundação (3 dias)
- [ ] Criar services: `jornal.service.ts`, `jornal-export.service.ts`
- [ ] Criar hooks: `useJornalQueue.ts`
- [ ] Componentizar UI existente
- [ ] Testes unitários

### Sprint 2: Performance (4 dias)
- [ ] Implementar paginação no backend
- [ ] Hook useJornalQueue com infinite query
- [ ] VirtualizedQueueTable component
- [ ] Adicionar indexes no Prisma
- [ ] Benchmarks antes/depois

### Sprint 3: UX - Preview (3 dias)
- [ ] DocumentPreviewDialog component
- [ ] DocumentPDFPreview com estados
- [ ] Integrar no dashboard
- [ ] Testes de erro (PDF não existe, timeout)

### Sprint 4: UX - Relatórios (4 dias)
- [ ] ExportButton component
- [ ] API endpoint `/api/jornal/export`
- [ ] Service de exportação (CSV, PDF)
- [ ] Testes de download

### Sprint 5: Multi-Documento (5 dias)
- [ ] Migration Fase 1 (adicionar campos)
- [ ] Deploy + monitorar 48h
- [ ] Migration Fase 2 (migrar dados)
- [ ] Adaptar API para polimorfismo
- [ ] UI com filtros de tipo
- [ ] Testes completos

**Total:** ~19 dias úteis (~4 semanas)

---

## Testes Necessários

### Performance
- [ ] Benchmark: 50, 200, 500, 1000 itens na fila
- [ ] Memory leaks no VirtualizedTable
- [ ] Infinite scroll funciona em diferentes resoluções

### Preview
- [ ] PDF carrega corretamente
- [ ] PDF não existe → mostra erro amigável
- [ ] Timeout → permite retry
- [ ] Abrir em nova aba funciona

### Relatórios
- [ ] CSV abre no Excel sem quebrar acentos (BOM)
- [ ] PDF renderiza corretamente
- [ ] Download funciona em diferentes browsers
- [ ] Períodos customizados calculam datas corretas

### Multi-Documento
- [ ] Migration não quebra portarias existentes
- [ ] Rollback funciona
- [ ] Filtros de tipo funcionam
- [ ] API aceita múltiplos tipos

---

## Rollback Plan

### Cenário 1: Migration causou problemas
```bash
npx prisma migrate resolve --rolled-back 20260302_add_multi_doc_phase1
```

### Cenário 2: Bug crítico em produção
```bash
# Feature flags no .env
ENABLE_PAGINATION=false
ENABLE_PREVIEW=false
ENABLE_MULTI_DOC=false
```

### Cenário 3: Performance piorou
```typescript
// Fallback para método antigo
if (!FEATURES.PAGINACAO) {
  return await carregarFilaCompleta()
}
```

---

## Métricas de Sucesso

### Performance
- ✅ Tempo de carregamento < 200ms para filas de 500+ itens
- ✅ FPS mantém 60fps durante scroll
- ✅ Memory usage < 100MB no frontend

### UX
- ✅ Taxa de erro pós-numeração reduz em 80%+
- ✅ Relatórios exportados sem erros
- ✅ Jornalistas usam preview em 50%+ das numerações

### Multi-Documento
- ✅ Zero downtime durante migrations
- ✅ Portarias continuam funcionando 100%
- ✅ Preparado para Memorando em < 1 semana quando necessário

---

## Dependências

**npm packages:**
- `@tanstack/react-query` (já instalado)
- `@tanstack/react-virtual` (instalar: `npm i @tanstack/react-virtual`)
- `@json2csv/plainjs` (instalar: `npm i @json2csv/plainjs`)
- `pdfkit` (instalar: `npm i pdfkit @types/pdfkit`)

**Configurações:**
- Redis (opcional, cache de métricas)
- Feature flags no `.env`

---

## Notas de Implementação

### Ordem de Implementação
1. **Performance primeiro:** Base para tudo
2. **Preview segundo:** UX crítica
3. **Relatórios terceiro:** Menos crítico
4. **Multi-documento por último:** Preparação futura

### Testes em Produção
- Deploy incremental (1 sprint por vez)
- Monitorar por 48h antes de próxima sprint
- Rollback imediato se qualquer problema

### Comunicação com Time
- Demo ao fim de cada sprint
- Coleta de feedback dos jornalistas
- Ajustes antes de próxima sprint

---

## Referências

- [Plano original: jornal-dashboard-design.md](./2026-03-01-jornal-dashboard-design.md)
- [Schema atual: prisma/schema.prisma](../../apps/api/prisma/schema.prisma)
- [Dashboard atual: _sistema.jornal.tsx](../../apps/web/src/routes/_sistema.jornal.tsx)
- [API atual: jornal/route.ts](../../apps/api/src/app/api/jornal/route.ts)
