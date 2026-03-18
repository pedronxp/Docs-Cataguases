/**
 * GET /api/sidebar-counts
 *
 * Retorna contagens para badges da sidebar, filtradas pela role/secretaria do usuário.
 * Resposta rápida (< 100ms) usando queries simples com índices.
 *
 * Campos retornados:
 * - filaRevisao: portarias EM_REVISAO_ABERTA visíveis para o usuário
 * - minhasRevisoes: portarias atribuídas ao usuário (revisor atual)
 * - aguardandoAssinatura: portarias AGUARDANDO_ASSINATURA ou PRONTO_PUBLICACAO
 * - notificacoesNaoLidas: notificações não lidas do usuário
 * - portariasCorrecao: portarias CORRECAO_NECESSARIA criadas pelo usuário (autor)
 */
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { CacheService, CACHE_TTL, CACHE_TAGS } from '@/services/cache.service'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const userId = session.id as string
    const role = (session as any).role as string
    const secretariaId = (session as any).secretariaId as string | undefined

    try {
        // Cache por usuário (cada um tem contagens diferentes)
        const cacheKey = CacheService.key('sidebar-counts', userId)
        const cached = await CacheService.get<any>(cacheKey)
        if (cached) {
            return NextResponse.json({ success: true, data: cached })
        }
        const isAdminOrPrefeito = role === 'ADMIN_GERAL' || role === 'PREFEITO'
        const isRevisor = ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'].includes(role)
        const canPublish = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO'].includes(role)

        // Paralleliza todas as queries com SQL raw para flexibilidade nos filtros
        const [filaRow, minhasRow, assinaturaRow, notifRow, correcaoRow, aprovacaoRow] = await Promise.all([
            // Fila de revisão
            isRevisor
                ? (isAdminOrPrefeito || !secretariaId
                    ? prisma.$queryRaw`SELECT COUNT(*)::int as total FROM "Portaria" WHERE status = 'EM_REVISAO_ABERTA'`
                    : prisma.$queryRaw`SELECT COUNT(*)::int as total FROM "Portaria" WHERE status = 'EM_REVISAO_ABERTA' AND "secretariaId" = ${secretariaId}`)
                : Promise.resolve([{ total: 0 }]),

            // Minhas revisões em andamento
            prisma.$queryRaw`
                SELECT COUNT(*)::int as total FROM "Portaria"
                WHERE "revisorAtualId" = ${userId}
                  AND status = 'EM_REVISAO_ATRIBUIDA'
            `,

            // Aguardando assinatura/publicação
            canPublish
                ? (isAdminOrPrefeito || !secretariaId
                    ? prisma.$queryRaw`SELECT COUNT(*)::int as total FROM "Portaria" WHERE status IN ('AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO')`
                    : prisma.$queryRaw`SELECT COUNT(*)::int as total FROM "Portaria" WHERE status IN ('AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO') AND "secretariaId" = ${secretariaId}`)
                : Promise.resolve([{ total: 0 }]),

            // Notificações não lidas do usuário
            prisma.$queryRaw`
                SELECT COUNT(*)::int as total FROM "Notificacao"
                WHERE "userId" = ${userId} AND lida = false
            `,

            // Portarias CORRECAO_NECESSARIA do autor
            prisma.$queryRaw`
                SELECT COUNT(*)::int as total FROM "Portaria"
                WHERE "criadoPorId" = ${userId}
                  AND status = 'CORRECAO_NECESSARIA'
            `,

            // Fila de aprovação de usuários (apenas para admins)
            isAdminOrPrefeito
                ? prisma.$queryRaw`SELECT COUNT(*)::int as total FROM "User" WHERE role = 'PENDENTE' AND ativo = true`
                : Promise.resolve([{ total: 0 }]),
        ])

        const counts = {
            filaRevisao: Number((filaRow as any[])[0]?.total ?? 0),
            minhasRevisoes: Number((minhasRow as any[])[0]?.total ?? 0),
            aguardandoAssinatura: Number((assinaturaRow as any[])[0]?.total ?? 0),
            notificacoesNaoLidas: Number((notifRow as any[])[0]?.total ?? 0),
            portariasCorrecao: Number((correcaoRow as any[])[0]?.total ?? 0),
            filaAprovacao: Number((aprovacaoRow as any[])[0]?.total ?? 0),
        }

        // Salvar no cache por 15s
        await CacheService.set(cacheKey, counts, CACHE_TTL.SIDEBAR_COUNTS, [CACHE_TAGS.PORTARIAS, CACHE_TAGS.USUARIOS])

        return NextResponse.json({ success: true, data: counts })
    } catch (err: any) {
        console.error('[sidebar-counts]', err)
        return NextResponse.json({ error: 'Erro ao buscar contagens' }, { status: 500 })
    }
}
