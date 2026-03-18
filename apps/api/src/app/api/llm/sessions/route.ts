import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const dbUser = await prisma.user.findUnique({ where: { id: session.id as string } })
        if (!dbUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        const user = dbUser as any; // Bypass TS cache for new Prisma fields

        const sessions = await (prisma as any).chatSession.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                titulo: true,
                provider: true,
                model: true,
                updatedAt: true,
                createdAt: true,
                _count: {
                    select: { mensagens: true }
                }
            }
        })

        return NextResponse.json({ sessions, limiteTokens: user.limiteTokensLlm, tokensUsadosMes: user.tokensUsadosMesLlm })
    } catch (err: any) {
        console.error('[GET /api/llm/sessions]', err)
        return NextResponse.json({ error: 'Erro interno ao buscar sessões' }, { status: 500 })
    }
}
