# agents/_modulos/AUDITORIA_LOTE.md — ASSINATURA EM LOTE E AUDITORIA
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_modulos/ASSINATURA.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também AUDITORIA_LOTE.en.md

---

## IDENTIDADE

Este arquivo especifica duas funcionalidades avançadas:
1. **Assinatura em Lote:** Produtividade para Alta Gestão assinar múltiplos documentos simultaneamente
2. **Trilha de Auditoria:** Log técnico de todas as ações críticas do sistema

---

## 1. ASSINATURA EM LOTE (PRODUTIVIDADE)

### 1.1. Problema e Solução

**Problema:** Prefeito/Secretário não pode abrir 50 portarias uma por uma para assinar.

**Solução:** Nova aba na tela "Portarias" chamada "Aguardando Minha Assinatura" com checkboxes para seleção múltipla.

### 1.2. Permissão CASL

Nenhuma nova permissão necessária. Se o usuário tem `can('publicar', 'Portaria')`, tem acesso à funcionalidade em lote.

### 1.3. Alteração na UI: Tela "Lista de Portarias"

**Rota:** `/_sistema/administrativo/portarias`

**Adicionar Tabs:**

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

<Tabs defaultValue="todas">
  <TabsList>
    <TabsTrigger value="todas">Todas as Portarias</TabsTrigger>
    {ability.can('publicar', 'Portaria') && (
      <TabsTrigger value="aguardando-assinatura">
        Aguardando Minha Assinatura
        {countPendentes > 0 && (
          <Badge className="ml-2" variant="secondary">{countPendentes}</Badge>
        )}
      </TabsTrigger>
    )}
  </TabsList>

  <TabsContent value="todas">
    {/* Tabela padrão existente */}
  </TabsContent>

  <TabsContent value="aguardando-assinatura">
    <AssinaturaLoteTable />
  </TabsContent>
</Tabs>
```

### 1.4. Layout da Aba "Aguardando Minha Assinatura"

**STITCH_PROMPT:**
```
Design the "Aguardando Minha Assinatura" tab for the Portarias page.
Layout: Data table with multi-select checkboxes.
Top Bar (sticky/floating when items selected):
  Bg-purple-50, border-purple-200, p-3 rounded-md flex justify-between items-center.
  Text: "12 documentos selecionados".
  Button: [✍️ Assinar Lote] (gov-blue).
Table Columns: [Checkbox] | Número | Título | Secretaria | Recebido Há | [Ver] button
Row: [X] checked | 043/2025 | "Portaria de Férias - João" | RH | "2 horas" | [Ver]
Style: Sober Brazilian Gov.br design.
```

**Componente:**

```typescript
// src/components/features/portarias/AssinaturaLoteTable.tsx

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, FileSignature } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AssinaturaLoteTable() {
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)

  const { data: portarias } = useQuery({
    queryKey: ['portarias-aguardando-assinatura'],
    queryFn: () => listarPortarias({ 
      status: 'AGUARDANDO_ASSINATURA',
      // Backend filtra automaticamente por assinanteId === usuario.id
    }),
  })

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  const toggleTodos = () => {
    if (selecionados.length === portarias?.data.length) {
      setSelecionados([])
    } else {
      setSelecionados(portarias?.data.map(p => p.id) ?? [])
    }
  }

  return (
    <>
      {/* Barra flutuante quando há seleção */}
      {selecionados.length > 0 && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md flex justify-between items-center">
          <span className="text-sm font-medium text-purple-900">
            {selecionados.length} documento{selecionados.length > 1 ? 's' : ''} selecionado{selecionados.length > 1 ? 's' : ''}
          </span>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-gov-blue hover:bg-gov-blue-dark"
          >
            <FileSignature className="mr-2 h-4 w-4" />
            Assinar Lote
          </Button>
        </div>
      )}

      {/* Tabela */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox 
                checked={selecionados.length === portarias?.data.length}
                onCheckedChange={toggleTodos}
              />
            </TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Secretaria</TableHead>
            <TableHead>Recebido Há</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portarias?.data.map((portaria) => (
            <TableRow key={portaria.id}>
              <TableCell>
                <Checkbox 
                  checked={selecionados.includes(portaria.id)}
                  onCheckedChange={() => toggleSelecionado(portaria.id)}
                />
              </TableCell>
              <TableCell className="font-mono">{portaria.numeroOficial}</TableCell>
              <TableCell>{portaria.titulo}</TableCell>
              <TableCell>
                <Badge variant="outline">{portaria.secretaria?.sigla}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(portaria.updatedAt), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/portarias/${portaria.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal de confirmação */}
      <ModalAssinaturaLote 
        open={showModal}
        onOpenChange={setShowModal}
        portariaIds={selecionados}
        onSuccess={() => {
          setSelecionados([])
          setShowModal(false)
        }}
      />
    </>
  )
}
```

### 1.5. Modal de Assinatura (Segurança)

**STITCH_PROMPT:**
```
Design a security confirmation Dialog for signing documents.
Title: "Confirmar Assinatura Eletrônica".
Description: "Você está prestes a assinar 12 documentos oficiais. Esta ação é irreversível e os documentos serão publicados publicamente."
Form field: Password input (Label: "Digite sua senha de acesso para confirmar").
Footer: [Cancelar] outline + [Confirmar e Publicar] green button.
```

**Componente:**

```typescript
// src/components/features/assinatura/ModalAssinaturaLote.tsx

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assinarLote } from '@/services/assinatura.service'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Check } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  portariaIds: string[]
  onSuccess: () => void
}

