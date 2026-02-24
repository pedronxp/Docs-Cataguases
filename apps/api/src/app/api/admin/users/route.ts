import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const session = await getAuthUser()

        // Apenas admins podem listar todos os usuários
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado. Apenas administradores podem acessar esta lista.' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const role = searchParams.get('role')
        const ativo = searchParams.get('ativo')
        const busca = searchParams.get('busca')

        const where: any = {}
        if (role) where.role = role
        if (ativo) where.ativo = ativo === 'true'
        if (busca) {
            where.OR = [
                { name: { contains: busca, mode: 'insensitive' } },
                { email: { contains: busca, mode: 'insensitive' } },
            ]
        }

        const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' } as any,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                ativo: true,
                secretariaId: true,
                setorId: true,
                permissoesExtra: true,
            },
        })

        return NextResponse.json({
            success: true,
            data: users,
        })
    } catch (error) {
        console.error('Erro ao listar usuários:', error)
        return NextResponse.json(
            { success: false, error: 'Erro interno ao recuperar lista de usuários' },
            { status: 500 }
        )
    }
}
