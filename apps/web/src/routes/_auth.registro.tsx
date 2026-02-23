import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/auth.store'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import { useState } from 'react'

const registroSchema = z.object({
    nome: z.string().min(3, 'Nome muito curto'),
    email: z.string().email('E-mail inválido').refine(e => e.endsWith('@cataguases.mg.gov.br'), {
        message: 'Apenas e-mails @cataguases.mg.gov.br são permitidos'
    }),
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
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<RegistroForm>({
        resolver: zodResolver(registroSchema),
        defaultValues: { nome: '', email: '', password: '', confirmPassword: '' },
    })

    const onSubmit = (data: RegistroForm) => {
        // Simula registro: cria usuário com role PENDENTE e sem lotação
        setSession(
            {
                id: `user-${Date.now()}`,
                name: data.nome,
                email: data.email,
                role: 'PENDENTE',
                ativo: true,
                permissoesExtra: [],
                secretariaId: null,
                setorId: null,
                createdAt: new Date().toISOString()
            },
            'fake-jwt-token-pending'
        )
        // O router root vai capturar o PENDENTE + sem secretaria e mandar pro /onboarding
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
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="nome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-700">Nome Completo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Seu nome completo" className="border-slate-300" {...field} />
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
                                            <Input placeholder="servidor@cataguases.mg.gov.br" className="border-slate-300" {...field} />
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
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className="border-slate-300 pr-10"
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
                                            <Input type="password" placeholder="••••••••" className="border-slate-300" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white mt-4 font-bold h-11">
                                Cadastrar Servidor
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
