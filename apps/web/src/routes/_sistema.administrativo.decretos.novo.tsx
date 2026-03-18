import { createFileRoute, Link } from '@tanstack/react-router'
import { Stamp, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_sistema/administrativo/decretos/novo')({
    component: NovoDecretoPage,
})

function NovoDecretoPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild className="h-8 rounded-xl border-slate-200 text-xs font-semibold">
                    <Link to="/administrativo/decretos">
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Voltar
                    </Link>
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Stamp className="text-primary h-3.5 w-3.5" />
                    </div>
                    <h1 className="text-xl font-black text-slate-900">Novo Decreto</h1>
                </div>
            </div>

            {/* Formulário reutiliza o mesmo wizard de portarias */}
            {/* Importar o componente de wizard aqui quando disponível */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Stamp className="h-7 w-7 text-primary" />
                </div>
                <div>
                    <p className="font-bold text-slate-800">Wizard de criação de Decreto</p>
                    <p className="text-sm text-slate-500 mt-1">
                        O formulário de criação de decretos segue o mesmo fluxo das portarias.<br />
                        Selecione um modelo do tipo Decreto para iniciar.
                    </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-6 rounded-xl shadow-sm shadow-primary/20 text-sm">
                    <Link to="/administrativo/portarias/novo">
                        Criar via Wizard de Portaria (temp.)
                    </Link>
                </Button>
                <p className="text-[10px] text-slate-400">
                    Wizard dedicado para Decretos em breve.
                </p>
            </div>
        </div>
    )
}
