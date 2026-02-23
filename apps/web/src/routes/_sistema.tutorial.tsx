import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, BookOpen, Variable, ShieldCheck, ArrowRight, CheckCircle2, Lightbulb, Building2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_sistema/tutorial')({
  component: TutorialPage,
})

const STEPS = [
  {
    icon: FileText,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#1351B4]',
    title: '1. Criar uma Nova Portaria',
    description: 'Acesse "Portarias" no menu lateral e clique em "+ Nova Portaria". Escolha o modelo (Nomeação, Exoneração ou Gratificação) e preencha os campos obrigatórios como Nome do Servidor, Cargo e Data.',
    link: '/administrativo/portarias',
    linkLabel: 'Ir para Portarias',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: '2. Entender os Modelos de Documento',
    description: 'Cada modelo tem variáveis pré-definidas (como {{NOME_SERVIDOR}}) que são preenchidas automaticamente no documento final. Acesse "Modelos" para ver todos os modelos ativos e suas variáveis.',
    link: '/admin/modelos',
    linkLabel: 'Ver Modelos',
  },
  {
    icon: Variable,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: '3. Variáveis Globais do Sistema',
    description: 'Variáveis como {{NUMERO_PORTARIA}} e {{DATA_EXTENSA}} são preenchidas automaticamente pelo sistema. Você pode configurar outras variáveis globais na página de Variáveis.',
    link: '/admin/variaveis',
    linkLabel: 'Ver Variáveis',
  },
  {
    icon: ShieldCheck,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: '4. Fluxo de Aprovação',
    description: 'A portaria percorre o seguinte fluxo: Rascunho → Pendente (aguardando aprovação) → Aprovada → Publicada. Cada etapa exige o nível de permissão correto no sistema.',
  },
  {
    icon: Users,
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: '5. Gerenciar Usuários e Permissões',
    description: 'Administradores podem convidar novos servidores, definir roles (Operador, Secretário, Prefeito) e adicionar permissões granulares. Acesse "Usuários" no menu lateral.',
    link: '/admin/usuarios',
    linkLabel: 'Gerenciar Usuários',
  },
  {
    icon: Building2,
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    title: '6. Gestão Institucional & Secretários',
    description: 'Acesse "Gestão Institucional" para configurar o mandato atual e associar os Secretários Titulares de cada Órgão a partir de seus logins. Use tags como {{SYS_SEC_SAUDE_NOME}} ou {{SYS_SEC_EDU_NOME}} nos seus modelos para que o sistema exiba o secretário automaticamente.',
    link: '/admin/gestao',
    linkLabel: 'Acessar Gestão',
  },
]

const TIPS = [
  'O campo "Variável" abaixo de cada input mostra qual tag será substituída no documento final.',
  'Apenas portarias com status "Pendente" podem ser aprovadas. Rascunhos precisam ser submetidos primeiro.',
  'O Prefeito é o único que pode assinar e publicar portarias oficialmente.',
  'Erros de processamento podem ser re-tentados diretamente na lista de portarias.',
  'Permissões granulares (como "+deletar:Portaria") dão poder extra além do role padrão.',
]

function TutorialPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-3 pb-6 border-b border-slate-200">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">
          Bem-vindo ao Doc's Cataguases
        </h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Sistema de Gestão de Portarias da Prefeitura Municipal de Cataguases.
          Siga os passos abaixo para entender como funciona o fluxo completo.
        </p>
      </div>

      {/* Fluxo Visual */}
      <Card className="shadow-sm border-[#1351B4]/20 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-[#1351B4] flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Fluxo da Portaria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            {['Selecionar Modelo', 'Preencher Dados', 'Revisar Documento', 'Submeter', 'Aprovação', 'Assinatura', 'Publicação'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  <span className="w-5 h-5 rounded-full bg-[#1351B4] text-white text-xs flex items-center justify-center">{i + 1}</span>
                  <span className="text-slate-700">{step}</span>
                </div>
                {i < 6 && <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Guia Passo a Passo</h3>
        {STEPS.map((step) => (
          <Card key={step.title} className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={`p-2.5 rounded-lg ${step.iconBg} shrink-0`}>
                <step.icon className={`h-6 w-6 ${step.iconColor}`} />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-bold text-slate-800">{step.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                {step.link && (
                  <Button variant="outline" size="sm" asChild className="mt-2 border-slate-300 text-slate-600">
                    <Link to={step.link as any}>
                      {step.linkLabel}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dicas */}
      <Card className="shadow-sm border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-amber-800 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            Dicas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900">{tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Roles */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Níveis de Acesso do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Administrador Geral', desc: 'Acesso total ao sistema. Pode gerenciar usuários, modelos e todas as portarias.', color: 'bg-blue-100 text-blue-800' },
              { role: 'Prefeito', desc: 'Pode visualizar tudo, assinar e publicar portarias oficialmente.', color: 'bg-purple-100 text-purple-800' },
              { role: 'Secretário', desc: 'Gerencia portarias da sua secretaria. Pode aprovar ou rejeitar documentos.', color: 'bg-emerald-100 text-emerald-800' },
              { role: 'Operador', desc: 'Cria e edita rascunhos de portarias. Não pode aprovar nem publicar.', color: 'bg-slate-100 text-slate-800' },
            ].map((r) => (
              <div key={r.role} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.role}</span>
                <p className="text-sm text-slate-600 mt-2">{r.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
