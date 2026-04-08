import { vi } from 'vitest'

// Mock Prisma globalmente para testes unitários
vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    feedAtividade: { findMany: vi.fn() },
    notificacao: { findMany: vi.fn() },
    chatSession: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    chatMessage: { findMany: vi.fn(), create: vi.fn() },
    llmApiKey: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Variáveis de ambiente para testes
process.env.JWT_SECRET = 'test-secret-key-for-vitest-only'
process.env.NODE_ENV = 'test'
