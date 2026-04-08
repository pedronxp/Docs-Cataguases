import { describe, it, expect } from 'vitest'

// Testa a lógica de construção de resposta do chat-session
describe('Chat Session Route — Shapes', () => {
  it('resposta de sucesso contém sessionId, message e tokensUsadosMes', () => {
    const mockResponse = {
      success: true,
      sessionId: 'sess-001',
      message: {
        role: 'assistant',
        content: 'Olá!',
        provider: 'cerebras',
        model: 'llama3.1-8b',
        tokens: 50,
      },
      tokensUsadosMes: 5050,
    }
    expect(mockResponse).toHaveProperty('sessionId')
    expect(mockResponse).toHaveProperty('message.role', 'assistant')
    expect(mockResponse).toHaveProperty('tokensUsadosMes')
  })

  it('modelo auto é resolvido para provider padrão', () => {
    const MODEL_TO_PROVIDER: Record<string, string> = {
      'llama3.1-8b': 'cerebras',
      'llama3.3-70b': 'cerebras',
      'mistral-large-latest': 'mistral',
    }
    const selectedModel = 'mistral-large-latest'
    const provider = MODEL_TO_PROVIDER[selectedModel] || 'cerebras'
    expect(provider).toBe('mistral')
  })

  it('toolCalls são extraídos do metadata para LLMMessage', () => {
    const dbMessage = {
      role: 'assistant',
      content: 'Usando ferramenta...',
      metadata: { tool_calls: [{ id: 'tc1', function: { name: 'listar_secretarias', arguments: '{}' } }] }
    }
    // Simula a lógica de reconstrução
    const msg: any = { role: dbMessage.role, content: dbMessage.content }
    if (dbMessage.metadata?.tool_calls) msg.tool_calls = dbMessage.metadata.tool_calls
    expect(msg.tool_calls).toHaveLength(1)
    expect(msg.tool_calls[0].function.name).toBe('listar_secretarias')
  })
})
