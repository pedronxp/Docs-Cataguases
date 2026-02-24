import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { PortariaService } from '@/services/portaria.service'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria)
            return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })

        if (!ability.can('rejeitar', 'Portaria', portaria as any))
            return NextResponse.json({ error: 'Sem permissão para rejeitar esta portaria' }, { status: 403 })

        const body = await req.json().catch(() => ({}))
        const { observacao } = body

        if (!observacao) {
            return NextResponse.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 })
        }

        const result = await PortariaService.rejeitar(id, usuario.id as string, observacao)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        console.error('Erro ao rejeitar portaria:', error)
        return NextResponse.json(
            { error: 'Erro interno ao rejeitar portaria' },
            { status: 500 }
        )
    }
}
