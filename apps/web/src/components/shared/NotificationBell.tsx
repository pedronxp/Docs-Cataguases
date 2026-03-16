import { Bell, CheckCircle, XCircle, Clock, BookOpen, PenLine, CheckCheck, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotificationsStore } from '@/store/notifications.store'
import { useNavigate } from '@tanstack/react-router'
import type { NotificacaoItem } from '@/types/domain'

function EventoIcon({ tipo }: { tipo: string }) {
    if (tipo === 'MODELO_CRIADO' || tipo === 'MODELO_ATUALIZADO')
        return <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
    if (tipo.includes('APROVADA') || tipo.includes('APROVAR'))
        return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
    if (tipo.includes('REJEITADA') || tipo.includes('REJEITAR') || tipo.includes('DEVOLVIDO'))
        return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    if (tipo.includes('SUBMETIDA') || tipo.includes('SUBMETIDO') || tipo.includes('CRIADA'))
        return <Clock className="h-4 w-4 text-amber-500 shrink-0" />
    if (tipo.includes('PUBLICADA'))
        return <BookOpen className="h-4 w-4 text-blue-500 shrink-0" />
    if (tipo.includes('ASSINATURA') || tipo.includes('ASSINADA') || tipo.includes('DISPENSADA'))
        return <PenLine className="h-4 w-4 text-purple-500 shrink-0" />
    if (tipo.includes('REVISAO') || tipo.includes('REVISÃO') || tipo.includes('ATRIBUIDA'))
        return <CheckCheck className="h-4 w-4 text-amber-600 shrink-0" />
    return <Bell className="h-4 w-4 text-slate-400 shrink-0" />
}

function tempoRelativo(createdAt: string): string {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const min = Math.floor(diffMs / 60_000)
    if (min < 1) return 'agora mesmo'
    if (min === 1) return 'há 1 min'
    if (min < 60) return `há ${min} min`
    const h = Math.floor(min / 60)
    if (h === 1) return 'há 1 hora'
    if (h < 24) return `há ${h} horas`
    return `há ${Math.floor(h / 24)} dias`
}

function NotificacaoRow({
    notif,
    onClick,
}: {
    notif: NotificacaoItem
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!notif.lida ? 'bg-blue-50/40' : ''}`}
        >
            <div className="mt-0.5">
                <EventoIcon tipo={notif.tipoEvento} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                    {notif.mensagem}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {notif.portariaNumero && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded px-1 py-0.5">
                            {notif.portariaNumero}
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                        {tempoRelativo(notif.createdAt)}
                    </span>
                </div>
            </div>
        </button>
    )
}

export function NotificationBell() {
    const { notificacoes, naoLidas, marcarTodasLidas } = useNotificationsStore()
    const navigate = useNavigate()

    const handleClick = (n: NotificacaoItem) => {
        if (n.tipoEvento === 'MODELO_CRIADO' || n.tipoEvento === 'MODELO_ATUALIZADO') {
            navigate({ to: '/admin/modelos' })
            return
        }
        if (n.portariaId) {
            navigate({
                to: '/administrativo/portarias/$id',
                params: { id: n.portariaId },
            }).catch(() => {
                navigate({ to: '/administrativo/portarias' })
            })
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 hover:bg-slate-100"
                    aria-label={`Notificações${naoLidas > 0 ? `, ${naoLidas} não lidas` : ''}`}
                >
                    <Bell className="h-5 w-5 text-slate-600" />
                    {naoLidas > 0 && (
                        <span
                            role="status"
                            aria-label={`${naoLidas} notificações não lidas`}
                            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none"
                        >
                            {naoLidas > 9 ? '9+' : naoLidas}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-80 p-0" align="end" sideOffset={8}>
                {/* Cabeçalho */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">Notificações</h3>
                    {naoLidas > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-500 hover:text-slate-800 px-2"
                            onClick={(e) => {
                                e.preventDefault()
                                marcarTodasLidas()
                            }}
                        >
                            <CheckCheck className="h-3 w-3 mr-1" />
                            Marcar como lidas
                        </Button>
                    )}
                </div>

                {/* Lista */}
                <ScrollArea className="h-72">
                    {notificacoes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-10 gap-2 text-slate-400">
                            <Bell className="h-8 w-8 opacity-25" />
                            <p className="text-sm">Nenhuma notificação ainda</p>
                        </div>
                    ) : (
                        <div>
                            {notificacoes.map((n) => (
                                <NotificacaoRow
                                    key={n.id}
                                    notif={n}
                                    onClick={() => handleClick(n)}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
