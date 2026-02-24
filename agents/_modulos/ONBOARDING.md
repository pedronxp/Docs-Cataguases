# agents/_modulos/ONBOARDING.md — ONBOARDING E GESTÃO DE SETORES
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também ONBOARDING.en.md

---

## IDENTIDADE

Este arquivo especifica o fluxo de Auto-Registro e Onboarding de novos servidores,
incluindo a gestão de hierarquia (Secretaria → Setores) e processo de aprovação.

---

## 1. PROBLEMA (CONTEXTO GOVTECH)

Em sistemas de prefeitura com centenas de servidores:
- Admin Geral não pode cadastrar manualmente cada usuário
- Servidor precisa poder se registrar, mas não pode emitir portarias imediatamente (segurança)
- Prefeitura precisa gerenciar hierarquia clara: Secretaria → Setores
- Servidor recém-cadastrado precisa informar a qual Setor pertence

---

## 2. SOLUÇÃO ARQUITETURAL

### Fluxo Completo (5 Etapas)

```
1. AUTO-REGISTRO
   Servidor cria conta com e-mail institucional, nome e senha
   ↓
2. ONBOARDING (LOTAÇÃO)
   No primeiro login, escolhe Secretaria e Setor em cascata
   ↓
3. QUARENTENA (PENDENTE)
   Conta fica "Aguardando Liberação" (role: PENDENTE)
   Usuário não acessa Dashboard
   ↓
4. APROVAÇÃO (ADMIN)
   Admin recebe alerta, define role real (OPERADOR, GESTOR_SETOR, etc.)
   ↓
5. LIBERADO
   Usuário recebe e-mail e pode acessar sistema normalmente
```

---

## 3. ALTERAÇÕES NO DOMÍNIO

### 3.1. Nova Role: `PENDENTE`

```typescript
// src/types/domain.ts

export const ROLES = {
  ADMIN_GERAL: 'ADMIN_GERAL',
  PREFEITO: 'PREFEITO',
  SECRETARIO: 'SECRETARIO',
  GESTOR_SETOR: 'GESTOR_SETOR',
  OPERADOR: 'OPERADOR',
  PENDENTE: 'PENDENTE', // NOVO: Usuário que acabou de se registrar
} as const

export type RoleUsuario = typeof ROLES[keyof typeof ROLES]
```

### 3.2. Novo Model: `Setor`

```typescript
// src/types/domain.ts

export interface Setor {
  id: string
  secretariaId: string
  nome: string
  sigla?: string
  ativo: boolean
  createdAt: string
  updatedAt: string
}
```

---

## 4. NOVAS ROTAS

| Rota | Propósito | Acesso |
|---|---|---|
| `/_auth/registro` | Auto-registro de novo servidor | Público |
| `/_auth/onboarding` | Escolha de Secretaria/Setor | Autenticado (PENDENTE) |
| `/_auth/aguardando` | Tela de espera pós-lotação | Autenticado (PENDENTE) |
| `/_sistema/admin/usuarios` | Gestão + Fila de Aprovação | ADMIN_GERAL |

---

## 5. TELA: AUTO-REGISTRO (`/_auth/registro`)

### 5.1. Layout

**STITCH_PROMPT:**
```
Design a clean government registration page for "Doc's Cataguases".
Layout: Centered white card on slate-50 background, max-w-md.
Header: City coat of arms placeholder circular 64px + Title "Criar Conta Servidor".
Form fields (full width):
  - Nome Completo
  - E-mail institucional (@cataguases.mg.gov.br)
  - Senha (password input)
  - Confirmar Senha
Button: "Cadastrar" (gov-blue).
Footer text: "Apenas e-mails institucionais oficiais serão aprovados."
Bottom link: "Já possui conta? Fazer Login" (redirects to /_auth/login).
Style: Sober Brazilian Gov.br design system. High contrast.
```

### 5.2. Validações

- **E-mail:** Deve conter `@cataguases.mg.gov.br`
- **Senha:** Mínimo 8 caracteres
- **Confirmar Senha:** Deve ser igual à senha
- **Nome:** Obrigatório

### 5.3. Comportamento

1. Usuário preenche formulário
2. Sistema valida e-mail institucional
3. Cria conta com `role = 'PENDENTE'`, `secretariaId = null`, `setorId = null`, `ativo = false`
4. Redireciona para `/_auth/onboarding`

