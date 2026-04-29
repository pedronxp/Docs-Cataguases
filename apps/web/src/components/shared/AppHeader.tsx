import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Building2, Search, X } from 'lucide-react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { useNotificationsSSE } from '@/hooks/use-notifications-sse'
import { TopNavGroups } from '@/components/shared/TopNavGroups'
import { FloatingChat } from '@/components/chat/FloatingChat'
import { useEffect, useMemo, useRef, useState } from 'react'

interface AppHeaderProps {
    title?: string
    actions?: React.ReactNode
}

const SEARCH_ITEMS = [
    { label: 'Painel Geral', path: '/dashboard', keywords: 'dashboard painel inicio indicadores' },
    { label: 'Portarias', path: '/administrativo/portarias', keywords: 'portarias documentos listar' },
    { label: 'Nova Portaria', path: '/administrativo/portarias/novo', keywords: 'criar nova portaria documento' },
    { label: 'Decretos', path: '/administrativo/decretos', keywords: 'decretos listar' },
    { label: 'Novo Decreto', path: '/administrativo/decretos/novo', keywords: 'criar novo decreto' },
    { label: 'Acompanhamento', path: '/acompanhamento', keywords: 'assinatura acompanhamento andamento' },
    { label: 'Acervo Documental', path: '/acervo', keywords: 'acervo publicacoes publicados portal' },
    { label: 'Diario Oficial', path: '/diario-oficial', keywords: 'jornal diario oficial publicacao' },
    { label: 'Status de Documentos', path: '/status-documentos', keywords: 'status documentos situacao' },
    { label: 'Revisoes', path: '/revisao/todas', keywords: 'revisao revisoes todas' },
    { label: 'Fila de Revisao', path: '/revisao/fila', keywords: 'fila revisao pendentes' },
    { label: 'Minhas Revisoes', path: '/revisao/minhas', keywords: 'minhas revisoes atribuida' },
    { label: 'Modelos', path: '/admin/modelos', keywords: 'modelos templates documentos' },
    { label: 'Analytics', path: '/admin/analytics', keywords: 'relatorios metricas analytics desempenho' },
    { label: 'Analytics Avancado', path: '/admin/analytics-avancado', keywords: 'avancado sla produtividade metricas' },
    { label: 'Usuarios', path: '/admin/usuarios', keywords: 'usuarios acesso pessoas servidores' },
    { label: 'Gestao Institucional', path: '/admin/gestao', keywords: 'secretarias orgaos setores gestao' },
    { label: 'Variaveis Globais', path: '/admin/variaveis', keywords: 'variaveis globais campos' },
    { label: 'Workflows', path: '/admin/workflow', keywords: 'workflow fluxo aprovacao etapas' },
    { label: 'Painel de IA', path: '/admin/llm', keywords: 'ia llm chatbot inteligencia' },
    { label: 'Tutorial', path: '/tutorial', keywords: 'tutorial ajuda guia' },
    { label: 'Meu Perfil', path: '/perfil', keywords: 'perfil conta usuario senha' },
]

