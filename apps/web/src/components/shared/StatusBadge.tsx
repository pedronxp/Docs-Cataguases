import { Badge } from '@/components/ui/badge'
import type { StatusPortaria } from '@/types/domain'

const STATUS_CONFIG: Record<StatusPortaria, { label: string; className: string }> = {
    RASCUNHO: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-300' },
    PROCESSANDO: { label: 'Processando…', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    PENDENTE: { label: 'Aguardando Revisão', className: 'bg-amber-100 text-amber-700 border-amber-300' },
    APROVADA: { label: 'Aprovada', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    PUBLICADA: { label: 'Publicada', className: 'bg-gov-green text-white border-transparent' },
    FALHA_PROCESSAMENTO: { label: 'Falha no PDF', className: 'bg-rose-100 text-rose-700 border-rose-300' },
    ERRO_GERACAO: { label: 'Falha no PDF', className: 'bg-rose-100 text-rose-700 border-rose-300' },
}

export function StatusBadge({ status }: { status: StatusPortaria }) {
    const config = STATUS_CONFIG[status]

    // Tratamento safe caso não ache algo configurado (fallback)
    if (!config) return <Badge variant="outline">{status}</Badge>

    return (
        <Badge
            variant="outline"
            className={`font-medium shadow-sm w-fit ${config.className}`}
        >
            {config.label}
        </Badge>
    )
}
