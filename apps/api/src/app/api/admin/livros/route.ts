import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()

        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'SECRETARIO')) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const livros = await prisma.livroNumeracao.findMany({
            orderBy: [{ ano: 'desc' }, { secretariaId: 'asc' }],
        })

        return NextResponse.json({
            success: true,
            data: livros,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao listar livros de numeração' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Apenas Administradores podem criar livros' },
                { status: 403 }
            )
        }

        const { secretariaId, setorId, ano, proximoNumero, formato } = await request.json()

        const livro = await prisma.livroNumeracao.create({
            data: {
                secretariaId,
                setorId,
                ano: ano || new Date().getFullYear(),
                proximoNumero: proximoNumero || 1,
                formato: formato || 'XXX/YYYY',
            },
        })

        return NextResponse.json({
            success: true,
            data: livro,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao criar livro de numeração' },
            { status: 500 }
        )
    }
}