---

## 6. TELA: ONBOARDING/LOTAÇÃO (`/_auth/onboarding`)

### 6.1. Layout

**STITCH_PROMPT:**
```
Design an onboarding/lotação step page for a government system.
Layout: Centered white card on slate-50 background, max-w-lg.
Header: Icon Building (gov-blue) + Title "Bem-vindo ao Doc's Cataguases"
Subtitle: "Para iniciar, informe sua lotação atual na Prefeitura."
Form fields:
  - Select 1: "Secretaria" (placeholder "Ex: Secretaria de Saúde")
  - Select 2: "Setor" (disabled until Secretaria is selected. Helper text: "Selecione a secretaria primeiro").
Alert banner (amber-50): "Após enviar, seu acesso passará por uma validação de segurança da administração."
Button: "Confirmar Lotação" (gov-blue).
Style: Sober Brazilian Gov.br design system.
```

### 6.2. Lógica de Cascata

```typescript
const [secretariaId, setSecretariaId] = useState('')
const [setorId, setSetorId] = useState('')

const { data: secretarias } = useQuery({
  queryKey: ['secretarias'],
  queryFn: listarSecretarias,
})

const { data: setores } = useQuery({
  queryKey: ['setores', secretariaId],
  queryFn: () => listarSetores(secretariaId),
  enabled: !!secretariaId,
})

// Quando Secretaria muda, reseta Setor
useEffect(() => {
  setSetorId('')
}, [secretariaId])
```

### 6.3. Comportamento

1. Usuário seleciona Secretaria → Select de Setores habilita
2. Usuário seleciona Setor
3. Clica "Confirmar Lotação"
4. Sistema atualiza: `secretariaId`, `setorId` no usuário
5. Redireciona para `/_auth/aguardando`

---

## 7. TELA: AGUARDANDO LIBERAÇÃO (`/_auth/aguardando`)

### 7.1. Layout

**STITCH_PROMPT:**
```
Design an "Awaiting Approval" static page for a government system.
Layout: Centered white card on slate-50 background, max-w-md, text-center.
Header: Icon Clock or ShieldCheck (large, slate-400) + Title "Conta em Análise".
Body text: "Sua solicitação de acesso para a [Secretaria de Saúde - Setor de Compras] foi recebida."
Body text 2: "Por questões de segurança, um administrador precisa validar seu vínculo antes de liberar a criação de documentos oficiais."
Button: "Voltar para o Login" (outline).
Style: Sober Brazilian Gov.br design system.
```

### 7.2. Comportamento

- Usuário não pode sair desta tela até ser aprovado
- Pode fazer logout e voltar para login
- Após aprovação pelo Admin, próximo login redireciona para Dashboard

---

## 8. TELA: GESTÃO DE USUÁRIOS + FILA DE APROVAÇÃO

### 8.1. Adicionar Tabs

**Rota:** `/_sistema/admin/usuarios`

```typescript
<Tabs defaultValue="ativos">
  <TabsList>
    <TabsTrigger value="ativos">Usuários Ativos</TabsTrigger>
    <TabsTrigger value="fila">
      Fila de Aprovação
      {countPendentes > 0 && (
        <Badge className="ml-2" variant="destructive">{countPendentes}</Badge>
      )}
    </TabsTrigger>
  </TabsList>

  <TabsContent value="ativos">
    {/* Tabela existente */}
  </TabsContent>

  <TabsContent value="fila">
    <FilaAprovacaoTable />
  </TabsContent>
</Tabs>
```

### 8.2. Layout da Fila de Aprovação

**STITCH_PROMPT:**
```
Design the "Fila de Aprovação" tab for the User Management admin page.
Layout: Table layout.
Columns: Nome | E-mail | Lotação Solicitada | Data | Ações
Row 1: "Carlos Mota", "carlos@cataguases...", "Sec. Saúde / Compras", "Há 2 horas",
       Buttons: [Aprovar Acesso] (gov-blue) | [Recusar] (outline red)
Approval Modal (Dialog):
  Title: "Aprovar Servidor: Carlos Mota".
  Text: "Confirme o nível de permissão deste usuário."
  Select: "Cargo no Sistema" (Options: Operador, Gestor de Setor, Secretário).
  Button: "Aprovar e Enviar E-mail" (gov-blue).
```

