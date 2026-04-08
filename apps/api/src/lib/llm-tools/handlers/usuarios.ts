import { prisma, verificarPermissao, logAcaoIA, type ToolContext } from './_shared'

export async function handleUsuarios(toolName: string, args: any, context?: ToolContext): Promise<any> {
    switch (toolName) {

    case 'listar_usuarios': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { role, secretariaId, busca, ativo } = args
        const where: any = {}
        if (role) where.role = role
        if (secretariaId) where.secretariaId = secretariaId
        if (typeof ativo === 'boolean') where.ativo = ativo
        if (busca) {
            where.OR = [
                { name: { contains: busca, mode: 'insensitive' } },
                { email: { contains: busca, mode: 'insensitive' } },
            ]
        }

        const users = await prisma.user.findMany({
            where,
            take: 20,
            select: {
                id: true, name: true, email: true, role: true, ativo: true,
                secretaria: { select: { sigla: true, nome: true } },
                setor: { select: { nome: true } },
            },
            orderBy: { name: 'asc' },
        })

        return {
            mensagem: `${users.length} usuário(s) encontrado(s).`,
            usuarios: users.map(u => ({
                id: u.id,
                nome: u.name,
                email: u.email,
                papel: u.role,
                ativo: u.ativo,
                secretaria: u.secretaria?.sigla ?? null,
                setor: u.setor?.nome ?? null,
            })),
        }
    }

    case 'alterar_papel': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { userId, role, secretariaId, ativo } = args

        // Valida: REVISOR, OPERADOR e SECRETARIO precisam de secretaria
        const rolesRequeremSecretaria = ['REVISOR', 'OPERADOR', 'SECRETARIO']
        if (rolesRequeremSecretaria.includes(role) && !secretariaId) {
            return { erro: `O papel "${role}" exige uma secretaria de lotação. Informe secretariaId (use listar_secretarias para obter os IDs).` }
        }

        const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
        if (!target) return { erro: `Usuário com ID "${userId}" não encontrado.` }

        // Impede rebaixar o próprio ADMIN para não travar o sistema
        if (target.role === 'ADMIN_GERAL' && role !== 'ADMIN_GERAL' && perm.user!.id === userId) {
            return { erro: 'Não é possível rebaixar a si mesmo de ADMIN_GERAL.' }
        }

        if (secretariaId) {
            const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
            if (!sec) return { erro: `Secretaria "${secretariaId}" não encontrada ou inativa.` }
        }

        const updateData: any = { role }
        if (secretariaId !== undefined) updateData.secretariaId = secretariaId
        if (typeof ativo === 'boolean') updateData.ativo = ativo

        const atualizado = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, email: true, role: true, ativo: true, secretaria: { select: { sigla: true } } },
        })

        await logAcaoIA(perm.user!.id, `Assistente IA alterou papel de "${target.name}": ${target.role} → ${role}`, secretariaId, { acao: 'alterar_papel', targetUserId: userId, roleAnterior: target.role, roleNovo: role })
        return {
            mensagem: `Papel de "${atualizado.name}" alterado de ${target.role} para ${role} com sucesso!`,
            usuario: { id: atualizado.id, nome: atualizado.name, email: atualizado.email, papel: atualizado.role, ativo: atualizado.ativo, secretaria: atualizado.secretaria?.sigla },
        }
    }

    case 'alterar_lotacao': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { userId, secretariaId, setorId } = args

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, role: true, secretariaId: true, secretaria: { select: { sigla: true } } },
        })
        if (!target) return { erro: `Usuário com ID "${userId}" não encontrado.` }

        const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
        if (!sec) return { erro: `Secretaria "${secretariaId}" não encontrada ou inativa.` }

        if (setorId) {
            const setor = await prisma.setor.findFirst({ where: { id: setorId, secretariaId, ativo: true } })
            if (!setor) return { erro: `Setor "${setorId}" não encontrado ou não pertence à secretaria ${sec.sigla}.` }
        }

        const updateData: any = { secretariaId, setorId: setorId ?? null }
        const atualizado = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, name: true, role: true, secretaria: { select: { sigla: true, nome: true } }, setor: { select: { nome: true } } },
        })

        await logAcaoIA(perm.user!.id, `Assistente IA alterou lotação de "${target.name}": ${target.secretaria?.sigla ?? 'N/A'} → ${sec.sigla}`, secretariaId, { acao: 'alterar_lotacao', targetUserId: userId, secretariaAnterior: target.secretariaId, secretariaNova: secretariaId })
        return {
            mensagem: `Lotação de "${atualizado.name}" atualizada para ${sec.nome} (${sec.sigla})!`,
            usuario: { id: atualizado.id, nome: atualizado.name, papel: atualizado.role, secretaria: atualizado.secretaria?.sigla, setor: atualizado.setor?.nome ?? null },
        }
    }

    default:
        return null
    }
}