export function AppHeader({ actions }: AppHeaderProps) {
    const usuario = useAuthStore((s) => s.usuario)
    const clearSession = useAuthStore((s) => s.clearSession)
    const navigate = useNavigate()
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)

    const handleLogout = () => {
        clearSession()
        navigate({ to: '/login' })
    }

    const initials = usuario?.name.substring(0, 2).toUpperCase() || 'US'

    const searchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return SEARCH_ITEMS.slice(0, 6)
        return SEARCH_ITEMS
            .filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(query))
            .slice(0, 8)
    }, [searchQuery])

    useEffect(() => {
        if (!searchOpen) return
        const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 120)
        return () => window.clearTimeout(timeout)
    }, [searchOpen])

    function closeSearch() {
        setSearchOpen(false)
        setSearchQuery('')
    }

    function goToSearchResult(path: string) {
        closeSearch()
        navigate({ to: path as any })
    }

    function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            closeSearch()
            return
        }
        if (event.key === 'Enter' && searchResults[0]) {
            goToSearchResult(searchResults[0].path)
        }
    }

    useNotificationsSSE()

    return (
        <header
            className="h-14 border-b border-[#e0e2e6] bg-white/96 backdrop-blur-sm px-3 sm:px-4 lg:px-5 flex items-center justify-between shrink-0 sticky top-0 z-30 gap-2 lg:gap-4"
            style={{
                boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px, rgba(15,48,106,0.03) 0px 2px 8px',
            }}
        >
            {/* ── Esquerda: Logo + Navegação ── */}
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-4">
                {/* Logo */}
                <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
                    <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #1b61c9 0%, #0D4F9E 100%)',
                            boxShadow: 'rgba(27,97,201,0.3) 0px 2px 6px',
                        }}
                    >
                        <Building2 size={14} className="text-white" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="font-bold text-[#181d26] text-[13px]" style={{ letterSpacing: '0.08px' }}>
                            Doc's
                        </span>
                        <span className="text-[#1b61c9] font-semibold text-[9px]" style={{ letterSpacing: '0.14px' }}>
                            Cataguases
                        </span>
                    </div>
                </Link>

                {/* Divisor */}
                <div className="h-5 w-px bg-[#e0e2e6] shrink-0" />

                {/* Navegação em dropdowns */}
                <div className="hidden min-w-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-hide md:block">
                    <TopNavGroups />
                </div>
            </div>

            {/* ── Direita: Status + Ações + Notificações + User ── */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">


                {/* Actions customizados da página */}
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                <div className="relative">
                    <div
                        className={`flex items-center overflow-hidden rounded-[8px] border border-[#e0e2e6] bg-white transition-all duration-300 ease-standard ${
                            searchOpen ? 'w-[min(320px,calc(100vw-7rem))] shadow-sm sm:w-[320px]' : 'w-8'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="grid h-8 w-8 shrink-0 place-items-center text-[rgba(4,14,32,0.55)] transition-colors hover:text-[#1b61c9]"
                            aria-label="Pesquisar"
                        >
                            <Search size={15} />
                        </button>
                        <input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Pesquisar no sistema"
                            className={`h-8 min-w-0 flex-1 bg-transparent pr-2 text-[13px] text-[#181d26] outline-none placeholder:text-[rgba(4,14,32,0.35)] transition-opacity duration-200 ${
                                searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                        />
                        {searchOpen && (
                            <button
                                type="button"
                                onClick={closeSearch}
                                className="mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[rgba(4,14,32,0.45)] transition-colors hover:bg-[#f8fafc] hover:text-[#181d26]"
                                aria-label="Fechar pesquisa"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <div
                        className={`absolute right-0 top-10 w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#e0e2e6] bg-white p-1.5 transition-all duration-200 sm:w-[320px] ${
                            searchOpen ? 'translate-y-0 opacity-100 shadow-xl' : 'pointer-events-none -translate-y-1 opacity-0'
                        }`}
                        style={{ boxShadow: searchOpen ? 'rgba(15,48,106,0.12) 0px 12px 32px' : undefined }}
                    >
                        {searchResults.length > 0 ? (
                            searchResults.map((item) => (
                                <button
                                    key={item.path}
                                    type="button"
                                    onClick={() => goToSearchResult(item.path)}
                                    className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-medium text-[rgba(4,14,32,0.78)] transition-colors hover:bg-[#f8fafc] hover:text-[#1b61c9]"
                                >
                                    <Search size={13} className="text-[rgba(4,14,32,0.35)]" />
                                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                </button>
                            ))
                        ) : (
                            <div className="px-3 py-3 text-[12px] font-medium text-[rgba(4,14,32,0.45)]">
                                Nenhum resultado encontrado
                            </div>
                        )}
                    </div>
                </div>

                {/* Notificações */}
                <FloatingChat />
                <NotificationBell />

                <div className="h-5 w-px bg-[#e0e2e6]" />

                {/* Menu do usuário */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-8 max-w-[44px] rounded-[8px] pl-1.5 pr-2 sm:max-w-[132px] lg:max-w-[160px] xl:max-w-[184px] sm:pr-3 flex items-center gap-2 hover:bg-[#f8fafc] border border-[#e0e2e6] text-[#181d26]"
                        >
                            <Avatar className="h-5 w-5">
                                <AvatarFallback
                                    className="text-[9px] font-bold text-white"
                                    style={{ background: 'linear-gradient(135deg, #1b61c9 0%, #0D4F9E 100%)' }}
                                >
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden min-w-0 max-w-[88px] flex-col items-start -space-y-0.5 sm:flex lg:max-w-[116px] xl:max-w-[140px]">
                                <span
                                    className="block max-w-full truncate text-[11px] font-semibold text-[#181d26] leading-none"
                                    style={{ letterSpacing: '0.06px' }}
                                >
                                    {usuario?.name?.split(' ')[0]}
                                </span>
                                <span
                                    className="mt-0.5 block max-w-full truncate whitespace-nowrap text-[9px] capitalize leading-none text-[rgba(4,14,32,0.50)]"
                                    style={{ letterSpacing: '0.06px' }}
                                >
                                    {usuario?.role?.replace('_', ' ').toLowerCase() || '...'}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-2xl border border-[#e0e2e6] bg-white p-1.5"
                        style={{
                            boxShadow: 'rgba(0,0,0,0.32) 0px 0px 1px, rgba(0,0,0,0.08) 0px 0px 2px, rgba(45,127,249,0.28) 0px 1px 3px',
                        }}
                        align="end"
                        forceMount
                    >
                        <DropdownMenuLabel className="font-normal px-3 py-2">
                            <div className="flex items-center gap-2.5">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback
                                        className="text-xs font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, #1b61c9 0%, #0D4F9E 100%)' }}
                                    >
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col space-y-0.5 min-w-0">
                                    <p className="text-[13px] font-semibold text-[#181d26] leading-none truncate" style={{ letterSpacing: '0.08px' }}>
                                        {usuario?.name}
                                    </p>
                                    <p className="text-[10px] leading-none text-[rgba(4,14,32,0.50)] truncate">
                                        {usuario?.email}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#e0e2e6] my-1" />
                        <DropdownMenuItem asChild className="cursor-pointer rounded-[8px] focus:bg-[#f8fafc] focus:text-[#1b61c9] text-[#181d26]">
                            <Link to="/perfil" className="flex items-center gap-2 px-3 py-2 text-sm">
                                <UserIcon className="h-4 w-4" />
                                <span>Meu Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-[8px] px-3 py-2 text-sm gap-2 mb-0.5"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sair do sistema</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
