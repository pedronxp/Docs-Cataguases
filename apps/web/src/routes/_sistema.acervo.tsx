import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Filter } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'
import { buscarAcervo, contarPorSecretaria } from '@/services/acervo.service'
import { listarSecretarias } from '@/services/secretaria.service'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { PastaSecretaria } from '@/components/features/acervo/PastaSecretaria'
import { AcervoTable } from '@/components/features/acervo/AcervoTable'
import { AcervoPagination } from '@/components/features/acervo/AcervoPagination'
import type { Portaria, Secretaria } from '@/types/domain'

export const Route = createFileRoute('/_sistema/acervo')({
  component: AcervoPage,
})

function AcervoPage() {
  const ability = useAbility(AbilityContext)
  const { usuario } = useAuthStore()

  // ABAC
  const podeVerTodasSecretarias = ability.can('gerenciar', 'all') || ability.can('visualizar' as any, 'PortariaGlobal')
  const [secretariaAtivaId, setSecretariaAtivaId] = useState<string>(podeVerTodasSecretarias ? '' : (usuario?.secretariaId ?? ''))

  // Data Loading
  const [portarias, setPortarias] = useState<Portaria[]>([])
  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [contadores, setContadores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Params
  const [busca, setBusca] = useState('')
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()))
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Setup inicial para pastas (só se tiver permissão global)
  useEffect(() => {
    if (!podeVerTodasSecretarias) return
    async function loadFolders() {
      const [resSecs, resCont] = await Promise.all([listarSecretarias(), contarPorSecretaria()])
      if (resSecs.success) setSecretarias(resSecs.data)
      if (resCont.success) setContadores(resCont.data)
    }
    loadFolders()
  }, [podeVerTodasSecretarias])

  // Busca de Portarias
  const fetchAcervo = useCallback(async () => {
    setLoading(true)
    const anoParam = ano !== 'todos' ? Number(ano) : undefined
    const secParam = podeVerTodasSecretarias ? (secretariaAtivaId || undefined) : usuario?.secretariaId!

    const result = await buscarAcervo({
      secretariaId: secParam,
      busca: busca.trim(),
      ano: anoParam,
      page,
      pageSize: 15,
      statusFiltro: ['PUBLICADA', 'ASSINADO'], // Considerando ASSINADO também para dar mais massa de dados no mock
    })

    if (result.success) {
      setPortarias(result.data.data)
      setTotalPages(result.data.totalPages)
    }
    setLoading(false)
  }, [busca, ano, page, secretariaAtivaId, podeVerTodasSecretarias, usuario])

  useEffect(() => {
    const timer = setTimeout(() => { fetchAcervo() }, 300)
    return () => clearTimeout(timer)
  }, [fetchAcervo])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Acervo Documental</h2>
          <p className="text-sm text-slate-500">Consulta pública e histórico de portarias publicadas.</p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto text-[#1351B4] border-[#1351B4]/20 bg-blue-50 hover:bg-blue-100">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Painel de Pastas */}
        {podeVerTodasSecretarias && (
          <aside className="w-64 shrink-0 flex flex-col gap-2 overflow-y-auto pr-2 pb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
              Secretarias e Órgãos
            </p>

            <PastaSecretaria
              secretaria={{ id: '', sigla: 'Todas as Secretarias', nome: 'Todas', cor: '' }}
              ativa={secretariaAtivaId === ''}
              totalDocs={Object.values(contadores).reduce((a, b) => a + b, 0)}
              onClick={() => { setSecretariaAtivaId(''); setPage(1) }}
            />

            {secretarias.map((sec) => (
              <PastaSecretaria
                key={sec.id}
                secretaria={sec}
                ativa={secretariaAtivaId === sec.id}
                totalDocs={contadores[sec.id] ?? 0}
                onClick={() => { setSecretariaAtivaId(sec.id); setPage(1) }}
              />
            ))}
          </aside>
        )}

        {/* Área Principal */}
        <Card className="flex-1 flex flex-col shadow-sm border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por título, número, servidor..."
                className="pl-10 bg-slate-50/50 border-slate-200 focus-visible:ring-[#1351B4]"
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={ano} onValueChange={(v) => { setAno(v); setPage(1) }}>
                <SelectTrigger className="w-[130px] bg-slate-50/50 font-medium text-slate-700">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Anos</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="border-slate-300 text-slate-600 bg-white">
                <Filter className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Mais Filtros</span>
              </Button>
            </div>
          </div>

          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="p-4 h-full flex flex-col">
              {loading ? (
                <DataTableSkeleton rows={6} columns={4} />
              ) : (
                <>
                  <AcervoTable portarias={portarias} mostrarSecretaria={podeVerTodasSecretarias && secretariaAtivaId === ''} />
                  <div className="mt-auto">
                    <AcervoPagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
