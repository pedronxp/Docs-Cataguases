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

export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) return null
    return verifyToken(token)
}

/**
 * Alias para getSession seguindo o padrão do BACKEND.md
 */
export const getAuthUser = getSession
