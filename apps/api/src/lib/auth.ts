import { cookies, headers } from 'next/headers'
import { verifyToken, signToken } from './jwt'
import bcrypt from 'bcryptjs'

/**
 * Compara uma senha em texto puro com um hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

/**
 * Cria um novo token JWT para o usuário.
 */
export async function createToken(payload: any): Promise<string> {
    return signToken(payload)
}

export async function getSession() {
    try {
        let token: string | undefined
        
        // 1. Tenta ler do Authorization header (Bearer token enviado pelo Axios)
        const headerStore = await headers()
        const authHeader = headerStore.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7)
        } else {
            // 2. Fallback: cookie auth-token
            const cookieStore = await cookies()
            token = cookieStore.get('auth-token')?.value
        }

        if (!token) return null
        
        const payload = await verifyToken(token)
        if (!payload || !payload.id) return null

        // Verifica contra o banco de dados em tempo real para invalidar sessões revogadas
        const user = await prisma.user.findUnique({
            where: { id: payload.id as string },
            select: { role: true, ativo: true }
        })

        if (!user) return null
        
        // Se o usuário foi inativado (e não está pendente) ou se a role mudou, derruba a sessão
        if (!user.ativo && user.role !== 'PENDENTE') return null
        if (user.role !== payload.role) return null // Força relogin para atualizar permissões

        return payload
    } catch (e) {
        return null
    }
}

import prisma from './prisma'

/**
 * Retorna o usuário completo do banco de dados a partir da sessão.
 */
export async function getAuthUser() {
    const session = await getSession()
    if (!session || !session.id) return null
    
    return prisma.user.findUnique({
        where: { id: session.id as string }
    })
}
