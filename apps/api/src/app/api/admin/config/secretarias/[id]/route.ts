import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/config/secretarias/[id]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()

        // Soft delete — marca como inativo para não quebrar relações históricas (Portarias, Atividades, etc.)
        await prisma.secretaria.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro ao remover secretaria:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao remover órgão' }, { status: 500 })
    }
}
