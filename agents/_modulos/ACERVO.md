# agents/_modulos/ACERVO.md — ACERVO DOCUMENTAL
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_modulos/ASSINATURA.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também ACERVO.en.md

---

## IDENTIDADE

Este arquivo especifica a Tela de Acervo Documental (`/_sistema/acervo`).
O Acervo é um arquivo histórico de portarias publicadas, com busca avançada e filtros.
NÃO confundir com a Lista de Portarias (fila de trabalho operacional).

---

## 1. DIFERENÇA: LISTA vs. ACERVO

### Lista de Portarias (`/_sistema/administrativo/portarias`)
- Fila de trabalho operacional
- Exibe: RASCUNHO, PROCESSANDO, PENDENTE, APROVADA, AGUARDANDO_ASSINATURA, FALHA_PROCESSAMENTO
- Objetivo: gerenciar documentos em andamento
- Ações: submeter, aprovar, rejeitar, enviar para assinatura, assinar

### Acervo Documental (`/_sistema/acervo`)
- Arquivo histórico de consulta
- Exibe: PUBLICADA (padrão), APROVADA, PENDENTE (opcional por filtro)
- Objetivo: buscar, consultar e baixar documentos oficiais já publicados
- Ações: visualizar PDF, baixar, ver detalhes

---

## 2. REGRAS ABAC — ISOLAMENTO DE DADOS

| Role | Acesso |
|---|---|
| `OPERADOR` | Portarias da própria `secretariaId` |
| `GESTOR_SETOR` | Portarias do próprio `setorId` dentro da `secretariaId` |
| `SECRETARIO` | Todas as portarias da própria `secretariaId` |
| `SECRETARIO` com `visualizar:PortariaGlobal` | **Todas as secretarias** (ex: Secretário de Administração) |
| `ADMIN_GERAL`, `PREFEITO` | Tudo (via `gerenciar: all`) |

**NUNCA exibir:** `RASCUNHO`, `PROCESSANDO`, `FALHA_PROCESSAMENTO`.

---

## 3. NOVA PERMISSÃO: `visualizar:PortariaGlobal`

### Em `src/lib/ability.ts`

```typescript
export type Subjects =
  | 'all'
  | 'Usuario'
  | 'Portaria'
  | 'PortariaGlobal'  // NOVO
  | 'Modelo'
  // ...
```

A permissão já é coberta pelo loop de `permissoesExtra` existente no `buildAbility`.
Basta o `ADMIN_GERAL` adicionar `"visualizar:PortariaGlobal"` no array `permissoesExtra` do usuário.

### Na Tela de Gestão de Usuários

Adicionar checkbox:

```typescript
const PERMISSOES_DISPONIVEIS = [
  { value: 'deletar:Portaria',          label: 'Deletar Portarias' },
  { value: 'aprovar:Portaria',          label: 'Aprovar Portarias' },
  { value: 'publicar:Portaria',         label: 'Assinar e Publicar Portarias' },
  { value: 'gerenciar:Modelo',          label: 'Gerenciar Modelos de Documento' },
  { value: 'visualizar:PortariaGlobal', label: 'Ver acervo de TODAS as Secretarias' }, // NOVO
]
```

---

## 4. LAYOUT DA TELA

```
┌─────────────────────────────────────────────────────────────────┐
│ Acervo Documental                                               │
│                                              [Buscar Portaria]  │
├──────────────────┬──────────────────────────────────────────────┤
│ PASTAS           │  PORTARIAS — Secretaria de RH                │
│                  │                                              │
│ 📁 Sec. RH   ←ativa│  🔍 [busca]  📅 [ano]  📂 [setor]          │
│                  │                                              │
│ (se visualizar:  │  Nº       Título              Data    Ações  │
│ PortariaGlobal)  │  042/2025 Portaria de Nom...  10/06   [PDF]  │
│ 📁 Sec. Obras    │  039/2025 Portaria de Lic...  13/06   [PDF]  │
│ 📁 Sec. Saúde    │  035/2025 Portaria de Exo...  01/06   [PDF]  │
│ 📁 Sec. Educação │                                              │
│                  │  ← anterior  página 1 de 4  próxima →       │
└──────────────────┴──────────────────────────────────────────────┘
```

