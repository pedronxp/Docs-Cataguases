import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'

// DELETE /api/admin/variaveis/[id]
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'VariavelSistema')) {
            return NextResponse.json({ error: 'Sem permissão para gerenciar variáveis' }, { status: 403 })
        }

        const params = await context.params;
        const result = await ModeloService.excluirVariavelSistema(params.id)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno ao excluir variável' }, { status: 500 })
    }
}
