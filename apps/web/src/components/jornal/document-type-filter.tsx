import { cn } from '@/lib/utils'

type TipoDocumento = 'TODOS' | 'PORTARIA' | 'MEMORANDO' | 'OFICIO' | 'LEI'

const tipos: { value: TipoDocumento; label: string; color: string }[] = [
    { value: 'TODOS', label: 'Todos', color: 'bg-slate-100 text-slate-700 ring-slate-300' },
    { value: 'PORTARIA', label: 'Portaria', color: 'bg-violet-50 text-violet-700 ring-violet-300' },
    { value: 'MEMORANDO', label: 'Memorando', color: 'bg-blue-50 text-blue-700 ring-blue-300' },
    { value: 'OFICIO', label: 'Ofício', color: 'bg-teal-50 text-teal-700 ring-teal-300' },
    { value: 'LEI', label: 'Lei', color: 'bg-amber-50 text-amber-700 ring-amber-300' },
]

interface DocumentTypeFilterProps {
    selected: TipoDocumento
    total?: number
    counts?: Record<string, number>
    onChange: (tipo: TipoDocumento) => void
}

export function DocumentTypeFilter({ selected, total, counts, onChange }: DocumentTypeFilterProps) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {tipos.map((tipo) => {
                const isActive = selected === tipo.value
                const count = tipo.value === 'TODOS'
                    ? total
                    : counts?.[tipo.value]

                return (
                    <button
                        key={tipo.value}
                        onClick={() => onChange(tipo.value)}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium transition-all',
                            'ring-1 focus:outline-none focus:ring-2',
                            isActive
                                ? `${tipo.color} ring-2 shadow-sm`
                                : 'bg-white text-slate-500 ring-slate-200 hover:ring-slate-300 hover:text-slate-700'
                        )}
                    >
                        {tipo.value !== 'TODOS' && (
                            <span className={cn(
                                'inline-block w-1.5 h-1.5 rounded-full',
                                isActive
                                    ? tipo.value === 'PORTARIA' ? 'bg-violet-500'
                                        : tipo.value === 'MEMORANDO' ? 'bg-blue-500'
                                            : tipo.value === 'OFICIO' ? 'bg-teal-500'
                                                : 'bg-amber-500'
                                    : 'bg-slate-300'
                            )} />
                        )}
                        {tipo.label}
                        {typeof count === 'number' && (
                            <span className={cn(
                                'ml-0.5 font-semibold tabular-nums',
                                isActive ? 'opacity-100' : 'opacity-50'
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
