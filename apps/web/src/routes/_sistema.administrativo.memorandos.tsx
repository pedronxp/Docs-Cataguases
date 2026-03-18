import { createFileRoute } from '@tanstack/react-router'
import { Construction, Clock, Bell } from 'lucide-react'

export const Route = createFileRoute('/_sistema/administrativo/memorandos')({
    component: MemorandosPage,
})

function MemorandosPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
            <div className="max-w-md w-full mx-auto text-center space-y-6">
                {/* Ícone animado */}
                <div className="relative mx-auto w-24 h-24">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center shadow-lg shadow-amber-100">
                        <Construction className="h-12 w-12 text-amber-500" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center">
                            <Clock className="h-2.5 w-2.5 text-white" />
                        </span>
                    </span>
                </div>

                {/* Título e descrição */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Memorandos
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Esta seção está sendo desenvolvida e estará disponível em breve.
                    </p>
                </div>

                {/* Badge informativo */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm font-semibold">
                    <Bell className="h-3.5 w-3.5" />
                    Em Construção
                </div>

                {/* Descrição detalhada */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-3 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">O que estará disponível</p>
                    <ul className="space-y-2.5">
                        {[
                            'Criação e edição de memorandos internos',
                            'Fluxo de revisão e aprovação',
                            'Assinatura digital integrada',
                            'Controle de numeração automática',
                            'Registro e rastreabilidade completos',
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                <span className="text-sm text-slate-600 font-medium">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
