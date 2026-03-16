/**
 * GET /api/notifications
 *
 * Lista as notificações do usuário autenticado (últimas 50, ordenadas por data).
 * Suporta ?naoLidas=true para filtrar apenas não lidas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const apenasNaoLidas = searchParams.get('naoLidas') === 'true'

    const userId = session.id as string

    let notificacoes: any[]

    if (apenasNaoLidas) {
        notificacoes = await prisma.$queryRaw`
            SELECT n.*, p.titulo as "portariaTitulo", p."numeroOficial" as "portariaNumero"
            FROM "Notificacao" n
            LEFT JOIN "Portaria" p ON p.id = n."portariaId"
            WHERE n."userId" = ${userId} AND n.lida = false
            ORDER BY n."criadoEm" DESC
            LIMIT 50
        `
    } else {
        notificacoes = await prisma.$queryRaw`
            SELECT n.*, p.titulo as "portariaTitulo", p."numeroOficial" as "portariaNumero"
            FROM "Notificacao" n
            LEFT JOIN "Portaria" p ON p.id = n."portariaId"
            WHERE n."userId" = ${userId}
            ORDER BY n."criadoEm" DESC
            LIMIT 50
        `
    }

    const [countRow]: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as total FROM "Notificacao"
        WHERE "userId" = ${userId} AND lida = false
    `

    return NextResponse.json({
        success: true,
        data: notificacoes,
        naoLidas: countRow?.total ?? 0,
    })
}
