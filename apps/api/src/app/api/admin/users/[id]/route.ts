import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { UsuarioService } from '@/services/usuario.service'
import { z } from 'zod'

const userUpdateSchema = z.object({
    role: z.enum(['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'GESTOR_SETOR', 'OPERADOR', 'PENDENTE']).optional(),
    ativo: z.boolean().optional(),
    permissoesExtra: z.array(z.string()).optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const parsed = userUpdateSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
        }

        const result = await UsuarioService.atualizarDadosAdmin(id, parsed.data)

        if (!result.ok) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            data: result.value
        })
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        return NextResponse.json(
            { success: false, error: 'Ocorreu um erro interno no servidor' },
            { status: 500 }
        )
    }
}
