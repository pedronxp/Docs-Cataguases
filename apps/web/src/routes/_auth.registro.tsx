import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import {
    Eye, EyeOff, Building2, AlertCircle, User, Mail,
    Lock, ChevronRight, ChevronLeft, CheckCircle2
} from 'lucide-react'
import api from '@/lib/api'

// ── Schema de validação ───────────────────────────────────────────────────────
const stepOneSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
})

const stepTwoSchema = z.object({
    username: z
        .string()
        .min(3, 'Mínimo 3 caracteres')
        .max(30, 'Máximo 30 caracteres')
        .regex(/^[a-zA-Z0-9_.]+$/, 'Somente letras, números, pontos e underlines'),
    email: z.string().email('E-mail inválido'),
    password: z
        .string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
        .regex(/[0-9]/, 'Deve conter ao menos um número'),
    confirmPassword: z.string(),
    aceitaTermos: z.literal(true, { errorMap: () => ({ message: 'Aceite os termos para continuar' }) }),
}).refine(d => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

type StepOneForm = z.infer<typeof stepOneSchema>

type StepTwoForm = z.infer<typeof stepTwoSchema>

export const Route = createFileRoute('/_auth/registro')({
    component: RegistroPage,
})

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 justify-center mb-6">
            {Array.from({ length: total }, (_, i) => {
                const idx = i + 1
                const done = idx < current
                const active = idx === current
                return (
                    <div key={idx} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            done ? 'bg-green-500 text-white' :
                            active ? 'bg-primary text-white shadow-lg shadow-primary/30' :
                            'bg-slate-100 text-slate-400'
                        }`}>
                            {done ? '✓' : idx}
                        </div>
                        {idx < total && (
                            <div className={`w-8 h-px ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: '8+ caracteres', ok: password.length >= 8 },
        { label: 'Maiúscula', ok: /[A-Z]/.test(password) },
        { label: 'Número', ok: /[0-9]/.test(password) },
    ]
    const strength = checks.filter(c => c.ok).length
    const colors = ['bg-red-400', 'bg-amber-400', 'bg-green-500']

    if (!password) return null

    return (
        <div className="mt-1.5 space-y-1.5">
            <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                            i < strength ? colors[strength - 1] : 'bg-slate-100'
                        }`}
                    />
                ))}
            </div>
            <div className="flex gap-3">
                {checks.map(({ label, ok }) => (
                    <span key={label} className={`text-[10px] flex items-center gap-0.5 ${ok ? 'text-green-600' : 'text-slate-400'}`}>
                        <span>{ok ? '✓' : '○'}</span> {label}
                    </span>
                ))}
            </div>
        </div>
    )
}

function RegistroPage() {
    const setSession = useAuthStore(s => s.setSession)
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)
    const [stepOneData, setStepOneData] = useState<StepOneForm | null>(null)

    const formOne = useForm<StepOneForm>({
        resolver: zodResolver(stepOneSchema),
        defaultValues: { nome: '' },
    })

    const formTwo = useForm<StepTwoForm>({
        resolver: zodResolver(stepTwoSchema),
        defaultValues: { username: '', email: '', password: '', confirmPassword: '', aceitaTermos: undefined as any },
    })

    const password = formTwo.watch('password')

    const onStepOne = (data: StepOneForm) => {
        setStepOneData(data)
        setStep(2)
    }

    const onStepTwo = async (data: StepTwoForm) => {
        if (!stepOneData) return
        setIsLoading(true)
        setServerError(null)

        try {
            const response = await api.post('/api/auth/registro', {
                name: stepOneData.nome,
                username: data.username,
                email: data.email,
                password: data.password,
            })

            if (response.data.success) {
                const usuarioData = response.data.data
                setSession(
                    {
                        id: usuarioData.id,
                        name: usuarioData.name,
                        email: usuarioData.email,
                        role: usuarioData.role,
                        ativo: usuarioData.ativo,
                        permissoesExtra: usuarioData.permissoesExtra || [],
                        secretariaId: usuarioData.secretariaId,
                        setorId: usuarioData.setorId,
                        createdAt: usuarioData.createdAt,
                    },
                    response.data.token || 'temp-registration-token'
                )
                navigate({ to: '/onboarding' })
            } else {
                setServerError(response.data.error || 'Falha ao criar conta.')
            }
        } catch (error: any) {
            setServerError(error.response?.data?.error || 'Não foi possível conectar ao servidor.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-5 animate-in slide-in-from-bottom duration-400">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-lg shadow-primary/25">
                            <Building2 className="text-white w-5 h-5" />
                        </div>
                    </div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Criar Conta</h1>
                    <p className="text-sm text-slate-400">Doc's Cataguases · Prefeitura de Cataguases/MG</p>
                </div>

                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-400" />
                    <div className="p-6">
                        <StepIndicator current={step} total={2} />

                        {serverError && (
                            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-start gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>{serverError}</p>
                            </div>
                        )}

                        {/* Passo 1 — Dados Pessoais */}
                        {step === 1 && (
                            <Form {...formOne}>
                                <form onSubmit={formOne.handleSubmit(onStepOne)} className="space-y-4">
                                    <div className="text-center mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center mx-auto mb-2">
                                            <User className="w-4 h-4 text-primary" />
                                        </div>
                                        <h2 className="text-sm font-bold text-slate-800">Dados Pessoais</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Informações de identificação funcional</p>
                                    </div>

                                    <FormField
                                        control={formOne.control}
                                        name="nome"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-700">Nome Completo *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Ex: João da Silva Santos"
                                                        className="h-10 border-slate-200 rounded-xl text-sm focus-visible:ring-primary/30"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />


                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2.5">
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            Após o cadastro, você precisará informar sua secretaria/setor para que o administrador valide o acesso.
                                        </p>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-sm shadow-primary/20"
                                    >
                                        Continuar <ChevronRight className="ml-1.5 w-4 h-4" />
                                    </Button>
                                </form>
                            </Form>
                        )}

                        {/* Passo 2 — Credenciais */}
                        {step === 2 && (
                            <Form {...formTwo}>
                                <form onSubmit={formTwo.handleSubmit(onStepTwo)} className="space-y-4">
                                    <div className="text-center mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center mx-auto mb-2">
                                            <Lock className="w-4 h-4 text-primary" />
                                        </div>
                                        <h2 className="text-sm font-bold text-slate-800">Credenciais de Acesso</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Defina como você vai entrar no sistema</p>
                                    </div>

                                    <FormField
                                        control={formTwo.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-700">
                                                    Nome de Usuário *
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                                                        <Input
                                                            placeholder="joao.silva"
                                                            className="h-10 pl-7 border-slate-200 rounded-xl text-sm"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <p className="text-[10px] text-slate-400">Letras, números, pontos e underlines. Usado para login rápido.</p>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={formTwo.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-700">E-mail *</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <Input
                                                            placeholder="servidor@cataguases.mg.gov.br"
                                                            className="h-10 pl-9 border-slate-200 rounded-xl text-sm"
                                                            type="email"
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={formTwo.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-700">Senha *</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder="Mínimo 8 caracteres"
                                                            className="h-10 pl-9 pr-10 border-slate-200 rounded-xl text-sm"
                                                            {...field}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(s => !s)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <PasswordStrength password={password ?? ''} />
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={formTwo.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-slate-700">Confirmar Senha *</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Repita a senha"
                                                        className="h-10 border-slate-200 rounded-xl text-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Aceite de termos */}
                                    <FormField
                                        control={formTwo.control}
                                        name="aceitaTermos"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex items-start gap-2.5">
                                                    <div
                                                        role="checkbox"
                                                        aria-checked={!!field.value}
                                                        tabIndex={0}
                                                        onClick={() => field.onChange(field.value ? undefined : true)}
                                                        onKeyDown={e => e.key === ' ' && field.onChange(field.value ? undefined : true)}
                                                        className={`w-4 h-4 mt-0.5 shrink-0 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                                                            field.value
                                                                ? 'bg-primary border-primary'
                                                                : 'border-slate-300 bg-white'
                                                        }`}
                                                    >
                                                        {field.value && <span className="text-white text-[9px] font-black leading-none">✓</span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed">
                                                        Li e aceito os{' '}
                                                        <Link to={'/sobre' as any} className="text-primary hover:underline font-medium" target="_blank">
                                                            Termos de Uso e Política de Privacidade
                                                        </Link>
                                                        {' '}do sistema, em conformidade com a{' '}
                                                        <span className="font-medium text-slate-700">LGPD</span>.
                                                    </p>
                                                </div>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep(1)}
                                            className="flex-1 h-10 border-slate-200 text-slate-600 rounded-xl text-sm"
                                        >
                                            <ChevronLeft className="mr-1 w-4 h-4" /> Voltar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-sm shadow-primary/20 text-sm"
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    Criando…
                                                </span>
                                            ) : (
                                                <>Criar Conta <CheckCircle2 className="ml-1.5 w-4 h-4" /></>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400">
                    Já tem conta?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                        Fazer Login
                    </Link>
                </p>
            </div>
        </div>
    )
}
