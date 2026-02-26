import { z } from 'zod'

export const criarPortariaSchema = z.object({
    titulo: z.string().min(10, 'Título deve ter no mínimo 10 caracteres').max(200, 'Título muito longo'),
    modeloId: z.string().min(1, 'Selecione um modelo de documento'),
    formData: z.record(z.string(), z.any()),
})
export type CriarPortariaForm = z.infer<typeof criarPortariaSchema>

export const loginSchema = z.object({
    email: z.string().min(3, 'Informe seu e-mail ou username'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
export type LoginForm = z.infer<typeof loginSchema>
