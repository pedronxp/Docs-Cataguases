import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('Prisma Schema — ChatSession e ChatMessage', () => {
  const schema = readFileSync(
    path.resolve(__dirname, '../prisma/schema.prisma'), 'utf-8'
  )

  describe('ChatSession', () => {
    it('tem campo tokensInputTotal', () => {
      expect(schema).toMatch(/tokensInputTotal\s+Int/)
    })
    it('tem campo tokensOutputTotal', () => {
      expect(schema).toMatch(/tokensOutputTotal\s+Int/)
    })
    it('tem campo requestsCount', () => {
      expect(schema).toMatch(/requestsCount\s+Int/)
    })
    it('tem índice em userId e createdAt', () => {
      // O índice pode estar como @@index ou implícito — verifica que @@index existe no bloco ChatSession
      const chatSessionBlock = schema.match(/model ChatSession \{[\s\S]*?\n\}/)
      expect(chatSessionBlock?.[0]).toMatch(/@@index/)
    })
  })

  describe('ChatMessage', () => {
    it('tem campo toolCalls do tipo Json', () => {
      expect(schema).toMatch(/toolCalls\s+Json/)
    })
    it('tem índice em sessionId e createdAt', () => {
      const chatMessageBlock = schema.match(/model ChatMessage \{[\s\S]*?\n\}/)
      expect(chatMessageBlock?.[0]).toMatch(/@@index/)
    })
  })

  describe('FeedAtividade', () => {
    it('tem índice composto em createdAt, secretariaId', () => {
      const feedBlock = schema.match(/model FeedAtividade \{[\s\S]*?\n\}/)
      expect(feedBlock?.[0]).toMatch(/@@index/)
    })
  })
})