### Comportamento do Painel de Pastas (esquerda)

- **Sem `visualizar:PortariaGlobal`:** painel oculto, exibe apenas portarias da própria secretaria
- **Com `visualizar:PortariaGlobal` ou `ADMIN_GERAL`/`PREFEITO`:** painel visível com todas as secretarias
- Clicar em uma pasta filtra as portarias à direita
- Badge ao lado da pasta mostra total de documentos publicados

---

## 5. FILTROS DISPONÍVEIS

| Filtro | Tipo | Descrição |
|---|---|---|
| Busca | texto | Procura em: `numeroOficial`, `titulo`, valores de `dadosFormulario` |
| Ano | select | Filtra pelo ano do `numeroOficial` (ex: 2025) |
| Setor | select | Filtra pelo `setorId` (apenas na secretaria ativa) |
| Status | checkbox | `PUBLICADA` (padrão ativo), `APROVADA`, `PENDENTE` |

---

## 6. COLUNAS DA TABELA

| Coluna | Visibilidade | Descrição |
|---|---|---|
| Número Oficial | sempre | ex: `042/2025` |
| Título | sempre | Título da portaria |
| Secretaria | `visualizar:PortariaGlobal` apenas | Nome/sigla da secretaria |
| Setor | opcional | Setor emissor |
| Data de Publicação | sempre | `updatedAt` formatado |
| Ações | sempre | [Ver PDF] [Detalhes] |

---

## 7. COMPONENTE `PastaSecretaria.tsx`

```typescript
// src/components/features/acervo/PastaSecretaria.tsx

import { Folder, FolderOpen } from 'lucide-react'
import type { Secretaria } from '@/types/domain'

interface Props {
  secretaria: Secretaria
  ativa: boolean
  totalDocs: number
  onClick: () => void
}

export function PastaSecretaria({ secretaria, ativa, totalDocs, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors
        ${ativa
          ? 'bg-gov-blue text-white'
          : 'text-slate-600 hover:bg-slate-100'
        }
      `}
    >
      {ativa ? <FolderOpen size={16} /> : <Folder size={16} />}
      <span className="flex-1 truncate">{secretaria.sigla}</span>
      <span className={`text-xs ${ativa ? 'text-blue-200' : 'text-slate-400'}`}>
        {totalDocs}
      </span>
    </button>
  )
}
```

---

## 8. LÓGICA ABAC NO FRONTEND

```typescript
// src/routes/_sistema/acervo/index.tsx (resumo)

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'

export default function AcervoPage() {
  const ability = useAbility(AbilityContext)
  const { usuario } = useAuthStore()

  // Define se pode ver pastas de outras secretarias
  const podeVerTodasSecretarias =
    ability.can('gerenciar', 'all') ||
    ability.can('visualizar', 'PortariaGlobal')

  // Secretaria inicial: a do usuário, ou vazio se pode ver todas
  const [secretariaAtivaId, setSecretariaAtivaId] = useState<string>(
    podeVerTodasSecretarias ? '' : (usuario?.secretariaId ?? '')
  )

  const [busca, setBusca] = useState('')
  const [ano, setAno] = useState<number>(new Date().getFullYear())
  const [setorId, setSetorId] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['acervo', secretariaAtivaId, busca, ano, setorId, page],
    queryFn: () => buscarAcervo({
      secretariaId: podeVerTodasSecretarias ? secretariaAtivaId : usuario!.secretariaId!,
      busca,
      ano,
      setorId,
      page,
      pageSize: 15,
      statusFiltro: ['PUBLICADA'],
    }),
  })

  return (
    <PageLayout title="Acervo Documental">
      <div className="flex gap-6 h-full">
        {podeVerTodasSecretarias && (
          <aside className="w-48 shrink-0">
            {/* Painel de pastas */}
          </aside>
        )}
        <div className="flex-1 flex flex-col gap-4">
          {/* Filtros + Tabela + Paginação */}
        </div>
      </div>
    </PageLayout>
  )
}
```

---

## 9. SERVIÇO MOCK (já incluído em `agents/_base/MOCKS.md`)

Ver arquivo `MOCKS.md` para implementação completa de:
- `buscarAcervo(params: AcervoQueryParams)`
- `contarPorSecretaria()`

---

## 10. ENDPOINTS BACKEND (Ciclo 3)

```
GET /api/acervo
  Query:   secretariaId, busca, ano, setorId, page, pageSize, status[]
  ABAC:    buildFiltroSeguranca aplicado primeiro
           Se usuário não tem visualizar:PortariaGlobal → força secretariaId = usuario.secretariaId
  Retorna: PaginatedResponse<Portaria>

