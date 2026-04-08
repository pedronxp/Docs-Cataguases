import { prisma, verificarPermissao, logAcaoIA, type ToolContext } from './_shared'

export async function handleSetores(toolName: string, args: any, context?: ToolContext): Promise<any> {
    switch (toolName) {

    case 'listar_setores_secretaria': {
        const { termo_secretaria } = args
        const setores = await prisma.setor.findMany({
            where: {
                ativo: true,
                secretaria: {
                    OR: [
                        { sigla: { equals: termo_secretaria, mode: 'insensitive' } },
                        { id: termo_secretaria },
                    ],
                },
            },
            select: {
                id: true,
                nome: true,
                sigla: true,
                secretaria: { select: { sigla: true, nome: true } },
            },
        })
        return {
            mensagem: setores.length > 0 ? 'Setores encontrados.' : 'Nenhum setor encontrado para esta secretaria.',
            setores,
        }
    }

    case 'criar_setor': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL', 'SECRETARIO'])
        if (!perm.ok) return { erro: perm.erro }

        const { nome, sigla, secretariaId } = args
        const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
        if (!sec) return { erro: `Secretaria com ID ${secretariaId} não encontrada.` }

        try {
            const setor = await prisma.setor.create({
                data: { nome, sigla: sigla.toUpperCase(), secretariaId, ativo: true },
            })
            await logAcaoIA(perm.user!.id, `Assistente IA criou setor "${setor.nome}" (${setor.sigla}) na secretaria ${sec.sigla}`, secretariaId, { acao: 'criar_setor', setorId: setor.id, secretariaId })
            return {
                mensagem: 'Setor criado com sucesso!',
                setor: { id: setor.id, nome: setor.nome, sigla: setor.sigla, secretaria: sec.sigla },
            }
        } catch (err: any) {
            if (err.code === 'P2002') return { erro: 'Já existe um setor com essa sigla nessa secretaria.' }
            return { erro: 'Falha ao criar setor.', detalhes: err.message }
        }
    }

    case 'deletar_setor': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL', 'SECRETARIO'])
        if (!perm.ok) return { erro: perm.erro }

        const { setorId } = args
        const setor = await prisma.setor.findUnique({
            where: { id: setorId },
            include: { secretaria: { select: { sigla: true } } },
        })
        if (!setor) return { erro: `Setor com ID "${setorId}" não encontrado.` }

        await prisma.setor.update({
            where: { id: setorId },
            data: { ativo: false },
        })
        await logAcaoIA(perm.user!.id, `Assistente IA desativou setor "${setor.nome}" (${setor.sigla}) da secretaria ${setor.secretaria.sigla}`, setor.secretariaId, { acao: 'deletar_setor', setorId: setor.id })
        return {
            mensagem: `Setor "${setor.nome}" (${setor.sigla}) da secretaria ${setor.secretaria.sigla} foi desativado com sucesso.`,
            setorId: setor.id,
        }
    }

    default:
        return null
    }
}
