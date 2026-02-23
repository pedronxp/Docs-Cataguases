# AGENTS_ASSINATURA.md — COMPLEMENTO: FLUXO DE ASSINATURA
# Leia junto com AGENTS.md e MOCKS.md
# Este arquivo adiciona o status AGUARDANDO_ASSINATURA e o fluxo completo de assinatura digital

---

## PROBLEMA CORRIGIDO

O fluxo anterior pulava a etapa de notificação ao assinante.
O novo fluxo garante que o assinante designado seja avisado em tempo real
e que o sistema registre quem assinou, quando e com qual hash.

---

## STATE MACHINE ATUALIZADA (substitui a versão do AGENTS.md)

RASCUNHO (numeroOficial: null)
  → [Submeter] → PROCESSANDO (numeroOficial gravado atomicamente)
    → [CloudConvert OK]    → PENDENTE
    → [CloudConvert falha] → FALHA_PROCESSAMENTO
      → [Tentar Novamente] → PROCESSANDO (mesmo número, nunca gera novo)
PENDENTE
  → [Gestor aprova]   → APROVADA
  → [Gestor rejeita]  → RASCUNHO
APROVADA
  → [Gestor clica "Enviar para Assinatura" + seleciona assinante]
  → Sistema grava assinanteId + enviadoParaAssinaturaEm
  → Cria evento PORTARIA_ENVIADA_ASSINATURA no FeedAtividade
  → Supabase Realtime notifica o assinante em tempo real
  → AGUARDANDO_ASSINATURA ← STATUS NOVO
AGUARDANDO_ASSINATURA
  → [Assinante clica "Assinar e Publicar"]
  → Sistema grava hashAssinatura + assinadoEm
  → PUBLICADA (IMUTÁVEL — nenhum campo editável jamais)

---

## ALTERAÇÕES EM src/types/domain.ts

Substitua o STATUS_PORTARIA existente por este:

export const STATUS_PORTARIA = {
  RASCUNHO:                'RASCUNHO',
  PROCESSANDO:             'PROCESSANDO',
  PENDENTE:                'PENDENTE',
  APROVADA:                'APROVADA',
  AGUARDANDO_ASSINATURA:   'AGUARDANDO_ASSINATURA',
  PUBLICADA:               'PUBLICADA',
  FALHA_PROCESSAMENTO:     'FALHA_PROCESSAMENTO',
} as const
export type StatusPortaria = (typeof STATUS_PORTARIA)[keyof typeof STATUS_PORTARIA]

Substitua o TIPO_EVENTO_FEED existente por este:

export const TIPO_EVENTO_FEED = {
  PORTARIA_CRIADA:              'PORTARIA_CRIADA',
  PORTARIA_SUBMETIDA:           'PORTARIA_SUBMETIDA',
  PORTARIA_APROVADA:            'PORTARIA_APROVADA',
  PORTARIA_REJEITADA:           'PORTARIA_REJEITADA',
  PORTARIA_ENVIADA_ASSINATURA:  'PORTARIA_ENVIADA_ASSINATURA',
  PORTARIA_PUBLICADA:           'PORTARIA_PUBLICADA',
  PORTARIA_FALHA:               'PORTARIA_FALHA',
} as const
export type TipoEventoFeed = (typeof TIPO_EVENTO_FEED)[keyof typeof TIPO_EVENTO_FEED]

Adicione os campos novos na interface Portaria:

export interface Portaria {
  id: string
  titulo: string
  numeroOficial: string | null
  status: StatusPortaria
  autorId: string
  secretariaId: string
  setorId: string | null
  modeloId: string
  pdfUrl: string | null
  docxRascunhoUrl: string | null
  hashAssinatura: string | null
  assinanteId: string | null                  // NOVO — quem deve assinar
  enviadoParaAssinaturaEm: string | null      // NOVO — quando foi enviado
  assinadoEm: string | null                   // NOVO — quando foi assinado
  dadosFormulario: Record<string, string>
  autor?: Pick<Usuario, 'id' | 'name' | 'email'>
  assinante?: Pick<Usuario, 'id' | 'name' | 'role'>  // NOVO — dados do assinante
  secretaria?: Secretaria
  createdAt: string
  updatedAt: string
}

---

## ALTERAÇÕES EM src/types/api.ts

Adicione estes novos contratos:

export interface EnviarParaAssinaturaRequest {
  portariaId: string
  assinanteId: string   // id do usuário que vai assinar
}

export interface AssinarPublicarRequest {
  portariaId: string
  hashAssinatura: string
}

---

## ALTERAÇÕES NO PRISMA SCHEMA (apps/api)

Substitua o model Portaria existente por este:

model Portaria {
  id                       String    @id @default(cuid())
  titulo                   String
  numeroOficial            String?
  status                   String    @default("RASCUNHO")
  autorId                  String
  secretariaId             String
  setorId                  String?
  modeloId                 String
  pdfUrl                   String?
  docxRascunhoUrl          String?
  hashAssinatura           String?
  assinanteId              String?
  enviadoParaAssinaturaEm  DateTime?
  assinadoEm               DateTime?
  dadosFormulario          Json      @default("{}")
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt
}

