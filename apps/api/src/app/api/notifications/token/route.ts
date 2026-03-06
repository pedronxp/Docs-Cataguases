import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'secret-key-docs-cataguases-2024'
)

/**
 * POST /api/notifications/token
 *
 * Emite um token de curta duração (5 min) exclusivo para o canal SSE.
 * O JWT principal só contém {id, email, role} — este endpoint faz lookup no banco
 * para incluir secretariaId e setorId necessários ao filtro ABAC do stream.
 */
export async function POST() {
    const session = await getSession()

    if (!session) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    // O JWT principal só tem {id, email, role} — busca secretariaId/setorId no banco
    const user = await prisma.user.findUnique({
        where: { id: session.id as string },
        select: { secretariaId: true, setorId: true, role: true },
    })

    if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 })
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const sseToken = await new SignJWT({
        userId: session.id,
        secretariaId: user.secretariaId ?? null,
        setorId: user.setorId ?? null,
        role: user.role,
        purpose: 'sse',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(secret)

    return NextResponse.json({ sseToken, expiresAt })
}