export function ModalAssinaturaLote({ open, onOpenChange, portariaIds, onSuccess }: Props) {
  const [senha, setSenha] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => assinarLote(portariaIds, senha),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${result.data.sucesso.length} documento(s) assinado(s) com sucesso!`)
        if (result.data.falha.length > 0) {
          toast.warning(`${result.data.falha.length} documento(s) falharam.`)
        }
        queryClient.invalidateQueries(['portarias-aguardando-assinatura'])
        onSuccess()
      } else {
        toast.error(result.error)
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Confirmar Assinatura Eletrônica
          </DialogTitle>
          <DialogDescription>
            Você está prestes a assinar <strong>{portariaIds.length} documento(s)</strong> oficial(is). 
            Esta ação é <strong>irreversível</strong> e os documentos serão publicados publicamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Digite sua senha de acesso para confirmar</Label>
            <Input 
              id="senha"
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => mutation.mutate()}
            disabled={!senha || mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {mutation.isPending ? (
              'Assinando...'
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirmar e Publicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 1.6. Serviço Mock (já incluído em `MOCKS.md`)

Ver `agents/_base/MOCKS.md` seção `assinatura.service.ts` para implementação completa.

### 1.7. Regra de Negócio do Lote

**Comportamento esperado:**
1. Usuário seleciona múltiplas portarias com `status = 'AGUARDANDO_ASSINATURA'`
2. Clica em "Assinar Lote" → abre modal de confirmação
3. Digita senha → backend valida (Ciclo 1: mock `'123456'`, Ciclo 3: Supabase Auth)
4. Backend itera sobre array de IDs:
   - Valida que cada portaria está em `AGUARDANDO_ASSINATURA`
   - Gera hash SHA-256: `hash = SHA256(pdfBinary)` (Ciclo 3) ou mock (Ciclo 1)
   - Atualiza: `status = 'PUBLICADA'`, `hashAssinatura = hash`, `updatedAt = now()`
5. Retorna resultado: `{ sucesso: string[], falha: string[] }`
6. Frontend exibe toast com resumo
7. Invalida query e remove checkboxes

---

## 2. TRILHA DE AUDITORIA BLINDADA (SEGURANÇA)

### 2.1. Problema e Solução

**Problema:** `FeedAtividade` é para usuários finais, não grava dados técnicos ou deleções para auditoria legal.

**Solução:** Tabela `AuditLog` invisível para usuário comum, acessível apenas por `ADMIN_GERAL` em nova tela.

### 2.2. Model Prisma (Ciclo 3)

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String   // Quem fez
  action    String   // Ex: UPDATE_USER_ROLE, DELETE_PORTARIA, SIGN_LOTE
  entity    String   // Tabela afetada: Usuario, Portaria, Modelo
  entityId  String   // ID do registro afetado
  oldData   Json?    // Estado anterior (null para CREATE)
  newData   Json?    // Estado novo (null para DELETE)
  ipAddress String?  // IP da requisição
  userAgent String?  // Browser/client usado
  createdAt DateTime @default(now())

  user Usuario @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}
```

### 2.3. Ações Auditadas

| Ação | Quando | Dados Gravados |
|---|---|---|
| `CREATE_PORTARIA` | Nova portaria criada | `newData`: portaria completa |
| `UPDATE_PORTARIA` | Portaria editada | `oldData` + `newData`: diff |
| `DELETE_PORTARIA` | Portaria deletada | `oldData`: portaria completa |
| `SIGN_PORTARIA` | Assinatura individual | `newData`: hash, status |
| `SIGN_LOTE` | Assinatura em lote | `newData`: array de IDs |
| `UPDATE_USER_ROLE` | Mudança de permissão | `oldData.role` + `newData.role` |
| `DEACTIVATE_USER` | Usuário desativado | `oldData.ativo` + `newData.ativo` |
| `CREATE_MODELO` | Novo modelo criado | `newData`: modelo completo |
| `UPDATE_MODELO` | Modelo editado | `oldData` + `newData`: diff |

### 2.4. Nova Tela: Auditoria

**Rota:** `/_sistema/admin/auditoria`

**Permissão:** `ability.can('gerenciar', 'all')` (ADMIN_GERAL apenas)

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Trilha de Auditoria                                 [Exportar]  │
├─────────────────────────────────────────────────────────────────┤
│ Filtros:                                                        │
│ [Usuário: Todos ▾] [Ação: Todas ▾] [Período: 30 dias ▾]        │
├─────────────────────────────────────────────────────────────────┤
│ Data/Hora        Usuário       Ação              Entidade  IP   │
│ 24/02 10:35     Admin Geral    SIGN_LOTE         12 docs   ::1  │
│ 24/02 09:20     Operador RH    CREATE_PORTARIA   port-009  ::1  │
│ 23/02 16:45     Admin Geral    UPDATE_USER_ROLE  user-05   ::1  │
│ 23/02 14:10     Prefeito       SIGN_PORTARIA     port-007  ::1  │
│                                                                 │
│ ← anterior  página 1 de 8  próxima →                           │
└─────────────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Filtros por usuário, ação, período
- Paginação de 50 itens por página
- Clique na linha abre modal com diff JSON completo (`oldData` vs. `newData`)
- Botão "Exportar" gera CSV da consulta filtrada
- Busca por IP ou UserAgent

### 2.5. Serviço Mock (Ciclo 1)

```typescript
// src/services/auditoria.service.ts

import type { PaginatedResponse } from '../types/api'
import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  entity: string
  entityId: string
  oldData: Record<string, any> | null
  newData: Record<string, any> | null
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface AuditoriaFiltro {
  userId?: string
  action?: string
  entity?: string
  dataInicio?: string
  dataFim?: string
  page?: number
  pageSize?: number
}

const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    userId: 'user-admin',
    userName: 'Admin Geral',
    action: 'SIGN_LOTE',
    entity: 'Portaria',
    entityId: 'batch-12-docs',
    oldData: null,
    newData: { portariaIds: ['port-001', 'port-004', 'port-005'], count: 12 },
    ipAddress: '::1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: 'audit-002',
    userId: 'user-op-001',
    userName: 'Operador Padrão',
    action: 'CREATE_PORTARIA',
    entity: 'Portaria',
    entityId: 'port-009',
    oldData: null,
    newData: { titulo: 'Portaria de Nomeação - Teste', modeloId: 'modelo-nomeacao' },
    ipAddress: '::1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'audit-003',
    userId: 'user-admin',
    userName: 'Admin Geral',
    action: 'UPDATE_USER_ROLE',
    entity: 'Usuario',
    entityId: 'user-05',
    oldData: { role: 'OPERADOR' },
    newData: { role: 'SECRETARIO' },
    ipAddress: '::1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
]

export async function listarAuditoria(
  filtro: AuditoriaFiltro
): Promise<Result<PaginatedResponse<AuditLog>>> {
  await mockDelay(600)

  let logs = [...MOCK_AUDIT_LOGS]

  if (filtro.userId) logs = logs.filter(l => l.userId === filtro.userId)
  if (filtro.action) logs = logs.filter(l => l.action === filtro.action)
  if (filtro.entity) logs = logs.filter(l => l.entity === filtro.entity)

  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const page = filtro.page ?? 1
  const pageSize = filtro.pageSize ?? 50
  const total = logs.length
  const data = logs.slice((page - 1) * pageSize, page * pageSize)

  return ok({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function exportarAuditoria(filtro: AuditoriaFiltro): Promise<Result<Blob>> {
  await mockDelay(1000)
  // Mock: retorna um Blob CSV
  const csv = 'Data,Usuario,Acao,Entidade,IP\n2025-02-24,Admin,SIGN_LOTE,Portaria,::1'
  return ok(new Blob([csv], { type: 'text/csv' }))
}
```

### 2.6. Componente React

```typescript
// src/routes/_sistema/admin/auditoria.tsx

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { listarAuditoria } from '@/services/auditoria.service'
import { Shield } from 'lucide-react'

export default function AuditoriaPage() {
  const ability = useAbility(AbilityContext)

  if (!ability.can('gerenciar', 'all')) {
    return <Navigate to="/403" />
  }

  const [filtro, setFiltro] = useState({
    userId: '',
    action: '',
    page: 1,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['auditoria', filtro],
    queryFn: () => listarAuditoria(filtro),
  })

  return (
    <PageLayout title="Trilha de Auditoria" icon={Shield}>
      {/* Filtros + Tabela + Paginação */}
    </PageLayout>
  )
}
```

### 2.7. Endpoint Backend (Ciclo 3)

```
GET /api/auditoria
  Query:   userId?, action?, entity?, dataInicio?, dataFim?, page, pageSize
  Auth:    Requer gerenciar:all (ADMIN_GERAL)
  Retorna: PaginatedResponse<AuditLog>

GET /api/auditoria/export
  Query:   Mesmos filtros
  Auth:    Requer gerenciar:all
  Retorna: CSV file (Content-Type: text/csv)
```

---

## 3. CRITÉRIOS DE ACEITAÇÃO

### Assinatura em Lote
- [ ] Aba "Aguardando Minha Assinatura" visível apenas para quem tem `publicar:Portaria`
- [ ] Badge com contador de pendentes na aba
- [ ] Checkboxes de seleção múltipla funcionando
- [ ] Barra flutuante aparece ao selecionar 1+ documentos
- [ ] Botão "Assinar Lote" abre modal de confirmação
- [ ] Modal exige senha e mostra quantidade de documentos
- [ ] Assinatura em lote funciona corretamente (serviço mock)
- [ ] Toast de sucesso/falha exibido
- [ ] Query invalidada e checkboxes resetados após assinatura

### Auditoria
- [ ] Tela acessível apenas para `ADMIN_GERAL`
- [ ] Redirecionamento 403 para outros roles
- [ ] Filtros por usuário, ação, período funcionando
- [ ] Tabela com paginação de 50 itens
- [ ] Clique na linha abre modal com diff JSON
- [ ] Botão "Exportar" gera CSV (mock)
- [ ] Logs ordenados por data decrescente

---

## 4. CHECKLIST DE CONCLUSÃO (Ciclo 1)

### Assinatura em Lote
- [ ] Aba "Aguardando Minha Assinatura" adicionada na tela Portarias
- [ ] `AssinaturaLoteTable.tsx` criado
- [ ] `ModalAssinaturaLote.tsx` criado
- [ ] Serviço `assinarLote` no `assinatura.service.ts` (já em MOCKS.md)
- [ ] Lógica de checkboxes e seleção múltipla implementada
- [ ] Barra flutuante com contador implementada
- [ ] Modal de confirmação com input de senha implementado
- [ ] Toast de sucesso/falha implementado
- [ ] Query invalidation após assinatura implementada

### Auditoria
- [ ] Model `AuditLog` adicionado ao schema Prisma (preparação Ciclo 3)
- [ ] `src/services/auditoria.service.ts` criado com mocks
- [ ] Interfaces TypeScript: `AuditLog`, `AuditoriaFiltro`
- [ ] `src/routes/_sistema/admin/auditoria.tsx` criado
- [ ] Tabela com filtros implementada
- [ ] Modal de diff JSON implementado
- [ ] Botão "Exportar CSV" implementado (mock)
- [ ] Controle ABAC (gerenciar:all) aplicado
- [ ] Item "Auditoria" adicionado no sidebar (seção Admin)
- [ ] Paginação de 50 itens funcionando
