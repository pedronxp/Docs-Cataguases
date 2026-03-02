import { Folder, FolderOpen } from 'lucide-react'
import type { Secretaria } from '@/types/domain'

interface Props {
    secretaria: Secretaria
    ativa: boolean
    totalDocs: number
    onClick: () => void
}

export function PastaSecretaria({ secretaria, ativa, totalDocs, onClick }: Props) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left
                transition-all duration-150 font-medium border-l-2
                ${ativa
                    ? 'bg-blue-50 text-[#1351B4] border-l-[#1351B4]'
                    : 'text-slate-600 border-l-transparent hover:bg-slate-50 hover:text-slate-800'
                }
            `}
        >
            <div className="flex items-center gap-2.5 truncate">
                {ativa
                    ? <FolderOpen size={15} className="text-[#1351B4] shrink-0" />
                    : <Folder size={15} className="text-slate-400 shrink-0" />
                }
                <span className="truncate text-[13px]">{secretaria.sigla}</span>
            </div>
            <span className={`
                text-[10px] font-black px-1.5 py-0.5 rounded min-w-[20px] text-center
                ${ativa ? 'bg-[#1351B4] text-white' : 'bg-slate-100 text-slate-500'}
            `}>
                {totalDocs}
            </span>
        </button>
    )
}
