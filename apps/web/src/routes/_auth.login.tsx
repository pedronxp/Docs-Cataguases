import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginForm } from '@/validators/portaria.schema'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, Building2 } from 'lucide-react'
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

                // Redirecionamento baseado no role
                if (user.role === 'PENDENTE') {
                    navigate({ to: user.secretariaId ? '/aguardando' : '/onboarding' })
                } else {
                    navigate({ to: '/dashboard' })
                }
            } else {
                setError(response.data.error || 'Erro ao realizar login')
            }
        } catch (err: any) {
            console.error('Login error:', err)
            setError(err.response?.data?.error || 'Email/Username ou senha inválidos')
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
                        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Doc's Cataguases</CardTitle>
                        <CardDescription className="text-slate-500 text-sm">
                            Prefeitura de Cataguases . MG
                        </CardDescription>
                    </div>
                </CardHeader>
                <div className="px-6">
                    <div className="h-px bg-slate-100 w-full mb-6" />
                </div>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">E-mail ou Username</FormLabel>
                                        <FormControl>
                                            <Input disabled={isLoading} placeholder="seu.usuario ou email@provedor.com" className="border-slate-300" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Senha</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    disabled={isLoading}
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="border-slate-300 pr-10"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isLoading}
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
                            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-white mt-4 font-bold h-11 transition-all shadow-sm">
                                {isLoading ? 'Entrando...' : 'Entrar no sistema'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center pt-2 pb-6">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-xs text-slate-400 text-center">
                            Acesso restrito a servidores municipais
                        </p>
                        <Link to="/registro" className="text-xs text-primary hover:underline font-bold">
                            Não possui conta? Criar conta servidor
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
