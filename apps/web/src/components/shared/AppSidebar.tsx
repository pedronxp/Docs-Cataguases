import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { Link, useRouterState } from '@tanstack/react-router'
import {
    LayoutDashboard, FileText, Users, Settings, BookOpen,
    Braces, Archive, Building2, BarChart2, Network,
    Newspaper, Activity, ChevronLeft, ChevronRight,
    ClipboardList, ClipboardCheck, GraduationCap, ScrollText,
    PlusCircle, List, Puzzle, ChevronDown, ChevronUp, Bot
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUIStore } from '@/hooks/use-ui'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState } from 'react'

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
            { to: '/publicacoes', label: 'Portal de Publicações', icon: Archive, action: 'ler', subject: 'Portaria' },
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
            { to: '/admin/integracoes', label: 'Integrações', icon: Puzzle, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/livros', label: 'Numeração/Livros', icon: Settings, action: 'gerenciar', subject: 'LivroNumeracao' },
            { to: '/admin/analytics', label: 'Painel Analytics', icon: BarChart2, action: 'ler', subject: 'Analytics' },
            { to: '/admin/llm', label: 'Painel de IA', icon: Bot, action: 'gerenciar', subject: 'Configuracoes' },
            { to: '/admin/usuarios', label: 'Usuários', icon: Users, action: 'gerenciar', subject: 'Usuario' },
            { to: '/admin/usuarios-orgao', label: 'Lotação', icon: Network, action: 'gerenciar', subject: 'Usuario' },
        ]
    }
]

export function AppSidebar() {
    const ability = useAbility(AbilityContext)
    const router = useRouterState()
    const { isSidebarCollapsed, toggleSidebar } = useUIStore()
    const pathname = router.location.pathname

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        new Set(['Portarias', 'Revisão'])
    )

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
        const navLink = (
            <Link
                key={item.to}
                to={item.to as any}
                className={`group flex items-center relative px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${active
                    ? 'bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    } ${isSidebarCollapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : indent ? 'justify-between' : 'justify-between'}`}
            >
                <div className="flex items-center gap-2.5">
                    <item.icon
                        size={indent ? 15 : 19}
                        className={`shrink-0 transition-transform duration-200 ${active ? 'text-primary scale-110' : 'text-slate-400 group-hover:scale-105 group-hover:text-slate-600'}`}
                    />
                    {!isSidebarCollapsed && (
                        <span className="whitespace-nowrap transition-colors duration-200 leading-none">{item.label}</span>
                    )}
                </div>

                {!isSidebarCollapsed && item.badge && (
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-full ring-1 ring-primary/20">
                        {item.badge}
                    </span>
                )}

                {isSidebarCollapsed && active && (
                    <div className="absolute -left-1 w-1 h-5 bg-primary rounded-full" />
                )}
            </Link>
        )

        if (isSidebarCollapsed) {
            return (
                <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" className="font-bold bg-slate-900 border-none shadow-xl">
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

        const isExpanded = expandedGroups.has(item.label)
        const anyChildActive = visibleChildren.some(c => isActive(c.to))

        if (isSidebarCollapsed) {
            return (
                <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                        <button
                            className={`group flex items-center justify-center relative px-0 h-10 w-10 mx-auto rounded-xl text-sm font-bold transition-all duration-200 ${anyChildActive
                                ? 'bg-primary/5 text-primary ring-1 ring-primary/10'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            onClick={() => toggleGroup(item.label)}
                        >
                            <item.icon
                                size={20}
                                className={`${anyChildActive ? 'text-primary scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}
                            />
                            {anyChildActive && <div className="absolute -left-1 w-1 h-5 bg-primary rounded-full" />}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-bold bg-slate-900 border-none shadow-xl">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            )
        }

        return (
            <div key={item.label}>
                <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${anyChildActive
                        ? 'bg-primary/5 text-primary ring-1 ring-primary/10'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <item.icon
                            size={20}
                            className={`transition-transform duration-200 ${anyChildActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}
                        />
                        <span className="whitespace-nowrap">{item.label}</span>
                    </div>
                    {isExpanded
                        ? <ChevronUp size={13} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={13} className="text-slate-400 shrink-0" />
                    }
                </button>

                {isExpanded && (
                    <div className="mt-0.5 ml-4 pl-3 border-l-2 border-slate-100 space-y-0.5">
                        {visibleChildren.map(child => renderLeaf(child, true))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <aside
            className={`shrink-0 border-r border-slate-200 bg-white flex flex-col z-20 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
        >
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-white overflow-hidden">
                <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <div className="w-9 h-9 shrink-0 rounded bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                        <Building2 size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col whitespace-nowrap">
                        <span className="font-black text-slate-900 text-sm leading-tight tracking-tighter uppercase">Doc's</span>
                        <span className="text-primary font-bold text-xs leading-tight">Cataguases</span>
                    </div>
                </div>

                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary transition-all shadow-inner border border-slate-200"
                >
                    {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto scrollbar-hide custom-scrollbar">
                <TooltipProvider delayDuration={0}>
                    {NAV_GROUPS.map((group) => {
                        const visibleItems = group.items.filter(item => {
                            if (isLeaf(item)) return ability.can(item.action as any, item.subject as any)
                            return ability.can(item.action as any, item.subject as any) &&
                                item.children.some(c => ability.can(c.action as any, c.subject as any))
                        })
                        if (visibleItems.length === 0) return null

                        return (
                            <div key={group.label} className="space-y-1">
                                <div className={`px-3 mb-2 flex items-center gap-2 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                                    {!isSidebarCollapsed ? (
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                                            {group.label}
                                        </span>
                                    ) : (
                                        <div className="w-5 h-px bg-slate-200" />
                                    )}
                                </div>

                                {visibleItems.map((item) => isLeaf(item) ? renderLeaf(item) : renderParent(item))}
                            </div>
                        )
                    })}
                </TooltipProvider>
            </nav>

            <div className={`p-4 border-t border-slate-100 bg-slate-50/30 transition-all duration-300 ${isSidebarCollapsed ? 'items-center' : ''}`}>
                {!isSidebarCollapsed ? (
                    <div className="space-y-1">
                        <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-widest">Prefeitura de</p>
                        <p className="text-[11px] text-center text-slate-500 font-bold uppercase">Cataguases / MG</p>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                            PC
                        </div>
                    </div>
                )}
            </div>
        </aside>
    )
}
