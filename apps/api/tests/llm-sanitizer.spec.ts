import { describe, it, expect } from 'vitest'
import { sanitizeForLLM, sanitizeMessages } from '../src/lib/llm-sanitizer'

describe('LLM Sanitizer', () => {
  describe('sanitizeForLLM', () => {
    it('mascara email simples', () => {
      const result = sanitizeForLLM('Contate joao@exemplo.com para mais informações.')
      expect(result).not.toContain('joao@exemplo.com')
      expect(result).toContain('[EMAIL_OMITIDO]')
    })

    it('mascara email com domínio gov.br', () => {
      const result = sanitizeForLLM('Usuário teste@cataguases.mg.gov.br está ativo.')
      expect(result).not.toContain('teste@cataguases.mg.gov.br')
      expect(result).toContain('[EMAIL_OMITIDO]')
    })

    it('mascara múltiplos emails no mesmo texto', () => {
      const result = sanitizeForLLM('De a@b.com para c@d.com')
      const count = (result.match(/\[EMAIL_OMITIDO\]/g) || []).length
      expect(count).toBe(2)
    })

    it('mascara CPF (comportamento existente preservado)', () => {
      const result = sanitizeForLLM('CPF: 123.456.789-00')
      expect(result).toContain('[CPF_OMITIDO]')
    })

    it('não altera texto sem dados sensíveis', () => {
      const text = 'A prefeitura de Cataguases aprovou o decreto número 123.'
      expect(sanitizeForLLM(text)).toBe(text)
    })
  })

  describe('sanitizeMessages', () => {
    it('sanitiza mensagens do usuário', () => {
      const messages = [{ role: 'user', content: 'meu email é test@test.com' }]
      const result = sanitizeMessages(messages)
      expect(result[0].content).toContain('[EMAIL_OMITIDO]')
    })

    it('não sanitiza mensagens do assistente', () => {
      const messages = [{ role: 'assistant', content: 'contate admin@sistema.com' }]
      const result = sanitizeMessages(messages)
      // Mensagens do assistente não devem ser modificadas (vêm do LLM, não do usuário)
      expect(result[0].content).toBe('contate admin@sistema.com')
    })
  })
})
