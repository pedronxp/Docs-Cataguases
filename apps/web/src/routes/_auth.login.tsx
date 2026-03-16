import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginForm } from '@/validators/portaria.schema'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, Building2, Lock, User, AlertCircle, FileText, Users, Shield, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'

export const Route = createFileRoute('/_auth/login')({
    component: LoginPage,
})

function LoginPage() {
    const navigate = useNavigate()
    const setSession = useAuthStore(s => s.setSession)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    })

    const onSubmit = async (data: LoginForm) => {
        setIsLoading(true)
        setError(null)
        try {
            const response = await api.post('/api/auth/login', {
                email: data.email,
                password: data.password
            })

            if (response.data.success) {
                const { user, token } = response.data.data
                setSession(user, token)
                if (user.role === 'PENDENTE') {
                    navigate({ to: user.secretariaId ? '/aguardando' : '/onboarding' })
                } else {
                    navigate({ to: '/dashboard' })
                }
            } else {
                setError(response.data.error || 'Credenciais inválidas')
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'E-mail/username ou senha inválidos')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* ── Painel esquerdo — Branding ── */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-gradient-to-b from-[#071D41] via-[#0f3d8a] to-primary flex-col justify-between p-8 xl:p-10 relative overflow-hidden shrink-0">
                {/* Elementos decorativos */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.03]" />
                    <div className="absolute bottom-32 -left-16 w-64 h-64 rounded-full bg-white/[0.03]" />
                    <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full border border-white/[0.06]" />
                </div>

                {/* Topo — Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-black text-white text-sm leading-tight">Doc's Cataguases</p>
                            <p className="text-white/50 text-[11px]">Prefeitura Municipal</p>
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-4">
                        <h1 className="text-[26px] xl:text-[30px] font-black text-white leading-[1.15] tracking-tight">
                            Sistema de Gestão
                            <br />
                            de Documentos
                            <br />
                            <span className="text-white/40">Oficiais</span>
                        </h1>
                        <p className="text-white/60 text-[13px] leading-relaxed max-w-[280px]">
                            Crie, revise, assine e publique portarias e atos administrativos em um ambiente seguro e rastreável.
                        </p>
                    </div>
                </div>

                {/* Feature cards */}
                <div className="relative z-10 space-y-2.5">
                    {[
                        { icon: FileText, label: 'Portarias & Atos', desc: 'Ciclo completo de documentos oficiais' },
                        { icon: Users, label: 'Multi-secretaria', desc: 'Controle de acesso por órgão e setor' },
                        { icon: Shield, label: 'Auditoria total', desc: 'Rastreabilidade e logs de ações' },
                    ].map(({ icon: Icon, label, desc }) => (
                        <div key={label} className="flex items-center gap-3 bg-white/[0.06] rounded-xl px-3.5 py-3 border border-white/[0.08]">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-white/90" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-xs font-bold leading-tight">{label}</p>
                                <p className="text-white/40 text-[10px] leading-snug mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                    <p className="text-white/25 text-[9px] pt-3 font-medium">
                        © 2026 Prefeitura de Cataguases · LGPD Compliant
                    </p>
                </div>
            </div>

            {/* ── Painel direito — Formulário ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 bg-white min-h-screen lg:min-h-0">
                <div className="w-full max-w-[380px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Logo mobile */}
                    <div className="lg:hidden flex flex-col items-center gap-2 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#071D41] to-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-black text-slate-900 text-lg">Doc's Cataguases</p>
                        <p className="text-[11px] text-slate-400">Prefeitura de Cataguases / MG</p>
                    </div>

                    {/* Cabeçalho */}
                    <div className="space-y-1.5">
                        <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">
                            Bem-vindo de volta
                        </h2>
                        <p className="text-[13px] text-slate-400">
                            Informe suas credenciais para acessar o sistema
                        </p>
                    </div>

                    {/* Formulário */}
                    <div className="space-y-5">
                        {error && (
                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs leading-snug">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[13px] font-bold text-slate-700">
                                                E-mail ou Username
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                                    <Input
                                                        disabled={isLoading}
                                                        placeholder="seu.usuario ou email@..."
                                                        className="pl-10 h-11 border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                                                        autoComplete="username"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-[13px] font-bold text-slate-700">Senha</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                                                    <Input
                                                        disabled={isLoading}
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        className="pl-10 pr-11 h-11 border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                                                        autoComplete="current-password"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isLoading}
                                                        onClick={() => setShowPassword(s => !s)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                                    >
                                                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-11 bg-[#071D41] hover:bg-[#0f3060] text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:shadow-xl hover:shadow-slate-900/15 text-sm mt-1"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Entrando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Entrar no sistema
                                            <ArrowRight className="w-4 h-4" />
                                        </span>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </div>

                    {/* Rodapé */}
                    <div className="text-center space-y-3 pt-2">
                        <div className="h-px bg-slate-100" />
                        <p className="text-[11px] text-slate-400">
                            Acesso restrito a servidores municipais
                        </p>
                        <Link
                            to="/registro"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold"
                        >
                            Não possui conta? Criar conta servidor <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
