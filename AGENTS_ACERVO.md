# AGENTS_ACERVO.md — COMPLEMENTO: ACERVO DOCUMENTAL
# Leia junto com AGENTS.md, MOCKS.md e AGENTS_ASSINATURA.md
# Adiciona a tela 13: Acervo Documental (consulta e pesquisa de portarias publicadas)

---

## POR QUE ESTA TELA É DIFERENTE DA LISTA DE PORTARIAS

A Lista de Portarias (/_sistema/administrativo/portarias) é uma FILA DE TRABALHO.
Mostra documentos que precisam de ação: rascunhos, pendentes, com falha.

O Acervo Documental (/_sistema/acervo) é um ARQUIVO HISTÓRICO.
Permite consultar, pesquisar e baixar qualquer portaria publicada da secretaria.
É a tela que um servidor usa quando precisa verificar se uma portaria existe,
qual o número de uma nomeação de 2023, ou imprimir um documento publicado.

---

## REGRAS DE ISOLAMENTO DE DADOS (ABAC) — ACERVO

OPERADOR:
  → vê apenas portarias da sua própria secretariaId
  → não vê portarias de outras secretarias

GESTOR_SETOR:
  → vê portarias do seu setorId dentro da sua secretariaId

SECRETARIO:
  → vê todas as portarias da sua secretariaId
  → não vê portarias de outras secretarias

SECRETARIO com permissão visualizar:PortariaGlobal:
  → vê portarias de TODAS as secretarias
  → este é o "Secretário de Administração" ou cargo equivalente

ADMIN_GERAL e PREFEITO:
  → veem tudo (já coberto pelo gerenciar: all no CASL)

NUNCA exibir no acervo documentos com status RASCUNHO ou PROCESSANDO.
O acervo exibe apenas: PUBLICADA (padrão), APROVADA, PENDENTE (opcional por filtro).

---

## NOVA PERMISSÃO — adicionar em src/lib/ability.ts

Adicione na lista de Subjects:
  'PortariaGlobal'

Adicione no buildAbility, após o bloco de permissoesExtra:

// Permissão especial: visualizar acervo de todas as secretarias
// Concedida via permissoesExtra: "visualizar:PortariaGlobal"
// Usada pelo Secretário de Administração ou cargo equivalente
// ADMIN_GERAL e PREFEITO já têm via gerenciar: all

A permissão já é coberta automaticamente pelo loop de permissoesExtra existente.
Basta o ADMIN_GERAL cadastrar "visualizar:PortariaGlobal" no array permissoesExtra
do usuário desejado na tela de Gestão de Usuários.

Adicione o checkbox na tela de Gestão de Usuários:
  "visualizar:PortariaGlobal" → label: "Ver acervo de todas as Secretarias"

---

## NOVA ROTA

Adicione em src/routes/_sistema/:

/_sistema/acervo                          → Acervo Documental (busca geral)
/_sistema/acervo/$secretariaId            → Pasta de uma Secretaria específica

---

## NOVA TELA: src/routes/_sistema/acervo/index.tsx

LAYOUT DA TELA:

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

COMPORTAMENTO DAS PASTAS (painel esquerdo):
- Usuário sem visualizar:PortariaGlobal → vê apenas sua própria secretaria, sem painel de pastas
- Usuário com visualizar:PortariaGlobal ou ADMIN_GERAL/PREFEITO → vê lista de todas as pastas/secretarias
- Clicar em uma pasta filtra as portarias à direita

FILTROS DISPONÍVEIS:
- Busca por texto: número oficial, título, nome de servidor (dadosFormulario)
- Ano: select com anos disponíveis (2023, 2024, 2025…)
- Setor: select com setores da secretaria ativa
- Status: checkbox PUBLICADA (padrão ativo), APROVADA, PENDENTE

COLUNAS DA TABELA:
- Número Oficial (ex: 042/2025)
- Título
- Secretaria (só visível para quem tem visualizar:PortariaGlobal)
- Setor (opcional)
- Data de Publicação
- Ações: [Ver PDF] [Detalhes]

---

## COMPONENTE DE PASTA (src/components/features/acervo/PastaSecretaria.tsx)

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
      {ativa
        ? <FolderOpen size={16} />
        : <Folder size={16} />
      }
      <span className="flex-1 truncate">{secretaria.sigla}</span>
      <span className={`text-xs ${ativa ? 'text-blue-200' : 'text-slate-400'}`}>
        {totalDocs}
      </span>
    </button>
  )
}

---

