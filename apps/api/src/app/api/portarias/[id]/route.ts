import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id: params.id },
            include: {
                modelo: {
                    include: { variaveis: true }
                },
                criadoPor: {
                    select: { name: true, email: true }
                }
            }
        })

        if (!portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })

        return NextResponse.json({ success: true, data: portaria })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao buscar portaria' }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { titulo, descricao, formData } = body

        const portaria = await prisma.portaria.update({
            where: { id: params.id },
            data: {
                ...(titulo && { titulo }),
                ...(descricao && { descricao }),
                ...(formData && { formData }),
            }
        })

        return NextResponse.json({ success: true, data: portaria })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao atualizar portaria' }, { status: 500 })
    }
}
