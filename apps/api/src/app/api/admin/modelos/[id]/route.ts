import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { nome, descricao, docxTemplateUrl, ativo, secretariaId } = body

        const modelo = await prisma.modeloDocumento.update({
            where: { id: params.id },
            data: {
                ...(nome && { nome }),
                ...(descricao !== undefined && { descricao }),
                ...(docxTemplateUrl && { docxTemplateUrl }),
                ...(ativo !== undefined && { ativo }),
                ...(secretariaId !== undefined && { secretariaId }),
            },
            include: {
                variaveis: true
            }
        })

        return NextResponse.json({ success: true, data: modelo })
    } catch (error) {
        console.error('Erro ao atualizar modelo:', error)
        return NextResponse.json({ success: false, error: 'Erro ao atualizar modelo' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        // Soft delete: apenas desativa o modelo
        await prisma.modeloDocumento.update({
            where: { id: params.id },
            data: { ativo: false }
        })

        return NextResponse.json({ success: true, message: 'Modelo desativado com sucesso' })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao desativar modelo' }, { status: 500 })
    }
}
