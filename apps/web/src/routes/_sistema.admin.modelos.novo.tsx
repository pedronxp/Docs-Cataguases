import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { modeloService } from '@/services/modelo.service'
import { ChevronRight, ChevronLeft, Save, FileCode2, Settings2, Info } from 'lucide-react'

export const Route = createFileRoute('/_sistema/admin/modelos/novo')({
  component: NovoModeloWizard,
})

type VariavelExtraida = {
  tag: string
  label: string
  tipo: 'texto' | 'numero' | 'data' | 'moeda' | 'cpf' | 'select'
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
  const [conteudoHtml, setConteudoHtml] = useState('')

  // Variáveis Analisadas (Passo 3)
  const [variaveis, setVariaveis] = useState<VariavelExtraida[]>([])
  const [sysTags, setSysTags] = useState<string[]>([])

  const avancarParaPasso2 = () => {
    if (!nome || !descricao) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setPasso(2)
  }

  const analisarERestaurarPasso3 = async () => {
    if (!conteudoHtml) {
      toast({ title: 'O template HTML não pode estar vazio', variant: 'destructive' })
      return
    }

    setLoading(true)
    const res = await modeloService.analisarModelo(conteudoHtml)
    setLoading(false)

    if (res.success) {
      const extraidas = res.data.variaveis.map((v: any) => ({
        tag: v.chave,
        label: v.label,
        tipo: 'texto' as const,
        obrigatorio: true,
        opcoes: [],
        ordem: v.ordem
      }))
      setVariaveis(extraidas)
      setSysTags(res.data.variaveisSistema)
      setPasso(3)
    } else {
      toast({ title: 'Erro ao analisar', description: res.error, variant: 'destructive' })
    }
  }

  const atualizarVariavel = (index: number, campo: keyof VariavelExtraida, valor: any) => {
    const novas = [...variaveis]
    novas[index] = { ...novas[index], [campo]: valor }
    setVariaveis(novas)
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
      navigate({ to: '/_sistema/admin/modelos' })
    } else {
      toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Criar Novo Modelo</h2>
          <p className="text-slate-500">Configure um novo template e suas variáveis dinâmicas</p>
        </div>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center space-x-4 mb-8 bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <StepIndicator num={1} ativo={passo === 1} concluido={passo > 1} label="Dados Básicos" icon={<Info size={16} />} />
        <div className="flex-1 h-px bg-slate-200" />
        <StepIndicator num={2} ativo={passo === 2} concluido={passo > 2} label="Template HTML" icon={<FileCode2 size={16} />} />
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
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RH">Recursos Humanos (RH)</SelectItem>
                  <SelectItem value="Licitacao">Licitação e Contratos</SelectItem>
                  <SelectItem value="Gabinete">Gabinete do Prefeito</SelectItem>
                  <SelectItem value="Financeiro">Financeiro / Contábil</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="ghost" onClick={() => navigate({ to: '/_sistema/admin/modelos' })}>Cancelar</Button>
            <Button className="bg-[#1351B4] hover:bg-[#0f4496] text-white" onClick={avancarParaPasso2}>
              Próximo Passo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* PASSO 2: Template HTML */}
      {passo === 2 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Conteúdo do Template</CardTitle>
            <CardDescription>Cole o texto simulando HTML. Use chaves duplas para variáveis (Ex: {'{{NOME_SERVIDOR}}'})</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Aprova a contratação de {{NOME_SERVIDOR}} portador do CPF {{CPF_SERVIDOR}}..."
              className="min-h-[300px] font-mono text-sm bg-slate-50"
              value={conteudoHtml}
              onChange={e => setConteudoHtml(e.target.value)}
            />
          </CardContent>
          <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="outline" onClick={() => setPasso(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button disabled={loading} className="bg-[#1351B4] hover:bg-[#0f4496] text-white" onClick={analisarERestaurarPasso3}>
              {loading ? 'Analisando...' : 'Analisar HTML e Extrair Tags'} <Settings2 className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* PASSO 3: Configuração */}
      {passo === 3 && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Mapeamento de Variáveis</CardTitle>
            <CardDescription>
              Encontramos {variaveis.length} variáveis preenchíveis pelo usuário e {sysTags.length} de sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sysTags.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-sm text-blue-800">
                <strong>Tags de sistema detectadas (Preenchimento automático):</strong> {sysTags.join(', ')}
              </div>
            )}

            {variaveis.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhuma tag personalizada encontrada no texto.
              </div>
            ) : (
              <div className="space-y-4">
                {variaveis.map((v, idx) => (
                  <div key={v.tag} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-200 rounded-lg bg-slate-50 items-start sm:items-center">
                    <div className="w-full sm:w-1/4">
                      <div className="text-xs font-bold text-slate-400 mb-1">TAG NO TEXTO</div>
                      <div className="font-mono text-sm bg-white border border-slate-200 px-2 py-1 rounded inline-block">
                        {'{'}{'{'}{v.tag}{'}'}{'}'}
                      </div>
                    </div>
                    <div className="w-full sm:w-1/3">
                      <Label className="text-xs text-slate-500">Label na Tela</Label>
                      <Input value={v.label} onChange={e => atualizarVariavel(idx, 'label', e.target.value)} className="bg-white" />
                    </div>
                    <div className="w-full sm:w-1/4">
                      <Label className="text-xs text-slate-500">Tipo de Dado</Label>
                      <Select value={v.tipo} onValueChange={(val) => atualizarVariavel(idx, 'tipo', val)}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="texto">Texto Curto</SelectItem>
                          <SelectItem value="numero">Número</SelectItem>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="moeda">Moeda Monetária</SelectItem>
                          <SelectItem value="select">Lista Redirecionada (Select)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col items-center justify-center pt-5">
                      <Label className="text-xs text-slate-500 mb-2">Obrigatório?</Label>
                      <Switch checked={v.obrigatorio} onCheckedChange={(val) => atualizarVariavel(idx, 'obrigatorio', val)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between bg-slate-50 border-t rounded-b-lg p-4">
            <Button variant="outline" onClick={() => setPasso(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button disabled={loading} className="bg-green-600 hover:bg-green-700 text-white" onClick={salvarModeloFinal}>
              {loading ? 'Salvando...' : 'Finalizar e Salvar Modelo'} <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

function StepIndicator({ num, ativo, concluido, label, icon }: { num: number, ativo: boolean, concluido: boolean, label: string, icon: React.ReactNode }) {
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
