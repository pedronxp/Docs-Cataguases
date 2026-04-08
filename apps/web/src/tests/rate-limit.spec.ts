import { describe, it, expect } from 'vitest'

// Simula o estado de rate limit do FloatingChat
interface RateLimitState {
  blocked: boolean
  retryAfterMs: number
  resetAt: Date | null
}

function handleRateLimitResponse(
  status: number,
  body: { retryAfter?: number; resetAt?: string },
  state: RateLimitState
): RateLimitState {
  if (status === 429 && body.retryAfter) {
    return {
      blocked: true,
      retryAfterMs: body.retryAfter * 1000,
      resetAt: body.resetAt ? new Date(body.resetAt) : null,
    }
  }
  return state
}

function isInputBlocked(state: RateLimitState): boolean {
  if (!state.blocked) return false
  if (!state.resetAt) return true
  return new Date() < state.resetAt
}

describe('FloatingChat — Rate Limit Frontend', () => {
  it('bloqueia input após receber 429', () => {
    const initialState: RateLimitState = { blocked: false, retryAfterMs: 0, resetAt: null }
    const resetAt = new Date(Date.now() + 60 * 1000).toISOString()
    const newState = handleRateLimitResponse(429, { retryAfter: 60, resetAt }, initialState)
    expect(newState.blocked).toBe(true)
    expect(newState.retryAfterMs).toBe(60000)
  })

  it('desbloqueia input após resetAt passar', () => {
    const pastDate = new Date(Date.now() - 1000) // 1 segundo no passado
    const state: RateLimitState = { blocked: true, retryAfterMs: 0, resetAt: pastDate }
    expect(isInputBlocked(state)).toBe(false)
  })

  it('mantém bloqueio enquanto resetAt não passou', () => {
    const futureDate = new Date(Date.now() + 60 * 1000)
    const state: RateLimitState = { blocked: true, retryAfterMs: 0, resetAt: futureDate }
    expect(isInputBlocked(state)).toBe(true)
  })

  it('não bloqueia em resposta 200', () => {
    const initialState: RateLimitState = { blocked: false, retryAfterMs: 0, resetAt: null }
    const newState = handleRateLimitResponse(200, {}, initialState)
    expect(newState.blocked).toBe(false)
  })
})
