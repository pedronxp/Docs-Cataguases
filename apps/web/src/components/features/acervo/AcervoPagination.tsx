import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function AcervoPagination({ page, totalPages, onPageChange }: Props) {
    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between px-2 pt-4">
            <div className="text-sm text-slate-500">
                Página <span className="font-semibold text-slate-800">{page}</span> de <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 pl-2.5 text-slate-600"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 pr-2.5 text-slate-600"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
