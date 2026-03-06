import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import {
    FileText, Users, BookOpen, ShieldCheck, ArrowRight,
    ClipboardList, PenTool, Building2, Eye, BarChart2,
    CheckCircle2, AlertCircle, Clock, Send, Stamp, Newspaper,
    ChevronRight
} from 'lucide-react'

export const Route = createFileRoute('/_sistema/tutorial')({
    component: TutorialPage,
})

// ── Fluxo de portaria com cores por etapa ─────────────────────────────────────

const FLUXO: { label: string; cor: string; descricao: string }[] = [
    { label: 'Rascunho',           cor: '#555555', descricao: 'Operador cria e edita o documento.' },
    { label: 'Em Revisão',         cor: '#1351b4', descricao: 'Revisor faz o claim e analisa o conteúdo.' },
    { label: 'Correção Necessária',cor: '#e52207', descricao: 'Revisor rejeita — volta ao Operador com comentário.' },
    { label: 'Aguardando Assinatura', cor: '#d4a017', descricao: 'Portaria aprovada aguarda assinatura do Prefeito.' },
    { label: 'Pronto p/ Publicação', cor: '#0c7b41', descricao: 'Assinada e aguardando publicação no Diário.' },
    { label: 'Publicada',          cor: '#071D41', descricao: 'Ato oficial publicado no acervo.' },
]

// ── Conteúdo por role ─────────────────────────────────────────────────────────

type Passo = { numero: number; icon: React.ElementType; titulo: string; texto: string; link?: string; linkLabel?: string }

const PASSOS_POR_ROLE: Record<string, Passo[]> = {
    OPERADOR: [
        {
            numero: 1, icon: FileText,
            titulo: 'Crie uma nova portaria',
            texto: 'Acesse "Portarias" no menu e clique em "+ Nova Portaria". Escolha o modelo adequado e preencha os campos. O número, data e secretaria são preenchidos automaticamente.',
            link: '/administrativo/portarias', linkLabel: 'Ir para Portarias',
        },
        {
            numero: 2, icon: PenTool,
            titulo: 'Revise e submeta',
            texto: 'Com o documento pronto, clique em "Submeter para Revisão". A portaria entra na fila e fica aguardando um Revisor. Você pode acompanhar o status na lista.',
        },
        {
            numero: 3, icon: AlertCircle,
            titulo: 'Corrija se necessário',
            texto: 'Se o Revisor rejeitar, a portaria volta com um comentário explicando o que ajustar. Corrija o documento e submeta novamente.',
        },
    ],
    REVISOR: [
        {
            numero: 1, icon: ClipboardList,
            titulo: 'Acesse a fila de revisão',
            texto: 'Em "Fila de Revisão" você vê todas as portarias da sua secretaria aguardando análise. Clique em "Pegar para Revisão" para assumir uma.',
            link: '/revisao/fila', linkLabel: 'Ver fila',
        },
        {
            numero: 2, icon: ShieldCheck,
            titulo: 'Analise e decida',
            texto: 'Leia o documento com atenção. Você pode aprovar (avança o fluxo), rejeitar com comentário obrigatório (volta ao Operador) ou transferir para outro revisor com justificativa.',
            link: '/revisao/minhas', linkLabel: 'Minhas revisões',
        },
    ],
    SECRETARIO: [
        {
            numero: 1, icon: FileText,
            titulo: 'Acompanhe as portarias',
            texto: 'Em "Portarias" você visualiza todos os documentos da sua secretaria. Filtre por status para ver os que precisam da sua atenção.',
            link: '/administrativo/portarias', linkLabel: 'Ver portarias',
        },
        {
            numero: 2, icon: ShieldCheck,
            titulo: 'Aprove ou rejeite',
            texto: 'Portarias que chegam à etapa do Secretário ficam disponíveis para ação. Aprove para avançar ao Prefeito, ou rejeite com comentário.',
        },
    ],
    PREFEITO: [
        {
            numero: 1, icon: Clock,
            titulo: 'Veja o que aguarda assinatura',
            texto: 'Em "Acompanhamento" ficam as portarias que passaram por todo o fluxo de revisão e aprovação e aguardam a sua assinatura para se tornarem atos oficiais.',
            link: '/acompanhamento', linkLabel: 'Acompanhamento',
        },
        {
            numero: 2, icon: Stamp,
            titulo: 'Assine e autorize a publicação',
            texto: 'Após assinar, a portaria fica no status "Pronto para Publicação". Você ou um Administrador faz a publicação final no Diário Oficial.',
        },
        {
            numero: 3, icon: BarChart2,
            titulo: 'Acompanhe pelo Analytics',
            texto: 'O Painel de Analytics mostra estatísticas de uso por secretaria: portarias criadas, aprovadas e publicadas por período.',
            link: '/admin/analytics', linkLabel: 'Ver Analytics',
        },
    ],
    ADMIN_GERAL: [
        {
            numero: 1, icon: Users,
            titulo: 'Libere o acesso de novos servidores',
            texto: 'Acesse "Usuários" → aba "Fila de Aprovação" para liberar servidores que se cadastraram. Defina o nível de acesso (Operador, Revisor, Secretário) e a secretaria.',
            link: '/admin/usuarios', linkLabel: 'Gerenciar usuários',
        },
        {
            numero: 2, icon: BookOpen,
            titulo: 'Configure os modelos de documento',
            texto: 'Em "Modelos" crie e edite os templates usados por todas as secretarias. Use variáveis como {{NOME_SERVIDOR}}, {{CARGO}} e {{DATA_EXTENSA}} que são substituídas automaticamente.',
            link: '/admin/modelos', linkLabel: 'Ver modelos',
        },
        {
            numero: 3, icon: Building2,
            titulo: 'Configure a gestão institucional',
            texto: 'Defina o mandato atual e associe Secretários Titulares a cada órgão. As variáveis {{SYS_SEC_SAUDE_NOME}} e similares ficam disponíveis para os modelos automaticamente.',
            link: '/admin/gestao', linkLabel: 'Gestão institucional',
        },
        {
            numero: 4, icon: Eye,
            titulo: 'Monitore pelo Analytics',
            texto: 'O Painel de Analytics centraliza as métricas do sistema para relatórios e acompanhamento da produtividade de cada secretaria.',
            link: '/admin/analytics', linkLabel: 'Ver Analytics',
        },
    ],
}

