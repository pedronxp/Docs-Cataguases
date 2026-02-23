import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

export const Route = createFileRoute('/_auth/aguardando')({
    component: AguardandoPage,
})

function AguardandoPage() {
    const navigate = useNavigate()
    const clearSession = useAuthStore(s => s.clearSession)
    const usuario = useAuthStore(s => s.usuario)

    const handleLogout = () => {
        clearSession()
        navigate({ to: '/login' })
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-sm border-slate-200 bg-white text-center p-6">
                <CardHeader className="space-y-4 flex flex-col items-center pb-6">
                    <div className="p-4 rounded-full bg-slate-50 border border-slate-100">
                        <ShieldCheck className="w-16 h-16 text-slate-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
                        Conta em Análise
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-slate-600">
                        Sua solicitação de acesso para a <span className="font-semibold text-slate-800">Secretaria de Recursos Humanos</span> foi recebida.
                    </p>
                    <p className="text-sm text-slate-500">
                        Por questões de segurança, um administrador precisa validar seu vínculo antes de liberar a criação de documentos oficiais.
                    </p>

                    <div className="pt-6">
                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair do sistema
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <p className="mt-8 text-xs text-slate-400 font-medium">
                Prefeitura de Cataguases / MG
            </p>
        </div>
    )
}