## LÓGICA DE ABAC NO FRONTEND (src/routes/_sistema/acervo/index.tsx)

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'

export default function AcervoPage() {
  const ability = useAbility(AbilityContext)
  const { usuario } = useAuthStore()

  // Define se o usuário pode ver pastas de outras secretarias
  const podeVerTodasSecretarias =
    ability.can('gerenciar', 'all') ||
    ability.can('visualizar', 'PortariaGlobal')

  // Secretaria inicial: a do próprio usuário, ou null se pode ver todas
  const [secretariaAtivaId, setSecretariaAtivaId] = useState<string>(
    podeVerTodasSecretarias ? '' : (usuario?.secretariaId ?? '')
  )

  // Parâmetros de busca
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
      statusFiltro: ['PUBLICADA'],  // padrão: só publicadas
    }),
  })

  return (
    <PageLayout title="Acervo Documental">
      <div className="flex gap-6 h-full">

        {/* Painel de pastas — só para quem tem visualizar:PortariaGlobal */}
        {podeVerTodasSecretarias && (
          <aside className="w-48 shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 px-1">
              Secretarias
            </p>
            <div className="space-y-1">
              {secretarias.map((sec) => (
                <PastaSecretaria
                  key={sec.id}
                  secretaria={sec}
                  ativa={secretariaAtivaId === sec.id}
                  totalDocs={contadores[sec.id] ?? 0}
                  onClick={() => { setSecretariaAtivaId(sec.id); setPage(1) }}
                />
              ))}
            </div>
          </aside>
        )}

        {/* Área principal */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Filtros */}
          <div className="flex gap-3 items-center">
            <Input
              placeholder="Buscar por número, título ou servidor…"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPage(1) }}
              className="max-w-xs"
            />
            <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2024, 2023].map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {isLoading
            ? <DataTableSkeleton rows={8} />
            : <AcervoTable
                portarias={data?.success ? data.data.data : []}
                mostrarSecretaria={podeVerTodasSecretarias}
              />
          }

          {/* Paginação */}
          <AcervoPagination
            page={page}
            totalPages={data?.success ? data.data.totalPages : 1}
            onPageChange={setPage}
          />

        </div>
      </div>
    </PageLayout>
  )
}

---

## NOVO SERVIÇO MOCK: src/services/acervo.service.ts

import type { Portaria } from '../types/domain'
import type { PaginatedResponse } from '../types/api'
import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export interface AcervoQueryParams {
  secretariaId?: string
  busca?: string
  ano?: number
  setorId?: string
  page?: number
  pageSize?: number
  statusFiltro?: string[]
}