// ── Roles ─────────────────────────────────────────────────────────────────────

const ROLES = [
    { role: 'Operador',            cor: 'bg-[#f8f9fa] border-[#999999] text-[#333333]', desc: 'Cria rascunhos e submete portarias. Corrige documentos rejeitados.' },
    { role: 'Revisor',             cor: 'bg-[#e6f4eb] border-[#0c7b41] text-[#0c7b41]', desc: 'Pega portarias da fila, aprova, rejeita com comentário ou transfere.' },
    { role: 'Secretário',          cor: 'bg-[#e8f0fb] border-[#1351b4] text-[#1351b4]', desc: 'Aprova ou rejeita portarias da sua secretaria antes de ir ao Prefeito.' },
    { role: 'Prefeito',            cor: 'bg-[#fffbea] border-[#d4a017] text-[#7d5c00]', desc: 'Assina portarias e autoriza publicação no Diário Oficial.' },
    { role: 'Administrador Geral', cor: 'bg-[#f9f0ff] border-[#9b59b6] text-[#9b59b6]', desc: 'Acesso total: usuários, modelos, variáveis globais e configuração do sistema.' },
]

// ── Dicas por role ────────────────────────────────────────────────────────────

const DICAS: Record<string, string[]> = {
    OPERADOR: [
        'O número da portaria (PORT-0001/CATAGUASES) é gerado automaticamente ao submeter.',
        'Rascunhos podem ser editados à vontade antes de submeter.',
        'Se a portaria for rejeitada, leia o comentário do Revisor antes de corrigir.',
        'Campos com * são obrigatórios para submeter.',
    ],
    REVISOR: [
        'Só é possível pegar uma portaria se ela ainda não foi assumida por outro revisor.',
        'A rejeição exige comentário obrigatório — seja claro para ajudar o Operador.',
        'Transferência para outro revisor também exige justificativa.',
        'Em "Minhas Revisões" ficam as portarias que você assumiu e ainda não finalizou.',
    ],
    SECRETARIO: [
        'Portarias da sua secretaria ficam visíveis independente do status.',
        'A aprovação avança a portaria direto para a assinatura do Prefeito.',
    ],
    PREFEITO: [
        'Apenas você pode fazer a assinatura oficial.',
        'Você tem acesso de leitura a portarias de todas as secretarias.',
    ],
    ADMIN_GERAL: [
        'Ao liberar novo servidor, defina sempre a secretaria — ela é usada em todo o fluxo.',
        'Permissões especiais podem ser configuradas em "Usuários" → botão "Configurar" de cada usuário.',
        'Variáveis globais como {{PREFEITO_NOME}} ficam em "Variáveis Globais" e valem para todos os modelos.',
        'Use "Desativar conta" para remover acesso temporariamente sem excluir o usuário.',
    ],
}

const ROLE_LABELS: Record<string, string> = {
    OPERADOR: 'Operador',
    REVISOR: 'Revisor',
    SECRETARIO: 'Secretário',
    PREFEITO: 'Prefeito',
    ADMIN_GERAL: 'Administrador Geral',
}

