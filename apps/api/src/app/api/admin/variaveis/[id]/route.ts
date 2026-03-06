import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import prisma from '@/lib/prisma'

// DELETE /api/admin/variaveis/[id]
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'VariavelSistema')) {
            return NextResponse.json({ error: 'Sem permissão para gerenciar variáveis' }, { status: 403 })
        }

        const params = await context.params

        // Busca a chave antes de excluir para o audit log
        const variavel = await prisma.variavelSistema.findUnique({ where: { id: params.id } })

        const result = await ModeloService.excluirVariavelSistema(params.id)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        if (variavel) {
            await prisma.feedAtividade.create({
                data: {
                    tipoEvento: 'VARIAVEL_EXCLUIDA',
                    mensagem: `Variável {{${variavel.chave}}} excluída`,
                    autorId: (usuario as any).id,
                    secretariaId: null,
                    portariaId: null,
                    metadata: { chave: variavel.chave }
                }
            }).catch(() => { /* não bloquear por falha no feed */ })
        }

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno ao excluir variável' }, { status: 500 })
    }
}
