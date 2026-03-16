import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({ where: { id: session.id as string } })

        if (!user) {
            return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
        }

        if (user.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Acesso negado. Apenas o Admin Geral pode atualizar o PIN.' }, { status: 403 })
        }

        const { pin } = await request.json()

        if (!pin || typeof pin !== 'string' || pin.length < 4) {
            return NextResponse.json({ success: false, error: 'PIN inválido. Mínimo 4 dígitos.' }, { status: 400 })
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { pinSeguranca: pin },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao atualizar PIN:', error)
        return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
    }
}
