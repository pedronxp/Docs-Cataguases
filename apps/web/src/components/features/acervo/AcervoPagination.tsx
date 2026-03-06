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
        <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-slate-500">
                Página <span className="font-semibold text-slate-700">{page}</span> de{' '}
                <span className="font-semibold text-slate-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1 text-slate-600 border-slate-200 hover:border-[#1351B4]/30 hover:text-[#1351B4]"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-1 text-slate-600 border-slate-200 hover:border-[#1351B4]/30 hover:text-[#1351B4]"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}
