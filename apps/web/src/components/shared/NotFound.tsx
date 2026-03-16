import { Link, useRouter } from '@tanstack/react-router'
import { FileQuestion, Home, ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">

                {/* Número decorativo */}
                <div className="relative">
                    <p className="text-[8rem] font-black text-slate-100 leading-none select-none">404</p>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm">
                            <FileQuestion className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-800">Página não encontrada</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        A página que você está procurando não existe, foi movida ou o endereço foi digitado incorretamente.
                    </p>
                </div>

                {/* Sugestões */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-left space-y-2 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sugestões:</p>
                    <ul className="text-sm text-slate-600 space-y-1.5">
                        <li className="flex items-start gap-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            Verifique se o endereço está correto
                        </li>
                        <li className="flex items-start gap-2">
                            <Home className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            Acesse o painel e navegue pelo menu lateral
                        </li>
                        <li className="flex items-start gap-2">
                            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            Volte à página anterior
                        </li>
                    </ul>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={() => router.history.back()}
                        className="gap-2 text-sm font-semibold border-slate-200 text-slate-600 hover:border-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" /> Voltar
                    </Button>

                    <Link to="/dashboard">
                        <Button className="gap-2 text-sm font-bold bg-primary hover:bg-primary/90 text-white w-full sm:w-auto shadow-lg shadow-primary/20">
                            <Home className="w-4 h-4" /> Ir ao Painel
                        </Button>
                    </Link>
                </div>

                {/* Footer discreto */}
                <p className="text-[11px] text-slate-400 pt-2">
                    Doc's Cataguases · Prefeitura Municipal
                </p>
            </div>
        </div>
    )
}
