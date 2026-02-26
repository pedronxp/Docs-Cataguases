import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
