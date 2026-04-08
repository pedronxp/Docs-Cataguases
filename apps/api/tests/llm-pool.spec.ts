import { describe, it, expect } from 'vitest'

// Simula a lógica de pickBestKey isolada
interface MockKey {
  id: string
  provider: string
  ativo: boolean
  esgotada: boolean
  esgotadaAte: Date | null
  requisicoes: number
  tokensTotal: number
}

function pickBestKey(keys: MockKey[]): MockKey | null {
  const now = new Date()
  const available = keys.filter(k =>
    k.ativo &&
    (
      !k.esgotada ||
      (k.esgotadaAte !== null && k.esgotadaAte < now) // cooldown expirado — trata como disponível
    )
  )
  if (available.length === 0) return null
  // Seleciona a chave com menos requisições (round-robin por carga)
  return available.reduce((best, k) => k.requisicoes < best.requisicoes ? k : best)
}

function markKeyExhausted(key: MockKey, cooldownMs: number): MockKey {
  return {
    ...key,
    esgotada: true,
    esgotadaAte: new Date(Date.now() + cooldownMs),
  }
}

describe('LLM Pool Balancer', () => {
  const baseKey = (id: string, requisicoes = 0): MockKey => ({
    id,
    provider: 'cerebras',
    ativo: true,
    esgotada: false,
    esgotadaAte: null,
    requisicoes,
    tokensTotal: 0,
  })

  it('seleciona chave com menos requisições', () => {
    const keys = [baseKey('k1', 10), baseKey('k2', 3), baseKey('k3', 7)]
    expect(pickBestKey(keys)?.id).toBe('k2')
  })

  it('ignora chave inativa', () => {
    const keys = [{ ...baseKey('k1', 0), ativo: false }, baseKey('k2', 5)]
    expect(pickBestKey(keys)?.id).toBe('k2')
  })

  it('ignora chave esgotada com cooldown ativo', () => {
    const exhausted = markKeyExhausted(baseKey('k1', 0), 60 * 60 * 1000) // 1h cooldown
    const keys = [exhausted, baseKey('k2', 100)]
    expect(pickBestKey(keys)?.id).toBe('k2')
  })

  it('usa chave esgotada se cooldown expirou', () => {
    const expired = {
      ...baseKey('k1', 0),
      esgotada: true,
      esgotadaAte: new Date(Date.now() - 1000), // expirou 1s atrás
    }
    const keys = [expired, baseKey('k2', 50)]
    // k1 tem cooldown expirado — deve ser selecionada por ter menos requisições
    expect(pickBestKey(keys)?.id).toBe('k1')
  })

  it('retorna null se todas as chaves estão esgotadas', () => {
    const keys = [
      markKeyExhausted(baseKey('k1'), 3600_000),
      markKeyExhausted(baseKey('k2'), 3600_000),
    ]
    expect(pickBestKey(keys)).toBeNull()
  })

  it('marca chave como esgotada com cooldown de 60 minutos para 429', () => {
    const key = baseKey('k1')
    const exhausted = markKeyExhausted(key, 60 * 60 * 1000)
    expect(exhausted.esgotada).toBe(true)
    expect(exhausted.esgotadaAte!.getTime()).toBeGreaterThan(Date.now() + 59 * 60 * 1000)
  })
})
