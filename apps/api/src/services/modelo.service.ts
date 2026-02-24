import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

/**
 * Serviço para gestão de Modelos de Documento e suas Variáveis.
 */
export class ModeloService {
    /**
     * Lista todos os modelos ativos.
     */
    static async listarTodos(): Promise<Result<any[]>> {
        try {
            const modelos = await prisma.modeloDocumento.findMany({
                where: { ativo: true },
                include: {
                    variaveis: {
                        orderBy: { ordem: 'asc' }
                    }
                },
                orderBy: { nome: 'asc' }
            })
            return ok(modelos)
        } catch (error) {
            return err('Erro ao listar modelos de documento.')
        }
    }

    /**
     * Busca um modelo específico por ID.
     */
    static async buscarPorId(id: string): Promise<Result<any>> {
        try {
            const modelo = await prisma.modeloDocumento.findUnique({
                where: { id },
                include: {
                    variaveis: {
                        orderBy: { ordem: 'asc' }
                    }
                }
            })
            if (!modelo) return err('Modelo não encontrado.')
            return ok(modelo)
        } catch (error) {
            return err('Erro ao buscar modelo.')
        }
    }

    /**
     * Cria um novo modelo com suas variáveis em uma transação única.
     */
    static async criar(data: {
        nome: string
        descricao: string
        secretariaId?: string
        docxTemplateUrl: string
        variaveis: {
            chave: string
            label: string
            tipo?: string
            opcoes?: string[]
            obrigatorio?: boolean
            ordem?: number
        }[]
    }): Promise<Result<any>> {
        try {
            const result = await prisma.$transaction(async (tx) => {
                const modelo = await tx.modeloDocumento.create({
                    data: {
                        nome: data.nome,
                        descricao: data.descricao,
                        secretariaId: data.secretariaId,
                        docxTemplateUrl: data.docxTemplateUrl,
                        ativo: true,
                        variaveis: {
                            create: data.variaveis.map((v) => ({
                                chave: v.chave,
                                label: v.label,
                                tipo: v.tipo || 'texto',
                                opcoes: v.opcoes || [],
                                obrigatorio: v.obrigatorio ?? true,
                                ordem: v.ordem ?? 0
                            }))
                        }
                    },
                    include: { variaveis: true }
                })
                return modelo
            })
            return ok(result)
        } catch (error) {
            console.error('Erro ao criar modelo:', error)
            return err('Erro ao criar modelo de documento.')
        }
    }

    /**
     * Atualiza um modelo e suas variáveis.
     */
    static async atualizar(id: string, data: {
        nome?: string
        descricao?: string
        docxTemplateUrl?: string
        ativo?: boolean
        variaveis?: any[] // Simplificado para este exemplo
    }): Promise<Result<any>> {
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Se houver novas variáveis, deletamos as antigas e criamos as novas (estratégia simples)
                if (data.variaveis) {
                    await tx.modeloVariavel.deleteMany({ where: { modeloId: id } })
                }

                const modelo = await tx.modeloDocumento.update({
                    where: { id },
                    data: {
                        nome: data.nome,
                        descricao: data.descricao,
                        docxTemplateUrl: data.docxTemplateUrl,
                        ativo: data.ativo,
                        ...(data.variaveis && {
                            variaveis: {
                                create: data.variaveis.map((v, index) => ({
                                    chave: v.chave,
                                    label: v.label,
                                    tipo: v.tipo || 'texto',
                                    opcoes: v.opcoes || [],
                                    obrigatorio: v.obrigatorio ?? true,
                                    ordem: v.ordem ?? index
                                }))
                            }
                        })
                    },
                    include: { variaveis: true }
                })
                return modelo
            })
            return ok(result)
        } catch (error) {
            return err('Erro ao atualizar modelo de documento.')
        }
    }

    /**
     * Soft delete de um modelo.
     */
    static async excluir(id: string): Promise<Result<boolean>> {
        try {
            await prisma.modeloDocumento.update({
                where: { id },
                data: { ativo: false }
            })
            return ok(true)
        } catch (error) {
            return err('Erro ao excluir modelo.')
        }
    }
}
