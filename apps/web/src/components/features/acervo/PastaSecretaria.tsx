import { Building2 } from 'lucide-react'
import type { Secretaria } from '@/types/domain'

interface Props {
    secretaria: Secretaria
    ativa: boolean
    totalDocs: number
    onClick: () => void
}

export function PastaSecretaria({ secretaria, ativa, totalDocs, onClick }: Props) {
    const corSecretaria = secretaria.cor || '#6366f1'

    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left
                transition-all duration-150 border-l-3
                ${ativa
                    ? 'bg-blue-50/80 border-l-[#1351B4]'
                    : 'border-l-transparent hover:bg-slate-50'
                }
            `}
        >
            <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-black"
                style={{ backgroundColor: ativa ? '#1351B4' : corSecretaria }}
            >
                {secretaria.sigla ? secretaria.sigla.slice(0, 3) : <Building2 size={14} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-semibold truncate ${ativa ? 'text-[#1351B4]' : 'text-slate-700'}`}>
                    {secretaria.sigla || 'Todas'}
                </p>
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                    {secretaria.nome}
                </p>
            </div>
            <span className={`
                text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[22px] text-center shrink-0
                ${ativa ? 'bg-[#1351B4] text-white' : 'bg-slate-100 text-slate-500'}
            `}>
                {totalDocs}
            </span>
        </button>
    )
}
