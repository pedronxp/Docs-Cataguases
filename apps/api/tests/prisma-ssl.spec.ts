import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('Prisma SSL Configuration', () => {
  it('não contém rejectUnauthorized: false no código fonte', () => {
    const filePath = path.resolve(__dirname, '../src/lib/prisma.ts')
    const content = readFileSync(filePath, 'utf-8')
    expect(content).not.toMatch(/rejectUnauthorized\s*:\s*false/)
  })

  it('usa variável de ambiente para SSL CA quando disponível', () => {
    const filePath = path.resolve(__dirname, '../src/lib/prisma.ts')
    const content = readFileSync(filePath, 'utf-8')
    // Deve referenciar SUPABASE_SSL_CERT ou usar rejectUnauthorized: true
    const hasSecureSSL = content.includes('SUPABASE_SSL_CERT') || content.includes('rejectUnauthorized: true')
    expect(hasSecureSSL).toBe(true)
  })
})
