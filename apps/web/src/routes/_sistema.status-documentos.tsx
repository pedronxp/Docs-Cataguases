import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Clock,
    Settings,
    AlertCircle,
    PenTool,
    CheckCircle2,
    XOctagon,
    AlertTriangle,
    ArrowLeft,
    FileText,
    HelpCircle
} from 'lucide-react'

export const Route = createFileRoute('/_sistema/status-documentos')({
    component: StatusGuiaPage,
})

const STATUS_DATA = [
    {
        icon: Clock,
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-500',
        title: 'Rascunho',
        description: 'O documento foi criado e salvo, mas ainda está em fase de edição inicial. Ele pertence apenas ao seu criador e não foi submetido ao fluxo.',
        details: 'Nesta etapa você pode editar os dados quantas vezes quiser ou gerar um "Prevew" de como o PDF ficará.'
    },
    {
        icon: Settings,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        title: 'Processando',
        description: 'O sistema está gerando o documento final (ex: renderizando o arquivo PDF) ou realizando operações automáticas em background.',
        details: 'Geralmente esta etapa dura poucos segundos. Você não precisa fazer nada além de aguardar.'
    },
    {
        icon: AlertCircle,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        title: 'Aguardando Revisão',
        description: 'O documento foi submetido e agora está na mesa de um revisor ou Secretário aguardando análise para aprovação oficial.',
        details: 'Somente usuários com permissão superior podem aprovar o documento nesta etapa, permitindo que ele avance para a assinatura.'
    },
    {
        icon: PenTool,
        iconBg: 'bg-[#1351B4]/10',
        iconColor: 'text-[#1351B4]',
        title: 'Aguardando Assinatura',
        description: 'Documento revisado com sucesso! Agora aguarda as assinaturas digitais finais (ex: assinatura oficial do Prefeito).',
        details: 'O documento não pode mais sofrer alterações de texto, apenas receber a respectiva assinatura digital e certificado.'
    },
    {
        icon: CheckCircle2,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        title: 'Publicada',
        description: 'O documento concluiu todo o fluxo! Foi assinado, aprovado e agora está publicado e disponível de forma oficial.',
        details: 'A partir deste momento o documento pode ser listado publicamente no diário ou portal da transparência.'
    },
    {
        icon: AlertTriangle,
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
        title: 'Falha no PDF',
        description: 'Ocorreu um problema técnico pontual ao tentar gerar o layout visual (arquivo PDF) do documento.',
        details: 'Clique em "Tentar Novamente" no menu de ações da listagem. Na maioria das vezes, uma nova tentativa resolve o problema.'
    },
    {
        icon: XOctagon,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-700',
        title: 'Erro de Geração',
        description: 'Falha ao processar o documento. Geralmente ocorre se alguma variável essencial foi removida ou preenchida incorretamente.',
        details: 'Requer que as informações e variáveis do modelo sejam revisadas com calma. Retorne à edição se necessário.'
    },
]

function StatusGuiaPage() {
    const router = useRouter()

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    className="text-slate-500 hover:text-slate-800 -ml-3"
                    onClick={() => router.history.back()}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>

                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#1351B4]/10 rounded-xl">
                        <HelpCircle className="h-6 w-6 text-[#1351B4]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-slate-800">
                            Guia de Status dos Documentos
                        </h2>
                        <p className="text-slate-500 text-lg">
                            Entenda o que significa cada etapa do fluxo de tramitação.
                        </p>
                    </div>
                </div>
            </div>

            {/* Introduction Card */}
            <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-sm border-l-4 border-l-[#1351B4]">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <FileText className="h-6 w-6 text-slate-400 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <h3 className="font-semibold text-slate-800 text-lg">Como o fluxo funciona?</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Os documentos no sistema seguem um caminho linear rígido para garantir segurança jurídica e revisão.
                                Eles nascem como rascunhos, passam por etapas de aprovação e eventualmente alcançam o status de publicação.
                                Status de erro ocorrem caso exista alguma pendência no processamento e podem ser corrigidos.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STATUS_DATA.map((status) => (
                    <Card key={status.title} className="shadow-sm border-slate-200 hover:border-slate-300 hover:shadow-md transition-all">
                        <CardHeader className="p-5 pb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${status.iconBg}`}>
                                    <status.icon className={`h-5 w-5 ${status.iconColor}`} />
                                </div>
                                <CardTitle className="text-lg font-bold text-slate-800">
                                    {status.title}
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 space-y-3">
                            <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                {status.description}
                            </p>
                            <div className="bg-slate-50 rounded p-3 text-xs text-slate-500 border border-slate-100">
                                <span className="font-bold text-slate-700 mr-1">Dica:</span>
                                {status.details}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8 flex justify-center">
                <Button onClick={() => router.history.back()} variant="outline" className="px-8 border-slate-300 font-bold">
                    Entendi, voltar ao trabalho
                </Button>
            </div>
        </div>
    )
}
