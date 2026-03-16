import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        let user = await prisma.user.findUnique({
            where: { id: session.id as string },
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Usuário não encontrado' },
                { status: 404 }
            )
        }

        // Auto-gera PIN de segurança para ADMIN_GERAL caso não tenha
        // Usa crypto.randomInt para geração criptograficamente segura
        if (user.role === 'ADMIN_GERAL' && !user.pinSeguranca) {
            const newPin = crypto.randomInt(100000, 999999).toString()
            user = await prisma.user.update({
                where: { id: user.id },
                data: { pinSeguranca: newPin }
            })
        }

        // Remove a senha do objeto de retorno
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json({
            success: true,
            data: userWithoutPassword,
        })
    } catch (error) {
        console.error('Erro no endpoint /me:', error)
        return NextResponse.json(
            { success: false, error: 'Ocorreu um erro interno no servidor' },
            { status: 500 }
        )
    }
}
