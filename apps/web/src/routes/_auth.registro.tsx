import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, Building2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import api from '@/lib/api'
import { useIMask } from 'react-imask'

const registroSchema = z.object({
    nome: z.string().min(3, 'Nome muito curto'),
    email: z.string().email('E-mail inválido').refine(e => e.endsWith('@cataguases.mg.gov.br'), {
        message: 'Apenas e-mails institucionais oficiais (@cataguases.mg.gov.br) são permitidos'
    }),
    cpf: z.string()
        .transform(v => v.replace(/\D/g, ''))
        .refine(v => v.length === 11, 'CPF deve conter exatamente 11 números'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
})

type RegistroForm = z.infer<typeof registroSchema>

export const Route = createFileRoute('/_auth/registro')({
    component: RegistroPage,
})

function RegistroPage() {
    const setSession = useAuthStore(s => s.setSession)
    const navigate = useNavigate()
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const form = useForm<RegistroForm>({
        resolver: zodResolver(registroSchema),
        defaultValues: { nome: '', email: '', cpf: '', password: '', confirmPassword: '' },
    })

    // Mask logic using react-imask for CPF
    const { ref: cpfRef } = useIMask({ mask: '000.000.000-00' })

    const onSubmit = async (data: RegistroForm) => {
        setIsLoading(true)
        setServerError(null)

        try {
            // Chamada à nova rota real construída no backend
            const response = await api.post('/api/auth/registro', {
                name: data.nome,
                email: data.email,
                password: data.password,
                cpf: data.cpf, // Já desformatado pelo Zod .transform(...)
            })

            if (response.data.success) {
                const usuarioData = response.data.data

                // Em um cenário real, o backend já retornaria o JWT. Se não retornar, podemos forçar o login ou registrar a store assim:
                setSession(
                    {
                        id: usuarioData.id,
                        name: usuarioData.name,
                        email: usuarioData.email,
                        role: usuarioData.role, // Vai ser retornado 'PENDENTE' da API
                        ativo: usuarioData.ativo,
                        permissoesExtra: usuarioData.permissoesExtra || [],
                        secretariaId: usuarioData.secretariaId,
                        setorId: usuarioData.setorId,
                        createdAt: usuarioData.createdAt
                    },
                    // Caso o endpoint apenas registre e não gere token instantâneo, a UX dita forçar navegação pro login para gerar o ticket de sessão longo de verdade, ou mandamos pra onboarding
                    response.data.token || 'temp-registration-token'
                )

                // Transição baseada no banco: Se PENDENTE sem secretaria, o Route Guard em root.tsx deverá arrastar para /onboarding
                navigate({ to: '/_auth/onboarding' })
            } else {
                setServerError(response.data.error || 'Falha desconhecida no registro.')
            }
        } catch (error: any) {
            console.error('Registration failed:', error)
            setServerError(error.response?.data?.error || 'Não foi possível conectar ao servidor. Tente novamente mais tarde.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-sm border-slate-200 rounded-lg bg-white">
                <CardHeader className="space-y-4 text-center flex flex-col items-center pb-6">
                    <div className="w-16 h-16 rounded bg-primary flex items-center justify-center mb-2 shadow-sm" aria-hidden="true">
                        <Building2 size={32} className="text-white" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Criar Conta Servidor</CardTitle>
                        <CardDescription className="text-slate-500 text-sm">
                            Prefeitura de Cataguases . MG
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>

                    {serverError && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-start gap-2 border border-red-100">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <p className="flex-1">{serverError}</p>
                        </div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Seu nome completo" className="border-slate-300" disabled={isLoading} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cpf"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">CPF</FormLabel>
                                        <FormControl>
                                            <Input
                                                // Link inputs imask hook to input dom
                                                ref={cpfRef as any}
                                                // Maintain form sync
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                                placeholder="000.000.000-00"
                                                className="border-slate-300"
                                                disabled={isLoading}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">E-mail institucional</FormLabel>
                                        <FormControl>
                                            <Input placeholder="servidor@cataguases.mg.gov.br" className="border-slate-300" disabled={isLoading} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700">Senha</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="border-slate-300 pr-10"
                                                        disabled={isLoading}
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-700">Confirmar Senha</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" className="border-slate-300" disabled={isLoading} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white mt-4 font-bold h-11" disabled={isLoading}>
                                {isLoading ? "Criando conta..." : "Cadastrar Servidor"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-3 pt-2 pb-6">
                    <p className="text-xs text-slate-400 text-center px-6">
                        Apenas e-mails institucionais oficiais serão aprovados.
                    </p>
                    <Link to="/login" className="text-xs text-primary hover:underline font-bold">
                        Já possui conta? Fazer Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}

