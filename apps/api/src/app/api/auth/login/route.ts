import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { comparePassword, createToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
    try {
        // Pega os campos. Vamos assumir que o FE pode mandar "email" como identifier (email ou username).
        const identifier = await request.json()
        const loginIdentifier = identifier.email || identifier.username
        const password = identifier.password

        if (!loginIdentifier || !password) {
            return NextResponse.json(
                { success: false, error: 'E-mail/Username e senha são obrigatórios' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier }
                ]
            },
        })

        if (!user || !(await comparePassword(password, user.password))) {
            return NextResponse.json(
                { success: false, error: 'Credenciais inválidas' },
                { status: 401 }
            )
        }

        if (!user.ativo) {
            return NextResponse.json(
                { success: false, error: 'Usuário inativo. Entre em contato com o administrador.' },
                { status: 403 }
            )
        }

        const token = await createToken({
            id: user.id,
            email: user.email,
            role: user.role,
        })

        const cookieStore = await cookies()
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 horas
            path: '/',
        })

        // Remove a senha do objeto de retorno
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json({
            success: true,
            data: {
                user: userWithoutPassword,
                token,
            },
        })
    } catch (error: any) {
        console.error('Erro no login:', error)
        return NextResponse.json(
            { success: false, error: 'Ocorreu um erro interno no servidor' },
            { status: 500 }
        )
    }
}
