import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const result = await ModeloService.buscarPorId(id)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'Modelo')) {
            return NextResponse.json({ error: 'Sem permissão para editar modelos' }, { status: 403 })
        }

        const body = await request.json()
        const result = await ModeloService.atualizar(id, body)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'Modelo')) {
            return NextResponse.json({ error: 'Sem permissão para excluir modelos' }, { status: 403 })
        }

        const result = await ModeloService.desativar(id)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, message: 'Modelo desativado com sucesso' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
