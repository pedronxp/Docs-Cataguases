import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/feed?tipoEvento=VARIAVEL_CRIADA&autorId=xxx&dias=30
export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'all')) {
            return NextResponse.json({ error: 'Sem permissão para visualizar logs' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const tipoEvento = searchParams.get('tipoEvento') ?? undefined
        const autorId = searchParams.get('autorId') ?? undefined
        const dias = parseInt(searchParams.get('dias') ?? '30', 10)

        const desde = new Date()
        desde.setDate(desde.getDate() - dias)

        const where: any = { createdAt: { gte: desde } }
        if (tipoEvento) where.tipoEvento = tipoEvento
        if (autorId) where.autorId = autorId

        const eventos = await prisma.feedAtividade.findMany({
            where,
            include: {
                autor: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        })

        return NextResponse.json({ success: true, data: eventos })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
