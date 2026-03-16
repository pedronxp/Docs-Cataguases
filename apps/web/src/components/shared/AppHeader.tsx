import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon, Wifi } from 'lucide-react'
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

interface AppHeaderProps {
    title: string
    actions?: React.ReactNode
}

export function AppHeader({ title, actions }: AppHeaderProps) {
    const usuario = useAuthStore((s) => s.usuario)
    const clearSession = useAuthStore((s) => s.clearSession)
    const navigate = useNavigate()

    const handleLogout = () => {
        clearSession()
        navigate({ to: '/login' })
    }

    const initials = usuario?.name.substring(0, 2).toUpperCase() || 'US'

    useNotificationsSSE()

    return (
        <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 transition-all duration-300 shadow-sm shadow-slate-100/50">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-black text-slate-800 tracking-tight">{title}</h1>
                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100/80">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <Wifi size={9} className="text-emerald-600" />
                    <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Sincronizado</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                <NotificationBell />

                <div className="h-6 w-px bg-slate-200 mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 rounded-full pl-1.5 pr-4 flex items-center gap-2.5 hover:bg-slate-100 ring-1 ring-slate-200/80 shadow-sm">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] font-black text-white" style={{
                                    background: 'linear-gradient(135deg, #1351B4 0%, #0D3F8F 100%)'
                                }}>
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start -space-y-0.5">
                                <span className="text-xs font-semibold text-slate-700 leading-none">{usuario?.name}</span>
                                <span className="text-[10px] text-slate-400 capitalize leading-none mt-0.5">
                                    {usuario?.role?.replace('_', ' ').toLowerCase() || '...'}
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 shadow-lg shadow-slate-200/60" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold leading-none">{usuario?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {usuario?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/perfil">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Meu Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair do sistema</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

