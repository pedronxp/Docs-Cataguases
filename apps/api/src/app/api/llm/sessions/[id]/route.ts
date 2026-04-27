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
        const dbUser = await prisma.user.findUnique({ where: { id: session.id as string } })
        if (!dbUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        const chatSession = await (prisma as any).chatSession.findFirst({
            where: { id, userId: dbUser.id },
            include: {
                mensagens: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        anexo: { select: { id: true, titulo: true, numeroOficial: true } }
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const dbUser = await prisma.user.findUnique({ where: { id: session.id as string } })
        if (!dbUser) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

        await (prisma as any).chatSession.deleteMany({
            where: { id, userId: dbUser.id }
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error(`[DELETE /api/llm/sessions/${id}]`, err)
        return NextResponse.json({ error: 'Erro interno ao deletar sessão' }, { status: 500 })
    }
}
