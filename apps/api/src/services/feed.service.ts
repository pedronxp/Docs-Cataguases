import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'
import { CacheService, CACHE_TTL, CACHE_TAGS } from './cache.service'

export class FeedService {
    /**
     * Lista atividades recentes filtradas pelo escopo do usuário.
     * Cache TTL: 30s por escopo (role + secretaria + page).
     */
    static async listarAtividades(params: {
        secretariaId?: string;
        setorId?: string;
        autorId?: string;
        page?: number;
        pageSize?: number;
        role: string;
    }) {
        const {
            secretariaId,
            setorId,
            autorId,
            page = 1,
            pageSize = 20,
            role
        } = params

        const skip = (page - 1) * pageSize

        // Chave de cache inclui todos os parâmetros que afetam o resultado
        const cacheKey = CacheService.key(
            'feed',
            role,
            secretariaId,
            setorId,
            autorId,
            String(page),
            String(pageSize)
        )

        return CacheService.getOrSet(cacheKey, async () => {
            try {
                // Filtro ABAC básico aplicado no banco
                const where: any = {}

                // Se autorId for passado, filtra APENAS atividades do usuário
                if (autorId) {
                    where.autorId = autorId
                } else if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO') {
                    if (secretariaId) {
                        where.secretariaId = secretariaId
                    }
                    if (setorId && role === 'REVISOR') {
                        where.setorId = setorId
                    }
                }

                const [atividades, total] = await Promise.all([
                    prisma.feedAtividade.findMany({
                        where,
                        include: {
                            autor: {
                                select: { id: true, name: true, role: true }
                            },
                            portaria: {
                                select: { id: true, titulo: true, numeroOficial: true }
                            }
                        } as any,
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: pageSize
                    }),
                    prisma.feedAtividade.count({ where })
                ])

                return ok({
                    itens: atividades,
                    meta: {
                        total,
                        page,
                        pageSize,
                        totalPages: Math.ceil(total / pageSize)
                    }
                })
            } catch (error) {
                console.error('Erro ao listar feed:', error)
                return err('Falha ao recuperar feed de atividades.')
            }
        }, CACHE_TTL.FEED, [CACHE_TAGS.PORTARIAS])
    }

    /**
     * Atalho para criar um evento (Auditoria).
     * Invalida caches de feed após inserção.
     */
    static async registrarEvento(data: {
        tipoEvento: string;
        mensagem: string;
        autorId: string;
        secretariaId?: string | null;
        setorId?: string | null;
        portariaId?: string | null;
        metadata?: any;
    }) {
        try {
            const evento = await prisma.feedAtividade.create({
                data: {
                    tipoEvento: data.tipoEvento,
                    mensagem: data.mensagem,
                    autorId: data.autorId,
                    secretariaId: data.secretariaId ?? null,
                    setorId: data.setorId ?? null,
                    portariaId: data.portariaId ?? null,
                    metadata: data.metadata ?? {}
                }
            })
            // Invalida feed cache para que o novo evento apareça em até 1 ciclo de TTL
            CacheService.invalidateByPattern('feed:*').catch(() => {})
            return ok(evento)
        } catch (error) {
            console.error('Erro ao registrar evento no feed:', error)
            return err('Falha ao registrar auditoria.')
        }
    }
}
