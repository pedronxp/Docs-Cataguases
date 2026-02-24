import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'secret-key-docs-cataguases-2024'
)

export async function createToken(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret)
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload
    } catch (error) {
        return null
    }
}
