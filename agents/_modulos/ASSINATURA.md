# agents/_modulos/ASSINATURA.md — FLUXO COMPLETO DE ASSINATURA DIGITAL
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_gestao/PROGRESS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também ASSINATURA.en.md
# Este arquivo COMPLEMENTA o AGENTS.md. Não substitua o que já existe — apenas adicione.

---

## IDENTIDADE

Este arquivo especifica o fluxo de assinatura digital de portarias.
Introduz o status `AGUARDANDO_ASSINATURA`, o componente de seleção de assinante
e os endpoints de envio e assinatura.
Nunca permita que um usuário que não seja o `assinanteId` cadastrado assine o documento.

---

## 1. STATE MACHINE ATUALIZADA

> Esta versão SUBSTITUI a state machine do AGENTS.md. Atualize `domain.ts` com ela.

```
RASCUNHO (numeroOficial: null)
  → [Submeter] → PROCESSANDO (número gravado atomicamente ANTES do PDF)
    → [PDF OK]    → PENDENTE
    → [PDF falha] → FALHA_PROCESSAMENTO (reusa número, nunca gera novo)
      → [Retry]   → PROCESSANDO (mesmo número)
PENDENTE
  → [Gestor aprova]  → APROVADA
  → [Gestor rejeita] → RASCUNHO
APROVADA
  → [Gestor envia para assinatura + seleciona assinante]
  → Grava assinanteId + enviadoParaAssinaturaEm
  → Cria FeedAtividade PORTARIA_ENVIADA_ASSINATURA
  → AGUARDANDO_ASSINATURA (STATUS NOVO)
AGUARDANDO_ASSINATURA
  → [Assinante clica "Assinar e Publicar"]
  → Grava hashAssinatura (SHA-256 do PDF em hex) + assinadoEm
  → PUBLICADA (IMUTÁVEL — nenhum campo editável jamais)
```

> Supabase Realtime (notificações ao vivo) será adicionado no **Ciclo 4**.
> No Ciclo 3, o frontend usa polling de 30s para atualizar o badge do sidebar.

---

## 2. ALTERAÇÕES EM `src/types/domain.ts`

```typescript
// Substitua STATUS_PORTARIA por esta versão completa
export const STATUS_PORTARIA = {
  RASCUNHO:               'RASCUNHO',
  PROCESSANDO:            'PROCESSANDO',
  PENDENTE:               'PENDENTE',
  APROVADA:               'APROVADA',
  AGUARDANDO_ASSINATURA:  'AGUARDANDO_ASSINATURA',  // NOVO
  PUBLICADA:              'PUBLICADA',
  FALHA_PROCESSAMENTO:    'FALHA_PROCESSAMENTO',
} as const
export type StatusPortaria = (typeof STATUS_PORTARIA)[keyof typeof STATUS_PORTARIA]

// Substitua TIPO_EVENTO_FEED por esta versão completa
export const TIPO_EVENTO_FEED = {
  PORTARIA_CRIADA:             'PORTARIA_CRIADA',
  PORTARIA_SUBMETIDA:          'PORTARIA_SUBMETIDA',
  PORTARIA_APROVADA:           'PORTARIA_APROVADA',
  PORTARIA_REJEITADA:          'PORTARIA_REJEITADA',
  PORTARIA_ENVIADA_ASSINATURA: 'PORTARIA_ENVIADA_ASSINATURA',  // NOVO
  PORTARIA_PUBLICADA:          'PORTARIA_PUBLICADA',
  PORTARIA_FALHA:              'PORTARIA_FALHA',
  PORTARIA_RETRY:              'PORTARIA_RETRY',               // NOVO
} as const
export type TipoEventoFeed = (typeof TIPO_EVENTO_FEED)[keyof typeof TIPO_EVENTO_FEED]

// Adicione estes campos na interface Portaria (preserve os existentes)
export interface Portaria {
  // ... campos existentes ...
  hashAssinatura:          string | null  // SHA-256 do PDF em hex (64 chars). Nunca nulo após PUBLICADA.
  assinanteId:             string | null  // NOVO — id do usuário designado para assinar
  enviadoParaAssinaturaEm: string | null  // NOVO — ISO timestamp do envio
  assinadoEm:              string | null  // NOVO — ISO timestamp da assinatura
  assinante?: Pick<Usuario, 'id' | 'name' | 'role'>  // NOVO — dados do assinante (include)
}
```

