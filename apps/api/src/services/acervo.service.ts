import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/result'
import { CacheService, CACHE_TTL, CACHE_TAGS } from './cache.service'

export interface FiltrosAcervo {
    termo?: string
    secretariaId?: string
    setorId?: string
    status?: string
    ano?: number
    page?: number
    limit?: number
}

export class AcervoService {
    /**
     * Lista portarias com filtros e paginação.
     * Cache TTL: 60s por combinação de filtros.
     * Buscas com `termo` não são cacheadas (muito variáveis).
     */
    static async listarPortarias(filtros: FiltrosAcervo) {
        const {
            termo,
            secretariaId,
            setorId,
            status,
            ano,
            page = 1,
            limit = 10
        } = filtros

        const skip = (page - 1) * limit

        // Não cacheia buscas textuais (muita variância, pouca reutilização)
        const shouldCache = !termo

        const cacheKey = CacheService.key(
            'acervo',
            secretariaId,
            setorId,
            status,
            ano ? String(ano) : undefined,
            String(page),
            String(limit)
        )

        const fetcher = async () => {
            try {
                const where: any = {}

                if (termo) {
                    where.OR = [
                        { titulo: { contains: termo, mode: 'insensitive' } },
                        { numeroOficial: { contains: termo, mode: 'insensitive' } },
                        { descricao: { contains: termo, mode: 'insensitive' } }
                    ]
                }

                if (secretariaId) where.secretariaId = secretariaId
                if (setorId) where.setorId = setorId
                if (status) where.status = status

                if (ano) {
                    const dataInicio = new Date(`${ano}-01-01T00:00:00Z`)
                    const dataFim = new Date(`${ano}-12-31T23:59:59Z`)
                    where.createdAt = { gte: dataInicio, lte: dataFim }
                }

                const [itens, total] = await Promise.all([
                    prisma.portaria.findMany({
                        where,
                        include: {
                            modelo:       { select: { nome: true } },
                            criadoPor:    { select: { name: true } },
                            revisorAtual: { select: { name: true } },
                            assinadoPor:  { select: { name: true } },
                            secretaria:   { select: { sigla: true, cor: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit
                    }),
                    prisma.portaria.count({ where })
                ])

                return ok({
                    itens,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                })
            } catch (error) {
                console.error('Erro ao listar acervo:', error)
                return err('Falha ao recuperar documentos do acervo.')
            }
        }

        if (!shouldCache) return fetcher()
        return CacheService.getOrSet(cacheKey, fetcher, CACHE_TTL.ACERVO_LISTA, [CACHE_TAGS.PORTARIAS])
    }

    /**
     * Retorna estatísticas do acervo.
     * Cache TTL: 2min — dados de contagem, tolerante a leve defasagem.
     */
    static async obterEstatisticas(secretariaId?: string) {
        const cacheKey = CacheService.key('acervo', 'stats', secretariaId)

        return CacheService.getOrSet(cacheKey, async () => {
            try {
                const whereBase: any = {
                    status: { in: ['PUBLICADA', 'PRONTO_PUBLICACAO'] }
                }
                if (secretariaId) whereBase.secretariaId = secretariaId

                // Início do mês atual
                const agora = new Date()
                const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

                const [grupos, publicadasEsteMes] = await Promise.all([
                    prisma.portaria.groupBy({
                        by: ['secretariaId'],
                        where: whereBase,
                        _count: { id: true }
                    }),
                    prisma.portaria.count({
                        where: {
                            ...whereBase,
                            status: 'PUBLICADA',
                            dataPublicacao: { gte: inicioMes }
                        }
                    })
                ])

                const porSecretaria: Record<string, number> = {}
                for (const g of grupos) {
                    if (g.secretariaId) {
                        porSecretaria[g.secretariaId] = g._count.id
                    }
                }

                return ok({ porSecretaria, publicadasEsteMes })
            } catch (error) {
                return err('Erro ao gerar estatísticas.')
            }
        }, CACHE_TTL.ACERVO_STATS, [CACHE_TAGS.PORTARIAS])
    }
}
