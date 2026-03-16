import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight,
  FileText, ClipboardCheck, PenLine, Stamp, Newspaper,
  CheckCircle2, Clock, AlertTriangle, HelpCircle, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_sistema/diario-oficial/guia')({
  component: GuiaJornalPage,
})

// ─── Tipos ───────────────────────────────────────────────────────────────────

type DocumentoTipo = 'PORTARIA' | 'MEMORANDO' | 'OFICIO' | 'LEI'

interface Passo {
  numero: number
  titulo: string
  descricao: string
  dica?: string
}

interface FaqItem {
  pergunta: string
  resposta: string
}

// ─── Dados ───────────────────────────────────────────────────────────────────

const PASSOS_PORTARIA: Passo[] = [
  {
    numero: 1,
    titulo: 'Verificar a fila',
    descricao:
      'Acesse o Dashboard de Publicação. A tabela principal exibe todos os documentos assinados que aguardam numeração oficial. Verifique a coluna "Assinatura" para confirmar que cada documento está com o status correto antes de prosseguir.',
    dica: 'Documentos com assinatura "Dispensada" possuem justificativa — passe o mouse sobre o badge para visualizá-la.',
  },
  {
    numero: 2,
    titulo: 'Confirmar o tipo de assinatura',
    descricao:
      'Existem três tipos de assinatura aceitos para publicação: Digital (certificado eletrônico), Manual (assinatura física com upload de comprovante) e Dispensada com Justificativa (casos previstos em legislação). Qualquer um desses status habilita o botão "Numerar".',
    dica: 'Documentos sem assinatura não aparecem na fila — eles permanecem em AGUARDANDO_ASSINATURA até o Prefeito ou Secretário concluir a assinatura.',
  },
  {
    numero: 3,
    titulo: 'Numerar o documento',
    descricao:
      'Clique em "Numerar" na linha do documento desejado, ou selecione múltiplos documentos via checkbox e use o botão flutuante "Numerar selecionadas" para processar em lote. O sistema alocará o próximo número disponível de forma atômica — sem risco de duplicatas mesmo com múltiplos usuários simultâneos.',
    dica: 'O processamento em lote ocorre sequencialmente: um documento por vez, na ordem da fila. O progresso é exibido em tempo real.',
  },
  {
    numero: 4,
    titulo: 'Verificar a publicação',
    descricao:
      'Após a confirmação, o documento recebe seu número oficial (ex: PORT-0001/2026) e seu status muda para PUBLICADA. Você pode verificar o resultado abrindo o documento pelo link na coluna "Documento". O número gerado também aparece no Feed de Atividades do sistema.',
    dica: 'O número gerado é definitivo e não pode ser alterado. Em caso de erro, contate o Administrador Geral do sistema.',
  },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    pergunta: 'O que fazer se um documento aparecer sem assinatura na fila?',
    resposta:
      'Documentos só entram na fila após serem assinados. Se você identificar um documento com status "Pendente" na coluna de assinatura, isso pode indicar um dado desatualizado — clique em "Sincronizar" para recarregar a fila. Se o problema persistir, contate o Administrador para verificar o fluxo.',
  },
  {
    pergunta: 'Posso desfazer uma numeração após confirmar?',
    resposta:
      'Não. A numeração é uma operação definitiva e irreversível para garantir a integridade do registro histórico. Números já emitidos não podem ser reutilizados ou cancelados. Em casos de erro grave, o Administrador Geral pode avaliar a situação e emitir uma portaria de retificação.',
  },
  {
    pergunta: 'O que significa "operação atômica"?',
    resposta:
      'Significa que a atribuição do número, a atualização do status do documento e o registro no histórico ocorrem dentro de uma única transação no banco de dados. Se qualquer parte falhar, nenhuma alteração é salva — garantindo consistência total e eliminando o risco de duplicatas mesmo com múltiplos usuários numerando simultaneamente.',
  },
  {
    pergunta: 'Como funciona o processamento em lote?',
    resposta:
      'Ao selecionar múltiplos documentos e clicar em "Numerar selecionadas", o sistema processa cada item sequencialmente (um por vez), sempre respeitando a ordem de entrada na fila. Um progresso em tempo real é exibido durante o processamento. Itens com erro são sinalizados individualmente sem interromper os demais.',
  },
  {
    pergunta: 'O que acontece se o servidor cair durante um lote?',
    resposta:
      'Os documentos já numerados permanecem publicados normalmente. Os documentos que ainda não foram processados continuam na fila com status PENDENTE e podem ser numerados em uma nova operação. Não há risco de numeração parcial ou duplicada.',
  },
]

const TIPOS_DOCUMENTO: { tipo: DocumentoTipo; label: string; disponivel: boolean }[] = [
  { tipo: 'PORTARIA', label: 'Portaria', disponivel: true },
  { tipo: 'MEMORANDO', label: 'Memorando', disponivel: false },
  { tipo: 'OFICIO', label: 'Ofício', disponivel: false },
  { tipo: 'LEI', label: 'Lei', disponivel: false },
]

// ─── Componentes internos ─────────────────────────────────────────────────────

