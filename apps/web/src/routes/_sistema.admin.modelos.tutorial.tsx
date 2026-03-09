import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, Upload, FileText, Pencil, Zap, Clock, Settings2,
  CheckCircle2, AlertTriangle, Sparkles, ArrowRight, BookOpen,
  MousePointerClick, Tag, RefreshCw, Trash2, Plus
} from 'lucide-react'

export const Route = createFileRoute('/_sistema/admin/modelos/tutorial')({
  component: TutorialModelosPage,
})

function TutorialModelosPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full max-w-[1100px] mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/admin/modelos' })}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-[#1351B4]" size={24} /> Como Criar Modelos de Documento
          </h2>
          <p className="text-slate-500 text-sm">Guia completo para criar, configurar e publicar templates inteligentes.</p>
        </div>
      </div>

      {/* Visão Geral */}
      <div className="bg-gradient-to-r from-[#1351B4] to-[#0f4496] rounded-2xl p-6 text-white shadow-lg">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Sparkles size={18} /> O que é um Modelo de Documento?</h3>
        <p className="text-blue-100 text-sm leading-relaxed max-w-3xl">
          Um modelo é um template de portaria ou ato oficial com <strong className="text-white">campos dinâmicos</strong> marcados
          com <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-xs">{'{{TAG}}'}</code>.
          Quando o operador preenche o formulário, o sistema substitui cada tag pelo valor real e gera o PDF final automaticamente.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => navigate({ to: '/admin/modelos/novo' })}
            className="bg-white text-[#1351B4] hover:bg-blue-50 font-bold shadow-sm"
          >
            <Plus size={16} className="mr-2" /> Criar meu primeiro modelo
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/admin/modelos' })}
            className="border-white/40 text-white hover:bg-white/10"
          >
            Ver modelos existentes
          </Button>
        </div>
      </div>

      {/* Passo a Passo */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ArrowRight size={16} className="text-[#1351B4]" /> Fluxo em 3 Passos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[#1351B4]/30 bg-blue-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1351B4] text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <CardTitle className="text-sm text-slate-800">Dados Básicos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p>Defina o <strong>nome oficial</strong> do modelo (ex: "Portaria de Nomeação"), uma <strong>descrição/ementa</strong> e a <strong>categoria</strong> (RH, Licitação, Gabinete...).</p>
              <div className="bg-white rounded border border-blue-100 p-2 text-slate-500 italic">
                Ex: "Portaria de Exoneração de Cargo Comissionado"
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1351B4]/30 bg-blue-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1351B4] text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <CardTitle className="text-sm text-slate-800">Importar Documento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p>Escolha uma das formas:</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-1.5"><Upload size={12} className="text-blue-600 shrink-0 mt-0.5" /> <span><strong>Upload DOCX</strong> — envie o documento Word. O CloudConvert extrai o texto automaticamente.</span></li>
                <li className="flex items-start gap-1.5"><FileText size={12} className="text-green-600 shrink-0 mt-0.5" /> <span><strong>Texto Livre</strong> — cole ou escreva diretamente com as tags {'{{TAG}}'} já inseridas.</span></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-[#1351B4]/30 bg-blue-50/40 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1351B4] text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <CardTitle className="text-sm text-slate-800">Configurar Variáveis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              <p>Para cada tag detectada, configure:</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Label (nome amigável para o operador)</li>
                <li>Tipo (Texto, CPF, Data, Moeda, Lista...)</li>
                <li>Obrigatoriedade e valor padrão</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sistema de Tags */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Tag size={16} className="text-[#1351B4]" /> Como Funcionam as Tags <code className="text-sm font-mono bg-slate-100 px-1.5 py-0.5 rounded">{'{{TAG}}'}</code>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Regras básicas</p>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" /> Use apenas <strong>letras maiúsculas, números e underline</strong></li>
                <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" /> Sem espaços, acentos ou caracteres especiais</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" /> Nomes descritivos facilitam o preenchimento</li>
                <li className="flex items-start gap-2"><AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" /> Nunca crie tags iniciando com <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">SYS_</code> — esse prefixo é reservado</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Exemplos de boas tags</p>
              <div className="space-y-1.5">
                {[
                  ['{{NOME_SERVIDOR}}', 'Nome completo do servidor'],
                  ['{{CPF_SERVIDOR}}', 'CPF (use tipo "Máscara CPF")'],
                  ['{{CARGO_EFETIVO}}', 'Nome do cargo'],
                  ['{{DATA_ADMISSAO}}', 'Data de início (tipo "Data")'],
                  ['{{VALOR_REMUNERACAO}}', 'Salário (tipo "Moeda R$")'],
                ].map(([tag, desc]) => (
                  <div key={tag} className="flex items-center justify-between bg-slate-50 rounded px-2 py-1 border border-slate-100">
                    <code className="font-mono text-[11px] text-blue-700 font-bold">{tag}</code>
                    <span className="text-[10px] text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Variáveis de Sistema */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" /> Variáveis de Sistema — Preenchimento Automático
        </h3>
        <p className="text-xs text-slate-500 mb-4">Essas tags <strong>não geram campos no formulário</strong>. O sistema preenche sozinho, na hora certa.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              tag: '{{SYS_NUMERO}}',
              titulo: 'Número Oficial',
              desc: 'Número sequencial do documento. Ex: PORT-0001/CATAGUASES. Gerado com trava atômica para garantir unicidade.',
              quando: 'Na Publicação',
              cor: 'amber',
              icone: <Clock size={14} />,
            },
            {
              tag: '{{SYS_DATA}}',
              titulo: 'Data Atual',
              desc: 'Data no formato DD/MM/AAAA. Registrada no momento da submissão pelo operador.',
              quando: 'Na Submissão',
              cor: 'blue',
              icone: <Zap size={14} />,
            },
            {
              tag: '{{SYS_DATA_EXTENSO}}',
              titulo: 'Data por Extenso',
              desc: 'Ex: "1º de março de 2026". Ideal para o corpo do texto da portaria.',
              quando: 'Na Submissão',
              cor: 'blue',
              icone: <Zap size={14} />,
            },
            {
              tag: '{{SYS_PREFEITO}}',
              titulo: 'Nome do Prefeito',
              desc: 'Puxado de Admin → Gestão Municipal. Atualiza automaticamente a cada mandato.',
              quando: 'Na Submissão',
              cor: 'blue',
              icone: <Zap size={14} />,
            },
          ].map(item => (
            <div key={item.tag} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <code className={`font-bold px-1.5 py-0.5 rounded text-[11px] border font-mono ${item.cor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                    {item.tag}
                  </code>
                  <Badge className={`text-[9px] px-1.5 h-4 font-bold gap-1 border ${item.cor === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100'}`}>
                    {item.icone} {item.quando}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-slate-700 mb-0.5">{item.titulo}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ferramentas do Passo 3 */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings2 size={16} className="text-[#1351B4]" /> Ferramentas Disponíveis no Passo 3
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              icone: <Pencil size={16} className="text-blue-600" />,
              titulo: 'Editar Texto',
              desc: 'Abre um editor visual (WYSIWYG) mostrando o documento como ele vai ficar. Você pode digitar, formatar e inserir {{TAGS}} diretamente.',
            },
            {
              icone: <RefreshCw size={16} className="text-green-600" />,
              titulo: 'Reanalisar',
              desc: 'Re-detecta as tags {{...}} no documento atual. Use após editar o texto manualmente. Não consome tokens do CloudConvert.',
            },
            {
              icone: <MousePointerClick size={16} className="text-indigo-600" />,
              titulo: 'Seleção Direta',
              desc: 'Selecione qualquer trecho de texto no preview e clique no botão flutuante para transformá-lo em variável instantaneamente.',
            },
            {
              icone: <Sparkles size={16} className="text-purple-600" />,
              titulo: 'Sugestões AI',
              desc: 'O sistema detecta automaticamente CPFs, datas e nomes em CAIXA ALTA e sugere transformá-los em variáveis com um clique.',
            },
            {
              icone: <Trash2 size={16} className="text-amber-600" />,
              titulo: 'Limpar Orfãs',
              desc: 'Variáveis configuradas mas ausentes no texto são marcadas como "orfãs". Remova individualmente ou todas de uma vez.',
            },
            {
              icone: <CheckCircle2 size={16} className="text-green-600" />,
              titulo: 'Cobertura',
              desc: 'Badge no topo mostra X/Y tags mapeadas. O botão "Salvar" só é liberado quando todas as tags do documento têm variável configurada.',
            },
          ].map(item => (
            <div key={item.titulo} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex gap-3 items-start">
              <div className="shrink-0 mt-0.5 p-2 bg-slate-50 rounded-lg border border-slate-100">{item.icone}</div>
              <div>
                <p className="text-sm font-bold text-slate-800 mb-1">{item.titulo}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dicas e Armadilhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" /> Boas Práticas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-green-800/80 space-y-2">
            <p>✔ Prepare o DOCX no Word já com as tags <code className="bg-green-100 px-1 rounded font-mono">{'{{TAG}}'}</code> antes de fazer o upload.</p>
            <p>✔ Use grupos organizadores para agrupar variáveis relacionadas (ex: "Identificação", "Cargo", "Período").</p>
            <p>✔ Defina valores padrão para campos que raramente mudam (ex: nome do município).</p>
            <p>✔ Use o modo "Simular preenchimento" para verificar o resultado final antes de salvar.</p>
            <p>✔ Modelos com portarias vinculadas criam nova versão automaticamente — as portarias antigas ficam preservadas.</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> Armadilhas Comuns
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-red-800/80 space-y-2">
            <p>✗ <strong>Não</strong> use espaços em tags: <code className="bg-red-100 px-1 rounded font-mono">{'{{NOME DO SERVIDOR}}'}</code> é inválido — use <code className="bg-red-100 px-1 rounded font-mono">{'{{NOME_SERVIDOR}}'}</code>.</p>
            <p>✗ <strong>Não</strong> crie variáveis manuais para SYS_DATA, SYS_NUMERO etc. — o sistema já preenche automaticamente.</p>
            <p>✗ <strong>Não</strong> apague variáveis que ainda têm tags no texto — isso cria "Tags sem variável" que bloqueiam o salvamento.</p>
            <p>✗ <strong>Não</strong> confunda "Tag sem variável" (🔴 bloqueia salvamento) com "Variável orfã" (🟡 apenas aviso).</p>
          </CardContent>
        </Card>
      </div>

      {/* CTA Final */}
      <div className="text-center py-4">
        <Button
          onClick={() => navigate({ to: '/admin/modelos/novo' })}
          className="bg-[#1351B4] hover:bg-[#0f4496] text-white px-8 h-11 text-base font-bold shadow-md"
        >
          <Plus size={18} className="mr-2" /> Criar Novo Modelo Agora
        </Button>
        <p className="text-xs text-slate-400 mt-2">Qualquer dúvida, clique em "Guia Rápido" dentro do criador de modelos.</p>
      </div>

    </div>
  )
}
