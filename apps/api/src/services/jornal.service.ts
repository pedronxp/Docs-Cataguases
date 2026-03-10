import prisma from '@/lib/prisma'

export interface PaginationParams {
    cursor?: string
    limit?: number
    tipo?: string[]
}

export interface PaginatedResult<T> {
    items: T[]
    nextCursor: string | null
    hasMore: boolean
    total: number
}

export class JornalService {
    static async getFilaPaginada(params: PaginationParams): Promise<PaginatedResult<any>> {
        const { cursor, limit = 50, tipo } = params

        const where: any = {
            status: 'PENDENTE',
            ...(tipo && tipo.length > 0 ? { tipoDocumento: { in: tipo } } : {})
        }

        const items = await (prisma as any).jornalQueue.findMany({
            take: limit + 1,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where,
            include: {
                portaria: {
                    include: { secretaria: true }
                }
            },
            orderBy: [
                { prioridade: 'desc' },
                { createdAt: 'asc' }
            ]
        })

        const hasMore = items.length > limit
        const itemsResult = hasMore ? items.slice(0, limit) : items
        const nextCursor = hasMore ? itemsResult[itemsResult.length - 1].id : null

        const total = await (prisma as any).jornalQueue.count({ where })

        return { items: itemsResult, nextCursor, hasMore, total }
    }

    static async getMetricas() {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const inicioAno = new Date(hoje.getFullYear(), 0, 1)

        const [pendentes, publicadasHoje, totalAno, livroAtivo, porTipo] = await Promise.all([
            (prisma as any).jornalQueue.count({ where: { status: 'PENDENTE' } }),

            prisma.portaria.count({
                where: { status: 'PUBLICADA', dataPublicacao: { gte: hoje } }
            }),

            prisma.portaria.count({
                where: { status: 'PUBLICADA', dataPublicacao: { gte: inicioAno } }
            }),

            // Nome correto conforme schema: model LivrosNumeracao → prisma.livrosNumeracao
            (prisma as any).livrosNumeracao.findFirst({
                where: { ativo: true },
                orderBy: { criado_em: 'asc' }
            }),

            // Contagem por tipo para o filtro da UI
            (prisma as any).jornalQueue.groupBy({
                by: ['tipoDocumento'],
                where: { status: 'PENDENTE' },
                _count: { _all: true }
            })
        ])

        const proximoNumero = livroAtivo
            ? livroAtivo.formato_base
                .replace('{N}', String(livroAtivo.proximo_numero).padStart(3, '0'))
                .replace('{ANO}', new Date().getFullYear().toString())
            : null

        const contagemPorTipo: Record<string, number> = {}
        if (Array.isArray(porTipo)) {
            porTipo.forEach((item: any) => {
                contagemPorTipo[item.tipoDocumento] = item._count._all
            })
        }

        return { pendentes, publicadasHoje, totalAno, proximoNumero, porTipo: contagemPorTipo }
    }
}
