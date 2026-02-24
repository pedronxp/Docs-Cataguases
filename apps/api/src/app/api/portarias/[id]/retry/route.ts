import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { PortariaService } from '@/services/portaria.service'
import prisma from '@/lib/prisma'

export async function PATCH(
    req: NextRequest, // Embora não usemos o body, mantemos por padrão
    { params }: { params: { id: string } }
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

        // No CASL, para retry, verificamos se tem permissão de 'editar' ou uma ação específica
        if (!ability.can('editar', 'Portaria', portaria as any))
            return NextResponse.json({ error: 'Sem permissão para reiniciar processamento desta portaria' }, { status: 403 })

        const result = await PortariaService.retry(id, usuario.id as string)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        console.error('Erro no retry da portaria:', error)
        return NextResponse.json(
            { error: 'Erro interno ao reiniciar processamento' },
            { status: 500 }
        )
    }
}
