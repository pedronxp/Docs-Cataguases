import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect } from 'react'
import JoditEditor from 'jodit-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { modeloService } from '@/services/modelo.service'
import { ChevronLeft, Save, Settings2, FileText, Plus, AlertCircle, AlertTriangle, GitBranch, Pencil, Eye, X, Trash2 } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { VariavelCard, type VariavelExtraida } from '@/components/features/modelos/VariavelCard'
import type { ModeloDocumento } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/modelos/$id')({
  component: EditarModeloPage,
})

function EditarModeloPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [modelo, setModelo] = useState<ModeloDocumento | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [conteudoHtml, setConteudoHtml] = useState('')
  // Estado separado para o editor WYSIWYG (body limpo, sem <style>)
  const [editorHtml, setEditorHtml] = useState('')
  const [variaveis, setVariaveis] = useState<VariavelExtraida[]>([])
  const [tagHovered, setTagHovered] = useState<string | null>(null)
  const [modoEdicaoHtml, setModoEdicaoHtml] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  // Carrega o modelo ao montar
  useEffect(() => {
    loadModelo()
  }, [id])

  async function loadModelo() {
    setLoading(true)
    const res = await modeloService.buscarModelo(id)
    if (res.success) {
      const m = res.data
      setModelo(m)
      setNome(m.nome)
      setDescricao(m.descricao)
      setConteudoHtml((m as any).conteudoHtml || '')
      setVariaveis(
        m.variaveis.map(v => ({
          tag: v.chave,
          label: v.label,
          tipo: v.tipo as VariavelExtraida['tipo'],
          obrigatorio: v.obrigatorio,
          opcoes: v.opcoes,
          ordem: v.ordem,
          valorPadrao: v.valorPadrao || undefined,
          grupo: v.grupo || undefined,
          regraCondicional: v.regraCondicional || null,
        }))
      )
    } else {
      toast({ title: 'Erro ao carregar modelo', description: res.error, variant: 'destructive' })
      navigate({ to: '/admin/modelos' })
    }
    setLoading(false)
  }

  // A2: hover preview ↔ variável
  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return
    container.querySelectorAll<HTMLElement>('[data-tag]').forEach(el => {
      el.style.outline = ''
      el.style.transform = ''
      el.style.boxShadow = ''
    })
    if (tagHovered) {
      container.querySelectorAll<HTMLElement>(`[data-tag="${tagHovered}"]`).forEach(el => {
        el.style.outline = '2px solid #1351B4'
        el.style.transform = 'scale(1.08)'
        el.style.boxShadow = '0 2px 8px rgba(19,81,180,0.25)'
      })
    }
  }, [tagHovered])

  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return
    const handleOver = (e: MouseEvent) => {
      const target = (e.target as Element).closest('[data-tag]')
      if (target) setTagHovered(target.getAttribute('data-tag'))
    }
    const handleOut = (e: MouseEvent) => {
      const target = (e.target as Element).closest('[data-tag]')
      if (target) setTagHovered(null)
    }
    container.addEventListener('mouseover', handleOver)
    container.addEventListener('mouseout', handleOut)
    return () => {
      container.removeEventListener('mouseover', handleOver)
      container.removeEventListener('mouseout', handleOut)
    }
  }, [conteudoHtml])

  // Preview com highlight das tags
  const previewHtml = useMemo(() => {
    if (!conteudoHtml) return ''
    return conteudoHtml.replace(/\{\{([^}]+)\}\}/g, (match, tag) => {
      const cleanTag = tag.trim()
      const exists = variaveis.some(v => v.tag === cleanTag)
      const colorClass = exists
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
      return `<span data-tag="${cleanTag}" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border mx-1 transition-all duration-150 cursor-pointer ${colorClass}" title="${exists ? 'Variável configurada' : 'Variável pendente'}">${match}</span>`
    })
  }, [conteudoHtml, variaveis])

  // Derivados de cobertura
  const tagsNoHtml = useMemo(() => {
    const regex = /\{\{([A-Z0-9_a-z]+)\}\}/g
    const tags = new Set<string>()
    let match
    while ((match = regex.exec(conteudoHtml)) !== null) {
      const tag = match[1].trim()
      if (!tag.startsWith('SYS_')) tags.add(tag)
    }
    return tags
  }, [conteudoHtml])

  const chavesDefinidas = useMemo(() => new Set(variaveis.map(v => v.tag)), [variaveis])
  const tagsSemVariavel = useMemo(() => [...tagsNoHtml].filter(t => !chavesDefinidas.has(t)), [tagsNoHtml, chavesDefinidas])
  const variaveisSemTag = useMemo(() => variaveis.filter(v => !tagsNoHtml.has(v.tag)), [variaveis, tagsNoHtml])
  const cobertura = useMemo(() => ({
    total: tagsNoHtml.size,
    mapeadas: [...tagsNoHtml].filter(t => chavesDefinidas.has(t)).length
  }), [tagsNoHtml, chavesDefinidas])
  const podeSalvar = tagsSemVariavel.length === 0

  const gruposExistentes = useMemo(
    () => [...new Set(variaveis.map(v => v.grupo).filter(Boolean) as string[])],
    [variaveis]
  )

  /** Abre o editor WYSIWYG extraindo apenas o body (sem <style> bruto do DOCX) */
  function entrarModoEdicao() {
    let html = conteudoHtml
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) html = bodyMatch[1]
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    setEditorHtml(html.trim())
    setModoEdicaoHtml(true)
  }

  /** Salva o conteúdo do editor preservando os <style> originais */
  function salvarEdicaoHtml() {
    const styleBlocks = conteudoHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
    const prefixStyles = styleBlocks.join('\n')
    setConteudoHtml(prefixStyles ? prefixStyles + '\n' + editorHtml : editorHtml)
    setModoEdicaoHtml(false)
    toast({ title: 'Conteúdo atualizado!', description: 'Verifique as variáveis no painel ao lado.', className: 'bg-green-600 text-white' })
  }

  function atualizarVariavel(index: number, campo: keyof VariavelExtraida, valor: any) {
    const novas = [...variaveis]
    const varAntiga = novas[index]
    // Sincroniza renomeação de tag no HTML para não criar orfãs
    if (campo === 'tag' && valor && valor !== varAntiga.tag) {
      const tagAntigaStr = `{{${varAntiga.tag}}}`
      const tagNovaStr = `{{${valor}}}`
      const escapado = tagAntigaStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      setConteudoHtml(prev => prev.replace(new RegExp(escapado, 'g'), tagNovaStr))
    }
    novas[index] = { ...novas[index], [campo]: valor }
    setVariaveis(novas)
  }

  function removerVariavel(index: number) {
    const varRemovida = variaveis[index]
    // Lixeira Inteligente: substitui {{TAG}} pelo label original no HTML
    if (varRemovida?.tag) {
      const tagHTML = `{{${varRemovida.tag}}}`
      const textoLimpo = varRemovida.label && varRemovida.label !== varRemovida.tag
        ? varRemovida.label
        : varRemovida.tag
      const escapado = tagHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      setConteudoHtml(prev => prev.replace(new RegExp(escapado, 'g'), textoLimpo))
    }
    setVariaveis(variaveis.filter((_, i) => i !== index))
  }

  function adicionarVariavelManual() {
    const nova: VariavelExtraida = {
      tag: `NOVA_VAR_${Date.now()}`,
      label: 'Novo Campo',
      tipo: 'texto',
      obrigatorio: true,
      opcoes: [],
      ordem: variaveis.length,
      valorPadrao: '',
      grupo: '',
      regraCondicional: null,
    }
    setVariaveis([...variaveis, nova])
  }

  // A1: DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = variaveis.findIndex(v => v.tag === active.id)
    const newIndex = variaveis.findIndex(v => v.tag === over.id)
    const reordenadas = arrayMove(variaveis, oldIndex, newIndex).map((v, i) => ({ ...v, ordem: i }))
    setVariaveis(reordenadas)
  }

  async function salvar() {
    if (!podeSalvar) return
    setSaving(true)
    const res = await modeloService.atualizarModelo(id, { nome, descricao, conteudoHtml, variaveis })
    setSaving(false)

    if (res.success) {
      const { novaVersao, modelo: novoModelo } = res.data
      if (novaVersao) {
        toast({
          title: `Nova versão v${(novoModelo.versao ?? 2)} criada`,
          description: 'O modelo anterior foi arquivado. Portarias existentes continuam vinculadas à versão antiga.',
          className: 'bg-amber-600 text-white',
        })
        navigate({ to: '/admin/modelos/$id', params: { id: novoModelo.id } })
      } else {
        toast({ title: 'Modelo atualizado com sucesso!', className: 'bg-green-600 text-white' })
      }
    } else {
      toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Carregando modelo...
      </div>
    )
  }

  if (!modelo) return null

  return (
    <div className="w-full max-w-[1400px] mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/admin/modelos' })}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">Editar Modelo</h2>
              {(modelo.versao ?? 1) > 1 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 font-mono text-xs">
                  v{modelo.versao}
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm">Alterações em modelos com portarias vinculadas criam uma nova versão automaticamente.</p>
          </div>
        </div>
      </div>

      {/* Dados básicos */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Informações do Modelo</CardTitle>
          <CardDescription>Nome e descrição exibidos na listagem.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome <span className="text-red-500">*</span></Label>
            <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição / Ementa <span className="text-red-500">*</span></Label>
            <Textarea id="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Preview + Variáveis */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 size={16} className="text-slate-500" />
              Variáveis
              {cobertura.total > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-2 text-xs ${cobertura.mapeadas === cobertura.total ? 'bg-green-100 text-green-700' : cobertura.mapeadas > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}
                >
                  {cobertura.mapeadas}/{cobertura.total} mapeadas
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={adicionarVariavelManual} className="border-dashed border-2 border-slate-300 hover:border-[#1351B4] hover:text-[#1351B4]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alertas C1 */}
          {tagsSemVariavel.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="shrink-0 text-red-600" />
                <strong>Tags sem variável ({tagsSemVariavel.length})</strong>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tagsSemVariavel.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const nova: VariavelExtraida = { tag, label: tag.replace(/_/g, ' '), tipo: 'texto', obrigatorio: true, opcoes: [], ordem: variaveis.length }
                      setVariaveis(prev => [...prev, nova])
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded text-xs font-mono font-bold text-red-700 hover:bg-red-200 transition-colors"
                    title="Clique para criar variável"
                  >
                    <Plus size={10} /> {`{{${tag}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {variaveisSemTag.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-yellow-600" />
                  <strong>Variáveis orfãs — tag não encontrada no documento ({variaveisSemTag.length})</strong>
                </div>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => {
                    const tagsOrfas = new Set(variaveisSemTag.map(v => v.tag))
                    setVariaveis(prev => prev.filter(v => !tagsOrfas.has(v.tag)))
                    toast({ title: 'Orfãs removidas', className: 'bg-amber-600 text-white' })
                  }}
                  className="h-6 text-[10px] text-yellow-700 hover:text-red-600 hover:bg-red-50 px-2 font-semibold"
                >
                  <Trash2 size={11} className="mr-1" /> Remover todas
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variaveisSemTag.map(v => (
                  <div key={v.tag} className="flex items-center gap-1 bg-white border border-yellow-300 rounded-md pl-2 pr-1 py-0.5 shadow-sm">
                    <span className="font-mono font-bold text-xs text-yellow-800">{`{{${v.tag}}}`}</span>
                    <button
                      type="button"
                      title="Remover variável orfã"
                      onClick={() => removerVariavel(variaveis.findIndex(va => va.tag === v.tag))}
                      className="text-yellow-500 hover:text-red-600 hover:bg-red-50 rounded p-0.5 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout: preview/editor (esquerda) + variáveis (direita) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
            {/* Preview / Editor de HTML */}
            <div className="flex flex-col border border-slate-200 rounded-lg bg-slate-50 overflow-hidden h-[500px]">
              <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#1351B4]" />
                  <span className="text-sm font-bold text-slate-700">
                    {modoEdicaoHtml ? 'Editor de Conteúdo' : 'Pré-visualização'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => modoEdicaoHtml ? salvarEdicaoHtml() : entrarModoEdicao()}
                  className={`h-7 text-xs gap-1.5 ${modoEdicaoHtml ? 'bg-green-50 border-green-500 text-green-700 hover:bg-green-100' : 'border-slate-200 text-slate-600'}`}
                >
                  {modoEdicaoHtml ? <><Eye size={12} /> Ver Preview & Salvar</> : <><Pencil size={12} /> Editar Texto</>}
                </Button>
              </div>
              <div className="overflow-y-auto flex-1">
                {modoEdicaoHtml ? (
                  <JoditEditor
                    value={editorHtml}
                    config={{
                      readonly: false,
                      language: 'pt_br',
                      minHeight: 420,
                      placeholder: 'Digite ou cole o conteúdo da portaria. Use {{TAG}} para variáveis.',
                      toolbarButtonSize: 'small',
                      buttons: [
                        'bold', 'italic', 'underline', 'strikethrough', '|',
                        'ul', 'ol', '|',
                        'align', '|',
                        'fontsize', '|',
                        'table', '|',
                        'undo', 'redo', '|',
                        'eraser'
                      ],
                      showXPathInStatusbar: false,
                      showCharsCounter: false,
                      showWordsCounter: false,
                    }}
                    onBlur={newContent => setEditorHtml(newContent)}
                    onChange={() => {}}
                  />
                ) : previewHtml ? (
                  <div
                    ref={previewContainerRef}
                    className="prose prose-sm max-w-none text-slate-800 bg-white p-6 border border-slate-200 rounded shadow-sm min-h-full"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                    <p className="text-sm">Sem conteúdo HTML disponível</p>
                    <Button variant="outline" size="sm" onClick={() => setModoEdicaoHtml(true)} className="text-xs gap-1.5 border-dashed border-slate-300">
                      <Pencil size={12} /> Adicionar conteúdo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de variáveis */}
            <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden h-[500px]">
              <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Configuração das Variáveis</span>
                <Badge variant="secondary" className="bg-blue-100 text-[#1351B4]">{variaveis.length}</Badge>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
                {variaveis.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-3 h-full">
                    <p className="text-sm">Nenhuma variável configurada.</p>
                    <Button variant="outline" onClick={adicionarVariavelManual} className="border-dashed border-2 border-slate-300 hover:border-[#1351B4] hover:text-[#1351B4]">
                      <Plus className="mr-2 h-4 w-4" /> Adicionar Manualmente
                    </Button>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={variaveis.map(v => v.tag)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {variaveis.map((v, idx) => (
                          <VariavelCard
                            key={v.tag}
                            id={v.tag}
                            v={v}
                            idx={idx}
                            tagHovered={tagHovered}
                            setTagHovered={setTagHovered}
                            atualizarVariavel={atualizarVariavel}
                            removerVariavel={removerVariavel}
                            gruposExistentes={gruposExistentes}
                            todasAsTags={variaveis.filter(o => o.tag !== v.tag).map(o => ({ tag: o.tag, label: o.label }))}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
          <Button variant="outline" onClick={() => navigate({ to: '/admin/modelos' })}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div className="flex flex-col items-end gap-1">
            {tagsSemVariavel.length > 0 && !saving && (
              <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} /> Resolva as {tagsSemVariavel.length} tag(s) sem variável para salvar
              </p>
            )}
            <Button
              type="button"
              disabled={saving || !podeSalvar || !nome || !descricao}
              className={`text-white ${podeSalvar && nome && descricao ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400 cursor-not-allowed'}`}
              onClick={salvar}
            >
              {saving ? 'Salvando...' : (
                <>
                  <GitBranch className="mr-2 h-4 w-4" />
                  Salvar Alterações
                  <Save className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
