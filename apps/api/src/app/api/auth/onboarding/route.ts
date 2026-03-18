import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, getSession } from '@/lib/auth'
import { UsuarioService } from '@/services/usuario.service'

export const dynamic = 'force-dynamic'

const onboardingSchema = z.object({
    secretariaId: z.string().min(1, 'Secretaria é obrigatória'),
    setorId: z.string().optional()
})

export async function PATCH(request: NextRequest) {
    try {
        // Tenta autenticar via DB lookup primeiro
        let usuario = await getAuthUser()

        // Fallback: se getAuthUser falhar (ex: user não encontrado no DB),
        // usa getSession() para pegar o ID do JWT diretamente
        if (!usuario) {
            const session = await getSession()
            if (!session?.id) {
                console.warn('[onboarding] Token JWT inválido ou ausente')
                return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
            }
            // Usa o ID do JWT diretamente para o onboarding
            usuario = { id: session.id } as any
            console.warn(`[onboarding] getAuthUser() retornou null, usando session.id: ${session.id}`)
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

        const result = await UsuarioService.completarOnboarding(usuario!.id as string, parsed.data)

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
