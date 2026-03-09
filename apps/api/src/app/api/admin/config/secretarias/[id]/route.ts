import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/config/secretarias/[id]
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || (session as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await req.json()
        const schema = z.object({
            nome: z.string().min(3).optional(),
            sigla: z.string().min(1).max(20).optional(),
            cor: z.string().optional(),
            titularId: z.string().nullable().optional(),
        })
        const parsed = schema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.issues }, { status: 400 })
        }

        const dataUpdate: any = {
            ...(parsed.data.nome !== undefined && { nome: parsed.data.nome }),
            ...(parsed.data.sigla !== undefined && { sigla: parsed.data.sigla.toUpperCase() }),
            ...(parsed.data.cor !== undefined && { cor: parsed.data.cor }),
        }

        if (parsed.data.titularId !== undefined) {
            dataUpdate.titularId = parsed.data.titularId
        }

        const updated = await prisma.secretaria.update({
            where: { id },
            data: dataUpdate
        })

        // Sincronização Automática com VariavelSistema (Se alterou o Titular)
        if (parsed.data.titularId !== undefined) {
            const chave = `SYS_SEC_${updated.sigla}_NOME`

            if (parsed.data.titularId) {
                // Tem novo Titular, buscar o nome
                const user = await prisma.user.findUnique({ where: { id: parsed.data.titularId } })
                if (user && user.name) {
                    await prisma.variavelSistema.upsert({
                        where: { chave },
                        update: { valor: user.name },
                        create: {
                            chave,
                            valor: user.name,
                            descricao: `Nome do Titular da ${updated.nome}`,
                            resolvidaAutomaticamente: true
                        }
                    })
                }
            } else {
                // Removeu o titular, deletar a variável se existir
                try {
                    await prisma.variavelSistema.delete({ where: { chave } })
                } catch (e) { /* ignora se já nao existir */ }
            }
        }

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Erro ao atualizar secretaria:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao atualizar secretaria' }, { status: 500 })
    }
}

// DELETE /api/admin/config/secretarias/[id]
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()

        // Soft delete — marca como inativo para não quebrar relações históricas (Portarias, Atividades, etc.)
        await prisma.secretaria.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Erro ao remover secretaria:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao remover órgão' }, { status: 500 })
    }
}
