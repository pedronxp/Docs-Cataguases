import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UsuarioService } from '@/services/usuario.service'
import { createToken } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const registroSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos numéricos').optional()
})

export async function POST(request: NextRequest) {
    try {
        // Rate limiting: máx. 10 registros por IP a cada hora; bloqueio de 1 hora após exceder
        const ip = getClientIp(request)
        const rl = checkRateLimit(`registro:${ip}`, 10, 60 * 60_000, 60 * 60_000)
        if (!rl.allowed) {
            return NextResponse.json(
                { success: false, error: `Limite de registros atingido. Tente novamente em ${rl.retryAfterSeconds}s.` },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rl.retryAfterSeconds),
                        'X-RateLimit-Limit': '10',
                        'X-RateLimit-Remaining': '0',
                    },
                }
            )
        }

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

        const usuario = result.value
        const token = await createToken({
            id: usuario.id,
            email: usuario.email,
            role: usuario.role,
        })

        return NextResponse.json({
            success: true,
            data: usuario,
            token: token
        })
    } catch (error) {
        console.error('Erro no endpoint de registro:', error)
        return NextResponse.json({
            success: false,
            error: 'Erro interno ao processar registro.'
        }, { status: 500 })
    }
}
