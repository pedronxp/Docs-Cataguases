import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

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

        try {
            // Construção da cláusula where dinâmica
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
                where.createdAt = {
                    gte: dataInicio,
                    lte: dataFim
                }
            }

            // Executa a busca e a contagem total para paginação
            const [itens, total] = await Promise.all([
                prisma.portaria.findMany({
                    where,
                    include: {
                        modelo: {
                            select: { nome: true }
                        },
                        criadoPor: {
                            select: { name: true }
                        }
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

    /**
     * Obtém estatísticas rápidas do acervo (opcional para dashboard).
     */
    static async obterEstatisticas(secretariaId?: string) {
        try {
            const where = secretariaId ? { secretariaId } : {}

            const stats = await prisma.portaria.groupBy({
                by: ['status'],
                where,
                _count: {
                    id: true
                }
            })

            return ok(stats)
        } catch (error) {
            return err('Erro ao gerar estatísticas.')
        }
    }
}