### 8.3. Modal de Aprovação

```typescript
// src/components/features/usuarios/ModalAprovarUsuario.tsx

interface Props {
  usuario: Usuario
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalAprovarUsuario({ usuario, open, onOpenChange }: Props) {
  const [roleEscolhida, setRoleEscolhida] = useState<RoleUsuario>('OPERADOR')

  const mutation = useMutation({
    mutationFn: () => aprovarUsuario(usuario.id, roleEscolhida),
    onSuccess: () => {
      toast.success(`Usuário ${usuario.name} aprovado com sucesso!`)
      queryClient.invalidateQueries(['usuarios-pendentes'])
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar Servidor: {usuario.name}</DialogTitle>
          <DialogDescription>
            Confirme o nível de permissão deste usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cargo no Sistema</Label>
            <Select value={roleEscolhida} onValueChange={(v) => setRoleEscolhida(v as RoleUsuario)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERADOR">Operador</SelectItem>
                <SelectItem value="GESTOR_SETOR">Gestor de Setor</SelectItem>
                <SelectItem value="SECRETARIO">Secretário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O usuário será notificado por e-mail e poderá acessar o sistema imediatamente.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Aprovando...' : 'Aprovar e Enviar E-mail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 9. TELA: GESTÃO DE SETORES (DRAWER)

### 9.1. Atualização na Gestão Municipal

**Rota:** `/_sistema/admin/gestao`

Na tabela de "Secretarias Cadastradas", adicionar coluna "Setores":

```typescript
<TableCell>
  <Button variant="ghost" size="sm" onClick={() => abrirDrawerSetores(secretaria.id)}>
    <Settings className="mr-2 h-4 w-4" />
    Gerenciar Setores
  </Button>
</TableCell>
```

### 9.2. Layout do Drawer

**STITCH_PROMPT:**
```
Design a right-side panel (Drawer/Sheet) to manage "Setores" of a specific Secretaria.
Header: Title "Setores - Secretaria de Saúde" + close (X) button.
Content:
  Input field + [Adicionar Setor] button inline.
  List of existing sectors (white border rounded-md p-3 mb-2):
    Item 1: "Departamento de Compras" + [Editar] [Desativar] icons on right.
    Item 2: "Recursos Humanos Interno" + [Editar] [Desativar] icons on right.
    Item 3: "Gabinete do Secretário" + [Editar] [Desativar] icons on right.
Style: Sober Brazilian Gov.br design system.
```

### 9.3. Componente

```typescript
// src/components/features/setores/DrawerSetores.tsx

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2 } from 'lucide-react'

