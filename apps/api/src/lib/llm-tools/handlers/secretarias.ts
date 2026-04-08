import { prisma, verificarPermissao, logAcaoIA, type ToolContext } from './_shared'

export async function handleSecretarias(toolName: string, args: any, context?: ToolContext): Promise<any> {
    switch (toolName) {

    case 'listar_secretarias': {
        const secretarias = await prisma.secretaria.findMany({
            where: { ativo: true },
            select: { id: true, nome: true, sigla: true, cor: true },
            orderBy: { nome: 'asc' },
        })
        return { mensagem: 'Lista de secretarias ativas.', secretarias }
    }

    case 'criar_secretaria': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { nome, sigla, cor } = args
        const existente = await prisma.secretaria.findUnique({ where: { sigla: sigla.toUpperCase() } })
        if (existente) return { erro: `Já existe uma secretaria com a sigla ${sigla.toUpperCase()}.` }

        const secretaria = await prisma.secretaria.create({
            data: { nome, sigla: sigla.toUpperCase(), cor: cor || '#6366f1', ativo: true },
        })
        await logAcaoIA(perm.user!.id, `Assistente IA criou secretaria "${secretaria.nome}" (${secretaria.sigla})`, secretaria.id, { acao: 'criar_secretaria', secretariaId: secretaria.id })
        return {
            mensagem: 'Secretaria criada com sucesso!',
            secretaria: { id: secretaria.id, nome: secretaria.nome, sigla: secretaria.sigla },
        }
    }

    case 'deletar_secretaria': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { secretariaId } = args
        const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
        if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada.` }

        // Soft delete — marca como inativa
        await prisma.secretaria.update({
            where: { id: secretariaId },
            data: { ativo: false },
        })
        await logAcaoIA(perm.user!.id, `Assistente IA desativou secretaria "${sec.nome}" (${sec.sigla})`, sec.id, { acao: 'deletar_secretaria', secretariaId: sec.id })
        return {
            mensagem: `Secretaria "${sec.nome}" (${sec.sigla}) foi desativada com sucesso.`,
            secretariaId: sec.id,
        }
    }

    case 'editar_secretaria': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { secretariaId, nome, sigla, cor } = args
        const sec = await prisma.secretaria.findUnique({ where: { id: secretariaId } })
        if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada.` }

        // Se mudou sigla, verificar conflito
        if (sigla && sigla.toUpperCase() !== sec.sigla) {
            const conflito = await prisma.secretaria.findUnique({ where: { sigla: sigla.toUpperCase() } })
            if (conflito) return { erro: `Já existe outra secretaria com a sigla ${sigla.toUpperCase()}.` }
        }

        const atualizada = await prisma.secretaria.update({
            where: { id: secretariaId },
            data: {
                ...(nome && { nome }),
                ...(sigla && { sigla: sigla.toUpperCase() }),
                ...(cor && { cor }),
            },
        })
        await logAcaoIA(perm.user!.id, `Assistente IA editou secretaria "${sec.nome}" → "${atualizada.nome}" (${atualizada.sigla})`, atualizada.id, { acao: 'editar_secretaria', secretariaId: atualizada.id, alteracoes: { nome, sigla, cor } })
        return {
            mensagem: `Secretaria atualizada com sucesso!`,
            secretaria: { id: atualizada.id, nome: atualizada.nome, sigla: atualizada.sigla },
        }
    }

    default:
        return null // indica que este handler não conhece a tool
    }
}
