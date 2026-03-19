import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import JoditEditor from 'jodit-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// Switch import removed
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { modeloService } from '@/services/modelo.service'
import { variavelService } from '@/services/variavel.service'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChevronRight, ChevronLeft, Save, FileCode2, Settings2, Info, Users, FileSignature, Building2, Calculator, LayoutGrid, Plus, FileText, Sparkles, AlertCircle, AlertTriangle, CheckCircle2, Eye, EyeOff, Activity, PanelLeft, PanelLeftClose, Pencil, Clock, Zap, X, Trash2, RefreshCw } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { VariavelCard, type VariavelExtraida } from '@/components/features/modelos/VariavelCard'

export const Route = createFileRoute('/_sistema/admin/modelos/novo')({
  component: NovoModeloWizard,
})


function NovoModeloWizard() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Controle do Stepper
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Dados do Modelo (Passo 1 e 2)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState<'PORTARIA' | 'MEMORANDO' | 'OFICIO' | 'LEI'>('PORTARIA')
  const [categoria, setCategoria] = useState('RH')
  const [modoEntrada, setModoEntrada] = useState<'upload' | 'texto'>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [conteudoHtml, setConteudoHtml] = useState('')
  // Path do template DOCX salvo no Supabase Storage (salvo como docxTemplateUrl no modelo)
  const [docxTemplateStoragePath, setDocxTemplateStoragePath] = useState<string | null>(null)

  // Variáveis Analisadas (Passo 3)
  const [variaveis, setVariaveis] = useState<VariavelExtraida[]>([])
  const [sysTags, setSysTags] = useState<string[]>([])
  const [recomendacoes, setRecomendacoes] = useState<any[]>([])
  const [textoSelecionado, setTextoSelecionado] = useState('')

  // A2: hover bidirecional variável ↔ preview
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [tagHovered, setTagHovered] = useState<string | null>(null)

  // A3: modo simulação de preenchimento
  const [modoSimulacao, setModoSimulacao] = useState(false)
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({})

  // UX: toggle painel preview e modal de edição de texto
  const [previewVisivel, setPreviewVisivel] = useState(true)
  const [modalEditarTexto, setModalEditarTexto] = useState(false)
  const [modalAjuda, setModalAjuda] = useState(false)
  // Estado separado para o editor WYSIWYG (body limpo, sem <style>)
  const [editorHtml, setEditorHtml] = useState('')

  const handleSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setTextoSelecionado(selection.toString().trim())
    } else {
      setTextoSelecionado('')
    }
  }

  /**
   * Abre o editor WYSIWYG extraindo apenas o body do HTML.
   * Remove <style> e <script> para exibir texto limpo e legível.
   */
  const abrirEditorTexto = () => {
    let html = conteudoHtml
    // Extrai conteúdo do <body> se for um documento HTML completo
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    if (bodyMatch) html = bodyMatch[1]
    // Remove blocos <style> (deixa inline styles intactos)
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove blocos <script>
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    setEditorHtml(html.trim())
    setModalEditarTexto(true)
  }

  /**
   * Salva a edição do editor de volta ao conteudoHtml.
   * Preserva os blocos <style> originais (formatação do DOCX).
   */
  const salvarEdicaoTexto = () => {
    // Coleta os blocos <style> do HTML original para preservar formatação
    const styleBlocks = conteudoHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
    const prefixStyles = styleBlocks.join('\n')
    setConteudoHtml(prefixStyles ? prefixStyles + '\n' + editorHtml : editorHtml)
    setModalEditarTexto(false)
    toast({ title: 'Documento atualizado!', description: 'O conteúdo foi salvo. Verifique as variáveis no painel lateral.', className: 'bg-green-600 text-white' })
  }

  /**
   * Re-analisa as tags {{...}} do conteudoHtml atual sem ir ao Passo 2
   * e SEM chamar o CloudConvert (não consome tokens).
   */
  const reanalisarTags = async () => {
    if (!conteudoHtml) {
      toast({ title: 'Nenhum conteúdo para analisar', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const modoAnterior = modoEntrada
      setModoEntrada('texto') // garante modo texto (sem CloudConvert)
      const res = await modeloService.analisarModelo(conteudoHtml)
      setModoEntrada(modoAnterior)

      if (res.success) {
        const tagsExistentes = new Set(variaveis.map(v => v.tag))
        const novasVariaveis = (res.data?.variaveis || [])
          .map((v: any, idx: number): VariavelExtraida => ({
            tag: v.chave,
            label: v.label || v.chave.replace(/_/g, ' '),
            tipo: 'texto',
            obrigatorio: true,
            opcoes: [],
            ordem: variaveis.length + idx
          }))
          .filter((v: VariavelExtraida) => !tagsExistentes.has(v.tag))

        setVariaveis(prev => [...prev, ...novasVariaveis])
        setSysTags(res.data?.variaveisSistema || [])
        setRecomendacoes(res.data?.recomendacoes || [])
        toast({
          title: `Reanálise concluída`,
          description: novasVariaveis.length > 0
            ? `${novasVariaveis.length} nova(s) variável(eis) adicionada(s)`
            : 'Nenhuma tag nova encontrada. Lista já está atualizada.',
          className: 'bg-blue-600 text-white'
        })
      } else {
        toast({ title: 'Erro na reanálise', description: res.error, variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Falha na reanálise', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const criarVariavelDaSelecao = () => {
    if (!textoSelecionado) return

    // Gerar uma tag baseada no texto (maiúsculas, sem acentos, espaços como underline)
    let tagSugerida = textoSelecionado
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_') // Substitui não-alfanuméricos por _
      .replace(/_+/g, '_') // Remove múltiplos underlines
      .replace(/^_|_$/g, ''); // Remove underline no início ou fim

    if (!tagSugerida) tagSugerida = `VARIAVEL_${Date.now()}`

    // Garante tag única adicionando sufixo numérico se já existe
    let tagFinal = tagSugerida
    let contador = 1
    while (variaveis.some(v => v.tag === tagFinal)) {
      tagFinal = `${tagSugerida}_${contador++}`
    }
    tagSugerida = tagFinal

    // Substituir todas as ocorrências do texto selecionado no conteudoHtml por {{TAG}}
    const escapado = textoSelecionado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const novoConteudoHtml = conteudoHtml.replace(new RegExp(escapado, 'g'), `{{${tagSugerida}}}`)
    setConteudoHtml(novoConteudoHtml)

    // Adicionar a variável na lista
    const nova: VariavelExtraida = {
      tag: tagSugerida,
      label: textoSelecionado.length > 30 ? textoSelecionado.substring(0, 30) + '...' : textoSelecionado,
      tipo: 'texto',
      obrigatorio: true,
      opcoes: [],
      ordem: variaveis.length
    }
    setVariaveis([...variaveis, nova])

    // Limpar seleção
    window.getSelection()?.removeAllRanges()
    setTextoSelecionado('')
    toast({ title: 'Variável criada!', description: `A tag {{${tagSugerida}}} foi adicionada ao texto.`, className: 'bg-green-600 text-white' })
  }

  const avancarParaPasso2 = () => {
    if (!nome || !descricao) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setPasso(2)
  }

  const analisarERestaurarPasso3 = async () => {
    try {
      if (modoEntrada === 'texto' && !conteudoHtml) {
        toast({ title: 'O template HTML não pode estar vazio', variant: 'destructive' })
        return
      }
      if (modoEntrada === 'upload' && !arquivo) {
        toast({ title: 'Selecione um arquivo DOCX', variant: 'destructive' })
        return
      }

      setLoading(true)

      // Se é upload de DOCX, faz o upload do arquivo original para o Storage ANTES de analisar
      // Isso garante que o docxTemplateUrl seja salvo corretamente no modelo
      if (modoEntrada === 'upload' && arquivo) {
        const uploadRes = await modeloService.uploadTemplate(arquivo)
        if (uploadRes.success) {
          setDocxTemplateStoragePath(uploadRes.data)
        } else {
          toast({
            title: 'Aviso: upload do template falhou',
            description: `O modelo será salvo sem o arquivo DOCX original. Detalhes: ${uploadRes.error}`,
            variant: 'destructive'
          })
          // Não aborta — segue com a análise mesmo assim
        }
      }

      const res = await modeloService.analisarModelo(modoEntrada === 'upload' ? arquivo! : conteudoHtml)

      // Buscar variáveis globais para pré-preencher configurações
      const globaisRes = await variavelService.listarVariaveis()
      const varsGlobais = globaisRes.success ? globaisRes.data : []
      const dicionarioGlobal = new Map(varsGlobais?.map(v => [v.chave, v]) || [])

      if (res.success) {
        if (res.data?.conteudoHtml) {
          setConteudoHtml(res.data.conteudoHtml)
          // Após conversão DOCX→HTML, muda para modo texto para permitir edição
          setModoEntrada('texto')
        }

        const variaveisMapeadas = (res.data?.variaveis || []).map((v: any, idx: number): VariavelExtraida => {
          const tag = v.chave
          const globalConfig = dicionarioGlobal.get(tag)
          return {
            tag,
            label: globalConfig?.descricao || v.label || tag.replace(/_/g, ' '),
            tipo: (globalConfig as any)?.tipo || 'texto',
            obrigatorio: true,
            opcoes: [],
            ordem: idx
          }
        })

        setVariaveis(variaveisMapeadas)
        setSysTags(res.data?.variaveisSistema || [])
        setRecomendacoes(res.data?.recomendacoes || [])
        setPasso(3)
      } else {
        toast({ title: 'Erro ao analisar', description: res.error, variant: 'destructive' })
      }
    } catch (error: any) {
      console.error('[analisarERestaurarPasso3] Erro catastrófico:', error)
      toast({
        title: 'Falha crítica na análise',
        description: 'Verifique o formato do documento ou o editor.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const aplicarRecomendacao = (rec: any) => {
    // Substituir todas as ocorrências do texto original pela tag sugerida no HTML
    const tag = `{{${rec.sugestaoChave}}}`
    const escapado = String(rec.textoOriginal).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    setConteudoHtml(prev => prev.replace(new RegExp(escapado, 'g'), tag))

    // Adicionar variável extraída
    const nova: VariavelExtraida = {
      tag: rec.sugestaoChave,
      label: rec.textoOriginal,
      tipo: rec.tipo === 'cpf' ? 'cpf' : rec.tipo === 'data' ? 'data' : 'texto',
      obrigatorio: true,
      opcoes: [],
      ordem: variaveis.length
    }
    setVariaveis([...variaveis, nova])

    // Remover da lista de recomendações
    setRecomendacoes(prev => prev.filter(r => r.textoOriginal !== rec.textoOriginal))

    toast({
      title: 'Variável Sugerida Aplicada!',
      description: `O texto "${rec.textoOriginal}" foi substituído por ${tag}`,
      className: 'bg-indigo-600 text-white'
    })
  }

  const atualizarVariavel = (index: number, campo: keyof VariavelExtraida, valor: any) => {
    const novas = [...variaveis]
    const varAntiga = novas[index]

    // Se estivermos mudando o nome da TAG, devemos atualizar o HTML para não quebrar a sincronia
    if (campo === 'tag' && valor && valor !== varAntiga.tag) {
      const tagAntigaStr = `{{${varAntiga.tag}}}`
      const tagNovaStr = `{{${valor}}}`
      const escapado = tagAntigaStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      setConteudoHtml(prev => prev.replace(new RegExp(escapado, 'g'), tagNovaStr))
    }

    novas[index] = { ...varAntiga, [campo]: valor }
    setVariaveis(novas)
  }

  const adicionarVariavelManual = () => {
    const nova: VariavelExtraida = {
      tag: `NOVA_VAR_${Date.now()}`,
      label: 'Novo Campo',
      tipo: 'texto',
      obrigatorio: true,
      opcoes: [],
      ordem: variaveis.length,
      valorPadrao: '',
      grupo: '',
      regraCondicional: null
    }
    setVariaveis([...variaveis, nova])
  }

  const removerVariavel = (index: number) => {
    const varRemovida = variaveis[index]

    // Lixeira Inteligente: Remove as chaves do HTML e devolve o texto limpo
    if (varRemovida && varRemovida.tag) {
      const tagHTML = `{{${varRemovida.tag}}}`
      const textoLimpo = varRemovida.label && varRemovida.label !== varRemovida.tag
        ? varRemovida.label
        : varRemovida.tag // Fallback caso não tenha label amigável
      const escapado = tagHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      setConteudoHtml(prev => prev.replace(new RegExp(escapado, 'g'), textoLimpo))
    }

    setVariaveis(variaveis.filter((_, i) => i !== index))
  }

  // A1: sensores e handler de drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = variaveis.findIndex(v => v.tag === active.id)
    const newIndex = variaveis.findIndex(v => v.tag === over.id)
    const reordenadas = arrayMove(variaveis, oldIndex, newIndex).map((v, i) => ({ ...v, ordem: i }))
    setVariaveis(reordenadas)
  }

  const salvarModeloFinal = async () => {
    setLoading(true)
    try {
      const payload = {
        nome,
        descricao,
        tipoDocumento,
        categoria,
        conteudoHtml,
        ativo: true,
        // docxTemplateUrl: path no Supabase Storage — necessário para gerar portarias
        docxTemplateUrl: docxTemplateStoragePath ?? null,
        variaveis: variaveis.map(v => ({
          chave: v.tag,
          label: v.label,
          tipo: v.tipo,
          opcoes: v.opcoes,
          obrigatorio: v.obrigatorio,
          ordem: v.ordem,
          valorPadrao: v.valorPadrao ?? null,
          grupo: v.grupo ?? null,
          regraCondicional: v.regraCondicional ?? null,
        }))
      }
      const res = await modeloService.criarModelo(payload)
      if (res.success) {
        toast({ title: 'Modelo salvo com sucesso!', className: 'bg-green-600 text-white' })
        navigate({ to: '/admin/modelos' })
      } else {
        toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  // C1 + A4: derivar tags no HTML (excluindo SYS_*) e cruzar com variáveis definidas
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

  // C1: tags no HTML sem variável correspondente (erro crítico)
  const tagsSemVariavel = useMemo(() =>
    [...tagsNoHtml].filter(t => !chavesDefinidas.has(t)),
    [tagsNoHtml, chavesDefinidas]
  )

  // C1: variáveis definidas mas ausentes no HTML (aviso)
  const variaveisSemTag = useMemo(() =>
    variaveis.filter(v => !tagsNoHtml.has(v.tag)),
    [variaveis, tagsNoHtml]
  )

  // A4: contagem de cobertura
  const cobertura = useMemo(() => {
    const total = tagsNoHtml.size
    const mapeadas = [...tagsNoHtml].filter(t => chavesDefinidas.has(t)).length
    return { total, mapeadas }
  }, [tagsNoHtml, chavesDefinidas])

  // C3: salvar só é permitido se não há tags críticas sem variável
  const podeSalvar = tagsSemVariavel.length === 0

  // B3: lista de grupos únicos já usados (para autocomplete datalist)
  const gruposExistentes = useMemo(() =>
    [...new Set(variaveis.map(v => v.grupo).filter(Boolean) as string[])],
    [variaveis]
  )

  const previewHtml = useMemo(() => {
    if (!conteudoHtml) return '';
    let html = conteudoHtml;
    // Highlight SYS_* tags em roxo primeiro
    html = html.replace(/\{\{(SYS_[^}]+)\}\}/g, (_, tag) => {
      return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border mx-1 bg-purple-100 text-purple-700 border-purple-200" title="Variável de Sistema Autônoma">{{${tag}}}</span>`;
    });

    // Highlight all instances of {{TAG}}
    const regex = /\{\{([^}]+)\}\}/g;
    html = html.replace(regex, (match, tag) => {
      // Remover espaços que podem vir no match para a verificação
      const cleanTag = tag.trim();
      const exists = variaveis.some(v => v.tag === cleanTag);
      const colorClass = exists ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      // A2: data-tag para highlight bidirecional via DOM
      return `<span data-tag="${cleanTag}" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border mx-1 transition-all duration-150 cursor-pointer ${colorClass}" title="${exists ? 'Variável configurada' : 'Variável pendente'}">${match}</span>`;
    });
    return html;
  }, [conteudoHtml, variaveis]);

  // A3: HTML renderizado com valores do modo simulação
  const simulacaoHtml = useMemo(() => {
    if (!conteudoHtml) return ''
    let html = conteudoHtml
    variaveis.forEach(v => {
      const valor = previewValues[v.tag]
      const display = valor || `[${v.label}]`
      const cls = valor ? 'bg-green-100 text-green-800 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'
      html = html.split(`{{${v.tag}}}`).join(
        `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border mx-1 ${cls}">${display}</span>`
      )
    })
    // SYS_* ficam em roxo
    html = html.replace(/\{\{(SYS_[^}]+)\}\}/g, (_, tag) =>
      `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border mx-1 bg-purple-100 text-purple-700 border-purple-200">${tag}</span>`
    )
    return html
  }, [conteudoHtml, variaveis, previewValues])

  // A2: aplica/remove classe de destaque no DOM quando tagHovered muda (variável → preview)
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

  // A2: delegação de eventos no preview para hover preview → variável
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
  }, [previewHtml])

  return (
    <div className="w-full max-w-[1400px] mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Criar Novo Modelo</h2>
          <p className="text-slate-500">Configure um novo template via DOCX ou editor direto</p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center space-x-4 mb-8 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <StepIndicator num={1} ativo={passo === 1} concluido={passo > 1} label="Dados Básicos" icon={<Info size={16} />} />
        <div className="flex-1 h-px bg-slate-200" />
        <StepIndicator num={2} ativo={passo === 2} concluido={passo > 2} label="Documento" icon={<FileCode2 size={16} />} />
        <div className="flex-1 h-px bg-slate-200" />
        <StepIndicator num={3} ativo={passo === 3} concluido={passo > 3} label="Configuração" icon={<Settings2 size={16} />} />
      </div>

      {/* PASSO 1: Dados Básicos */}
      {passo === 1 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Informações do Documento</CardTitle>
            <CardDescription>Defina como este modelo será listado para os usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Oficial do Modelo <span className="text-red-500">*</span></Label>
              <Input id="nome" placeholder="Ex: Portaria de Nomeação" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição / Ementa <span className="text-red-500">*</span></Label>
              <Textarea id="descricao" placeholder="Ex: Utilizada para nomeação de cargos comissionados..." value={descricao} onChange={e => setDescricao(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipoDocumento">Tipo de Documento <span className="text-red-500">*</span></Label>
              <Select value={tipoDocumento} onValueChange={v => setTipoDocumento(v as any)}>
                <SelectTrigger id="tipoDocumento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PORTARIA">Portaria — PORT-001/2026</SelectItem>
                  <SelectItem value="MEMORANDO">Memorando — MEM-001/2026</SelectItem>
                  <SelectItem value="OFICIO">Ofício — OF-001/2026</SelectItem>
                  <SelectItem value="LEI">Lei — LEI-001/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label>Categoria do Documento</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'RH', label: 'Recursos Humanos', icon: Users },
                  { id: 'Licitacao', label: 'Licitação e Contratos', icon: FileSignature },
                  { id: 'Gabinete', label: 'Gabinete do Prefeito', icon: Building2 },
                  { id: 'Financeiro', label: 'Financeiro / Contábil', icon: Calculator },
                  { id: 'Outros', label: 'Outros', icon: LayoutGrid },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoria(cat.id)}
                    className={`flex flex-col items-start gap-3 p-4 text-left border rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1351B4] ${categoria === cat.id
                      ? 'border-[#1351B4] bg-[#F4F7FB] ring-1 ring-[#1351B4] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-[#1351B4]/50 hover:bg-slate-50 text-slate-600'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${categoria === cat.id ? 'bg-[#1351B4] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <cat.icon className="h-5 w-5" />
                    </div>
                    <span className={`font-semibold text-sm ${categoria === cat.id ? 'text-[#1351B4]' : 'text-slate-700'}`}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="ghost" type="button" onClick={() => navigate({ to: '/admin/modelos' })}>Cancelar</Button>
            <Button type="button" className="bg-[#1351B4] hover:bg-[#0f4496] text-white" onClick={avancarParaPasso2}>
              Próximo Passo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* PASSO 2: Documento */}
      {passo === 2 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Conteúdo do Template</CardTitle>
              <CardDescription>Escolha como deseja importar o texto do modelo.</CardDescription>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setModoEntrada('upload')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${modoEntrada === 'upload' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Upload DOCX
              </button>
              <button
                type="button"
                onClick={() => setModoEntrada('texto')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${modoEntrada === 'texto' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Texto Livre
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {modoEntrada === 'upload' ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center group hover:border-[#1351B4] hover:bg-blue-50/50 transition-all cursor-pointer relative overflow-hidden">
                <input
                  type="file"
                  accept=".docx"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-4 bg-blue-50 rounded-full text-[#1351B4] group-hover:bg-[#1351B4] group-hover:text-white transition-colors">
                    <FileCode2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">
                      {arquivo ? arquivo.name : "Arraste seu arquivo .docx ou clique aqui"}
                    </p>
                    <p className="text-sm text-slate-500">
                      O CloudConvert irá extrair automaticamente o texto e as tags {'{{VARIAVEL}}'}.
                    </p>
                  </div>
                  {arquivo && (
                    <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                      Arquivo Selecionado
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <Textarea
                placeholder="Aprova a contratação de {{NOME_SERVIDOR}} portador do CPF {{CPF_SERVIDOR}}..."
                className="min-h-[350px] font-mono text-sm bg-slate-50"
                value={conteudoHtml}
                onChange={e => setConteudoHtml(e.target.value)}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="outline" type="button" onClick={() => setPasso(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button type="button" disabled={loading} className="bg-[#1351B4] hover:bg-[#0f4496] text-white" onClick={analisarERestaurarPasso3}>
              {loading ? 'Processando...' : (modoEntrada === 'upload' ? 'Extrair Texto do Arquivo' : 'Analisar Texto e Tags')} <Settings2 className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* PASSO 3: Configuração */}
      {passo === 3 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mapeamento de Variáveis</CardTitle>
                <CardDescription>
                  Identificamos {variaveis.length} variáveis de preenchimento e {sysTags.length} de sistema no seu {modoEntrada === 'upload' ? 'documento' : 'texto'}.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {cobertura.total > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2 py-1 ${tagsSemVariavel.length > 0
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : cobertura.mapeadas === cobertura.total
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                      }`}
                  >
                    {tagsSemVariavel.length > 0
                      ? <AlertCircle size={12} className="mr-1 inline" />
                      : cobertura.mapeadas === cobertura.total
                        ? <CheckCircle2 size={12} className="mr-1 inline" />
                        : <AlertTriangle size={12} className="mr-1 inline" />
                    }
                    {cobertura.mapeadas}/{cobertura.total} tags mapeadas
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={() => setModalAjuda(true)} className="h-8 text-sky-600 hover:bg-sky-50 hover:text-sky-700 gap-1.5 font-semibold">
                  <Info size={14} /> Guia Rápido
                </Button>
                {/* Botão reanalisar tags do HTML atual (sem CloudConvert) */}
                <Button variant="outline" size="sm" disabled={loading} onClick={reanalisarTags} className="h-8 border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5" title="Re-detecta variáveis {{TAG}} no HTML atual. Não usa tokens do CloudConvert.">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Reanalisar
                </Button>
                {/* Botão editar texto do documento (abre editor WYSIWYG sem CSS bruto) */}
                <Button variant="outline" size="sm" onClick={abrirEditorTexto} className="h-8 border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5">
                  <Pencil size={13} /> Editar Texto
                </Button>
                {/* Botão toggle preview */}
                <Button variant="outline" size="sm" onClick={() => setPreviewVisivel(v => !v)} className="h-8 border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5">
                  {previewVisivel ? <><PanelLeftClose size={13} /> Ocultar Preview</> : <><PanelLeft size={13} /> Mostrar Preview</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sysTags.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-800 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="animate-pulse" />
                  <strong className="font-black uppercase text-[10px] tracking-wider">Tags de sistema detectadas:</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sysTags.map(tag => (
                    <Badge key={tag} variant="outline" className="bg-white/50 border-blue-200 text-blue-700 font-bold text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* C1: Alerta crítico — tags no HTML sem variável configurada */}
            {tagsSemVariavel.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 animate-in fade-in flex flex-col sm:flex-row gap-4 items-start shadow-sm">
                <div className="shrink-0 flex items-center justify-center bg-red-100 rounded-full h-8 w-8 text-red-600">
                  <AlertCircle size={18} />
                </div>
                <div className="flex-1 w-full relative">
                  <strong className="font-bold flex items-center gap-2 mb-1 text-red-900">Tags sem variável <Badge variant="destructive" className="h-5 px-1.5">{tagsSemVariavel.length}</Badge></strong>
                  <p className="text-xs text-red-700/80 mb-3 max-w-[90%]">
                    As seguintes tags impedem o salvamento pois ainda não estão cadastradas como variáveis. Clique nas tags para criá-las ou remova-as do texto.
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto w-full custom-scrollbar pr-2">
                    {tagsSemVariavel.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const nova = { tag, label: tag.replace(/_/g, ' '), tipo: 'texto' as const, obrigatorio: true, opcoes: [], ordem: variaveis.length }
                          setVariaveis(prev => [...prev, nova])
                        }}
                        className="flex items-center gap-1.5 bg-white border border-red-300 rounded-md px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white transition-colors hover:border-red-600 group shadow-sm"
                        title="Criar variável automaticamente"
                      >
                        <Plus size={12} className="text-red-400 group-hover:text-red-200" /> {`{{${tag}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* C1: Aviso não-crítico — variáveis definidas mas ausentes no HTML (Variáveis Orfãs) */}
            {variaveisSemTag.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 animate-in fade-in flex flex-col sm:flex-row gap-4 items-start shadow-sm">
                <div className="shrink-0 flex items-center justify-center bg-yellow-100 rounded-full h-8 w-8 text-yellow-600">
                  <AlertTriangle size={18} />
                </div>
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                    <strong className="font-bold flex items-center gap-2 text-yellow-900">
                      Variáveis orfãs
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100 h-5 px-1.5">{variaveisSemTag.length}</Badge>
                    </strong>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const tagsOrfas = new Set(variaveisSemTag.map(v => v.tag))
                        setVariaveis(prev => prev.filter(v => !tagsOrfas.has(v.tag)))
                        toast({ title: 'Orfãs removidas', description: `${variaveisSemTag.length} variável(eis) orfã(s) excluída(s).`, className: 'bg-amber-600 text-white' })
                      }}
                      className="h-6 text-[10px] text-yellow-700 hover:text-red-600 hover:bg-red-50 px-2 font-semibold"
                    >
                      <Trash2 size={11} className="mr-1" /> Remover todas
                    </Button>
                  </div>
                  <p className="text-xs text-yellow-700/80 mb-3 max-w-[90%]">
                    Essas variáveis existem nas configurações mas suas tags não constam mais no documento. Clique em <strong>× para remover</strong> individualmente ou use "Remover todas".
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto w-full custom-scrollbar pr-2">
                    {variaveisSemTag.map(v => (
                      <div key={v.tag} className="flex items-center gap-1 bg-white border border-yellow-300 rounded-md pl-2 pr-1 py-1 shadow-sm">
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
              </div>
            )}

            {recomendacoes.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-[0.1em] text-indigo-900">Sugestões Doc's AI</h4>
                      <p className="text-[10px] text-indigo-700/70 font-bold uppercase">Encontramos dados que podem ser transformados em variáveis automaticamente</p>
                    </div>
                  </div>
                  <Badge className="bg-indigo-600 text-white border-0">{recomendacoes.length} sugestões</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recomendacoes.map((rec, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white p-1.5 pl-3 rounded-lg border border-indigo-200 shadow-sm hover:border-indigo-400 transition-all group">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">{rec.tipo}</span>
                        <span className="text-xs font-bold text-slate-700">{rec.textoOriginal}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => aplicarRecomendacao(rec)}
                        className="h-7 w-7 p-0 rounded-full hover:bg-indigo-600 hover:text-white group-hover:scale-110 transition-all"
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`grid gap-6 items-start transition-all duration-300 ${previewVisivel ? 'grid-cols-1 lg:grid-cols-[1.5fr_1fr] xl:grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}>
              {/* Preview Panel */}
              {previewVisivel && <div className="flex flex-col border border-slate-200 rounded-lg bg-[#EFEFEF] overflow-hidden lg:sticky lg:top-8 h-[calc(100vh-140px)] min-h-[600px] shadow-sm">
                <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-[#1351B4]" /> Pré-visualização do Documento
                  </span>
                  {/* A3: botão de simulação */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setModoSimulacao(v => !v); setPreviewValues({}) }}
                    className={`h-7 text-xs gap-1.5 ${modoSimulacao ? 'bg-green-50 border-green-400 text-green-700 hover:bg-green-100' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {modoSimulacao ? <><EyeOff size={12} /> Fechar Simulação</> : <><Eye size={12} /> Simular preenchimento</>}
                  </Button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 h-full relative" onMouseUp={!modoSimulacao ? handleSelection : undefined}>
                  {/* A3: mini-form de simulação */}
                  {modoSimulacao && variaveis.length > 0 && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 animate-in slide-in-from-top-2">
                      <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                        <Eye size={12} /> Preencha os campos para simular o documento
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {variaveis.map(v => (
                          <div key={v.tag} className="flex items-center gap-2">
                            <Label className="text-xs text-slate-500 w-1/3 shrink-0 truncate" title={v.label}>{v.label}</Label>
                            <input
                              type="text"
                              placeholder={v.valorPadrao || `{{${v.tag}}}`}
                              value={previewValues[v.tag] ?? (v.valorPadrao || '')}
                              onChange={e => setPreviewValues(prev => ({ ...prev, [v.tag]: e.target.value }))}
                              className="flex-1 text-xs border border-green-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!modoSimulacao && textoSelecionado && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-top-2 fade-in">
                      <Button
                        size="sm"
                        onClick={criarVariavelDaSelecao}
                        className="bg-[#1351B4] hover:bg-[#0f4496] shadow-xl shadow-blue-900/10 rounded-full px-5 h-10 border border-white font-medium text-xs text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar: &quot;{textoSelecionado.length > 25 ? textoSelecionado.substring(0, 25) + '...' : textoSelecionado}&quot;
                      </Button>
                    </div>
                  )}

                  {(modoSimulacao ? simulacaoHtml : previewHtml) ? (
                    // A2: ref no container para event delegation de hover
                    <div className="w-full flex justify-center pb-8 pt-4">
                      <div
                        ref={previewContainerRef}
                        className="prose prose-sm w-full max-w-[21cm] text-slate-800 bg-white p-8 sm:p-12 border border-slate-200 shadow-sm min-h-max selection:bg-blue-200 selection:text-blue-900 transition-all [&_div]:max-w-full [&_table]:max-w-full [&_p]:max-w-full [&_span]:break-words overflow-x-hidden"
                        dangerouslySetInnerHTML={{ __html: modoSimulacao ? simulacaoHtml : previewHtml }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      Nenhuma pré-visualização disponível
                    </div>
                  )}
                </div>
              </div>}

              {/* Variables Panel */}
              <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden lg:h-[calc(100vh-140px)] min-h-[600px] shadow-sm">
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap items-center justify-between gap-y-2 z-10 flex-shrink-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Settings2 size={16} className="text-slate-500" /> Variáveis <Badge variant="secondary" className="bg-blue-100 text-[#1351B4] hover:bg-blue-100 px-1.5">{variaveis.length}</Badge>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={adicionarVariavelManual} className="h-7 px-2 border-[#1351B4] text-[#1351B4] hover:bg-blue-50 text-xs shadow-sm">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Manual
                  </Button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
                  {variaveis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-4 h-full">
                      <p>Nenhuma tag personalizada encontrada no texto.</p>
                      <Button variant="outline" onClick={adicionarVariavelManual} className="border-dashed border-2 border-slate-300 hover:border-[#1351B4] hover:bg-blue-50 text-slate-600 hover:text-[#1351B4]">
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Manualmente
                      </Button>
                    </div>
                  ) : (
                    // A1: DndContext envolve a lista para drag-and-drop
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

                  {variaveis.length > 0 && (
                    <div className="mt-8 p-4 bg-sky-50 border border-sky-100 rounded-lg shadow-sm">
                      <h4 className="flex items-center gap-2 text-xs font-bold text-sky-900 mb-2 uppercase tracking-wide">
                        <Sparkles size={14} className="text-sky-600" /> Variáveis de Sistema (Automáticas)
                      </h4>
                      <p className="text-xs text-sky-800/80 leading-relaxed mb-3">
                        Não crie variáveis manuais para esses dados — o sistema preenche automaticamente na hora certa. Basta escrever as tags no seu DOCX ou texto.
                      </p>

                      <div className="space-y-2 mb-2">
                        {/* SYS_NUMERO */}
                        <div className="flex items-start gap-2 bg-white rounded-lg border border-sky-100 p-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <code className="font-bold bg-sky-50 px-1.5 py-0.5 border border-sky-200 rounded text-[10px] text-sky-700 shrink-0">{'{{SYS_NUMERO}}'}</code>
                              <Badge className="bg-amber-100 text-amber-700 border-amber-300 border text-[9px] px-1.5 h-4 font-bold gap-1 hover:bg-amber-100"><Clock size={9} /> Na Publicação</Badge>
                            </div>
                            <span className="text-[11px] text-sky-800/80">Número sequencial oficial — ex: <strong>PORT-0001/2026</strong>. Gerado com lock atômico na publicação.</span>
                          </div>
                        </div>

                        {/* SYS_DATA */}
                        <div className="flex items-start gap-2 bg-white rounded-lg border border-sky-100 p-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <code className="font-bold bg-sky-50 px-1.5 py-0.5 border border-sky-200 rounded text-[10px] text-sky-700 shrink-0">{'{{SYS_DATA}}'}</code>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 border text-[9px] px-1.5 h-4 font-bold gap-1 hover:bg-blue-100"><Zap size={9} /> Na Submissão</Badge>
                            </div>
                            <span className="text-[11px] text-sky-800/80">Data atual no formato <strong>{new Date().toLocaleDateString('pt-BR')}</strong>. Registrada quando o documento é submetido para revisão.</span>
                          </div>
                        </div>

                        {/* SYS_DATA_EXTENSO */}
                        <div className="flex items-start gap-2 bg-white rounded-lg border border-sky-100 p-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <code className="font-bold bg-sky-50 px-1.5 py-0.5 border border-sky-200 rounded text-[10px] text-sky-700 shrink-0">{'{{SYS_DATA_EXTENSO}}'}</code>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 border text-[9px] px-1.5 h-4 font-bold gap-1 hover:bg-blue-100"><Zap size={9} /> Na Submissão</Badge>
                            </div>
                            <span className="text-[11px] text-sky-800/80">Data por extenso — ex: <strong>1º de março de 2026</strong>. Ideal para o corpo textual da portaria.</span>
                          </div>
                        </div>

                        {/* SYS_PREFEITO */}
                        <div className="flex items-start gap-2 bg-white rounded-lg border border-sky-100 p-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <code className="font-bold bg-sky-50 px-1.5 py-0.5 border border-sky-200 rounded text-[10px] text-sky-700 shrink-0">{'{{SYS_PREFEITO}}'}</code>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 border text-[9px] px-1.5 h-4 font-bold gap-1 hover:bg-blue-100"><Zap size={9} /> Na Submissão</Badge>
                            </div>
                            <span className="text-[11px] text-sky-800/80">Nome do Prefeito conforme cadastrado em <strong>Admin → Gestão Municipal</strong>. Atualizado automaticamente a cada gestão.</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-sky-700/70 border-t border-sky-200/50 pt-3 mt-3 font-medium">
                        Dica: Escreva essas tags direto no DOCX antes do upload ou use o botão <strong>"Editar Texto"</strong> acima. Se criá-las acidentalmente na lista acima, <b>delete-as</b>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
            <div className="flex flex-col items-start gap-0.5">
              <Button variant="outline" type="button" disabled={loading} onClick={() => setPasso(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Ir para Passo 2
              </Button>
              <span className="text-[10px] text-slate-400 pl-1">Editar documento · sem recálculo CloudConvert</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {/* C3: Feedback de erro crítico próximo ao botão */}
              {tagsSemVariavel.length > 0 && !loading && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle size={12} /> Resolva as {tagsSemVariavel.length} tag(s) sem variável para salvar
                </p>
              )}
              <Button
                type="button"
                disabled={loading || !podeSalvar}
                className={`text-white ${podeSalvar ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-400 cursor-not-allowed'}`}
                onClick={salvarModeloFinal}
                title={!podeSalvar ? `Existem ${tagsSemVariavel.length} tag(s) no documento sem variável configurada` : undefined}
              >
                {loading ? 'Salvando...' : 'Finalizar e Salvar Modelo'} <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {/* Modal de edição direta do texto do documento — editor WYSIWYG (sem CSS bruto) */}
      <Dialog open={modalEditarTexto} onOpenChange={(open) => { if (!open) setModalEditarTexto(false) }}>
        <DialogContent className="max-w-5xl flex flex-col" style={{ height: '88vh' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil size={16} /> Editar Conteúdo do Documento</DialogTitle>
            <DialogDescription>
              Editor visual — o que você vê é o que sai no PDF. Use <code className="bg-slate-100 px-1 rounded text-xs font-mono">{'{{NOME_VARIAVEL}}'}</code> para campos de preenchimento e <code className="bg-slate-100 px-1 rounded text-xs font-mono">{'{{SYS_PREFEITO}}'}</code> para dados automáticos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-md">
            <JoditEditor
              value={editorHtml}
              config={{
                readonly: false,
                language: 'pt_br',
                height: '100%',
                minHeight: 500,
                placeholder: 'Escreva ou cole o conteúdo da portaria aqui...',
                toolbarButtonSize: 'small',
                // Botões simplificados para focar na edição de texto
                buttons: [
                  'bold', 'italic', 'underline', 'strikethrough', '|',
                  'ul', 'ol', '|',
                  'align', '|',
                  'fontsize', 'font', '|',
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
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setModalEditarTexto(false)}>Cancelar</Button>
            <Button className="bg-[#1351B4] hover:bg-[#0f4496] text-white" onClick={salvarEdicaoTexto}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Edição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Guia Rápido */}
      <Dialog open={modalAjuda} onOpenChange={setModalAjuda}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="text-amber-500" size={18} /> Guia Rápido: Criador de Modelos</DialogTitle>
            <DialogDescription>
              Aprenda a mapear e automatizar seus documentos de forma inteligente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText size={16} className="text-blue-600" /> 1. Uso de Tags</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>O sistema lê qualquer palavra escrita entre duas chaves duplas como um campo a ser preenchido.</p>
                <div className="bg-white p-2 text-center rounded border border-slate-200 font-mono text-blue-700">
                  {'{{NOME_SERVIDOR}}'}
                </div>
                <p>Não use espaços ou caracteres especiais dentro das chaves.</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Zap size={16} className="text-amber-600" /> 2. Automações Globais</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>Tags iniciadas com <code className="bg-slate-200 px-1 rounded">SYS_</code> puxam informações sozinhas, sem criar campos no formulário final.</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><b>SYS_NUMERO:</b> Numeração de portaria sequencial.</li>
                  <li><b>SYS_DATA:</b> Data atual da publicação.</li>
                  <li><b>SYS_PREFEITO:</b> Nome da autoridade máxima em exercício.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Pencil size={16} className="text-green-600" /> 3. Edição Inteligente</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <p>Errou algo? Clique em <b>Editar Texto</b> para abrir o editor e corrigir o MS Word na hora.</p>
                <p>Se você apagar um cartão da lateral ou renomear a tag dele, o sistema fará a correção do texto no documento automaticamente para você!</p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button onClick={() => setModalAjuda(false)}>Entendi!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


function StepIndicator({ num, ativo, concluido, label, icon }: { num: number, ativo: boolean, concluido: boolean, label: string, icon: ReactNode }) {
  let stateClass = "text-slate-400"
  let bgClass = "bg-slate-100"

  if (ativo) {
    stateClass = "text-[#1351B4] font-bold"
    bgClass = "bg-blue-100 border-[#1351B4] text-[#1351B4]"
  } else if (concluido) {
    stateClass = "text-green-600"
    bgClass = "bg-green-100 text-green-700 border-green-500"
  }

  return (
    <div className={`flex items-center space-x-2 ${stateClass}`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${bgClass}`}>
        {num}
      </div>
      <span className="hidden sm:inline text-sm flex items-center gap-1.5">{icon} {label}</span>
    </div>
  )
}
