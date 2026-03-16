/**
 * NotificacaoService
 *
 * Cria notificações direcionadas a usuários específicos (userId).
 * Usa $executeRaw porque o Prisma client ainda não foi regenerado
 * com o modelo Notificacao (pendente prisma generate).
 *
 * As notificações são persistidas na tabela "Notificacao" e entregues
 * em tempo real via SSE (o stream já faz polling na tabela).
 */
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'

export interface CriarNotificacaoInput {
    userId: string
    tipo: string
    mensagem: string
    portariaId?: string | null
    metadata?: Record<string, unknown>
}

export async function criarNotificacao(input: CriarNotificacaoInput): Promise<void> {
    const { userId, tipo, mensagem, portariaId = null, metadata = {} } = input
    const id = randomUUID()

    await prisma.$executeRaw`
        INSERT INTO "Notificacao" ("id", "userId", "tipo", "mensagem", "lida", "portariaId", "metadata", "criadoEm")
        VALUES (${id}, ${userId}, ${tipo}, ${mensagem}, false, ${portariaId}, ${JSON.stringify(metadata)}::jsonb, NOW())
    `
}

/**
 * Cria notificações para múltiplos usuários ao mesmo tempo (ex: notificar revisores).
 */
export async function criarNotificacoes(inputs: CriarNotificacaoInput[]): Promise<void> {
    if (inputs.length === 0) return
    await Promise.all(inputs.map((i) => criarNotificacao(i)))
}

/**
 * Busca revisores ativos de uma secretaria (para notificações de nova portaria em revisão).
 */
export async function buscarRevisoresDaSecretaria(secretariaId: string): Promise<{ id: string }[]> {
    const revisores: { id: string }[] = await prisma.$queryRaw`
        SELECT id FROM "User"
        WHERE "secretariaId" = ${secretariaId}
          AND role IN ('REVISOR', 'SECRETARIO')
          AND ativo = true
    `
    return revisores
}

/**
 * Busca o autor (criadoPorId) de uma portaria.
 */
export async function buscarAutorPortaria(portariaId: string): Promise<{ criadoPorId: string | null } | null> {
    const [row]: any[] = await prisma.$queryRaw`
        SELECT "criadoPorId" FROM "Portaria" WHERE id = ${portariaId}
    `
    return row ?? null
}

/**
 * Busca admins e prefeitos (para notificações globais).
 */
export async function buscarAdminsEPrefeitos(): Promise<{ id: string }[]> {
    const users: { id: string }[] = await prisma.$queryRaw`
        SELECT id FROM "User" WHERE role IN ('ADMIN_GERAL', 'PREFEITO') AND ativo = true
    `
    return users
}
