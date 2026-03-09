import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/config/secretarias/[id]/setores/[setorId]
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; setorId: string }> }
) {
    try {
        const { setorId } = await params
        const session = await getAuthUser()
        if (!session || (session as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await req.json()
        const schema = z.object({
            nome: z.string().min(2).optional(),
            sigla: z.string().min(1).max(20).optional(),
        })
        const parsed = schema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 })
        }

        const updated = await prisma.setor.update({
            where: { id: setorId },
            data: {
                ...(parsed.data.nome !== undefined && { nome: parsed.data.nome }),
                ...(parsed.data.sigla !== undefined && { sigla: parsed.data.sigla.toUpperCase() }),
            }
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Erro ao atualizar setor:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao atualizar setor' }, { status: 500 })
    }
}

// DELETE /api/admin/config/secretarias/[id]/setores/[setorId]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; setorId: string }> }
) {
    try {
        const { id, setorId } = await params
        const session = await getAuthUser()
        if (!session || (session as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        // Soft delete — marca como inativo para não quebrar relações
        await prisma.setor.update({
            where: { id: setorId },
            data: { ativo: false },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erro ao remover setor:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}
