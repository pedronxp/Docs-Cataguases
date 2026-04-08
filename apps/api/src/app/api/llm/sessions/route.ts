import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const sessions = await (prisma as any).chatSession.findMany({
            where: { userId: session.id as string },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                titulo: true,
                provider: true,
                model: true,
                temperature: true,
                maxTokens: true,
                requestsCount: true,
                tokensInputTotal: true,
                tokensOutputTotal: true,
                createdAt: true,
                updatedAt: true,
            },
            take: 50,
        })

        return NextResponse.json({ sessions })
    } catch (err: any) {
        console.error('[GET /api/llm/sessions]', err)
        return NextResponse.json({ error: 'Erro interno ao buscar sessões' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const body = await req.json().catch(() => ({}))
        const { provider, model, temperature, maxTokens } = body

        const newSession = await (prisma as any).chatSession.create({
            data: {
                userId: session.id as string,
                titulo: 'Nova conversa',
                provider: provider || 'cerebras',
                model: model || 'llama3.1-8b',
                temperature: temperature ?? 0.6,
                maxTokens: maxTokens ?? 2048,
            },
        })

        return NextResponse.json({ session: newSession }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/llm/sessions]', err)
        return NextResponse.json({ error: 'Erro interno ao criar sessão' }, { status: 500 })
    }
}
