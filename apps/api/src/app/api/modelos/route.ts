import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const secretariaId = searchParams.get('secretariaId')

        const modelos = await prisma.modeloDocumento.findMany({
            where: {
                ativo: true,
                OR: [
                    { secretariaId: null },
                    ...(secretariaId ? [{ secretariaId }] : []),
                ],
            },
            include: {
                variaveis: {
                    orderBy: { ordem: 'asc' },
                },
            },
            orderBy: { nome: 'asc' },
        })

        return NextResponse.json({
            success: true,
            data: modelos,
        })
    } catch (error) {
        console.error('Erro ao listar modelos:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao listar modelos de documento' },
            { status: 500 }
        )
    }
}
