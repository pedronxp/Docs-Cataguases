/**
 * PATCH /api/notifications/read-all — Marca todas as notificações do usuário como lidas
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const userId = session.id as string

    await prisma.$executeRaw`
        UPDATE "Notificacao" SET lida = true
        WHERE "userId" = ${userId} AND lida = false
    `

    return NextResponse.json({ success: true })
}