export async function buscarAcervo(
  params: AcervoQueryParams
): Promise<Result<PaginatedResponse<Portaria>>> {
  await mockDelay(500)

  let lista = [...mockDB.portarias]

  // Filtro de status (padrão: apenas PUBLICADA)
  const statusFiltro = params.statusFiltro ?? ['PUBLICADA']
  lista = lista.filter((p) => statusFiltro.includes(p.status))

  // Filtro ABAC por secretaria
  if (params.secretariaId) {
    lista = lista.filter((p) => p.secretariaId === params.secretariaId)
  }

  // Filtro por setor
  if (params.setorId) {
    lista = lista.filter((p) => p.setorId === params.setorId)
  }

  // Filtro por ano (extrai do numeroOficial ou createdAt)
  if (params.ano) {
    lista = lista.filter((p) => {
      const ano = p.numeroOficial?.split('/')[1] ??
                  new Date(p.createdAt).getFullYear().toString()
      return ano === String(params.ano)
    })
  }

  // Busca por texto (número, título ou valor em dadosFormulario)
  if (params.busca) {
    const termo = params.busca.toLowerCase()
    lista = lista.filter((p) =>
      p.titulo.toLowerCase().includes(termo) ||
      (p.numeroOficial ?? '').toLowerCase().includes(termo) ||
      Object.values(p.dadosFormulario).some((v) => v.toLowerCase().includes(termo))
    )
  }

  // Ordena por data de publicação (mais recente primeiro)
  lista.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 15
  const total = lista.length
  const data = lista.slice((page - 1) * pageSize, page * pageSize)

  return ok({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

// Retorna contagem de docs publicados por secretaria (para os badges das pastas)
export async function contarPorSecretaria(): Promise<Result<Record<string, number>>> {
  await mockDelay(200)
  const contadores: Record<string, number> = {}
  mockDB.portarias
    .filter((p) => p.status === 'PUBLICADA')
    .forEach((p) => {
      contadores[p.secretariaId] = (contadores[p.secretariaId] ?? 0) + 1
    })
  return ok(contadores)
}

---

## ADICIONAR NO SIDEBAR (AppSidebar.tsx)

Adicione o item de Acervo na lista NAV_ITEMS:

{
  to: '/_sistema/acervo',
  label: 'Acervo',
  icon: Archive,
  action: 'ler',
  subject: 'Portaria'
}

Importar ícone:
  import { Archive } from 'lucide-react'

---

## ADICIONAR NA GESTÃO DE USUÁRIOS — novo checkbox de permissão

Na seção de Permissões Extras da tela de Gestão de Usuários, adicione:

const PERMISSOES_DISPONIVEIS = [
  { value: 'deletar:Portaria',          label: 'Deletar Portarias' },
  { value: 'aprovar:Portaria',          label: 'Aprovar Portarias' },
  { value: 'publicar:Portaria',         label: 'Assinar e Publicar Portarias' },
  { value: 'gerenciar:Modelo',          label: 'Gerenciar Modelos de Documento' },
  { value: 'visualizar:PortariaGlobal', label: 'Ver acervo de TODAS as Secretarias' }, // NOVO
]

---

## ENDPOINT BACKEND NOVO (Ciclo 2+)

GET /api/acervo
  Query params: secretariaId, busca, ano, setorId, page, pageSize, status[]
  → Aplica buildFiltroSeguranca (ABAC) antes de qualquer filtro
  → Se usuario não tem visualizar:PortariaGlobal, força secretariaId = usuario.secretariaId
  → Retorna PaginatedResponse<Portaria>

GET /api/acervo/contadores
  → Retorna Record<secretariaId, total> para popular badges das pastas
  → Respeitando ABAC: quem não tem visualizar:PortariaGlobal recebe só a própria secretaria

---

## CRITÉRIOS DE ACEITAÇÃO — TELA ACERVO

- Usuário OPERADOR/GESTOR/SECRETARIO vê apenas portarias da sua secretaria
- Usuário sem visualizar:PortariaGlobal NÃO vê o painel de pastas lateral
- Usuário com visualizar:PortariaGlobal vê painel de pastas com todas as secretarias
- Clicar em uma pasta filtra as portarias corretamente
- Busca por número "042" retorna portaria 042/2025
- Busca por nome "João Silva" encontra portaria via dadosFormulario
- Filtro por ano filtra corretamente pelo numeroOficial
- Coluna "Secretaria" só aparece para quem tem visualizar:PortariaGlobal
- Botão "Ver PDF" abre o pdfUrl em nova aba
- Botão "Detalhes" redireciona para /_sistema/administrativo/portarias/$id
- Status RASCUNHO e PROCESSANDO NUNCA aparecem no acervo
- Skeleton exibido durante carregamento
- Paginação de 15 itens por página

---

## ATUALIZAÇÃO DO MAPA DE TELAS (complementa AGENTS.md)

O sistema agora tem 13 telas:

TELAS OPERACIONAIS:
1.  Login
2.  Dashboard
3.  Lista de Portarias       ← fila de trabalho (documentos em andamento)
4.  Nova Portaria
5.  Revisão (Upload DOCX)
6.  Visualização/Aprovação/Assinatura
7.  Acervo Documental        ← NOVA (arquivo histórico + busca)

TELAS ADMINISTRATIVAS:
8.  Gestão de Usuários
9.  Modelos de Documento
10. Fluxo de Numeração
11. Variáveis de Sistema
12. Gestão (Setup Prefeito)
13. Analytics

---

## INSTRUÇÃO PARA A IDE

Leia AGENTS.md, MOCKS.md, AGENTS_ASSINATURA.md e AGENTS_ACERVO.md.
Este arquivo adiciona a tela de Acervo Documental. Execute nesta ordem:

1. Adicionar 'PortariaGlobal' nos Subjects do ability.ts
2. Adicionar checkbox "visualizar:PortariaGlobal" na tela de Gestão de Usuários
3. Criar src/services/acervo.service.ts com buscarAcervo e contarPorSecretaria
4. Criar src/components/features/acervo/PastaSecretaria.tsx
5. Criar src/components/features/acervo/AcervoTable.tsx
6. Criar src/components/features/acervo/AcervoPagination.tsx
7. Criar src/routes/_sistema/acervo/index.tsx
8. Adicionar item "Acervo" no AppSidebar.tsx com ícone Archive
9. Atualizar mocks: adicionar ao menos 3 portarias com status PUBLICADA de secretarias diferentes

Após cada item marque com ✅ ou ❌.