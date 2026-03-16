import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, LogOut, Clock, CheckCircle2, Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

export const Route = createFileRoute('/_auth/aguardando')({
    component: AguardandoPage,
})

// Verifica status do usuário a cada 15s
const POLL_INTERVAL_MS = 15_000

function AguardandoPage() {
    const navigate = useNavigate()
    const clearSession = useAuthStore(s => s.clearSession)
    const updateUsuario = useAuthStore(s => s.updateUsuario)
    const usuario = useAuthStore(s => s.usuario)

    const [aprovado, setAprovado] = useState(false)
    const [tempo, setTempo] = useState(0) // segundos aguardando
    const isMountedRef = useRef(true)

    // Polling: verifica se o role mudou de PENDENTE
    useEffect(() => {
        isMountedRef.current = true

        async function verificarStatus() {
            if (!isMountedRef.current) return
            try {
                const res = await api.get('/api/auth/me')
                if (res.data?.success && res.data?.data) {
                    const user = res.data.data
                    if (user.role !== 'PENDENTE') {
                        // Conta foi aprovada!
                        updateUsuario(user)
                        setAprovado(true)
                        // Aguarda 2.5s para exibir a mensagem de sucesso e redireciona
                        setTimeout(() => {
                            if (isMountedRef.current) {
                                navigate({ to: '/dashboard' })
                            }
                        }, 2500)
                    }
                }
            } catch {
                // falha silenciosa — tenta novamente no próximo ciclo
            }
        }

        verificarStatus()
        const interval = setInterval(verificarStatus, POLL_INTERVAL_MS)

        // Contador de tempo aguardando (atualiza a cada segundo)
        const timerInterval = setInterval(() => {
            if (isMountedRef.current) setTempo(t => t + 1)
        }, 1000)

        return () => {
            isMountedRef.current = false
            clearInterval(interval)
            clearInterval(timerInterval)
        }
    }, [])

    const handleLogout = () => {
        clearSession()
        navigate({ to: '/login' })
    }

    const formatTempo = (s: number) => {
        if (s < 60) return `${s}s`
        const m = Math.floor(s / 60)
        const r = s % 60
        return `${m}m ${r}s`
    }

    // Tela de aprovação
    if (aprovado) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white border border-green-200 rounded-2xl shadow-lg p-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-9 h-9 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Conta Aprovada!</h2>
                    <p className="text-slate-500 text-sm">
                        Seu acesso foi liberado pelo administrador.
                        Você será redirecionado automaticamente…
                    </p>
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Abrindo o sistema…
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                {/* Card principal */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    {/* Barra de progresso animada (efeito "aguardando") */}
                    <div className="h-1 w-full bg-slate-100 overflow-hidden">
                        <div className="h-full w-1/3 bg-primary/50 animate-pulse rounded-full" />
                    </div>

                    <div className="p-8 text-center space-y-5">
                        {/* Ícone */}
                        <div className="relative mx-auto w-fit">
                            <div className="p-4 rounded-full bg-amber-50 border border-amber-100">
                                <ShieldCheck className="w-14 h-14 text-amber-400" />
                            </div>
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                <Clock className="w-3 h-3 text-white" />
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Conta em Análise
                            </h1>
                            <p className="text-xs text-slate-400 font-medium">
                                Aguardando aprovação · {formatTempo(tempo)}
                            </p>
                        </div>

                        {/* Info da secretaria */}
                        {usuario?.secretariaId && (
                            <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                                <Building2 className="w-4 h-4 text-primary shrink-0" />
                                <p className="text-xs text-slate-600 font-medium">
                                    {(usuario as any)?.secretaria?.nome ?? 'Secretaria selecionada'}
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-slate-500 leading-relaxed">
                            Sua solicitação foi recebida com sucesso. Um administrador irá validar
                            seu vínculo institucional antes de liberar o acesso.
                        </p>

                        {/* Status do polling */}
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Verificando status automaticamente…
                        </div>

                        {/* Passos */}
                        <div className="text-left space-y-2.5 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                            {[
                                { step: 1, label: 'Cadastro realizado', done: true },
                                { step: 2, label: 'Lotação informada', done: true },
                                { step: 3, label: 'Validação pelo administrador', done: false },
                                { step: 4, label: 'Acesso ao sistema liberado', done: false },
                            ].map(({ step, label, done }) => (
                                <div key={step} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                                        done
                                            ? 'bg-green-500 text-white'
                                            : 'bg-slate-200 text-slate-400'
                                    }`}>
                                        {done ? '✓' : step}
                                    </div>
                                    <span className={`text-xs ${done ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair do sistema
                        </Button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 font-medium">
                    Prefeitura de Cataguases / MG · Doc's Cataguases v2.0
                </p>
            </div>
        </div>
    )
}
