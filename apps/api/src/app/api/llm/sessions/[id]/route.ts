import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const chatSession = await (prisma as any).chatSession.findFirst({
            where: { id, userId: session.id as string }, // userId garante isolamento
            include: {
                mensagens: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        role: true,
                        content: true,
                        tokens: true,
                        provider: true,
                        model: true,
                        toolCalls: true,
                        createdAt: true,
                    }
                }
            }
        })

        if (!chatSession) {
            return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ session: chatSession })
    } catch (err: any) {
        console.error(`[GET /api/llm/sessions/${id}]`, err)
        return NextResponse.json({ error: 'Erro interno ao buscar mensagens da sessão' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const body = await req.json().catch(() => ({}))
        const { titulo, provider, model, temperature, maxTokens } = body

        const existing = await (prisma as any).chatSession.findFirst({
            where: { id, userId: session.id as string }
        })
        if (!existing) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

        const updated = await (prisma as any).chatSession.update({
            where: { id },
            data: {
                ...(titulo !== undefined && { titulo }),
                ...(provider !== undefined && { provider }),
                ...(model !== undefined && { model }),
                ...(temperature !== undefined && { temperature }),
                ...(maxTokens !== undefined && { maxTokens }),
            }
        })

        return NextResponse.json({ session: updated })
    } catch (err: any) {
        console.error(`[PATCH /api/llm/sessions/${id}]`, err)
        return NextResponse.json({ error: 'Erro interno ao atualizar sessão' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const existing = await (prisma as any).chatSession.findFirst({
            where: { id, userId: session.id as string }
        })
        if (!existing) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

        await (prisma as any).chatSession.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error(`[DELETE /api/llm/sessions/${id}]`, err)
        return NextResponse.json({ error: 'Erro interno ao deletar sessão' }, { status: 500 })
    }
}
