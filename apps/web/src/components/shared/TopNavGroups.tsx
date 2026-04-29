import React from 'react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import {
    LayoutDashboard, FileText, Users, Settings, BookOpen,
    Braces, Building2, BarChart2,
    Newspaper, Activity,
    ClipboardList, ClipboardCheck, GraduationCap, ScrollText,
    PlusCircle, List, Puzzle, Bot, Brain,
    Library, RefreshCcw, MessageSquarePlus, Stamp, MessageSquareWarning,
    Construction, GitBranch, ChevronDown, LayoutGrid,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSidebarCounts } from '@/hooks/use-sidebar-counts'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavLeaf = {
    to: string
    label: string
    icon: LucideIcon
    action: string
    subject: string
}

type NavGroup = {
    label: string
    icon: LucideIcon
    action: string
    subject: string
    children: NavLeaf[]
}

// ─── Fluxo de Trabalho (dropdown simples — visão geral) ───────────────────────
const FLUXO_ITEMS: NavLeaf[] = [
    { to: '/dashboard',           label: 'Painel Geral',       icon: LayoutDashboard, action: 'ler',    subject: 'FeedAtividade' },
    { to: '/acompanhamento',      label: 'Acompanhamento',     icon: Activity,        action: 'publicar',subject: 'Portaria' },
    { to: '/diario-oficial',      label: 'Diário Oficial',     icon: Newspaper,       action: 'ler',    subject: 'Portaria' },
    { to: '/administrativo/memorandos', label: 'Memorandos',   icon: Construction,   action: 'ler',    subject: 'Portaria' },
    { to: '/status-documentos',   label: 'Status de Documentos', icon: ClipboardCheck, action: 'ler', subject: 'Portaria' },
]

// ─── Portarias ────────────────────────────────────────────────────────────────
const PORTARIAS_GROUP: NavGroup = {
    label: 'Portarias',
    icon: FileText,
    action: 'ler',
    subject: 'Portaria',
    children: [
        { to: '/administrativo/portarias',       label: 'Listar Portarias', icon: List,       action: 'ler',   subject: 'Portaria' },
        { to: '/administrativo/portarias/novo',  label: 'Nova Portaria',    icon: PlusCircle, action: 'criar', subject: 'Portaria' },
    ],
}

// ─── Decretos ─────────────────────────────────────────────────────────────────
const DECRETOS_GROUP: NavGroup = {
    label: 'Decretos',
    icon: Stamp,
    action: 'ler',
    subject: 'Portaria',
    children: [
        { to: '/administrativo/decretos',       label: 'Listar Decretos', icon: List,       action: 'ler',   subject: 'Portaria' },
        { to: '/administrativo/decretos/novo',  label: 'Novo Decreto',    icon: PlusCircle, action: 'criar', subject: 'Portaria' },
    ],
}

// ─── Revisão ──────────────────────────────────────────────────────────────────
const REVISAO_GROUP: NavGroup = {
    label: 'Revisão',
    icon: ClipboardList,
    action: 'claim',
    subject: 'Revisao',
    children: [
        { to: '/revisao/todas',  label: 'Todas as Revisões', icon: Activity,        action: 'gerenciar',  subject: 'Revisao' },
        { to: '/revisao/fila',   label: 'Fila de Revisão',   icon: ClipboardList,   action: 'claim',      subject: 'Revisao' },
        { to: '/revisao/minhas', label: 'Minhas Revisões',   icon: ClipboardCheck,  action: 'transferir', subject: 'Revisao' },
    ],
}

