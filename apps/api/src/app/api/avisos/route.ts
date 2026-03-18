import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SessionPayload { id: string; role: string }

// GET /api/avisos — retorna avisos ativos (acessível a qualquer usuário logado)
export async function GET() {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const agora = new Date()
        const avisos = await (prisma as any).avisoSistema.findMany({
            where: {
                ativo: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: agora } },
                ],
            },
            orderBy: { criadoEm: 'desc' },
            take: 10,
        })

        return NextResponse.json({ success: true, data: avisos })
    } catch (error: any) {
        console.error('[GET /api/avisos]', error)
        return NextResponse.json({ success: false, error: 'Falha ao buscar avisos' }, { status: 500 })
    }
}

// POST /api/avisos — cria novo aviso (somente ADMIN_GERAL)
export async function POST(request: Request) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload
        if (session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Acesso restrito' }, { status: 403 })
        }

        const body = await request.json()
        const { titulo, mensagem, tipo, expiresAt } = body

        if (!titulo || !mensagem) {
            return NextResponse.json({ success: false, error: 'Título e mensagem são obrigatórios' }, { status: 400 })
        }

        const aviso = await (prisma as any).avisoSistema.create({
            data: {
                titulo,
                mensagem,
                tipo: tipo || 'INFO',
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                criadoPorId: session.id,
            },
        })

        return NextResponse.json({ success: true, data: aviso })
    } catch (error: any) {
        console.error('[POST /api/avisos]', error)
        return NextResponse.json({ success: false, error: 'Falha ao criar aviso' }, { status: 500 })
    }
}
