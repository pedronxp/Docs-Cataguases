import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                criadoPor: {
                    select: { name: true, email: true },
                },
                secretaria: {
                    select: { nome: true, sigla: true },
                },
                feedAtividades: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        autor: { select: { name: true, username: true } }
                    }
                }
            },
        })

        if (!portaria) {
            return NextResponse.json(
                { success: false, error: 'Portaria não encontrada' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: portaria,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar portaria' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params
        const body = await request.json()

        const portaria = await prisma.portaria.update({
            where: { id },
            data: {
                ...body,
                updatedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            data: portaria,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar portaria' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()

        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        await prisma.portaria.delete({
            where: { id },
        })

        return NextResponse.json({
            success: true,
            message: 'Portaria excluída com sucesso',
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao excluir portaria' },
            { status: 500 }
        )
    }
}
