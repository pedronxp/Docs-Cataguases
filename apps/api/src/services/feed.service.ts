import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

export class FeedService {
    /**
     * Lista atividades recentes filtradas pelo escopo do usuário.
     */
    static async listarAtividades(params: {
        secretariaId?: string;
        setorId?: string;
        page?: number;
        pageSize?: number;
        role: string;
    }) {
        const {
            secretariaId,
            setorId,
            page = 1,
            pageSize = 20,
            role
        } = params

        const skip = (page - 1) * pageSize

        try {
            // Filtro ABAC básico aplicado no banco
            const where: any = {}

            if (role !== 'ADMIN_GERAL' && role !== 'PREFEITO') {
                if (secretariaId) {
                    where.secretariaId = secretariaId
                }
                if (setorId && role === 'GESTOR_SETOR') {
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
                    // orderBy: { createdAt: 'desc' },
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
    }

    /**
     * Atalho para criar um evento (Auditoria).
     */
    static async registrarEvento(data: {
        tipoEvento: string;
        mensagem: string;
        autorId: string;
        secretariaId: string;
        setorId?: string | null;
        portariaId?: string | null;
        metadata?: any;
    }) {
        try {
            const evento = await prisma.feedAtividade.create({
                data: {
                    ...data,
                    setorId: data.setorId || (null as any),
                    portariaId: data.portariaId || (null as any),
                    metadata: data.metadata || {}
                }
            })
            return ok(evento)
        } catch (error) {
            console.error('Erro ao registrar evento no feed:', error)
            return err('Falha ao registrar auditoria.')
        }
    }
}
