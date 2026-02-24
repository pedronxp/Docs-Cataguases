import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { UsuarioService } from '@/services/usuario.service'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getAuthUser()
        const { id } = params

        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { role, ativo, permissoesExtra } = await request.json()

        const result = await UsuarioService.atualizarDadosAdmin(params.id, {
            role,
            ativo,
            permissoesExtra
        })

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
