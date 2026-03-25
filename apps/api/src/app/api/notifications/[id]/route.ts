/**
 * PATCH /api/notifications/:id   — Marca notificação como lida
 * DELETE /api/notifications/:id  — Remove notificação
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const userId = session.id as string

    // Garante que a notificação pertence ao usuário
    const [existente]: any[] = await prisma.$queryRaw`
        SELECT id FROM "Notificacao" WHERE id = ${id} AND "userId" = ${userId}
    `;
    if (!existente) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });

    await prisma.$executeRaw`
        UPDATE "Notificacao" SET lida = true WHERE id = ${id}
    `;
    return NextResponse.json({ success: true })
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const userId = session.id as string

    await prisma.$executeRaw`
        DELETE FROM "Notificacao" WHERE id = ${id} AND "userId" = ${userId}
    `;

    return NextResponse.json({ success: true })
}