GET /api/acervo/contadores
  Retorna: Record<secretariaId, total> para badges das pastas
  ABAC:    Respeitando isolamento (sem visualizar:PortariaGlobal → só a própria secretaria)
```

---

## 11. ADICIONAR NO SIDEBAR

```typescript
// src/components/layout/AppSidebar.tsx

import { Archive } from 'lucide-react'

const NAV_ITEMS = [
  // ...
  {
    to: '/_sistema/acervo',
    label: 'Acervo',
    icon: Archive,
    action: 'ler',
    subject: 'Portaria'
  },
  // ...
]
```

---

## 12. CRITÉRIOS DE ACEITAÇÃO

- [ ] `OPERADOR`/`SECRETARIO` sem `visualizar:PortariaGlobal` vê apenas portarias da própria secretaria
- [ ] Usuário sem `visualizar:PortariaGlobal` NÃO vê o painel de pastas lateral
- [ ] Usuário com `visualizar:PortariaGlobal` vê painel de pastas com todas as secretarias
- [ ] Clicar em uma pasta filtra as portarias corretamente
- [ ] Busca por número "042" retorna portaria `042/2025`
- [ ] Busca por nome "João Silva" encontra portaria via `dadosFormulario`
- [ ] Filtro por ano funciona corretamente (extrai de `numeroOficial`)
- [ ] Coluna "Secretaria" só aparece para quem tem `visualizar:PortariaGlobal`
- [ ] Botão "Ver PDF" abre `pdfUrl` em nova aba
- [ ] Botão "Detalhes" redireciona para `/_sistema/administrativo/portarias/[id]`
- [ ] Status `RASCUNHO`, `PROCESSANDO`, `FALHA_PROCESSAMENTO` NUNCA aparecem no acervo
- [ ] Skeleton exibido durante carregamento
- [ ] Paginação de 15 itens por página funcionando
- [ ] Badge nas pastas mostra total correto de documentos publicados

---

## 13. CHECKLIST DE CONCLUSÃO (Ciclo 1)

- [ ] `'PortariaGlobal'` adicionado aos `Subjects` em `src/lib/ability.ts`
- [ ] Checkbox `visualizar:PortariaGlobal` na tela de Gestão de Usuários
- [ ] `src/services/acervo.service.ts` criado com `buscarAcervo` e `contarPorSecretaria`
- [ ] `src/components/features/acervo/PastaSecretaria.tsx` criado
- [ ] `src/components/features/acervo/AcervoTable.tsx` criado
- [ ] `src/components/features/acervo/AcervoPagination.tsx` criado
- [ ] `src/routes/_sistema/acervo/index.tsx` criado
- [ ] Item "Acervo" adicionado no `AppSidebar.tsx` com ícone `Archive`
- [ ] Mocks atualizados: 3+ portarias `PUBLICADA` de secretarias diferentes no `mockDB.portarias`
- [ ] Lógica ABAC testada: usuário sem permissão vê apenas própria secretaria
- [ ] Lógica ABAC testada: usuário com `visualizar:PortariaGlobal` vê todas as secretarias