// ─── Grupos secundários ────────────────────────────────────────────────────────
const OTHER_GROUPS: { label: string; icon: LucideIcon; items: NavLeaf[] }[] = [
    {
        label: 'Publicações',
        icon: Library,
        items: [
            { to: '/acervo',        label: 'Portal de Publicações',  icon: Library,       action: 'ler',      subject: 'Portaria' },
            { to: '/admin/modelos', label: 'Modelos de Documento',   icon: BookOpen,      action: 'gerenciar',subject: 'Modelo' },
            { to: '/tutorial',      label: 'Tutorial do Sistema',    icon: GraduationCap, action: 'ler',      subject: 'Portaria' },
        ]
    },
    {
        label: 'Gestão',
        icon: Building2,
        items: [
            { to: '/admin/gestao',          label: 'Órgãos e Secretarias', icon: Building2,      action: 'gerenciar', subject: 'Secretaria' },
            { to: '/admin/usuarios',        label: 'Gestão de Usuários',   icon: Users,          action: 'gerenciar', subject: 'Usuario' },
            { to: '/admin/fila-aprovacao',  label: 'Fila de Aprovação',    icon: ClipboardCheck, action: 'manage',    subject: 'all' },
        ]
    },
    {
        label: 'Configurações',
        icon: Settings,
        items: [
            { to: '/admin/variaveis',   label: 'Variáveis Globais',    icon: Braces,    action: 'gerenciar', subject: 'VariavelSistema' },
            { to: '/admin/integracoes', label: 'Integrações Externas', icon: Puzzle,    action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/workflow',    label: 'Fluxos de Aprovação',  icon: GitBranch, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/livros',      label: 'Livros de Numeração',  icon: Settings,  action: 'gerenciar', subject: 'LivrosNumeracao' },
        ]
    },
    {
        label: 'Dados e IA',
        icon: Brain,
        items: [
            { to: '/admin/analytics',          label: 'Relatórios e Analytics', icon: BarChart2, action: 'ler',       subject: 'Analytics' },
            { to: '/admin/analytics-avancado', label: 'Analytics Avançado',     icon: Activity,  action: 'manage',    subject: 'all' },
            { to: '/admin/llm',                label: 'Painel de IA',           icon: Bot,       action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/ia',                 label: 'Treinamento de IA',      icon: Brain,     action: 'manage',    subject: 'all' },
        ]
    },
    {
        label: 'Auditoria',
        icon: ScrollText,
        items: [
            { to: '/admin/logs',      label: 'Logs de Auditoria',   icon: ScrollText,          action: 'gerenciar', subject: 'all' },
            { to: '/admin/feedbacks', label: 'Feedbacks Recebidos', icon: MessageSquareWarning,action: 'manage',    subject: 'all' },
        ]
    },
    {
        label: 'Sistema',
        icon: RefreshCcw,
        items: [
            { to: '/atualizacoes', label: 'Quadro de Atualizações', icon: RefreshCcw,        action: 'ler', subject: 'FeedAtividade' },
            { to: '/feedback',     label: 'Enviar Feedback',        icon: MessageSquarePlus, action: 'ler', subject: 'FeedAtividade' },
        ]
    },
]

export function TopNavGroups() {
    const ability = useAbility(AbilityContext)
    const router = useRouterState()
    const pathname = router.location.pathname
    const { counts } = useSidebarCounts()
    const navigate = useNavigate()

    const ROUTE_BADGES: Record<string, number> = {
        '/revisao/fila':             counts.filaRevisao,
        '/revisao/minhas':           counts.minhasRevisoes,
        '/acompanhamento':           counts.aguardandoAssinatura,
        '/administrativo/portarias': counts.portariasCorrecao,
        '/admin/fila-aprovacao':     counts.filaAprovacao,
    }

    function isActive(to: string) {
        return pathname === to || pathname.startsWith(to + '/')
    }

    // ─ NavLink dentro do dropdown ─────────────────────────────────────────────
    // Usa onSelect + navigate em vez de asChild + Link.
    // O Radix dispara onSelect APÓS fechar o menu, garantindo que a navegação
    // acontece na ordem certa sem conflito de eventos.
    function NavLink({ item }: { item: NavLeaf }) {
        const active = isActive(item.to)
        const badge = ROUTE_BADGES[item.to] || 0
        return (
            <DropdownMenuItem
                onSelect={() => navigate({ to: item.to as any })}
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-[8px] text-[13px] cursor-pointer transition-all duration-150 ${
                    active
                        ? 'bg-[#1b61c9]/[0.08] text-[#1b61c9] font-semibold focus:bg-[#1b61c9]/[0.10] focus:text-[#1b61c9]'
                        : 'text-[rgba(4,14,32,0.75)] hover:bg-[#f8fafc] hover:text-[#181d26] focus:bg-[#f8fafc] focus:text-[#181d26]'
                }`}
            >
                <item.icon size={14} className={active ? 'text-[#1b61c9]' : 'text-[rgba(4,14,32,0.40)]'} />
                <span className="flex-1 tracking-[0.08px]">{item.label}</span>
                {badge > 0 && (
                    <span className="bg-[#1b61c9] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </DropdownMenuItem>
        )
    }

    // ─ Botão padrão de trigger ────────────────────────────────────────────────
    // Usa forwardRef para que o DropdownMenuTrigger asChild passe os event
    // handlers corretamente, evitando o bug de fechamento prematuro do Radix.
    const TriggerBtn = React.forwardRef<
        HTMLButtonElement,
        { icon: LucideIcon; label: string; active: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>
    >(({ icon: Icon, label, active, ...rest }, ref) => (
        <button
            ref={ref}
            type="button"
            className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 lg:px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 outline-none ${
                active
                    ? 'bg-[#1b61c9]/[0.08] text-[#1b61c9] font-semibold'
                    : 'text-[rgba(4,14,32,0.70)] hover:bg-[#f8fafc] hover:text-[#181d26]'
            }`}
            {...rest}
        >
            <Icon size={14} className={`shrink-0 ${active ? 'text-[#1b61c9]' : 'text-[rgba(4,14,32,0.45)]'}`} />
            <span className="max-w-[9.5rem] truncate whitespace-nowrap tracking-[0.08px]">{label}</span>
            <ChevronDown size={11} className={`shrink-0 ${active ? 'text-[#1b61c9]' : 'text-[rgba(4,14,32,0.40)]'}`} />
        </button>
    ))
    TriggerBtn.displayName = 'TriggerBtn'

    // ─ Dropdown: Fluxo de Trabalho ────────────────────────────────────────────
    const FluxoDropdown = () => {
        const visible = FLUXO_ITEMS.filter(i => ability.can(i.action as any, i.subject as any))
        if (visible.length === 0) return null
        const active = visible.some(i => isActive(i.to))
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <TriggerBtn icon={LayoutGrid} label="Fluxo de Trabalho" active={active} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-56 rounded-2xl border border-[#e0e2e6] bg-white p-1.5"
                    style={{
                        boxShadow: 'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px',
                    }}
                >
                    <DropdownMenuLabel className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.20em] text-[rgba(4,14,32,0.40)]">
                        Fluxo de Trabalho
                    </DropdownMenuLabel>
                    <div className="space-y-0.5">
                        {visible.map(item => <NavLink key={item.to} item={item} />)}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    // ─ Dropdown: grupo simples (Portaria / Decreto / Revisão) ─────────────────
    function GroupDropdown({ group }: { group: NavGroup }) {
        if (!ability.can(group.action as any, group.subject as any)) return null
        const visible = group.children.filter(c => ability.can(c.action as any, c.subject as any))
        if (visible.length === 0) return null
        const active = visible.some(c => isActive(c.to))
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <TriggerBtn icon={group.icon} label={group.label} active={active} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-56 rounded-2xl border border-[#e0e2e6] bg-white p-1.5"
                    style={{
                        boxShadow: 'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px',
                    }}
                >
                    <DropdownMenuLabel className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.20em] text-[rgba(4,14,32,0.40)]">
                        {group.label}
                    </DropdownMenuLabel>
                    <div className="space-y-0.5">
                        {visible.map(item => <NavLink key={item.to} item={item} />)}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    // ─ Grupos secundários (Publicações / Configurações / Sistema) ─────────────
    function SimpleGroup({ group }: { group: typeof OTHER_GROUPS[0] }) {
        const visible = group.items.filter(i => ability.can(i.action as any, i.subject as any))
        if (visible.length === 0) return null
        const active = visible.some(i => isActive(i.to))
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <TriggerBtn icon={group.icon} label={group.label} active={active} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    sideOffset={4}
                    className="w-60 rounded-2xl border border-[#e0e2e6] bg-white p-1.5"
                    style={{
                        boxShadow: 'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px',
                    }}
                >
                    <DropdownMenuLabel className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.20em] text-[rgba(4,14,32,0.40)]">
                        {group.label}
                    </DropdownMenuLabel>
                    <div className="space-y-0.5">
                        {visible.map(item => <NavLink key={item.to} item={item} />)}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <div className="flex min-w-max items-center gap-0.5 pr-2">
            {/* Fluxo de Trabalho */}
            <FluxoDropdown />

            {/* Divisor */}
            <div className="w-px h-4 bg-[#e0e2e6] mx-1" />

            {/* Portaria · Decreto · Revisão */}
            <GroupDropdown group={PORTARIAS_GROUP} />
            <GroupDropdown group={DECRETOS_GROUP} />
            <GroupDropdown group={REVISAO_GROUP} />

            {/* Divisor */}
            <div className="w-px h-4 bg-[#e0e2e6] mx-1" />

            {/* Grupos secundários */}
            {OTHER_GROUPS.map(group => (
                <SimpleGroup key={group.label} group={group} />
            ))}
        </div>
    )
}
