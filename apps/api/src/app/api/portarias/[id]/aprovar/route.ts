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

        // Verifica se a portaria existe e qual a secretaria
        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria)
            return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })

        // No CASL backend, verificamos se tem permissão de aprovar NESTA portaria
        if (!ability.can('aprovar', 'Portaria', portaria as any))
            return NextResponse.json({ error: 'Sem permissão para aprovar esta portaria' }, { status: 403 })

        const body = await req.json().catch(() => ({}))
        const { observacao } = body

        const result = await PortariaService.aprovar(id, usuario.id as string, observacao)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        console.error('Erro ao aprovar portaria:', error)
        return NextResponse.json(
            { error: 'Erro interno ao aprovar portaria' },
            { status: 500 }
        )
    }
}
