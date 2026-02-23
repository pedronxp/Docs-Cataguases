import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { variaveis } = body

        if (!Array.isArray(variaveis)) {
            return NextResponse.json({ success: false, error: 'Lista de variáveis inválida' }, { status: 400 })
        }

        // Sincronização robusta via transação: remove e recria
        await prisma.$transaction([
            prisma.modeloVariavel.deleteMany({ where: { modeloId: params.id } }),
            prisma.modeloVariavel.createMany({
                data: variaveis.map((v: any, index: number) => ({
                    modeloId: params.id,
                    chave: v.chave,
                    label: v.label,
                    tipo: v.tipo || 'texto',
                    opcoes: v.opcoes || [],
                    obrigatorio: v.obrigatorio ?? true,
                    ordem: v.ordem ?? index,
                }))
            })
        ])

        const modeloAtualizado = await prisma.modeloDocumento.findUnique({
            where: { id: params.id },
            include: { variaveis: { orderBy: { ordem: 'asc' } } }
        })

        return NextResponse.json({ success: true, data: modeloAtualizado })
    } catch (error) {
        console.error('Erro ao gerenciar variáveis:', error)
        return NextResponse.json({ success: false, error: 'Erro ao atualizar variáveis do modelo' }, { status: 500 })
    }
}
