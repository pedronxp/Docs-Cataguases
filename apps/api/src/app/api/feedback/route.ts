import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
}

// ── GET: Admin lista todos os feedbacks ───────────────────────────────────────
export async function GET() {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload
        if (session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })
        }

        const feedbacks = await prisma.feedback.findMany({
            orderBy: { criadoEm: 'desc' },
            include: {
                user: { select: { name: true, username: true, email: true } },
            },
        })

        return NextResponse.json({ success: true, data: feedbacks })
    } catch (error: any) {
        console.error('[GET /api/feedback]', error)
        return NextResponse.json(
            { success: false, error: 'Falha ao buscar feedbacks' },
            { status: 500 }
        )
    }
}

// ── POST: Usuário envia um novo feedback ──────────────────────────────────────
export async function POST(request: Request) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload

        const body = await request.json()
        const { tipo, titulo, descricao, prioridade } = body

        if (!tipo || !titulo || !descricao) {
            return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
        }

        const feedback = await prisma.feedback.create({
            data: {
                tipo,
                titulo,
                descricao,
                prioridade: prioridade || 'MEDIA',
                userId: session.id,
            }
        })

        return NextResponse.json({ success: true, data: feedback })
    } catch (error: any) {
        console.error('[POST /api/feedback]', error)
        return NextResponse.json(
            { success: false, error: 'Falha ao enviar feedback' },
            { status: 500 }
        )
    }
}
