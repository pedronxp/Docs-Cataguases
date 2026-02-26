import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { LogOut, User as UserIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

    return (
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-4">
                {actions && <div className="flex items-center gap-2">{actions}</div>}

                <div className="h-6 w-px bg-slate-200 mx-2" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 rounded-full pl-2 pr-4 flex items-center gap-3 hover:bg-slate-100 ring-1 ring-slate-200">
                            <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start -space-y-0.5">
                                <span className="text-sm font-medium text-slate-700">{usuario?.name}</span>
                                <span className="text-xs text-slate-500 capitalize">{usuario?.role?.replace('_', ' ').toLowerCase() || 'Carregando...'}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{usuario?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {usuario?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Meu Perfil</span>
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
