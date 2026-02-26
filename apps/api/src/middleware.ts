import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'fallback-secret-para-desenvolvimento'
)

export async function middleware(request: NextRequest) {
    // 1. Preflight CORS
    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 })
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        return response
    }

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
