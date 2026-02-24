import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { UsuarioService } from '@/services/usuario.service'

const onboardingSchema = z.object({
    secretariaId: z.string().uuid('ID da secretaria inválido'),
    setorId: z.string().uuid('ID do setor inválido').optional()
})

export async function PATCH(request: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const parsed = onboardingSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Dados de lotação inválidos',
                details: parsed.error.flatten()
            }, { status: 400 })
        }

        const result = await UsuarioService.completarOnboarding(usuario.id as string, parsed.data)

        if (!result.ok) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            data: result.value
        })
    } catch (error) {
        console.error('Erro no endpoint de onboarding:', error)
        return NextResponse.json({
            success: false,
            error: 'Erro interno ao processar onboarding.'
        }, { status: 500 })
    }
}
