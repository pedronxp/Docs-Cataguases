import { describe, it, expect } from 'vitest'

// Simula a função de flush de stats para o banco
interface ProviderStats {
  provider: string
  requestsTotal: number
  tokensInputTotal: number
  tokensOutputTotal: number
  date: string
}

function mergeStats(existing: ProviderStats | null, delta: Partial<ProviderStats>): ProviderStats {
  if (!existing) {
    return {
      provider: delta.provider || 'cerebras',
      requestsTotal: delta.requestsTotal || 0,
      tokensInputTotal: delta.tokensInputTotal || 0,
      tokensOutputTotal: delta.tokensOutputTotal || 0,
      date: delta.date || new Date().toISOString().split('T')[0],
    }
  }
  return {
    ...existing,
    requestsTotal: existing.requestsTotal + (delta.requestsTotal || 0),
    tokensInputTotal: existing.tokensInputTotal + (delta.tokensInputTotal || 0),
    tokensOutputTotal: existing.tokensOutputTotal + (delta.tokensOutputTotal || 0),
  }
}

describe('LLM Stats — Persistência', () => {
  it('cria novo registro se não existe entrada para o dia', () => {
    const result = mergeStats(null, { provider: 'cerebras', requestsTotal: 1, tokensInputTotal: 100, tokensOutputTotal: 50 })
    expect(result.requestsTotal).toBe(1)
    expect(result.tokensInputTotal).toBe(100)
  })

  it('acumula sobre registro existente', () => {
    const existing: ProviderStats = {
      provider: 'cerebras',
      requestsTotal: 5,
      tokensInputTotal: 500,
      tokensOutputTotal: 250,
      date: '2026-04-08',
    }
    const result = mergeStats(existing, { requestsTotal: 1, tokensInputTotal: 100, tokensOutputTotal: 50 })
    expect(result.requestsTotal).toBe(6)
    expect(result.tokensInputTotal).toBe(600)
  })

  it('acumulo não perde dados existentes', () => {
    const existing: ProviderStats = {
      provider: 'mistral', requestsTotal: 10, tokensInputTotal: 1000, tokensOutputTotal: 500, date: '2026-04-08'
    }
    const result = mergeStats(existing, { tokensInputTotal: 50 })
    expect(result.requestsTotal).toBe(10) // não zerou
    expect(result.tokensOutputTotal).toBe(500) // não zerou
  })
})
