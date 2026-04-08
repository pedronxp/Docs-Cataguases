import { describe, it, expect } from 'vitest'
import { SignJWT } from 'jose'

describe('SSE Token Validation', () => {
  const correctSecret = 'test-secret-key-for-vitest-only'

  async function makeToken(secret: string, purpose = 'sse') {
    return new SignJWT({ purpose, userId: 'u1', role: 'OPERADOR', secretariaId: null, setorId: null })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret))
  }

  it('valida token com secret correto', async () => {
    const { jwtVerify } = await import('jose')
    const token = await makeToken(correctSecret)
    const secret = new TextEncoder().encode(correctSecret)
    const { payload } = await jwtVerify(token, secret)
    expect(payload.purpose).toBe('sse')
  })

  it('rejeita token com secret errado', async () => {
    const { jwtVerify } = await import('jose')
    const token = await makeToken('secret-key-docs-cataguases-2024') // fallback antigo
    const secret = new TextEncoder().encode(correctSecret)
    await expect(jwtVerify(token, secret)).rejects.toThrow()
  })

  it('falha loudly se JWT_SECRET não está definido', () => {
    const originalEnv = process.env.JWT_SECRET
    delete process.env.JWT_SECRET
    expect(() => {
      const s = process.env.JWT_SECRET
      if (!s) throw new Error('JWT_SECRET não configurado. Configure a variável de ambiente.')
    }).toThrow('JWT_SECRET não configurado')
    process.env.JWT_SECRET = originalEnv
  })
})
