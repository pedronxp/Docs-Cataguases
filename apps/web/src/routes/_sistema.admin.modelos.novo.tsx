import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { modeloService } from '@/services/modelo.service'
import { variavelService } from '@/services/variavel.service'
import { ChevronRight, ChevronLeft, Save, FileCode2, Settings2, Info, Users, FileSignature, Building2, Calculator, LayoutGrid, Plus, Trash2, FileText, Activity, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/_sistema/admin/modelos/novo')({
  component: NovoModeloWizard,
})

type VariavelExtraida = {
  tag: string
  label: string
  tipo: 'texto' | 'numero' | 'data' | 'moeda' | 'cpf' | 'select' | 'assinatura' | 'data_extenso'
  obrigatorio: boolean
  opcoes: string[]
  ordem: number
}

function NovoModeloWizard() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Controle do Stepper
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Dados do Modelo (Passo 1 e 2)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('RH')
  const [modoEntrada, setModoEntrada] = useState<'upload' | 'texto'>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [conteudoHtml, setConteudoHtml] = useState('')

  // Variáveis Analisadas (Passo 3)
  const [variaveis, setVariaveis] = useState<VariavelExtraida[]>([])
  const [sysTags, setSysTags] = useState<string[]>([])
  const [recomendacoes, setRecomendacoes] = useState<any[]>([])
  const [textoSelecionado, setTextoSelecionado] = useState('')

  const handleSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setTextoSelecionado(selection.toString().trim())
    } else {
      setTextoSelecionado('')
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

    if (!tagSugerida) tagSugerida = `VARIAVEL_${variaveis.length + 1}`

    // Substituir primeira ocorrência do texto selecionado no conteudoHtml por {{TAG}}
    // Usar split e join para substituir apenas a primeira ocorrência ou fazer um replace simples
    const novoConteudoHtml = conteudoHtml.replace(textoSelecionado, `{{${tagSugerida}}}`)
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
      const res = await modeloService.analisarModelo(modoEntrada === 'upload' ? arquivo! : conteudoHtml)

      // Buscar variáveis globais para pré-preencher configurações
      const globaisRes = await variavelService.listarVariaveis()
      const varsGlobais = globaisRes.success ? globaisRes.data : []
      const dicionarioGlobal = new Map(varsGlobais?.map(v => [v.chave, v]) || [])

      if (res.success) {
        if (res.data?.conteudoHtml) {
          setConteudoHtml(res.data.conteudoHtml)
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
    // Substituir primeira ocorrência do texto original pela tag sugerida no HTML
    const tag = `{{${rec.sugestaoChave}}}`
    setConteudoHtml(prev => prev.replace(rec.textoOriginal, tag))

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
    novas[index] = { ...novas[index], [campo]: valor }
    setVariaveis(novas)
  }

  const adicionarVariavelManual = () => {
    const nova: VariavelExtraida = {
      tag: `NOVA_VARIAVEL_${variaveis.length + 1}`,
      label: 'Novo Campo',
      tipo: 'texto',
      obrigatorio: true,
      opcoes: [],
      ordem: variaveis.length
    }
    setVariaveis([...variaveis, nova])
  }

  const removerVariavel = (index: number) => {
    setVariaveis(variaveis.filter((_, i) => i !== index))
  }

  const salvarModeloFinal = async () => {
    setLoading(true)
    const payload = {
      nome,
      descricao,
      categoria,
      conteudoHtml,
      ativo: true,
      variaveis
    }
    const res = await modeloService.criarModelo(payload)
    setLoading(false)

    if (res.success) {
      toast({ title: 'Modelo salvo com sucesso!', className: 'bg-green-600 text-white' })
      navigate({ to: '/admin/modelos' })
    } else {
      toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
    }
  }

  const previewHtml = useMemo(() => {
    if (!conteudoHtml) return '';
    let html = conteudoHtml;
    // Highlight all instances of {{TAG}}
    const regex = /\{\{([^}]+)\}\}/g;
    html = html.replace(regex, (match, tag) => {
      // Remover espaços que podem vir no match para a verificação
      const cleanTag = tag.trim();
      const exists = variaveis.some(v => v.tag === cleanTag);
      const colorClass = exists ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border mx-1 ${colorClass}" title="${exists ? 'Variável configurada' : 'Variável pendente'}">${match}</span>`;
    });
    return html;
  }, [conteudoHtml, variaveis]);

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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={adicionarVariavelManual} className="h-8 border-[#1351B4] text-[#1351B4] hover:bg-blue-50">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Variável
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPasso(2)} className="h-8 border-slate-200 hover:bg-slate-50">
                  Editar {modoEntrada === 'upload' ? 'Arquivo' : 'Texto'}
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

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
              {/* Preview Panel */}
              <div className="flex flex-col border border-slate-200 rounded-lg bg-slate-50 overflow-hidden h-[600px]">
                <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-[#1351B4]" /> Pré-visualização do Documento
                  </span>
                  <Badge variant="outline" className="text-xs bg-slate-50">Somente Leitura</Badge>
                </div>
                <div className="p-6 overflow-y-auto flex-1 h-full relative" onMouseUp={handleSelection}>
                  {textoSelecionado && (
                    <div className="sticky top-0 z-20 mb-4 flex justify-center animate-in slide-in-from-top-2">
                      <Button
                        size="sm"
                        onClick={criarVariavelDaSelecao}
                        className="bg-[#1351B4] hover:bg-[#0f4496] shadow-lg rounded-full px-6 border-2 border-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar variável: &quot;{textoSelecionado.length > 25 ? textoSelecionado.substring(0, 25) + '...' : textoSelecionado}&quot;
                      </Button>
                    </div>
                  )}
                  {previewHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 bg-white p-8 border border-slate-200 rounded shadow-sm min-h-full selection:bg-blue-200 selection:text-blue-900"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      Nenhuma pré-visualização disponível
                    </div>
                  )}
                </div>
              </div>

              {/* Variables Panel */}
              <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden h-[600px]">
                <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between z-10 flex-shrink-0">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Settings2 size={16} className="text-slate-500" /> Configuração das Variáveis
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-[#1351B4] hover:bg-blue-100">
                    {variaveis.length} Variáveis
                  </Badge>
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
                    <div className="space-y-4">
                      {variaveis.map((v, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row xl:flex-row gap-4 p-4 border border-slate-200 rounded-lg bg-white shadow-sm items-start sm:items-center">
                          <div className="w-full sm:w-1/4 xl:w-1/4">
                            <Label className="text-xs font-bold text-slate-400 mb-1 block">TAG NO TEXTO</Label>
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 focus-within:ring-1 focus-within:ring-[#1351B4]">
                              <span className="text-slate-400 font-mono text-xs">{'{'}{'{'}</span>
                              <input
                                type="text"
                                value={v.tag}
                                onChange={e => atualizarVariavel(idx, 'tag', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                                className="font-mono text-sm bg-transparent border-0 focus:outline-none p-0 h-9 w-full min-w-[50px] font-bold text-blue-800"
                              />
                              <span className="text-slate-400 font-mono text-xs">{'}'}{'}'}</span>
                            </div>
                          </div>
                          <div className="w-full sm:w-1/3 xl:w-1/3">
                            <Label className="text-xs font-bold text-slate-400 mb-1 block">LABEL DO CAMPO</Label>
                            <Input value={v.label} onChange={e => atualizarVariavel(idx, 'label', e.target.value)} className="bg-slate-50 border-slate-200" />
                          </div>
                          <div className="w-full sm:w-1/4 xl:w-1/4">
                            <Label className="text-xs font-bold text-slate-400 mb-1 block">TIPO DE DADO</Label>
                            <Select value={v.tipo} onValueChange={(val) => atualizarVariavel(idx, 'tipo', val as any)}>
                              <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="texto">Texto Curto</SelectItem>
                                <SelectItem value="numero">Número</SelectItem>
                                <SelectItem value="data">Data</SelectItem>
                                <SelectItem value="cpf">Mascara CPF</SelectItem>
                                <SelectItem value="moeda">Moeda Monetária (R$)</SelectItem>
                                <SelectItem value="select">Lista Redirecionada</SelectItem>
                                <SelectItem value="assinatura">Assinatura Digital</SelectItem>
                                <SelectItem value="data_extenso">Data por Extenso</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-full sm:w-auto xl:w-auto flex items-center gap-2 pt-1 sm:pt-4">
                            <div className="flex flex-col items-center justify-center">
                              <Label className="text-xs font-bold text-slate-400 mb-2">OBRIG.</Label>
                              <Switch checked={v.obrigatorio} onCheckedChange={(val) => atualizarVariavel(idx, 'obrigatorio', val)} />
                            </div>
                            <div className="border-l border-slate-200 pl-2 h-full flex items-center justify-center pt-2 ml-2">
                              <Button variant="ghost" size="icon" onClick={() => removerVariavel(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8" title="Remover Variável">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="outline" type="button" onClick={() => setPasso(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button type="button" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white" onClick={salvarModeloFinal}>
              {loading ? 'Salvando...' : 'Finalizar e Salvar Modelo'} <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
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
