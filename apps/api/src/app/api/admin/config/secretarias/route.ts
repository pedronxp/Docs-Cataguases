import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const secretarias = await prisma.secretaria.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' }
        })

        return NextResponse.json({
            success: true,
            data: secretarias,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao listar secretarias' },
            { status: 500 }
        )
    }
}
