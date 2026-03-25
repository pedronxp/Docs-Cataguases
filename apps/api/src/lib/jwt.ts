import { SignJWT, jwtVerify } from 'jose'

// SEGURANÇA: JWT_SECRET deve ser definido no ambiente como string aleatória de alta entropia.
// Nunca use um valor fallback hardcoded — qualquer pessoa com acesso ao código poderia forjar tokens.
// Gere um segredo seguro com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
if (!process.env.JWT_SECRET) {
    throw new Error('[jwt] CRITICAL: Variável de ambiente JWT_SECRET não definida. Servidor não pode iniciar com segurança.')
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function signToken(payload: any) {
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
