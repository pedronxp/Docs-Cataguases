import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PenTool, X } from 'lucide-react'

interface BatchActionBarProps {
    selectedCount: number
    onClear: () => void
    onAction: () => void
}

export function BatchActionBar({ selectedCount, onClear, onAction }: BatchActionBarProps) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <Card className="bg-slate-900 text-white border-slate-800 shadow-2xl p-4 flex items-center gap-6 rounded-2xl ring-4 ring-primary/10">
                <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                    <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm">
                        {selectedCount}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold leading-none">Documentos selecionados</span>
                        <span className="text-[10px] text-slate-400 font-medium">Ações em lote ativadas</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={onAction}
                        className="bg-primary hover:bg-primary/90 text-white font-black h-10 px-6 rounded-xl shadow-lg shadow-primary/20"
                    >
                        <PenTool className="mr-2 h-4 w-4" />
                        Assinar Selecionados
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 h-10 px-3 transition-all"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Limpar Seleção
                    </Button>
                </div>
            </Card>
        </div>
    )
}
