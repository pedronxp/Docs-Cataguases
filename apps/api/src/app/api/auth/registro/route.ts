import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UsuarioService } from '@/services/usuario.service'
import { signToken } from '@/lib/jwt'

const registroSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos numéricos').optional()
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = registroSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Dados inválidos',
                details: parsed.error.flatten()
            }, { status: 400 })
        }

        const result = await UsuarioService.registrar(parsed.data)

        if (!result.ok) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 400 })
        }

        // Gerar token JWT para o novo usuário
        const token = await signToken({
            id: result.value.id,
            email: result.value.email,
            role: result.value.role,
            name: result.value.name
        })

        return NextResponse.json({
            success: true,
            data: result.value,
            token
        })
    } catch (error) {
        console.error('Erro no endpoint de registro:', error)
        return NextResponse.json({
            success: false,
            error: 'Erro interno ao processar registro.'
        }, { status: 500 })
    }
}
