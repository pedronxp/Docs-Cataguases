import { cookies } from 'next/headers'
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

/**
 * Recupera a sessão atual baseada no cookie auth-token.
 */
export async function getSession() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value
        if (!token) return null
        return verifyToken(token)
    } catch (e) {
        return null
    }
}

/**
 * Alias para getSession seguindo o padrão do projeto.
 */
export const getAuthUser = getSession
