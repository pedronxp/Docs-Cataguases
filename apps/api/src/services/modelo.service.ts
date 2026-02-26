import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/result'

export class ModeloService {
    /**
     * Lista todos os modelos ativos, com filtro opcional por secretaria.
     * ADMIN_GERAL (secretariaId = undefined) vê todos.
     * SECRETARIO vê globais (secretariaId = null) + os da sua secretaria.
     */
    static async listarTodos(secretariaId?: string) {
        try {
            const where: any = { ativo: true }

            if (secretariaId) {
                // Mostra modelos globais (null) + modelos da secretaria específica
                where.OR = [
                    { secretariaId: null },
                    { secretariaId }
                ]
            }

            const modelos = await prisma.modeloDocumento.findMany({
                where,
                include: {
                    variaveis: {
                        orderBy: { ordem: 'asc' }
                    }
                },
                orderBy: { nome: 'asc' }
            })
            return ok(modelos)
        } catch (error) {
            return err('Erro ao listar modelos.')
        }
    }

    /**
     * Busca um modelo por ID.
     */
    static async buscarPorId(id: string) {
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
     * Cria um novo modelo com suas variáveis.
     * docxTemplateUrl é opcional (modelos HTML-only são válidos).
     */
    static async criar(data: {
        nome: string;
        descricao: string;
        categoria?: string;
        secretariaId?: string | null;
        docxTemplateUrl?: string | null;
        conteudoHtml: string;
        variaveis: {
            chave: string;
            label: string;
            tipo: string;
            opcoes?: string[];
            obrigatorio?: boolean;
            ordem?: number;
        }[]
    }) {
        try {
            const modelo = await prisma.modeloDocumento.create({
                data: {
                    nome: data.nome,
                    descricao: data.descricao,
                    secretariaId: data.secretariaId ?? null,
                    docxTemplateUrl: data.docxTemplateUrl ?? '',
                    conteudoHtml: data.conteudoHtml,
                    variaveis: {
                        create: data.variaveis.map(v => ({
                            chave: v.chave,
                            label: v.label,
                            tipo: v.tipo,
                            opcoes: v.opcoes || [],
                            obrigatorio: v.obrigatorio ?? true,
                            ordem: v.ordem ?? 0
                        }))
                    }
                },
                include: { variaveis: true }
            })
            return ok(modelo)
        } catch (error) {
            console.error('Erro ao criar modelo:', error)
            return err('Erro ao criar modelo de documento.')
        }
    }

    /**
     * Atualiza um modelo existente.
     */
    static async atualizar(id: string, data: any) {
        try {
            if (data.variaveis) {
                await prisma.modeloVariavel.deleteMany({ where: { modeloId: id } })
                const { variaveis, ...modeloData } = data
                const modelo = await prisma.modeloDocumento.update({
                    where: { id },
                    data: {
                        ...modeloData,
                        variaveis: {
                            create: variaveis.map((v: any) => ({
                                chave: v.chave,
                                label: v.label,
                                tipo: v.tipo,
                                opcoes: v.opcoes || [],
                                obrigatorio: v.obrigatorio ?? true,
                                ordem: v.ordem ?? 0
                            }))
                        }
                    },
                    include: { variaveis: true }
                })
                return ok(modelo)
            }

            const modelo = await prisma.modeloDocumento.update({
                where: { id },
                data,
                include: { variaveis: true }
            })
            return ok(modelo)
        } catch (error) {
            return err('Erro ao atualizar modelo.')
        }
    }

    /**
     * Soft delete de um modelo.
     * Bloqueia se houver portarias vinculadas ao modelo.
     */
    static async desativar(id: string) {
        try {
            const portariasVinculadas = await prisma.portaria.count({
                where: { modeloId: id }
            })

            if (portariasVinculadas > 0) {
                return err(
                    `Não é possível desativar este modelo pois há ${portariasVinculadas} portaria(s) vinculada(s) a ele.`
                )
            }

            await prisma.modeloDocumento.update({
                where: { id },
                data: { ativo: false }
            })
            return ok(true)
        } catch (error) {
            return err('Erro ao desativar modelo.')
        }
    }

    // --- VARIÁVEIS DE SISTEMA ---

    static async listarVariaveisSistema() {
        try {
            const vars = await prisma.variavelSistema.findMany({
                orderBy: { chave: 'asc' }
            })
            return ok(vars)
        } catch (error) {
            return err('Erro ao listar variáveis de sistema.')
        }
    }

    static async salvarVariavelSistema(data: { chave: string, valor: string, descricao: string }) {
        try {
            const v = await prisma.variavelSistema.upsert({
                where: { chave: data.chave },
                update: { valor: data.valor, descricao: data.descricao },
                create: { chave: data.chave, valor: data.valor, descricao: data.descricao }
            })
            return ok(v)
        } catch (error) {
            return err('Erro ao salvar variável de sistema.')
        }
    }
}
