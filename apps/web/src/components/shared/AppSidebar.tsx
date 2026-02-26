import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, FileText, Users, Settings, BookOpen, Braces, Archive, Building2, BarChart2, Network } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
    to: string
    label: string
    icon: LucideIcon
    action: string
    subject: string
    badge?: number
}

const NAV_ITEMS: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, action: 'ler', subject: 'FeedAtividade' },
    { to: '/administrativo/portarias', label: 'Portarias', icon: FileText, action: 'ler', subject: 'Portaria' },
    { to: '/acervo', label: 'Acervo Documental', icon: Archive, action: 'ler', subject: 'Portaria' },
    { to: '/admin/modelos', label: 'Modelos', icon: BookOpen, action: 'gerenciar', subject: 'Modelo' },
    { to: '/admin/gestao', label: 'Gestão Institucional', icon: Building2, action: 'gerenciar', subject: 'Secretaria' },
    { to: '/admin/organograma', label: 'Órgãos e Setores', icon: Building2, action: 'gerenciar', subject: 'Secretaria' },
    { to: '/admin/variaveis', label: 'Variáveis Globais', icon: Braces, action: 'gerenciar', subject: 'VariavelSistema' },
    { to: '/admin/livros', label: 'Numeração', icon: Settings, action: 'gerenciar', subject: 'LivroNumeracao' },
    { to: '/admin/analytics', label: 'Painel Analytics', icon: BarChart2, action: 'gerenciar', subject: 'Usuario' },
    { to: '/admin/usuarios', label: 'Usuários', icon: Users, action: 'gerenciar', subject: 'Usuario' },
    { to: '/admin/usuarios-orgao', label: 'Usuários por Órgão', icon: Network, action: 'gerenciar', subject: 'Usuario' },
    { to: '/tutorial', label: 'Tutorial', icon: BookOpen, action: 'ler', subject: 'Portaria' },
]

export function AppSidebar() {
    const ability = useAbility(AbilityContext)
    const router = useRouterState()

    return (
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col z-10">
            <div className="h-14 flex items-center px-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-sm" aria-hidden="true">
                        <Building2 size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm tracking-tight">Doc's <span className="text-primary tracking-tighter">Cataguases</span></span>
                </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) =>
                    ability.can(item.action as any, item.subject as any) ? (
                        <Link
                            key={item.to}
                            to={item.to as any}
                            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold transition-colors ${router.location.pathname.startsWith(item.to)
                                ? 'bg-slate-100/80 text-primary shadow-sm ring-1 ring-slate-200/50'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={18} className={router.location.pathname.startsWith(item.to) ? 'text-primary' : 'text-slate-400'} />
                                {item.label}
                            </div>
                            {item.badge && (
                                <span className="bg-slate-200/50 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ) : null
                )}
            </nav>
            <div className="p-4 border-t border-slate-100">
                <p className="text-xs text-center text-slate-400 font-medium">Prefeitura de Cataguases / MG</p>
            </div>
        </aside>
    )
}
