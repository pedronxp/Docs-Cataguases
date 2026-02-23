import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        const { id } = await params

        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { role, ativo, secretariaId, setorId, permissoesExtra } = body

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(role && { role }),
                ...(ativo !== undefined && { ativo }),
                ...(secretariaId !== undefined && { secretariaId }),
                ...(setorId !== undefined && { setorId }),
                ...(permissoesExtra && { permissoesExtra }),
            },
        })

        const { password: _, ...userWithoutPassword } = updatedUser

        return NextResponse.json({
            success: true,
            data: userWithoutPassword,
        })
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar dados do servidor' },
            { status: 500 }
        )
    }
}
