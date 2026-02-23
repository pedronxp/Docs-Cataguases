import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'fallback-secret-para-desenvolvimento'
)

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value

    // Rotas que começam com /api/_sistema exigem autenticação
    if (request.nextUrl.pathname.startsWith('/api/_sistema')) {
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Acesso negado. Token não fornecido.' },
                { status: 401 }
            )
        }

        try {
            await jwtVerify(token, JWT_SECRET)
            return NextResponse.next()
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Token inválido ou expirado.' },
                { status: 401 }
            )
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/api/_sistema/:path*'],
}
