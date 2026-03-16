import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'secret-key-docs-cataguases-2024'
)

const POLL_INTERVAL_MS = 5_000
const HEARTBEAT_INTERVAL_MS = 25_000
// Encerra a conexão antes do limite de 60s da Vercel (plano Pro).
// O EventSource reconecta automaticamente — sem perda de eventos graças ao cursor lastEventAt.
const GRACEFUL_TIMEOUT_MS = 55_000

/**
 * GET /api/notifications/sse?sseToken=<token>
 *
 * Abre um canal SSE (Server-Sent Events) que faz polling no banco a cada 5s
 * buscando novos eventos de FeedAtividade relevantes para o usuário autenticado.
 * O filtro de permissão é idêntico ao de FeedService.listarAtividades().
 *
 * Segurança: recebe um sseToken de curta duração (5 min) obtido via
 * POST /api/notifications/token — nunca o JWT principal.
 */
export async function GET(request: NextRequest) {
    const sseToken = request.nextUrl.searchParams.get('sseToken')

    if (!sseToken) {
        return new Response('Token SSE não informado.', { status: 401 })
    }

    // Valida o token SSE de curta duração
    let payload: Record<string, any>
    try {
        const { payload: p } = await jwtVerify(sseToken, secret)
        if (p.purpose !== 'sse') throw new Error('purpose inválido')
        payload = p as Record<string, any>
    } catch {
        return new Response('Token SSE inválido ou expirado.', { status: 401 })
    }

    const { userId, secretariaId, setorId, role } = payload

    // Filtro ABAC: ADMIN/PREFEITO veem tudo; outros veem eventos da sua secretaria
    // + eventos globais (secretariaId = null, ex: novos modelos de documento)
    let where: Record<string, any> = {}
    if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO') {
        const secretariaFilter: Record<string, any> = {}
        if (secretariaId) secretariaFilter.secretariaId = secretariaId
        if (setorId && role === 'REVISOR') secretariaFilter.setorId = setorId

        if (Object.keys(secretariaFilter).length > 0) {
            // OR: eventos da secretaria/setor do usuário OU eventos globais (novos modelos etc.)
            where = { OR: [secretariaFilter, { secretariaId: null }] }
        } else {
            // Usuário sem secretaria vê apenas eventos globais
            where = { secretariaId: null }
        }
    }

    // Aceita cursor do cliente para não perder eventos entre reconexões
    const lastEventAtParam = request.nextUrl.searchParams.get('lastEventAt')
    const encoder = new TextEncoder()
    let lastEventAt = lastEventAtParam ? new Date(lastEventAtParam) : new Date()
    // Cursor separado para notificações diretas (tabela Notificacao)
    let lastNotifAt = lastEventAtParam ? new Date(lastEventAtParam) : new Date()
    let pollInterval: ReturnType<typeof setInterval> | null = null
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null
    let gracefulTimeout: ReturnType<typeof setTimeout> | null = null

    const stream = new ReadableStream({
        start(controller) {
            // Poll por novos eventos a cada 5s
            pollInterval = setInterval(async () => {
                try {
                    // ── 1. FeedAtividade (broadcast por secretaria/setor) ──────────────
                    const eventos = await prisma.feedAtividade.findMany({
                        where: { ...where, createdAt: { gt: lastEventAt } },
                        include: {
                            portaria: {
                                select: { id: true, titulo: true, numeroOficial: true },
                            },
                        } as any,
                        orderBy: { createdAt: 'asc' },
                    })

                    if (eventos.length > 0) {
                        lastEventAt = new Date(eventos[eventos.length - 1].createdAt)

                        for (const evento of eventos) {
                            const data = JSON.stringify({
                                id: evento.id,
                                tipoEvento: evento.tipoEvento,
                                mensagem: evento.mensagem,
                                portariaId: evento.portariaId ?? null,
                                portariaTitulo: (evento as any).portaria?.titulo ?? null,
                                portariaNumero: (evento as any).portaria?.numeroOficial ?? null,
                                metadata: (evento.metadata as Record<string, string>) ?? {},
                                createdAt: (evento.createdAt as Date).toISOString(),
                            })
                            controller.enqueue(
                                encoder.encode(
                                    `id: ${evento.id}\nevent: portaria-update\ndata: ${data}\n\n`
                                )
                            )
                        }
                    }

                    // ── 2. Notificacoes diretas por userId ────────────────────────────
                    if (userId) {
                        const notifs: any[] = await prisma.$queryRaw`
                            SELECT n.*, p.titulo as "portariaTitulo", p."numeroOficial" as "portariaNumero"
                            FROM "Notificacao" n
                            LEFT JOIN "Portaria" p ON p.id = n."portariaId"
                            WHERE n."userId" = ${userId as string}
                              AND n."criadoEm" > ${lastNotifAt}
                            ORDER BY n."criadoEm" ASC
                            LIMIT 20
                        `

                        if (notifs.length > 0) {
                            lastNotifAt = new Date(notifs[notifs.length - 1].criadoEm)

                            for (const notif of notifs) {
                                const data = JSON.stringify({
                                    id: notif.id,
                                    tipo: notif.tipo,
                                    mensagem: notif.mensagem,
                                    lida: notif.lida,
                                    portariaId: notif.portariaId ?? null,
                                    portariaTitulo: notif.portariaTitulo ?? null,
                                    portariaNumero: notif.portariaNumero ?? null,
                                    metadata: notif.metadata ?? {},
                                    criadoEm: new Date(notif.criadoEm).toISOString(),
                                })
                                controller.enqueue(
                                    encoder.encode(
                                        `id: notif-${notif.id}\nevent: notificacao\ndata: ${data}\n\n`
                                    )
                                )
                            }
                        }
                    }
                } catch {
                    // Erro silencioso — não fecha o stream por falha pontual de DB
                }
            }, POLL_INTERVAL_MS)

            // Heartbeat a cada 25s para manter a conexão viva em proxies/Nginx
            heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': keep-alive\n\n'))
                } catch {
                    // stream já fechado
                }
            }, HEARTBEAT_INTERVAL_MS)

            // Graceful disconnect: encerra antes do timeout da Vercel (60s Pro / 10s Hobby)
            // O cliente reconecta automaticamente e retoma pelo cursor lastEventAt
            gracefulTimeout = setTimeout(() => {
                if (pollInterval) clearInterval(pollInterval)
                if (heartbeatInterval) clearInterval(heartbeatInterval)
                try { controller.close() } catch { /* já fechado */ }
            }, GRACEFUL_TIMEOUT_MS)

            // Limpa tudo quando o cliente desconecta
            request.signal.addEventListener('abort', () => {
                if (pollInterval) clearInterval(pollInterval)
                if (heartbeatInterval) clearInterval(heartbeatInterval)
                if (gracefulTimeout) clearTimeout(gracefulTimeout)
                try { controller.close() } catch { /* já fechado */ }
            })
        },
        cancel() {
            if (pollInterval) clearInterval(pollInterval)
            if (heartbeatInterval) clearInterval(heartbeatInterval)
            if (gracefulTimeout) clearTimeout(gracefulTimeout)
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