interface Props {
  secretariaId: string
  secretariaNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DrawerSetores({ secretariaId, secretariaNome, open, onOpenChange }: Props) {
  const [novoSetor, setNovoSetor] = useState('')

  const { data: setores } = useQuery({
    queryKey: ['setores', secretariaId],
    queryFn: () => listarSetores(secretariaId),
    enabled: open,
  })

  const adicionarMutation = useMutation({
    mutationFn: () => criarSetor({ secretariaId, nome: novoSetor }),
    onSuccess: () => {
      toast.success('Setor adicionado com sucesso!')
      setNovoSetor('')
      queryClient.invalidateQueries(['setores', secretariaId])
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Setores - {secretariaNome}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Adicionar Novo Setor */}
          <div className="flex gap-2">
            <Input 
              value={novoSetor}
              onChange={(e) => setNovoSetor(e.target.value)}
              placeholder="Nome do setor"
            />
            <Button 
              onClick={() => adicionarMutation.mutate()}
              disabled={!novoSetor || adicionarMutation.isPending}
            >
              Adicionar
            </Button>
          </div>

          {/* Lista de Setores */}
          <div className="space-y-2">
            {setores?.data.map((setor) => (
              <div key={setor.id} className="flex items-center justify-between p-3 border rounded-md">
                <span className="font-medium">{setor.nome}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

---

## 10. LÓGICA DE PROTEÇÃO DE ROTAS

```typescript
// src/routes/__root.tsx (ou route guard)

if (usuario.role === 'PENDENTE') {
  if (!usuario.secretariaId) {
    // Não preencheu lotação ainda
    throw redirect({ to: '/_auth/onboarding' })
  } else {
    // Preencheu lotação, aguardando admin
    throw redirect({ to: '/_auth/aguardando' })
  }
}

if (!usuario.ativo) {
  // Usuário desativado
  throw redirect({ to: '/_auth/login', search: { error: 'Conta desativada' } })
}

// Usuário aprovado e ativo → acessa normalmente
```

---

## 11. SERVIÇOS MOCK (Ciclo 1)

```typescript
// src/services/auth.service.ts (adicionar)

export interface RegistroRequest {
  name: string
  email: string
  password: string
}

export async function registrar(payload: RegistroRequest): Promise<Result<LoginResponse>> {
  await mockDelay(1000)
  
  // Valida e-mail institucional
  if (!payload.email.endsWith('@cataguases.mg.gov.br')) {
    return err('Apenas e-mails institucionais são permitidos.')
  }

  // Cria usuário PENDENTE
  const novoUsuario: Usuario = {
    id: `user-${Date.now()}`,
    name: payload.name,
    email: payload.email,
    role: 'PENDENTE',
    ativo: false,
    secretariaId: null,
    setorId: null,
    permissoesExtra: [],
    createdAt: new Date().toISOString(),
  }

  mockDB.usuarios.push(novoUsuario)
  return ok({ token: `mock-jwt-${Date.now()}`, usuario: novoUsuario })
}

export interface OnboardingRequest {
  secretariaId: string
  setorId: string
}

export async function confirmarLotacao(payload: OnboardingRequest): Promise<Result<Usuario>> {
  await mockDelay(800)
  const usuario = mockDB.usuarios.find(u => u.id === 'user-current') // Simular usuário autenticado
  if (!usuario) return err('Usuário não encontrado.')
  
  usuario.secretariaId = payload.secretariaId
  usuario.setorId = payload.setorId
  return ok(usuario)
}

---

// src/services/usuario.service.ts (adicionar)

export async function listarUsuariosPendentes(): Promise<Result<Usuario[]>> {
  await mockDelay(400)
  const pendentes = mockDB.usuarios.filter(u => u.role === 'PENDENTE' && u.secretariaId !== null)
  return ok(pendentes)
}

export async function aprovarUsuario(id: string, role: RoleUsuario): Promise<Result<Usuario>> {
  await mockDelay(600)
  const usuario = mockDB.usuarios.find(u => u.id === id)
  if (!usuario) return err('Usuário não encontrado.')
  
  usuario.role = role
  usuario.ativo = true
  return ok(usuario)
}

export async function recusarUsuario(id: string): Promise<Result<void>> {
  await mockDelay(500)
  mockDB.usuarios = mockDB.usuarios.filter(u => u.id !== id)
  return ok(undefined)
}

---

// src/services/setor.service.ts (NOVO)

import type { Setor } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_SETORES: Setor[] = [
  { id: 'setor-dp', secretariaId: 'sec-rh', nome: 'Departamento de Pessoal', sigla: 'DP', ativo: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
  { id: 'setor-compras', secretariaId: 'sec-rh', nome: 'Setor de Compras', sigla: 'COMPRAS', ativo: true, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
]

export async function listarSetores(secretariaId: string): Promise<Result<Setor[]>> {
  await mockDelay(300)
  const setores = MOCK_SETORES.filter(s => s.secretariaId === secretariaId && s.ativo)
  return ok(setores)
}

export async function criarSetor(payload: { secretariaId: string; nome: string }): Promise<Result<Setor>> {
  await mockDelay(500)
  const novoSetor: Setor = {
    id: `setor-${Date.now()}`,
    secretariaId: payload.secretariaId,
    nome: payload.nome,
    sigla: payload.nome.substring(0, 6).toUpperCase(),
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  MOCK_SETORES.push(novoSetor)
  return ok(novoSetor)
}

export async function desativarSetor(id: string): Promise<Result<Setor>> {
  await mockDelay(400)
  const setor = MOCK_SETORES.find(s => s.id === id)
  if (!setor) return err('Setor não encontrado.')
  setor.ativo = false
  return ok(setor)
}
```

---

## 12. ENDPOINTS BACKEND (Ciclo 3)

```
POST /api/auth/registro
  Body:    { name, email, password }
  Retorna: { token, usuario } com role=PENDENTE

PATCH /api/auth/onboarding
  Body:    { secretariaId, setorId }
  Auth:    Requer token (role=PENDENTE)
  Retorna: Usuario atualizado

GET /api/usuarios/pendentes
  Auth:    Requer gerenciar:all
  Retorna: Usuario[] com role=PENDENTE e secretariaId!=null

PATCH /api/usuarios/[id]/aprovar
  Body:    { role }
  Auth:    Requer gerenciar:all
  Retorna: Usuario aprovado (ativo=true)

DELETE /api/usuarios/[id]/recusar
  Auth:    Requer gerenciar:all
  Retorna: 204 No Content

GET /api/setores?secretariaId=[id]
  Auth:    Autenticado
  Retorna: Setor[]

POST /api/setores
  Body:    { secretariaId, nome }
  Auth:    Requer gerenciar:all
  Retorna: Setor criado

DELETE /api/setores/[id]
  Auth:    Requer gerenciar:all
  Retorna: 204 No Content
```

---

## 13. CRITÉRIOS DE ACEITAÇÃO

### Auto-Registro
- [ ] Tela `/_auth/registro` acessível publicamente
- [ ] Validação de e-mail institucional funcionando
- [ ] Criação de conta com role `PENDENTE` funcionando
- [ ] Redirecionamento automático para `/_auth/onboarding`

### Onboarding
- [ ] Tela `/_auth/onboarding` acessível apenas para `PENDENTE` sem lotação
- [ ] Select de Secretarias populado dinamicamente
- [ ] Select de Setores habilitado apenas após escolher Secretaria
- [ ] Cascata de Setores funcionando (filtrados por Secretaria)
- [ ] Confirmação de lotação atualiza usuário
- [ ] Redirecionamento para `/_auth/aguardando`

### Aguardando
- [ ] Tela `/_auth/aguardando` acessível apenas para `PENDENTE` com lotação
- [ ] Exibe Secretaria e Setor escolhidos
- [ ] Botão logout funcionando

### Fila de Aprovação
- [ ] Aba "Fila de Aprovação" visível apenas para `ADMIN_GERAL`
- [ ] Badge com contador de pendentes
- [ ] Tabela lista usuários `PENDENTE` com lotação
- [ ] Botão "Aprovar" abre modal
- [ ] Modal permite escolher role final
- [ ] Aprovação ativa usuário e muda role
- [ ] Botão "Recusar" deleta usuário
- [ ] Toast de confirmação exibido

### Gestão de Setores
- [ ] Botão "Gerenciar Setores" na tabela de Secretarias
- [ ] Drawer abre com lista de Setores da Secretaria
- [ ] Input + botão "Adicionar" funciona
- [ ] Novo setor criado e aparece na lista
- [ ] Botão "Desativar" funciona (setor some da lista)

---

## 14. CHECKLIST DE CONCLUSÃO (Ciclo 1)

- [ ] Role `PENDENTE` adicionada em `src/types/domain.ts`
- [ ] Interface `Setor` criada em `src/types/domain.ts`
- [ ] `src/routes/_auth/registro.tsx` criado
- [ ] `src/routes/_auth/onboarding.tsx` criado
- [ ] `src/routes/_auth/aguardando.tsx` criado
- [ ] Aba "Fila de Aprovação" adicionada em `/_sistema/admin/usuarios`
- [ ] `FilaAprovacaoTable.tsx` criado
- [ ] `ModalAprovarUsuario.tsx` criado
- [ ] `DrawerSetores.tsx` criado
- [ ] Botão "Gerenciar Setores" adicionado na Gestão Municipal
- [ ] `src/services/setor.service.ts` criado com mocks
- [ ] Funções `registrar`, `confirmarLotacao` adicionadas em `auth.service.ts`
- [ ] Funções `listarUsuariosPendentes`, `aprovarUsuario`, `recusarUsuario` adicionadas em `usuario.service.ts`
- [ ] Route guard para `PENDENTE` implementado em `__root.tsx`
- [ ] Lógica de cascata Secretaria → Setores implementada
- [ ] Validação de e-mail institucional implementada