// ── Componente ────────────────────────────────────────────────────────────────

function TutorialPage() {
    const usuario = useAuthStore(s => s.usuario)
    const role = usuario?.role ?? 'OPERADOR'

    const passos = PASSOS_POR_ROLE[role] ?? PASSOS_POR_ROLE['OPERADOR']
    const dicas  = DICAS[role] ?? DICAS['OPERADOR']
    const roleAtual = ROLES.find(r =>
        r.role === ROLE_LABELS[role]
    )

    return (
        <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pb-16">

            {/* ── Header Gov.br ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Guia do Sistema</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        Entenda como funciona o fluxo de portarias e o seu papel no Doc's Cataguases.
                    </p>
                </div>
                {roleAtual && (
                    <div className="flex items-center gap-2 shrink-0 bg-white border border-[#e6e6e6] px-4 py-2">
                        <BookOpen className="h-4 w-4 text-[#1351b4]" />
                        <span className={`text-xs font-bold px-2 py-0.5 border ${roleAtual.cor}`}>
                            {roleAtual.role}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Fluxo da portaria ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#1351b4]" />
                    <h2 className="text-base font-bold text-[#071D41]">Fluxo Completo da Portaria</h2>
                </div>

                <div className="bg-white border border-[#e6e6e6] p-5">
                    {/* Linha de status */}
                    <div className="flex flex-wrap gap-y-4 gap-x-0 items-start">
                        {FLUXO.map((etapa, i) => (
                            <div key={etapa.label} className="flex items-start">
                                {/* Badge + descrição */}
                                <div className="flex flex-col items-center gap-1.5 max-w-[110px]">
                                    <div
                                        className="px-2.5 py-1 text-white text-[11px] font-bold text-center leading-tight whitespace-nowrap"
                                        style={{ backgroundColor: etapa.cor }}
                                    >
                                        {etapa.label}
                                    </div>
                                    <p className="text-[10px] text-[#888888] text-center leading-tight px-1">
                                        {etapa.descricao}
                                    </p>
                                </div>
                                {i < FLUXO.length - 1 && (
                                    <ChevronRight className="h-4 w-4 text-[#cccccc] mt-1.5 mx-1 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Guia personalizado ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#1351b4]" />
                    <h2 className="text-base font-bold text-[#071D41]">
                        O que você precisa saber — <span className="text-[#1351b4]">{ROLE_LABELS[role] ?? role}</span>
                    </h2>
                </div>

                <div className="space-y-0 border border-[#e6e6e6] bg-white divide-y divide-[#f0f0f0]">
                    {passos.map((passo, idx) => (
                        <div key={passo.numero} className="flex gap-0">
                            {/* Número lateral */}
                            <div className="w-12 shrink-0 flex items-start justify-center pt-5 bg-[#f8f9fa] border-r border-[#f0f0f0]">
                                <span className="text-lg font-black text-[#1351b4]">{passo.numero}</span>
                            </div>
                            {/* Conteúdo */}
                            <div className="flex-1 p-5 space-y-2">
                                <div className="flex items-center gap-2">
                                    <passo.icon className="h-4 w-4 text-[#555555] shrink-0" />
                                    <h3 className="text-sm font-bold text-[#071D41]">{passo.titulo}</h3>
                                </div>
                                <p className="text-sm text-[#555555] leading-relaxed">{passo.texto}</p>
                                {passo.link && passo.linkLabel && (
                                    <Link
                                        to={passo.link as any}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1351b4] hover:underline"
                                    >
                                        {passo.linkLabel}
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Dicas ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#d4a017]" />
                    <h2 className="text-base font-bold text-[#071D41]">Dicas para o dia a dia</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dicas.map((dica, i) => (
                        <div key={i} className="bg-[#fffbea] border border-[#f0d060] p-4 flex items-start gap-3">
                            <CheckCircle2 className="h-4 w-4 text-[#7d5c00] mt-0.5 shrink-0" />
                            <p className="text-sm text-[#555533] leading-relaxed">{dica}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Níveis de acesso ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#555555]" />
                    <h2 className="text-base font-bold text-[#071D41]">Níveis de Acesso</h2>
                </div>

                <div className="border border-[#e6e6e6] bg-white divide-y divide-[#f0f0f0]">
                    {ROLES.map(r => (
                        <div key={r.role} className="flex items-start gap-4 p-4">
                            <span className={`text-xs font-bold px-2 py-0.5 border shrink-0 whitespace-nowrap ${r.cor}`}>
                                {r.role}
                            </span>
                            <p className="text-sm text-[#555555] leading-relaxed">{r.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-xs text-center text-[#aaaaaa]">
                Dúvidas? Fale com o Administrador do sistema.
            </p>
        </div>
    )
}