---

## 3. ALTERAÇÕES NO PRISMA SCHEMA (`apps/api/prisma/schema.prisma`)

Adicione os campos novos ao model Portaria (preserve os existentes):

```prisma
model Portaria {
  // campos existentes ...
  assinanteId              String?   // NOVO
  enviadoParaAssinaturaEm  DateTime? // NOVO
  assinadoEm               DateTime? // NOVO

  // relações
  autor     Usuario  @relation("AutorPortaria",    fields: [autorId],     references: [id])
  assinante Usuario? @relation("AssinantePortaria", fields: [assinanteId], references: [id])
}
```

---

## 4. ALTERAÇÕES EM `src/lib/ability.ts`

```typescript
// Adicione 'enviar-assinatura' na lista de Actions
type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
               'aprovar' | 'rejeitar' | 'assinar' | 'publicar' |
               'enviar-assinatura' | 'gerenciar'

// Bloco SECRETARIO — adicionar:
can('enviar-assinatura', 'Portaria', { secretariaId: user.secretariaId! })

// Bloco GESTOR_SETOR — adicionar:
can('enviar-assinatura', 'Portaria', { setorId: user.setorId! })
```

---

## 5. ALTERAÇÕES EM `src/components/shared/StatusBadge.tsx`

```typescript
const STATUS_CONFIG: Record<StatusPortaria, { label: string; className: string }> = {
  RASCUNHO:               { label: 'Rascunho',            className: 'bg-slate-100 text-slate-700 border-slate-300' },
  PROCESSANDO:            { label: 'Processando…',        className: 'bg-blue-100 text-blue-700 border-blue-300' },
  PENDENTE:               { label: 'Aguardando Revisão',  className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  APROVADA:               { label: 'Aprovada',            className: 'bg-green-100 text-green-700 border-green-300' },
  AGUARDANDO_ASSINATURA:  { label: 'Aguard. Assinatura',  className: 'bg-purple-100 text-purple-700 border-purple-300' },
  PUBLICADA:              { label: 'Publicada',           className: 'bg-green-700 text-white border-green-700' },
  FALHA_PROCESSAMENTO:    { label: 'Falha no PDF',        className: 'bg-red-100 text-red-700 border-red-300' },
}
```

---

## 6. NOVO COMPONENTE: `EnviarAssinaturaDialog.tsx`

Arquivo: `src/components/features/portaria/EnviarAssinaturaDialog.tsx`

```typescript
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { Usuario } from '@/types/domain'
import { enviarParaAssinatura } from '@/services/portaria.service'

interface Props {
  portariaId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// Mock Ciclo 1: lista fixa de assinantes
// Ciclo 3: substituir por GET /api/admin/users?podeAssinar=true
const MOCK_ASSINANTES: Pick<Usuario, 'id' | 'name' | 'role'>[] = [
  { id: 'user-prefeito', name: 'Sr. Prefeito',          role: 'PREFEITO' },
  { id: 'user-sec',      name: 'Dra. Secretária de RH', role: 'SECRETARIO' },
]

export function EnviarAssinaturaDialog({ portariaId, open, onClose, onSuccess }: Props) {
  const [assinanteId, setAssinanteId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleEnviar() {
    if (!assinanteId) {
      toast({ title: 'Selecione um assinante', variant: 'destructive' })
      return
    }
    setLoading(true)
    const result = await enviarParaAssinatura({ portariaId, assinanteId })
    setLoading(false)
    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Enviado para assinatura!', description: `Encaminhado para ${MOCK_ASSINANTES.find(a => a.id === assinanteId)?.name}.` })
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Enviar para Assinatura</DialogTitle></DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-600 mb-4">Selecione quem deve assinar este documento:</p>
          <RadioGroup value={assinanteId} onValueChange={setAssinanteId} className="space-y-3">
            {MOCK_ASSINANTES.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value={a.id} id={a.id} />
                <Label htmlFor={a.id} className="flex flex-col cursor-pointer">
                  <span className="font-medium text-slate-800">{a.name}</span>
                  <span className="text-xs text-slate-500">{a.role}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={loading || !assinanteId}>
            {loading ? 'Enviando…' : 'Enviar para Assinatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 7. ALTERAÇÕES NA TELA `portarias/$id.tsx`

```typescript
// import necessário para formatação de data
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Botão GESTOR/SECRETARIO — status === APROVADA
<Can I="enviar-assinatura" a="Portaria" ability={ability}>
  {portaria.status === 'APROVADA' && (
    <Button variant="default" onClick={() => setEnviarAssinaturaOpen(true)}>
      Enviar para Assinatura
    </Button>
  )}
