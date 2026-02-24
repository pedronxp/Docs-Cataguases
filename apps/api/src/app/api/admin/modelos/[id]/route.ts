import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import { z } from 'zod'

const atualizarModeloSchema = z.object({
    nome: z.string().optional(),
    descricao: z.string().optional(),
    docxTemplateUrl: z.string().url().optional(),
    ativo: z.boolean().optional(),
    variaveis: z.array(z.any()).optional()
})

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const result = await ModeloService.buscarPorId(id)
        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 404 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'ModeloDocumento'))
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

        const body = await req.json()
        const parsed = atualizarModeloSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const result = await ModeloService.atualizar(id, parsed.data)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'ModeloDocumento'))
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

        const result = await ModeloService.excluir(id)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao excluir modelo' }, { status: 500 })
    }
}
