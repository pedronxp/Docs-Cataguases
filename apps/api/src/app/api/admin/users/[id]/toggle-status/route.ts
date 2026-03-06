import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { FeedService } from '@/services/feed.service'

export const dynamic = 'force-dynamic'

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

        const user = await prisma.user.findUnique({
            where: { id },
            select: { ativo: true, name: true, secretariaId: true }
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Usuário não encontrado' },
                { status: 404 }
            )
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { ativo: !user.ativo },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                ativo: true,
                secretariaId: true,
                setorId: true,
                permissoesExtra: true,
                createdAt: true,
            }
        })

        // Auditoria: registra no FeedAtividade (fire-and-forget)
        const novoStatus = updated.ativo
        FeedService.registrarEvento({
            tipoEvento: novoStatus ? 'ACESSO_REATIVADO' : 'ACESSO_REVOGADO',
            mensagem: `${novoStatus ? 'Acesso reativado' : 'Acesso desativado'}: ${user.name}`,
            autorId: session.id,
            secretariaId: user.secretariaId ?? null,
            metadata: { targetUserId: id, novoStatus }
        }).catch(e => console.error('Falha ao registrar auditoria:', e))

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error)
        return NextResponse.json(
            { success: false, error: 'Erro interno ao alterar status' },
            { status: 500 }
        )
    }
}
