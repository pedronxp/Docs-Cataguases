import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCcw, Sparkles, Wrench, ShieldAlert, Plus } from 'lucide-react'

export const Route = createFileRoute('/_sistema/atualizacoes')({
    component: AtualizacoesPage,
})

// Tipos de badge para padronização
const BADGE_CONFIG = {
    NOVO: { label: 'Novo', cor: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200', icon: <Sparkles className="h-3 w-3 mr-1" /> },
    MELHORIA: { label: 'Melhoria', cor: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200', icon: <Plus className="h-3 w-3 mr-1" /> },
    CORRECAO: { label: 'Correção', cor: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200', icon: <Wrench className="h-3 w-3 mr-1" /> },
    SEGURANCA: { label: 'Segurança', cor: 'bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200', icon: <ShieldAlert className="h-3 w-3 mr-1" /> },
}

// Histórico de versões
const VERSOES = [
    {
        versao: 'v1.5.0',
        data: '18 de Marco, 2026',
        destaque: "Lançamento do chatDoc's: a Nova Inteligência Artificial do Sistema.",
        mudancas: [
            { tipo: 'NOVO', descricao: "chatDoc's: Experiência completa de chat com IA integrada, com layout expansivo interativo e limites de tokens mensais gerenciados por hierarquia de cargos." },
            { tipo: 'NOVO', descricao: "Painel Admin de Inteligência Artificial expandido com detalhes sobre a Política de ZCT (Zero Content Training) e informações transparentes de quotas." },
            { tipo: 'MELHORIA', descricao: "Layout flexível e responsivo do Chat Principal otimizado para não impactar performance, salvando o histórico direto na nuvem para não se perder dados." },
            { tipo: 'NOVO', descricao: "Nova categoria 'chatDoc's' implementada no modelo de Feedbacks, dedicada a organizar e priorizar os relatos exclusivos relacionados aos modelos de Linguagem Grande (LLMs)." }
        ]
    },
    {
        versao: 'v1.4.0',
        data: '16 de Março, 2026',
        destaque: 'Novo sistema de notificações, numeração flexível e áreas de feedback.',
        mudancas: [
            { tipo: 'NOVO', descricao: 'Página de "Feedback" para que usuários relatem bugs e sugiram ideias diretamente no sistema.' },
            { tipo: 'NOVO', descricao: 'Página de "Quadro de Atualização" para acompanhar as novidades e melhorias contínuas do sistema.' },
            { tipo: 'MELHORIA', descricao: 'O sistema de numeração de documentos agora suporta ciclos anuais, reiniciando automaticamente a cada novo ano.' },
            { tipo: 'MELHORIA', descricao: 'Botão "Limpar tudo" adicionado ao sino de notificações para melhor gestão da caixa de entrada.' },
            { tipo: 'MELHORIA', descricao: 'Notificações muito mais detalhadas: agora exibem o título e o número da portaria diretamente na listagem.' },
            { tipo: 'SEGURANCA', descricao: 'Ajustes finos no controle de acesso (RBAC) para proteger melhor as telas administrativas.' },
        ]
    },
    {
        versao: 'v1.3.0',
        data: '15 de Março, 2026',
        destaque: 'Dashboards focados, novo visual de login e suporte a extração de PDFs.',
        mudancas: [
            { tipo: 'MELHORIA', descricao: 'A tela de login foi completamente redesenhada com um visual mais moderno e limpo.' },
            { tipo: 'MELHORIA', descricao: 'Dashboard adaptado: o feed de atividades agora exibe informações mais focadas e relevantes para seu perfil.' },
            { tipo: 'NOVO', descricao: 'Nova infraestrutura para processamento e extração avançada de texto de PDFs (PDFExtractionAPI).' },
            { tipo: 'CORRECAO', descricao: 'Resolvidos erros onde as notificações podiam se multiplicar na tela após certas ações.' },
            { tipo: 'CORRECAO', descricao: 'Corrigido comportamento ao trocar o papel (Role) do usuário, aplicando a regra imediatamente.' },
        ]
    },
    {
        versao: 'v1.2.0',
        data: '10 de Março, 2026',
        destaque: 'Integrações de Inteligência Artificial expandidas.',
        mudancas: [
            { tipo: 'NOVO', descricao: 'Adicionado suporte nativo para Cerebras e Mistral como provedores principais de IA.' },
            { tipo: 'MELHORIA', descricao: 'Permitida a seleção manual do modelo LLM desejado nas interações de chat.' },
            { tipo: 'CORRECAO', descricao: 'Correção de erros pontuais na seleção de Secretaria e Setor no formulário inicial.' },
        ]
    }
]

function AtualizacoesPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 pt-2 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <RefreshCcw className="h-6 w-6 text-primary" />
                    Quadro de Atualizações
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Acompanhe as novidades, correções e melhorias implementadas no Doc's Cataguases.
                </p>
            </div>

            {/* Timeline */}
            <div className="relative border-l-2 border-slate-100 ml-4 md:ml-6 space-y-12">
                {VERSOES.map((v) => (
                    <div key={v.versao} className="relative pl-6 md:pl-10">
                        {/* Dot da timeline */}
                        <div className="absolute w-4 h-4 bg-primary ring-4 ring-white rounded-full -left-[9px] top-6" />

                        <Card className="border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="bg-slate-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Versão {v.versao}</h2>
                                    <p className="text-xs text-slate-500 font-medium">{v.destaque}</p>
                                </div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 w-fit">
                                    {v.data}
                                </div>
                            </div>
                            <CardContent className="p-0">
                                <ul className="divide-y divide-slate-50">
                                    {v.mudancas.map((mudanca, j) => {
                                        const config = BADGE_CONFIG[mudanca.tipo as keyof typeof BADGE_CONFIG]
                                        return (
                                            <li key={j} className="flex gap-4 p-5 hover:bg-slate-50/50 transition-colors">
                                                <div className="shrink-0 pt-0.5">
                                                    <Badge variant="outline" className={`${config.cor} w-24 justify-center border text-[10px] font-bold uppercase tracking-wide`}>
                                                        {config.icon}
                                                        {config.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    {mudanca.descricao}
                                                </p>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        </div>
    )
}
