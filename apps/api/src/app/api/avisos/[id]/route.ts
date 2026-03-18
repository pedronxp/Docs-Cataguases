import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SessionPayload { id: string; role: string }

// PATCH /api/avisos/[id] — atualiza aviso (ADMIN_GERAL)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        const session = rawSession as unknown as SessionPayload
        if (session.role !== 'ADMIN_GERAL') return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })

        const { id } = await params
        const body = await request.json()

        const aviso = await (prisma as any).avisoSistema.update({
            where: { id },
            data: {
                ...(body.titulo !== undefined && { titulo: body.titulo }),
                ...(body.mensagem !== undefined && { mensagem: body.mensagem }),
                ...(body.tipo !== undefined && { tipo: body.tipo }),
                ...(body.ativo !== undefined && { ativo: body.ativo }),
                ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
            },
        })
        return NextResponse.json({ success: true, data: aviso })
    } catch (error: any) {
        if (error.code === 'P2025') return NextResponse.json({ success: false, error: 'Aviso não encontrado' }, { status: 404 })
        return NextResponse.json({ success: false, error: 'Falha ao atualizar aviso' }, { status: 500 })
    }
}

// DELETE /api/avisos/[id] — remove aviso (ADMIN_GERAL)
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        const session = rawSession as unknown as SessionPayload
        if (session.role !== 'ADMIN_GERAL') return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })

        const { id } = await params
        await (prisma as any).avisoSistema.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.code === 'P2025') return NextResponse.json({ success: false, error: 'Aviso não encontrado' }, { status: 404 })
        return NextResponse.json({ success: false, error: 'Falha ao remover aviso' }, { status: 500 })
    }
}
