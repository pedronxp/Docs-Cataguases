import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/result'
import { CacheService, CACHE_TTL, CACHE_TAGS } from './cache.service'

export class ModeloService {
    /**
     * Lista todos os modelos ativos, com filtro opcional por secretaria.
     * ADMIN_GERAL (secretariaId = undefined) vê todos.
     * SECRETARIO vê globais (secretariaId = null) + os da sua secretaria.
     * Cache TTL: 2min — modelos mudam raramente.
     */
    static async listarTodos(secretariaId?: string) {
        const cacheKey = CacheService.key('modelos', 'lista', secretariaId)

        return CacheService.getOrSet(cacheKey, async () => {
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
        }, CACHE_TTL.MODELOS, [CACHE_TAGS.MODELOS])
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
        tipoDocumento?: string;
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
            valorPadrao?: string | null;
            grupo?: string | null;
            regraCondicional?: { dependeDe: string; valor: string } | null;
        }[]
    }) {
        try {
            const createData: any = {
                nome: data.nome,
                descricao: data.descricao,
                tipoDocumento: data.tipoDocumento ?? 'PORTARIA',
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
                        ordem: v.ordem ?? 0,
                        valorPadrao: v.valorPadrao ?? null,
                        grupo: v.grupo ?? null,
                        regraCondicional: v.regraCondicional ? (v.regraCondicional as any) : undefined
                    }))
                }
            }
            const modelo = await prisma.modeloDocumento.create({ data: createData, include: { variaveis: true } })
            CacheService.invalidateByTag(CACHE_TAGS.MODELOS).catch(() => {})
            return ok(modelo)
        } catch (error) {
            console.error('Erro ao criar modelo:', error)
            return err('Erro ao criar modelo de documento.')
        }
    }

    /**
     * Atualiza um modelo existente.
     *
     * Se o modelo já tem portarias vinculadas, cria uma nova versão (fork):
     *  - desativa o modelo atual
     *  - cria novo com versao+1 e modeloPaiId apontando para o atual
     *
     * Retorna { modelo, novaVersao: boolean }.
     */
    static async atualizar(id: string, data: any) {
        try {
            const modeloAtual = await prisma.modeloDocumento.findUnique({ where: { id } })
            if (!modeloAtual) return err('Modelo não encontrado.')

            const portariasVinculadas = await prisma.portaria.count({ where: { modeloId: id } })

            const variavelData = data.variaveis?.map((v: any) => ({
                chave: v.chave,
                label: v.label,
                tipo: v.tipo,
                opcoes: v.opcoes || [],
                obrigatorio: v.obrigatorio ?? true,
                ordem: v.ordem ?? 0,
                valorPadrao: v.valorPadrao ?? null,
                grupo: v.grupo ?? null,
                regraCondicional: v.regraCondicional ? (v.regraCondicional as any) : undefined
            }))

            // Fork: modelo em uso → cria nova versão, desativa a antiga
            if (portariasVinculadas > 0 && data.variaveis) {
                const { variaveis, ...modeloData } = data
                const novoModelo = await prisma.modeloDocumento.create({
                    data: {
                        ...modeloData,
                        versao: (modeloAtual.versao ?? 1) + 1,
                        modeloPaiId: id,
                        variaveis: { create: variavelData }
                    },
                    include: { variaveis: true }
                })
                // Desativa versão anterior
                await prisma.modeloDocumento.update({
                    where: { id },
                    data: { ativo: false }
                })
                CacheService.invalidateByTag(CACHE_TAGS.MODELOS).catch(() => {})
                return ok({ modelo: novoModelo, novaVersao: true })
            }

            // Atualização direta (sem portarias vinculadas)
            if (data.variaveis) {
                await prisma.modeloVariavel.deleteMany({ where: { modeloId: id } })
                const { variaveis, ...modeloData } = data
                const modelo = await prisma.modeloDocumento.update({
                    where: { id },
                    data: {
                        ...modeloData,
                        variaveis: { create: variavelData }
                    },
                    include: { variaveis: true }
                })
                CacheService.invalidateByTag(CACHE_TAGS.MODELOS).catch(() => {})
                return ok({ modelo, novaVersao: false })
            }

            const modelo = await prisma.modeloDocumento.update({
                where: { id },
                data,
                include: { variaveis: true }
            })
            CacheService.invalidateByTag(CACHE_TAGS.MODELOS).catch(() => {})
            return ok({ modelo, novaVersao: false })
        } catch (error) {
            return err('Erro ao atualizar modelo.')
        }
    }

    /**
     * Soft delete de um modelo.
     * Bloqueia se houver portarias vinculadas ou versões derivadas ativas.
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

            const versoesAtivas = await prisma.modeloDocumento.count({
                where: { modeloPaiId: id, ativo: true }
            })

            if (versoesAtivas > 0) {
                return err(
                    `Não é possível excluir este modelo pois ele possui ${versoesAtivas} versão(ões) derivada(s) ativa(s).`
                )
            }

            await prisma.modeloDocumento.update({
                where: { id },
                data: { ativo: false }
            })
            CacheService.invalidateByTag(CACHE_TAGS.MODELOS).catch(() => {})
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

    static async salvarVariavelSistema(data: { chave: string, valor: string, descricao?: string }) {
        try {
            const v = await prisma.variavelSistema.upsert({
                where: { chave: data.chave },
                update: { valor: data.valor, descricao: data.descricao ?? '' },
                create: { chave: data.chave, valor: data.valor, descricao: data.descricao ?? '' }
            })
            return ok(v)
        } catch (error) {
            return err('Erro ao salvar variável de sistema.')
        }
    }

    static async excluirVariavelSistema(id: string) {
        try {
            await prisma.variavelSistema.delete({ where: { id } })
            return ok(true)
        } catch (error) {
            return err('Erro ao excluir variável de sistema.')
        }
    }
}
