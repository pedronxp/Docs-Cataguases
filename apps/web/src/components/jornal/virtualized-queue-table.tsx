import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FileSignature, PenTool, FileX2, AlertCircle, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'

interface FilaItem {
    id: string
    portariaId: string
    tipoDocumento: string
    status: string
    numeroFinal: string | null
    createdAt: string
    portaria: {
        id: string
        titulo: string
        assinaturaStatus: string
        assinaturaJustificativa: string | null
        secretaria: {
            nome: string
            sigla: string
            cor: string
        }
    }
}

interface VirtualizedQueueTableProps {
    fila: FilaItem[]
    selectedItems: Set<string>
    canPublish: boolean
    fetchNextPage?: () => void
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
    onSelectItem: (id: string) => void
    onSelectAll: () => void
    allSelected: boolean
    onNumerar: (item: FilaItem) => void
}

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `há ${mins}min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `há ${hrs}h`
    return `há ${Math.floor(hrs / 24)}d`
}

function AssinaturaInfo({ status, justificativa }: { status: string; justificativa: string | null }) {
    if (status === 'ASSINADA_DIGITAL')
        return <Badge variant="outline" className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50"><FileSignature size={11} /> Digital</Badge>
    if (status === 'ASSINADA_MANUAL')
        return <Badge variant="outline" className="gap-1.5 text-blue-700 border-blue-200 bg-blue-50"><PenTool size={11} /> Manual</Badge>
    if (status === 'DISPENSADA_COM_JUSTIFICATIVA')
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1.5 text-amber-700 border-amber-200 bg-amber-50 cursor-default"><FileX2 size={11} /> Dispensada</Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs"><p className="text-xs">{justificativa || 'Sem justificativa'}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    return <Badge variant="outline" className="gap-1.5 text-slate-500"><AlertCircle size={11} /> Pendente</Badge>
}

export function VirtualizedQueueTable({
    fila,
    selectedItems,
    canPublish,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    onSelectItem,
    onSelectAll,
    allSelected,
    onNumerar
}: VirtualizedQueueTableProps) {
    const parentRef = useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: fila.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 8,
    })

    // Infinite scroll trigger
    useEffect(() => {
        const virtualItems = rowVirtualizer.getVirtualItems()
        const lastItem = virtualItems[virtualItems.length - 1]
        if (!lastItem) return

        if (lastItem.index >= fila.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage?.()
        }
    }, [hasNextPage, fetchNextPage, fila.length, isFetchingNextPage, rowVirtualizer.getVirtualItems()])

    if (fila.length === 0) {
        return (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="p-3 rounded-full bg-slate-100">
                    <CheckCircle2 className="h-5 w-5 text-slate-400" />
                </div>
                <p className="font-medium text-slate-600 text-sm">Fila vazia</p>
                <p className="text-xs">Nenhum documento aguardando numeração.</p>
            </div>
        )
    }

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-10 pl-4">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={onSelectAll}
                                aria-label="Selecionar todos"
                            />
                        </TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Secretaria</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide">Documento</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Assinatura</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Entrada</TableHead>
                        <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide pr-4">Ação</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>

            {/* Área virtualizada */}
            <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '600px' }}>
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = fila[virtualRow.index]
                        const isSelected = selectedItems.has(item.id)

                        return (
                            <div
                                key={item.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className={`flex items-center border-b border-slate-100 transition-colors ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                            >
                                {/* Checkbox */}
                                <div className="w-10 pl-4 shrink-0">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => onSelectItem(item.id)}
                                        aria-label={`Selecionar ${item.portaria.titulo}`}
                                    />
                                </div>

                                {/* Secretaria */}
                                <div className="flex-1 flex items-center gap-2 py-2 pr-2 min-w-[100px] max-w-[180px]">
                                    <span
                                        className="inline-flex items-center justify-center h-7 w-12 rounded text-xs font-bold text-white shrink-0"
                                        style={{ backgroundColor: item.portaria.secretaria.cor || '#6366f1' }}
                                    >
                                        {item.portaria.secretaria.sigla}
                                    </span>
                                    <span className="text-xs text-slate-500 hidden sm:block truncate">
                                        {item.portaria.secretaria.nome}
                                    </span>
                                </div>

                                {/* Documento */}
                                <div className="flex-[2] py-2 pr-4">
                                    <p className="font-medium text-sm text-slate-900 line-clamp-1">{item.portaria.titulo}</p>
                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.portariaId.slice(0, 8).toUpperCase()}</p>
                                </div>

                                {/* Assinatura */}
                                <div className="w-32 hidden md:block pr-4">
                                    <AssinaturaInfo status={item.portaria.assinaturaStatus} justificativa={item.portaria.assinaturaJustificativa} />
                                </div>

                                {/* Entrada */}
                                <div className="w-24 hidden lg:block pr-4">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs text-slate-500 cursor-default">{formatRelativeTime(item.createdAt)}</span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">{new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>

                                {/* Ação */}
                                <div className="w-28 text-right pr-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!canPublish}
                                        className="gap-1.5 text-slate-700 h-8 text-xs font-semibold"
                                        onClick={() => onNumerar(item)}
                                    >
                                        Numerar <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer: loading next page */}
            {isFetchingNextPage && (
                <div className="flex items-center justify-center py-3 text-slate-400 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">Carregando mais...</span>
                </div>
            )}
        </div>
    )
}