</Can>

// Botão ASSINANTE — status === AGUARDANDO_ASSINATURA e só para o assinante designado
<Can I="assinar" a="Portaria" ability={ability}>
  {portaria.status === 'AGUARDANDO_ASSINATURA' && portaria.assinanteId === usuario?.id && (
    <Button variant="default" className="bg-gov-blue hover:bg-gov-blue/90" onClick={handleAssinarPublicar}>
      ✍️ Assinar e Publicar
    </Button>
  )}
</Can>

// Bloco informativo quando usuário logado NÃO é o assinante
{portaria.status === 'AGUARDANDO_ASSINATURA' && portaria.assinanteId !== usuario?.id && (
  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700">
    Aguardando assinatura de <strong>{portaria.assinante?.name ?? 'assinante designado'}</strong>.
    {' '}Enviado {portaria.enviadoParaAssinaturaEm
      ? formatDistanceToNow(new Date(portaria.enviadoParaAssinaturaEm), { locale: ptBR, addSuffix: true })
      : ''}
  </div>
)}

// Bloco de confirmação quando PUBLICADA
{portaria.status === 'PUBLICADA' && (
  <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
    <p className="text-sm font-medium text-green-800">✅ Documento Publicado Oficialmente</p>
    <p className="text-xs text-green-700">Assinado por: {portaria.assinante?.name}</p>
    <p className="text-xs text-green-700">Em: {portaria.assinadoEm ? new Date(portaria.assinadoEm).toLocaleString('pt-BR') : '—'}</p>
    <p className="text-xs text-slate-500 font-mono break-all">Hash SHA-256: {portaria.hashAssinatura}</p>
  </div>
)}
```

---

## 8. CARD NO DASHBOARD (`dashboard.tsx`)

```typescript
// Só aparece para usuários com can('assinar', 'Portaria')
<Can I="assinar" a="Portaria" ability={ability}>
  {pendentesAssinatura.length > 0 && (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 mb-6">
      <h2 className="text-sm font-semibold text-purple-800 mb-3">
        ✍️ Documentos aguardando sua assinatura ({pendentesAssinatura.length})
      </h2>
      <ul className="space-y-2">
        {pendentesAssinatura.map((portaria) => (
          <li key={portaria.id} className="flex items-center justify-between bg-white border border-purple-100 rounded-md p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{portaria.titulo}</p>
              <p className="text-xs text-slate-500">
                Enviado {formatDistanceToNow(new Date(portaria.enviadoParaAssinaturaEm!), { locale: ptBR, addSuffix: true })}
              </p>
            </div>
            <Link to={`/_sistema/administrativo/portarias/${portaria.id}`}>
              <Button size="sm" className="bg-gov-blue hover:bg-gov-blue/90">Assinar</Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )}
</Can>
```

---

## 9. BADGE NO SIDEBAR (`AppSidebar.tsx`)

```typescript
// Polling de 30s no Ciclo 3. Supabase Realtime substitui no Ciclo 4.
const { data: pendentes } = useQuery({
  queryKey: ['portarias-assinatura-pendente'],
  queryFn: () => listarPortarias({ status: 'AGUARDANDO_ASSINATURA' }),
  enabled: ability.can('assinar', 'Portaria'),
  refetchInterval: 30_000,
})

const totalPendente = pendentes?.success
  ? pendentes.data.data.filter(p => p.assinanteId === usuario?.id).length
  : 0

// No JSX do item Portarias:
{totalPendente > 0 && (
  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
    {totalPendente}
  </span>
)}
```

---

## 10. FUNÇÕES MOCK (`portaria.service.ts`)

```typescript
export async function enviarParaAssinatura(
  payload: EnviarParaAssinaturaRequest
): Promise<Result<Portaria>> {
  await mockDelay(600)
  const portaria = mockDB.portarias.find((p) => p.id === payload.portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'APROVADA')
    return err('Apenas portarias aprovadas podem ser enviadas para assinatura.')
  portaria.status = 'AGUARDANDO_ASSINATURA'
  portaria.assinanteId = payload.assinanteId
  portaria.enviadoParaAssinaturaEm = new Date().toISOString()
  portaria.updatedAt = new Date().toISOString()
  mockDB.feed.unshift({
    id: `f-${Date.now()}`, tipoEvento: 'PORTARIA_ENVIADA_ASSINATURA',
    mensagem: `Portaria ${portaria.numeroOficial} enviada para assinatura.`,
    portariaId: portaria.id, autorId: 'user-op-001',
    secretariaId: portaria.secretariaId, setorId: portaria.setorId,
    metadata: { assinanteId: payload.assinanteId }, createdAt: new Date().toISOString(),
  })
  return ok({ ...portaria })
}

export async function assinarPublicar(portariaId: string): Promise<Result<Portaria>> {
  await mockDelay(800)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'AGUARDANDO_ASSINATURA')
    return err('Apenas portarias aguardando assinatura podem ser assinadas.')
  // Mock: hash fake. No Ciclo 3 o backend gera SHA-256 real do binário do PDF.
  portaria.hashAssinatura = `mock-sha256-${Date.now().toString(36)}`
  portaria.status = 'PUBLICADA'
  portaria.assinadoEm = new Date().toISOString()
  portaria.updatedAt = new Date().toISOString()
  mockDB.feed.unshift({
    id: `f-${Date.now()}`, tipoEvento: 'PORTARIA_PUBLICADA',
    mensagem: `Portaria ${portaria.numeroOficial} assinada e publicada oficialmente.`,
    portariaId: portaria.id, autorId: portaria.assinanteId ?? 'user-prefeito',
    secretariaId: portaria.secretariaId, setorId: portaria.setorId,
    metadata: { numero: portaria.numeroOficial ?? '' }, createdAt: new Date().toISOString(),
  })
  return ok({ ...portaria })
}
```

---

## 11. ENDPOINTS BACKEND (Ciclo 3)

```
PATCH /api/portarias/[id]/enviar-assinatura
  ABAC:      ability.can('enviar-assinatura', 'Portaria', { secretariaId })
  Valida:    status === 'APROVADA'
  Valida:    assinanteId existe e tem can('assinar', 'Portaria')
  Ação:     Grava assinanteId + enviadoParaAssinaturaEm, status → AGUARDANDO_ASSINATURA
  Feed:      tipoEvento = 'PORTARIA_ENVIADA_ASSINATURA'
  Ciclo 4:   Disparar Supabase Realtime para canal do assinante

PATCH /api/portarias/[id]/assinar  (já existe — VALIDAR implementação)
  ABAC:      ability.can('assinar', 'Portaria')
  Valida:    status === 'AGUARDANDO_ASSINATURA'
  Valida:    usuario.id === portaria.assinanteId (só o designado pode assinar)
  Ação:     Gera hashAssinatura = SHA-256 do PDF em hex, grava assinadoEm
  Status:    PUBLICADA (IMUTÁVEL)
  Feed:      tipoEvento = 'PORTARIA_PUBLICADA'
  Ciclo 4:   Disparar Supabase Realtime para canal da secretaria
```

---

## 12. CRITÉRIOS DE ACEITAÇÃO

**Tela portarias/$id:**
- [ ] Botão "Enviar para Assinatura" aparece só para can('enviar-assinatura') e status === APROVADA
- [ ] Dialog lista apenas usuários com permissão de assinar
- [ ] Após enviar: status → AGUARDANDO_ASSINATURA, bloco roxo com nome e tempo
- [ ] Botão "Assinar e Publicar" aparece só para o `assinanteId` exato
- [ ] Após assinar: bloco verde com nome, data e hash SHA-256

**Dashboard:**
- [ ] Card roxo aparece para can('assinar') com portarias pendentes
- [ ] Card não aparece se não há pendentes

**Sidebar:**
- [ ] Badge roxo aparece no item Portarias com contagem correta
- [ ] Badge desaparece quando não há pendentes
