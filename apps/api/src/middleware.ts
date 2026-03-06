import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-para-desenvolvimento'
)

export async function middleware(request: NextRequest) {
    const origin = request.headers.get('origin') || ''
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean)

    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed))
    const allowOrigin = isAllowed ? origin : allowedOrigins[0]

    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 })
        response.headers.set('Access-Control-Allow-Origin', allowOrigin)
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        return response
    }

    // Add CORS headers to all responses
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', allowOrigin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    // Verificar token do cookie OU header Authorization
    let token = request.cookies.get('auth-token')?.value
    if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7)
        }
    }

    // Rotas que exigem autenticação: /api/_sistema e /api/admin
    const requiresAuth = request.nextUrl.pathname.startsWith('/api/_sistema') ||
                         request.nextUrl.pathname.startsWith('/api/admin')

    if (requiresAuth) {
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Acesso negado. Token não fornecido.' },
                { status: 401, headers: response.headers }
            )
        }

        try {
            await jwtVerify(token, JWT_SECRET)
            return response
        } catch (error) {
            return NextResponse.json(
                { success: false, error: 'Token inválido ou expirado.' },
                { status: 401, headers: response.headers }
            )
        }
    }

    return response
}

export const config = {
    matcher: ['/api/:path*'],
}
