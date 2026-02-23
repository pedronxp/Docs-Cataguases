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
        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors font-medium border
        ${ativa
                    ? 'bg-blue-50/50 text-[#1351B4] border-blue-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }
      `}
        >
            <div className="flex items-center gap-2 truncate">
                {ativa
                    ? <FolderOpen size={16} className="text-[#1351B4] shrink-0" />
                    : <Folder size={16} className="text-slate-400 shrink-0" />
                }
                <span className="truncate">{secretaria.sigla}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ativa ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                {totalDocs}
            </span>
        </button>
    )
}
