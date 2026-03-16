import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['ADMIN_GERAL', 'ADMIN']

// PATCH — atualiza chave: ativa/desativa ou reseta esgotamento
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.role as string)) return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

    const { id } = await params

    let body: any
    try { body = await req.json() } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const key = await prisma.llmApiKey.findUnique({ where: { id } })
    if (!key) return NextResponse.json({ error: 'Chave não encontrada.' }, { status: 404 })

    const updateData: any = {}

    // Ativar/desativar
    if (typeof body.ativo === 'boolean') updateData.ativo = body.ativo

    // Reset manual de esgotamento
    if (body.resetEsgotamento === true) {
        updateData.esgotada = false
        updateData.esgotadaAte = null
    }

    const updated = await prisma.llmApiKey.update({
        where: { id },
        data: updateData,
        select: { id: true, provider: true, label: true, mask: true, ativo: true, esgotada: true, esgotadaAte: true },
    })

    return NextResponse.json({ success: true, key: updated })
}

// DELETE — remove chave permanentemente
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.role as string)) return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

    const { id } = await params

    const key = await prisma.llmApiKey.findUnique({ where: { id } })
    if (!key) return NextResponse.json({ error: 'Chave não encontrada.' }, { status: 404 })

    await prisma.llmApiKey.delete({ where: { id } })

    return NextResponse.json({ success: true, message: `Chave "${key.label}" removida.` })
}
