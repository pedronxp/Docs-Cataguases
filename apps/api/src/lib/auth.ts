import { cookies } from 'next/headers'
import { verifyToken } from './jwt'
import { cookies as nextCookies } from 'next/headers'

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