function FluxoCompleto() {
  const etapas = [
    { icone: FileText, label: 'Criação', sub: 'Operador', cor: 'bg-slate-100 text-slate-600' },
    { icone: ClipboardCheck, label: 'Revisão', sub: 'Revisor', cor: 'bg-slate-100 text-slate-600' },
    { icone: PenLine, label: 'Assinatura', sub: 'Prefeito', cor: 'bg-slate-100 text-slate-600' },
    { icone: Newspaper, label: 'Publicação', sub: 'Jornalista', cor: 'bg-slate-900 text-white', destaque: true },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {etapas.map((etapa, i) => {
        const Icon = etapa.icone
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={cn('flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[90px] relative', etapa.cor)}>
              {etapa.destaque && (
                <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Você
                </span>
              )}
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{etapa.label}</span>
              <span className={cn('text-[10px]', etapa.destaque ? 'text-slate-300' : 'text-slate-400')}>{etapa.sub}</span>
            </div>
            {i < etapas.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}

function FaqAccordion({ itens }: { itens: FaqItem[] }) {
  const [aberto, setAberto] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {itens.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            onClick={() => setAberto(aberto === i ? null : i)}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-800">{item.pergunta}</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform shrink-0 ml-3', aberto === i && 'rotate-180')} />
          </button>
          {aberto === i && (
            <div className="px-4 pb-4 pt-1">
              <p className="text-sm text-slate-600 leading-relaxed pl-6.5">{item.resposta}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

function GuiaJornalPage() {
  const [tipoAtivo, setTipoAtivo] = useState<DocumentoTipo>('PORTARIA')

  return (
    <div className="max-w-3xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-500 -ml-2 h-8">
          <Link to="/diario-oficial"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Dashboard</Link>
        </Button>
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 shrink-0">
            <BookOpen className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Guia de Publicação Oficial</h1>
            <p className="text-sm text-slate-500 mt-0.5">Como oficializar e numerar atos municipais no sistema.</p>
          </div>
        </div>
      </div>

      {/* Fluxo completo */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fluxo completo de um documento</CardTitle>
        </CardHeader>
        <CardContent>
          <FluxoCompleto />
          <p className="text-xs text-slate-400 mt-4 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            A etapa de Publicação (destacada) é onde você atua como Jornalista.
          </p>
        </CardContent>
      </Card>

      {/* Abas por tipo de documento */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
          {TIPOS_DOCUMENTO.map(({ tipo, label, disponivel }) => (
            <button
              key={tipo}
              disabled={!disponivel}
              onClick={() => disponivel && setTipoAtivo(tipo)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tipoAtivo === tipo && disponivel
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-600',
                !disponivel && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
              {!disponivel && (
                <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 border-slate-200 text-slate-400">Em breve</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Passos */}
        {tipoAtivo === 'PORTARIA' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Stamp className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800">Publicação de Portaria — Passo a passo</h2>
            </div>

            {PASSOS_PORTARIA.map((passo) => (
              <Card key={passo.numero} className="border-slate-200">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">
                      {passo.numero}
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm">{passo.titulo}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{passo.descricao}</p>
                      {passo.dica && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 leading-relaxed">{passo.dica}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-emerald-200 bg-emerald-50">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Documento publicado com sucesso</p>
                  <p className="text-xs text-emerald-600 mt-0.5">O número oficial aparece no documento e no Feed de Atividades do sistema.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Status de assinatura — referência rápida */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Referência: tipos de assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 space-y-1">
              <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-white text-xs">Digital</Badge>
              <p className="text-xs text-emerald-700">Assinatura via certificado digital. Verificada automaticamente pelo sistema.</p>
            </div>
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-1">
              <Badge variant="outline" className="gap-1 text-blue-700 border-blue-200 bg-white text-xs">Manual</Badge>
              <p className="text-xs text-blue-700">Assinatura física com comprovante digitalizado anexado ao documento.</p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-1">
              <Badge variant="outline" className="gap-1 text-amber-700 border-amber-200 bg-white text-xs">Dispensada</Badge>
              <p className="text-xs text-amber-700">Assinatura dispensada com justificativa registrada. Passe o mouse para ver o motivo.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status do documento — referência rápida */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Referência: estados do documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { status: 'PRONTO_PUBLICACAO', label: 'Pronto para publicação', desc: 'Assinado e na fila do Jornal. Visível no dashboard.', cor: 'bg-violet-100 text-violet-700' },
              { status: 'PUBLICADA', label: 'Publicada', desc: 'Número oficial atribuído. Processo concluído.', cor: 'bg-emerald-100 text-emerald-700' },
            ].map(({ status, label, desc, cor }) => (
              <div key={status} className="flex items-start gap-3">
                <Badge className={cn('text-[10px] font-semibold shrink-0 mt-0.5', cor)}>{label}</Badge>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">Dúvidas frequentes</h2>
        </div>
        <FaqAccordion itens={FAQ_ITEMS} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs">Guia atualizado em mar/2026</span>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-slate-600">
          <Link to="/diario-oficial"><ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