---

## ALTERAÇÕES EM src/components/shared/StatusBadge.tsx

Substitua o STATUS_CONFIG existente por este:

const STATUS_CONFIG: Record<StatusPortaria, { label: string; className: string }> = {
  RASCUNHO:               { label: 'Rascunho',             className: 'bg-slate-100 text-slate-700 border-slate-300' },
  PROCESSANDO:            { label: 'Processando…',         className: 'bg-blue-100 text-blue-700 border-blue-300' },
  PENDENTE:               { label: 'Aguardando Revisão',   className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  APROVADA:               { label: 'Aprovada',             className: 'bg-green-100 text-green-700 border-green-300' },
  AGUARDANDO_ASSINATURA:  { label: 'Aguard. Assinatura',   className: 'bg-purple-100 text-purple-700 border-purple-300' },
  PUBLICADA:              { label: 'Publicada',            className: 'bg-green-700 text-white border-green-700' },
  FALHA_PROCESSAMENTO:    { label: 'Falha no PDF',         className: 'bg-red-100 text-red-700 border-red-300' },
}

---

## ALTERAÇÕES EM src/lib/ability.ts

Adicione a action 'enviar-assinatura' na lista de Actions:

type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
               'aprovar' | 'rejeitar' | 'assinar' | 'publicar' |
               'enviar-assinatura' | 'gerenciar'

Adicione no bloco SECRETARIO:

  can('enviar-assinatura', 'Portaria', { secretariaId: user.secretariaId! })

Adicione no bloco GESTOR_SETOR:

  can('enviar-assinatura', 'Portaria', { setorId: user.setorId! })

---

## NOVO COMPONENTE: src/components/features/portaria/EnviarAssinaturaDialog.tsx

Este Dialog é aberto quando o Gestor/Secretário clica "Enviar para Assinatura".
Mostra apenas usuários com can('assinar', 'Portaria').

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

// Lista mock de usuários habilitados a assinar
// No Ciclo 2 substitua por query real filtrada por role + permissoesExtra
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
    toast({ title: 'Enviado para assinatura!', description: `Documento encaminhado para ${MOCK_ASSINANTES.find(a => a.id === assinanteId)?.name}.` })
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para Assinatura</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-slate-600 mb-4">
            Selecione quem deve assinar este documento:
          </p>
          <RadioGroup value={assinanteId} onValueChange={setAssinanteId} className="space-y-3">
            {MOCK_ASSINANTES.map((assinante) => (
              <div key={assinante.id} className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                <RadioGroupItem value={assinante.id} id={assinante.id} />
                <Label htmlFor={assinante.id} className="flex flex-col cursor-pointer">
                  <span className="font-medium text-slate-800">{assinante.name}</span>
                  <span className="text-xs text-slate-500">{assinante.role}</span>
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

---

## ALTERAÇÕES EM src/routes/_sistema/administrativo/portarias/$id.tsx

Adicione este bloco de botões na tela de Visualização/Aprovação:

// Botão para GESTOR/SECRETARIO — aparece quando status === APROVADA
<Can I="enviar-assinatura" a="Portaria" ability={ability}>
  {portaria.status === 'APROVADA' && (
    <Button
      variant="default"
      onClick={() => setEnviarAssinaturaOpen(true)}
    >
      Enviar para Assinatura
    </Button>
  )}
</Can>

// Botão para PREFEITO/SECRETARIO com permissão de assinar — aparece quando status === AGUARDANDO_ASSINATURA
<Can I="assinar" a="Portaria" ability={ability}>
  {portaria.status === 'AGUARDANDO_ASSINATURA' && portaria.assinanteId === usuario?.id && (
    <Button
      variant="default"
      className="bg-gov-blue hover:bg-gov-blue/90"
      onClick={handleAssinarPublicar}
    >
      ✍️ Assinar e Publicar
    </Button>
  )}
</Can>

// Bloco informativo para AGUARDANDO_ASSINATURA quando o usuário logado NÃO é o assinante
{portaria.status === 'AGUARDANDO_ASSINATURA' && portaria.assinanteId !== usuario?.id && (
  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-700">
    Aguardando assinatura de <strong>{portaria.assinante?.name ?? 'assinante designado'}</strong>.
    Enviado {portaria.enviadoParaAssinaturaEm
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
    <p className="text-xs text-slate-500 font-mono break-all">Hash: {portaria.hashAssinatura}</p>
  </div>
)}

---

## CARD NO DASHBOARD para o assinante

Adicione em src/routes/_sistema/dashboard.tsx logo após os cards de resumo.
Este card só aparece para usuários com can('assinar', 'Portaria').

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

---

## BADGE CONTADOR NO SIDEBAR

Adicione em src/components/shared/AppSidebar.tsx no item de Portarias:

// Busca portarias aguardando assinatura do usuário logado
const { data: pendentes } = useQuery({
  queryKey: ['portarias-assinatura-pendente'],
  queryFn: () => listarPortarias({ status: 'AGUARDANDO_ASSINATURA' }),
  enabled: ability.can('assinar', 'Portaria'),
  refetchInterval: 30000, // atualiza a cada 30s (Realtime substitui no Ciclo 3)
})

const totalPendente = pendentes?.success
  ? pendentes.data.data.filter(p => p.assinanteId === usuario?.id).length
  : 0

// No JSX do item Portarias:
<Link to="/_sistema/administrativo/portarias" ...>
  <FileText size={16} />
  Portarias
  {totalPendente > 0 && (
    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
      {totalPendente}
    </span>
  )}
</Link>

---

## ADIÇÕES EM src/services/portaria.service.ts (MOCKS.md)

Adicione estas duas funções no arquivo de serviço mock existente:

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

  // Adiciona evento no feed mock
  mockDB.feed.unshift({
    id: `f-${Date.now()}`,
    tipoEvento: 'PORTARIA_ENVIADA_ASSINATURA',
    mensagem: `Portaria ${portaria.numeroOficial} enviada para assinatura.`,
    portariaId: portaria.id,
    autorId: 'user-op-001',
    secretariaId: portaria.secretariaId,
    setorId: portaria.setorId,
    metadata: { assinanteId: payload.assinanteId },
    createdAt: new Date().toISOString(),
  })

  return ok({ ...portaria })
}

export async function assinarPublicar(
  portariaId: string
): Promise<Result<Portaria>> {
  await mockDelay(800)
  const portaria = mockDB.portarias.find((p) => p.id === portariaId)
  if (!portaria) return err('Portaria não encontrada.')
  if (portaria.status !== 'AGUARDANDO_ASSINATURA')
    return err('Apenas portarias aguardando assinatura podem ser assinadas.')
  portaria.status = 'PUBLICADA'
  portaria.hashAssinatura = `sha256-${Date.now()}-${Math.random().toString(36).slice(2)}`
  portaria.assinadoEm = new Date().toISOString()
  portaria.updatedAt = new Date().toISOString()

  mockDB.feed.unshift({
    id: `f-${Date.now()}`,
    tipoEvento: 'PORTARIA_PUBLICADA',
    mensagem: `Portaria ${portaria.numeroOficial} assinada e publicada oficialmente.`,
    portariaId: portaria.id,
    autorId: portaria.assinanteId ?? 'user-prefeito',
    secretariaId: portaria.secretariaId,
    setorId: portaria.setorId,
    metadata: { numero: portaria.numeroOficial ?? '' },
    createdAt: new Date().toISOString(),
  })

  return ok({ ...portaria })
}

---

## ENDPOINT BACKEND NOVO (Ciclo 2+)

PATCH /api/portarias/[id]/enviar-assinatura
  → Valida que status === APROVADA
  → Valida que o assinanteId existe e tem can('assinar', 'Portaria')
  → Grava assinanteId + enviadoParaAssinaturaEm
  → Cria FeedAtividade
  → Dispara Supabase Realtime para o canal do assinante

PATCH /api/portarias/[id]/assinar
  → Valida que status === AGUARDANDO_ASSINATURA
  → Valida que o usuário logado é o assinanteId gravado
  → Grava hashAssinatura + assinadoEm
  → Status → PUBLICADA
  → Cria FeedAtividade
  → Dispara Supabase Realtime para o canal da secretaria

---

## CRITÉRIOS DE ACEITAÇÃO — NOVOS (complementam os do AGENTS.md)

TELA VISUALIZAÇÃO/APROVAÇÃO ($id):
- Botão "Enviar para Assinatura" visível para can('enviar-assinatura', 'Portaria') quando status === APROVADA
- Dialog de seleção de assinante lista apenas usuários com permissão de assinar
- Após enviar: status muda para AGUARDANDO_ASSINATURA, botão some
- Bloco roxo exibe nome do assinante e tempo decorrido
- Botão "Assinar e Publicar" visível SOMENTE para o usuário cujo id === portaria.assinanteId
- Após assinar: status PUBLICADA, bloco verde exibe nome, data e hash

TELA DASHBOARD:
- Card roxo "Aguardando sua assinatura" aparece para can('assinar', 'Portaria')
- Card lista as portarias com link direto para assinar
- Card NÃO aparece se não há nenhuma portaria aguardando

SIDEBAR:
- Badge contador roxo aparece no item Portarias quando há docs aguardando assinatura do usuário logado
- Badge some quando não há nenhum pendente

---

## INSTRUÇÃO PARA A IDE

Leia AGENTS.md, MOCKS.md e AGENTS_ASSINATURA.md.
Este arquivo complementa os anteriores. Não substitua o que já foi construído — apenas:
1. Atualize STATUS_PORTARIA e TIPO_EVENTO_FEED em domain.ts
2. Adicione os campos novos em Portaria (assinanteId, enviadoParaAssinaturaEm, assinadoEm)
3. Atualize o Prisma schema
4. Crie o componente EnviarAssinaturaDialog
5. Atualize a tela $id com os novos botões e blocos informativos
6. Adicione o card no Dashboard
7. Adicione o badge no Sidebar
8. Adicione as funções enviarParaAssinatura e assinarPublicar no serviço mock
Após cada item, marque com ✅ ou ❌.
