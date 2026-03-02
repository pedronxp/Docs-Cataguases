import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface MetricCardProps {
    label: string
    value: string | number
    sub: string
    icon: React.ElementType
    highlight?: boolean
}

export function MetricCard({ label, value, sub, icon: Icon, highlight }: MetricCardProps) {
    return (
        <Card className={cn('border-slate-200', highlight && 'border-slate-300 bg-slate-50')}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className={cn('text-2xl font-bold truncate', highlight ? 'text-slate-900 font-mono text-lg' : 'text-slate-900')}>{value}</p>
                        <p className="text-xs text-slate-400">{sub}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 shrink-0 ml-3">
                        <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface MetricsGridProps {
    metricas: {
        pendentes: number
        publicadasHoje: number
        totalAno: number
        proximoNumero: string | null
    }
    icons: {
        ClipboardList: React.ElementType
        Calendar: React.ElementType
        Hash: React.ElementType
        TrendingUp: React.ElementType
    }
}

export function MetricsCards({ metricas, icons }: MetricsGridProps) {
    const anoAtual = new Date().getFullYear()
    const { ClipboardList, Calendar, Hash, TrendingUp } = icons

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
                label="Pendentes"
                value={metricas.pendentes}
                sub="Aguardando numeração"
                icon={ClipboardList}
            />
            <MetricCard
                label="Publicadas hoje"
                value={metricas.publicadasHoje}
                sub={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                icon={Calendar}
            />
            <MetricCard
                label="Próximo número"
                value={metricas.proximoNumero ?? '—'}
                sub="A ser atribuído na próxima ação"
                icon={Hash}
                highlight
            />
            <MetricCard
                label={`Total em ${anoAtual}`}
                value={metricas.totalAno}
                sub={`Desde jan/${anoAtual}`}
                icon={TrendingUp}
            />
        </div>
    )
}
