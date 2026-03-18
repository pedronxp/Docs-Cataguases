import { NextResponse, type NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
}

/**
 * PATCH /api/feedback/[id]
 * Admin pode atualizar o status e deixar uma resposta para o feedback.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload
        if (session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { status, resposta } = body

        const STATUSES_VALIDOS = ['ABERTO', 'EM_ANALISE', 'RESOLVIDO']
        if (status && !STATUSES_VALIDOS.includes(status)) {
            return NextResponse.json({ success: false, error: 'Status inválido' }, { status: 400 })
        }

        const dados: Record<string, any> = {}
        if (status) dados.status = status
        if (resposta !== undefined) dados.resposta = resposta

        const feedback = await prisma.feedback.update({
            where: { id },
            data: dados,
        })

        return NextResponse.json({ success: true, data: feedback })
    } catch (error: any) {
        console.error('[PATCH /api/feedback/[id]]', error)
        if (error.code === 'P2025') {
            return NextResponse.json({ success: false, error: 'Feedback não encontrado' }, { status: 404 })
        }
        return NextResponse.json({ success: false, error: 'Falha ao atualizar feedback' }, { status: 500 })
    }
}
