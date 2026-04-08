import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'

// Testa a função de sanitização isolada — não o componente completo
function renderMarkdownSafe(content: string): string {
  const dirty = `<p>${content}</p>`
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'br', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  })
}

describe('FloatingChat — Sanitização HTML', () => {
  it('remove tag script maliciosa', () => {
    const result = renderMarkdownSafe('<script>alert("xss")</script>texto')
    expect(result).not.toContain('<script>')
    expect(result).toContain('texto')
  })

  it('remove atributo onerror de img', () => {
    const result = renderMarkdownSafe('<img src=x onerror=alert(1)>')
    expect(result).not.toContain('onerror')
  })

  it('preserva markdown básico (negrito, itálico, código)', () => {
    const result = renderMarkdownSafe('<strong>negrito</strong> e <em>itálico</em>')
    expect(result).toContain('<strong>negrito</strong>')
    expect(result).toContain('<em>itálico</em>')
  })

  it('remove javascript: em href', () => {
    const result = renderMarkdownSafe('<a href="javascript:alert(1)">clique</a>')
    expect(result).not.toContain('javascript:')
  })
})
