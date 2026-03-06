import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Lista REVISORs ativos de uma secretaria.
// Acessível por REVISOR, SECRETARIO e ADMIN_GERAL.
export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const rolesPermitidas = ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL']
        if (!rolesPermitidas.includes((session as any).role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const secretariaId = searchParams.get('secretariaId') || (session as any).secretariaId

        if (!secretariaId) {
            return NextResponse.json({ success: false, error: 'secretariaId é obrigatório' }, { status: 400 })
        }

        const revisores = await prisma.user.findMany({
            where: { role: 'REVISOR', ativo: true, secretariaId },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({ success: true, data: revisores })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Erro ao listar revisores' }, { status: 500 })
    }
}
