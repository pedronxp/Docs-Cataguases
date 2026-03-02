import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

        const { modelo, novaVersao } = result.value

        // Notifica usuários sobre o modelo atualizado / nova versão
        const mensagem = novaVersao
            ? `Modelo "${modelo.nome}" foi atualizado para v${(modelo as any).versao ?? 2}`
            : `Modelo "${modelo.nome}" foi modificado`
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: 'MODELO_ATUALIZADO',
                mensagem,
                autorId: (usuario as any).id,
                secretariaId: modelo.secretariaId ?? null,
                portariaId: null,
                metadata: { modeloId: modelo.id, modeloNome: modelo.nome, novaVersao: String(novaVersao) }
            }
        }).catch(() => { /* não bloquear update por falha no feed */ })

        return NextResponse.json({ success: true, data: modelo, novaVersao })
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

        // Bloquear exclusão se houver portarias vinculadas
        const result = await ModeloService.desativar(id)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

        return NextResponse.json({ success: true, message: 'Modelo desativado com sucesso' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
