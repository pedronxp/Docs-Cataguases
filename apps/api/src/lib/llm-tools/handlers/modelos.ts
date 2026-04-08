import { prisma, verificarPermissao, logAcaoIA, getDocxAnalise, clearDocxAnalise, type ToolContext } from './_shared'

export async function handleModelos(toolName: string, args: any, context?: ToolContext): Promise<any> {
    switch (toolName) {

    case 'listar_modelos': {
        const modelos = await prisma.modeloDocumento.findMany({
            where: { ativo: true },
            select: {
                id: true, nome: true, descricao: true, tipoDocumento: true, versao: true,
                variaveis: { select: { chave: true, label: true, tipo: true, obrigatorio: true }, orderBy: { ordem: 'asc' } },
            },
            orderBy: { nome: 'asc' },
        })
        return { mensagem: `${modelos.length} modelo(s) disponível(is).`, modelos }
    }

    case 'criar_modelo': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        let { nome, descricao, tipoDocumento, secretariaId, conteudoHtml, variaveis = [] } = args

        // Se o HTML não foi fornecido (ou é muito curto), usar o cache da análise DOCX
        const analise = getDocxAnalise(perm.user!.id)
        if ((!conteudoHtml || conteudoHtml.length < 200) && analise) {
            conteudoHtml = analise.conteudoHtml
            if (!variaveis || variaveis.length === 0) {
                variaveis = analise.variaveis
            }
        }

        if (!conteudoHtml || conteudoHtml.length < 10) {
            return { erro: 'Conteúdo HTML do modelo não disponível. Envie o documento DOCX primeiro ou forneça o HTML.' }
        }

        // Validar secretaria/categoria se fornecida
        if (secretariaId) {
            const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
            if (!sec) return { erro: `Secretaria/categoria "${secretariaId}" não encontrada. Use listar_secretarias para ver as opções disponíveis.` }
        }

        const modelo = await prisma.modeloDocumento.create({
            data: {
                nome,
                descricao,
                tipoDocumento: tipoDocumento || 'PORTARIA',
                conteudoHtml: conteudoHtml || '',
                docxTemplateUrl: '',
                ativo: true,
                versao: 1,
                ...(secretariaId && { secretariaId }),
                variaveis: {
                    create: (variaveis as any[]).map((v: any, i: number) => ({
                        chave: v.chave,
                        label: v.label || v.chave,
                        tipo: v.tipo || 'texto',
                        obrigatorio: v.obrigatorio !== false,
                        ordem: i,
                    })),
                },
            },
            include: { variaveis: true },
        })

        // Limpa o cache da análise após criação bem-sucedida
        clearDocxAnalise(perm.user!.id)
        await logAcaoIA(perm.user!.id, `Assistente IA criou modelo "${modelo.nome}" (${modelo.tipoDocumento}) com ${modelo.variaveis.length} variável(is)`, undefined, { acao: 'criar_modelo', modeloId: modelo.id })
        return {
            mensagem: `Modelo "${modelo.nome}" criado com sucesso! ID: ${modelo.id}`,
            modelo: { id: modelo.id, nome: modelo.nome, tipo: modelo.tipoDocumento, totalVariaveis: modelo.variaveis.length },
        }
    }

    default:
        return null
    }
}
