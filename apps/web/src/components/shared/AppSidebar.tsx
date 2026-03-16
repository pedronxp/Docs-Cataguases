import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { Link, useRouterState } from '@tanstack/react-router'
import {
    LayoutDashboard, FileText, Users, Settings, BookOpen,
    Braces, Archive, Building2, BarChart2, Network,
    Newspaper, Activity, ChevronLeft, ChevronRight,
    ClipboardList, ClipboardCheck, GraduationCap, ScrollText,
    PlusCircle, List, Puzzle, ChevronDown, ChevronUp, Bot, Brain,
    Library,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui'
import { useSidebarCounts } from '@/hooks/use-sidebar-counts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useMemo } from 'react'

type NavLeaf = {
    to: string
    label: string
    icon: LucideIcon
    action: string
    subject: string
    badge?: number
}

type NavParent = {
    to?: undefined
    label: string
    icon: LucideIcon
    action: string
    subject: string
    children: NavLeaf[]
}

type NavItem = NavLeaf | NavParent

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
    {
        label: 'Fluxo de Trabalho',
        items: [
            { to: '/dashboard', label: 'Painel', icon: LayoutDashboard, action: 'ler', subject: 'FeedAtividade' },
            {
                label: 'Portarias', icon: FileText, action: 'ler', subject: 'Portaria',
                children: [
                    { to: '/administrativo/portarias', label: 'Listar Portarias', icon: List, action: 'ler', subject: 'Portaria' },
                    { to: '/administrativo/portarias/novo', label: 'Nova Portaria', icon: PlusCircle, action: 'criar', subject: 'Portaria' },
                ]
            },
            {
                label: 'Revisão', icon: ClipboardList, action: 'claim', subject: 'Revisao',
                children: [
                    { to: '/revisao/todas', label: 'Revisões', icon: Activity, action: 'gerenciar', subject: 'Revisao' },
                    { to: '/revisao/fila', label: 'Fila de Revisão', icon: ClipboardList, action: 'claim', subject: 'Revisao' },
                    { to: '/revisao/minhas', label: 'Minhas Revisões', icon: ClipboardCheck, action: 'transferir', subject: 'Revisao' },
                ]
            },
            { to: '/acompanhamento', label: 'Acompanhamento', icon: Activity, action: 'publicar', subject: 'Portaria' },
            { to: '/diario-oficial', label: 'Diário Oficial', icon: Newspaper, action: 'ler', subject: 'Portaria' },
        ]
    },
    {
        label: 'Acervo & Suporte',
        items: [
            { to: '/acervo', label: 'Portal de Publicações', icon: Library, action: 'ler', subject: 'Portaria' },
            { to: '/admin/modelos', label: 'Modelos', icon: BookOpen, action: 'gerenciar', subject: 'Modelo' },
            { to: '/tutorial', label: 'Tutorial', icon: GraduationCap, action: 'ler', subject: 'Portaria' },
        ]
    },
    {
        label: 'Administração',
        items: [
            { to: '/admin/gestao', label: 'Gestão Institucional', icon: Building2, action: 'gerenciar', subject: 'Secretaria' },
            { to: '/admin/variaveis', label: 'Variáveis Globais', icon: Braces, action: 'gerenciar', subject: 'VariavelSistema' },
            { to: '/admin/logs', label: 'Logs de Auditoria', icon: ScrollText, action: 'gerenciar', subject: 'all' },
            { to: '/admin/analytics', label: 'Painel Analytics', icon: BarChart2, action: 'ler', subject: 'Analytics' },
            { to: '/admin/analytics-avancado', label: 'Analytics Avançado', icon: BarChart2, action: 'gerenciar', subject: 'all' },
            { to: '/admin/integracoes', label: 'Integrações', icon: Puzzle, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/livros', label: 'Numeração/Livros', icon: Settings, action: 'gerenciar', subject: 'LivrosNumeracao' },
            { to: '/admin/llm', label: 'Painel de IA', icon: Bot, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/ia', label: 'Treinamento da IA', icon: Brain, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/usuarios', label: 'Usuários', icon: Users, action: 'gerenciar', subject: 'Usuario' },
            { to: '/admin/fila-aprovacao', label: 'Fila de Aprovação', icon: ClipboardCheck, action: 'gerenciar', subject: 'Usuario' },
        ]
    }
]

export function AppSidebar() {
    const ability = useAbility(AbilityContext)
    const router = useRouterState()
    const { isSidebarCollapsed, toggleSidebar } = useUIStore()
    const pathname = router.location.pathname
    const { counts } = useSidebarCounts()

    // Mapa de rota → badge para injeção dinâmica
    const ROUTE_BADGES: Record<string, number> = {
        '/revisao/fila':           counts.filaRevisao,
        '/revisao/minhas':         counts.minhasRevisoes,
        '/acompanhamento':         counts.aguardandoAssinatura,
        '/administrativo/portarias': counts.portariasCorrecao,
        '/admin/fila-aprovacao':   counts.filaAprovacao,
    }

    // ── Auto-expande grupos que contêm a rota ativa ────────────────────────────
    const autoExpanded = useMemo(() => {
        const expanded = new Set<string>()
        for (const group of NAV_GROUPS) {
            for (const item of group.items) {
                if (!isLeaf(item)) {
                    const childActive = item.children.some(c =>
                        pathname === c.to || pathname.startsWith(c.to + '/')
                    )
                    if (childActive) expanded.add(item.label)
                }
            }
        }
        return expanded
    }, [pathname])

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(autoExpanded)

    function toggleGroup(label: string) {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            next.has(label) ? next.delete(label) : next.add(label)
            return next
        })
    }

    function isLeaf(item: NavItem): item is NavLeaf {
        return 'to' in item && typeof item.to === 'string'
    }

    function isActive(to: string) {
        return pathname === to || pathname.startsWith(to + '/')
    }

    function renderLeaf(item: NavLeaf, indent = false) {
        const active = isActive(item.to)
        // Badge dinâmico do servidor tem prioridade sobre o estático declarado na rota
        const dynamicBadge = ROUTE_BADGES[item.to]
        const badge = dynamicBadge !== undefined ? dynamicBadge : (item.badge ?? 0)
        const navLink = (
            <Link
                key={item.to}
                to={item.to as any}
                className={`group flex items-center relative rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                        ? 'bg-primary/8 text-primary font-semibold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                } ${
                    isSidebarCollapsed
                        ? 'justify-center px-0 h-10 w-10 mx-auto'
                        : 'px-3 py-2 justify-between'
                }`}
                style={active && !isSidebarCollapsed ? {
                    background: 'linear-gradient(90deg, rgba(19,81,180,0.08) 0%, rgba(19,81,180,0.03) 100%)',
                } : undefined}
            >
                {/* Indicador da borda esquerda quando ativo */}
                {active && !isSidebarCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}

                <div className="flex items-center gap-2.5">
                    <item.icon
                        size={indent ? 14 : 18}
                        className={`shrink-0 transition-all duration-200 ${
                            active
                                ? 'text-primary'
                                : 'text-slate-400 group-hover:text-slate-600 group-hover:scale-105'
                        }`}
                    />
                    {!isSidebarCollapsed && (
                        <span className="whitespace-nowrap transition-colors duration-200 leading-none">
                            {item.label}
                        </span>
                    )}
                </div>

                {!isSidebarCollapsed && badge > 0 && (
                    <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}

                {isSidebarCollapsed && active && (
                    <div className="absolute -left-1 w-1 h-5 bg-primary rounded-full" />
                )}
                {isSidebarCollapsed && badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </Link>
        )

        if (isSidebarCollapsed) {
            return (
                <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold bg-slate-900 border-none shadow-xl text-xs">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            )
        }

        return navLink
    }

    function renderParent(item: NavParent) {
        const visibleChildren = item.children.filter(c => ability.can(c.action as any, c.subject as any))
        if (visibleChildren.length === 0) return null
        if (!ability.can(item.action as any, item.subject as any)) return null

        const isExpanded = expandedGroups.has(item.label) || autoExpanded.has(item.label)
        const anyChildActive = visibleChildren.some(c => isActive(c.to))

        if (isSidebarCollapsed) {
            // Ao clicar num item pai no modo recolhido: expande o sidebar e abre o grupo
            function handleCollapsedParentClick() {
                toggleSidebar()
                setExpandedGroups(prev => {
                    const next = new Set(prev)
                    next.add(item.label)
                    return next
                })
            }
            return (
                <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                        <button
                            className={`group flex items-center justify-center relative px-0 h-10 w-10 mx-auto rounded-xl text-sm font-medium transition-all duration-200 ${
                                anyChildActive
                                    ? 'bg-primary/8 text-primary'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                            onClick={handleCollapsedParentClick}
                        >
                            <item.icon
                                size={18}
                                className={`${anyChildActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}
                            />
                            {anyChildActive && <div className="absolute -left-1 w-1 h-5 bg-primary rounded-full" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold bg-slate-900 border-none shadow-xl text-xs">
                        {item.label} — clique para expandir
                    </TooltipContent>
                </Tooltip>
            )
        }

        return (
            <div key={item.label}>
                {/* FIX: position:relative adicionado para o indicador absoluto funcionar */}
                <button
                    onClick={() => toggleGroup(item.label)}
                    className={`relative w-full group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        anyChildActive
                            ? 'bg-primary/8 text-primary font-semibold'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                    style={anyChildActive ? {
                        background: 'linear-gradient(90deg, rgba(19,81,180,0.08) 0%, rgba(19,81,180,0.03) 100%)',
                    } : undefined}
                >
                    {anyChildActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    <div className="flex items-center gap-2.5">
                        <item.icon
                            size={18}
                            className={`transition-all duration-200 ${anyChildActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}
                        />
                        <span className="whitespace-nowrap">{item.label}</span>
                    </div>
                    {isExpanded
                        ? <ChevronUp size={12} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={12} className="text-slate-400 shrink-0" />
                    }
                </button>

                {isExpanded && (
                    <div className="mt-0.5 ml-4 pl-3 border-l-2 border-slate-100/80 space-y-0.5">
                        {visibleChildren.map(child => renderLeaf(child, true))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <aside
            className={`shrink-0 border-r border-slate-200/80 bg-white flex flex-col z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 bg-white overflow-hidden">
                <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[#0D3F8F] flex items-center justify-center shadow-md shadow-primary/25">
                        <Building2 size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm leading-tight tracking-tight">Doc's</span>
                        <span className="text-primary font-bold text-[11px] leading-tight">Cataguases</span>
                    </div>
                </div>

                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-primary/5 hover:text-primary transition-all border border-slate-200/80 shadow-sm"
                >
                    {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-7 overflow-y-auto scrollbar-hide custom-scrollbar">
                <TooltipProvider delayDuration={0}>
                    {NAV_GROUPS.map((group) => {
                        const visibleItems = group.items.filter(item => {
                            if (isLeaf(item)) return ability.can(item.action as any, item.subject as any)
                            return ability.can(item.action as any, item.subject as any) &&
                                item.children.some(c => ability.can(c.action as any, c.subject as any))
                        })
                        if (visibleItems.length === 0) return null

                        return (
                            <div key={group.label} className="space-y-0.5">
                                <div className={`px-3 mb-2.5 flex items-center gap-2 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                    {!isSidebarCollapsed ? (
                                        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400/80 whitespace-nowrap">
                                            {group.label}
                                        </span>
                                    ) : (
                                        <div className="w-4 h-px bg-slate-200" />
                                    )}
                                </div>

                                {visibleItems.map((item) => isLeaf(item) ? renderLeaf(item) : renderParent(item))}
                            </div>
                        )
                    })}
                </TooltipProvider>
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-slate-100 transition-all duration-300 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                {!isSidebarCollapsed ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Building2 size={10} className="text-primary" />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Prefeitura de Cataguases</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200/80 shadow-sm">
                        <Building2 size={14} className="text-slate-500" />
                    </div>
                )}
            </div>
        </aside>
    )
}
