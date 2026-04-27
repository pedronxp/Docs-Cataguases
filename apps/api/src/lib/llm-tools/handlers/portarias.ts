import { prisma, verificarPermissao, logAcaoIA, type ToolContext } from './_shared'

export async function handlePortarias(toolName: string, args: any, context?: ToolContext): Promise<any> {
    switch (toolName) {

    case 'listar_portarias': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
        if (!dbUser) return { erro: 'Usuário não encontrado.' }

        const { status, limite = 10 } = args

        const where: any = {}
        if (status) where.status = status
        // Operadores só veem as suas; Secretário/Revisor veem da secretaria; Admin/Prefeito veem tudo
        if (dbUser.role === 'OPERADOR') where.criadoPorId = dbUser.id
        else if (['SECRETARIO', 'REVISOR'].includes(dbUser.role) && dbUser.secretariaId) where.secretariaId = dbUser.secretariaId

        const portarias = await prisma.portaria.findMany({
            where,
            take: Number(limite),
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, titulo: true, status: true, numeroOficial: true,
                createdAt: true, updatedAt: true,
                secretaria: { select: { sigla: true } },
                modelo: { select: { nome: true } },
                criadoPor: { select: { name: true } },
            },
        })
        return {
            mensagem: `${portarias.length} portaria(s) encontrada(s).`,
            portarias: portarias.map(p => ({
                id: p.id, titulo: p.titulo, status: p.status,
                numero: p.numeroOficial, secretaria: p.secretaria?.sigla,
                modelo: p.modelo?.nome, autor: p.criadoPor?.name,
                atualizada: p.updatedAt,
            })),
        }
    }

    case 'criar_portaria': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['OPERADOR', 'SECRETARIO', 'REVISOR', 'PREFEITO', 'ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { titulo, descricao, modeloId, secretariaId, formData = {} } = args

        // Validar modelo
        const modelo = await prisma.modeloDocumento.findFirst({ where: { id: modeloId, ativo: true } })
        if (!modelo) return { erro: `Modelo com ID "${modeloId}" não encontrado ou inativo. Use listar_modelos para ver os disponíveis.` }

        // Validar secretaria
        const sec = await prisma.secretaria.findFirst({ where: { id: secretariaId, ativo: true } })
        if (!sec) return { erro: `Secretaria com ID "${secretariaId}" não encontrada. Use listar_secretarias para ver as disponíveis.` }

        const portaria = await prisma.portaria.create({
            data: {
                titulo,
                descricao: descricao || titulo,
                status: 'RASCUNHO',
                statusChangedAt: new Date(),
                criadoPorId: perm.user!.id,
                secretariaId,
                modeloId,
                formData: (formData || {}) as object,
            },
        })

        await logAcaoIA(perm.user!.id, `Assistente IA criou portaria "${titulo}" (RASCUNHO) na secretaria ${sec.sigla}`, secretariaId, { acao: 'criar_portaria', portariaId: portaria.id })
        return {
            mensagem: `Portaria "${titulo}" criada com sucesso como RASCUNHO! ID: ${portaria.id}`,
            portaria: { id: portaria.id, titulo: portaria.titulo, status: portaria.status, secretaria: sec.sigla, modelo: modelo.nome },
            proximoPasso: 'Para enviar para revisão, acesse a portaria e clique em "Submeter para Revisão".',
        }
    }

    case 'buscar_contexto_usuario': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({
            where: { email: context.userAuth.email, ativo: true },
            include: { secretaria: { select: { nome: true, sigla: true } }, setor: { select: { nome: true } } },
        })
        if (!dbUser) return { erro: 'Usuário não encontrado no sistema.' }

        const where: any = {}
        if (dbUser.role === 'OPERADOR') where.criadoPorId = dbUser.id
        else if (['SECRETARIO', 'REVISOR'].includes(dbUser.role) && dbUser.secretariaId) where.secretariaId = dbUser.secretariaId

        const [totalRascunho, totalRevisao, totalAssinatura, totalPublicadas, recentes] = await Promise.all([
            prisma.portaria.count({ where: { ...where, status: 'RASCUNHO' } }),
            prisma.portaria.count({ where: { ...where, status: { in: ['EM_REVISAO_ABERTA', 'EM_REVISAO_ATRIBUIDA'] } } }),
            prisma.portaria.count({ where: { ...where, status: { in: ['AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO'] } } }),
            prisma.portaria.count({ where: { ...where, status: 'PUBLICADA' } }),
            prisma.portaria.findMany({
                where, take: 5, orderBy: { updatedAt: 'desc' },
                select: { id: true, titulo: true, status: true, updatedAt: true, secretaria: { select: { sigla: true } } },
            }),
        ])

        return {
            usuario: { nome: dbUser.name, role: dbUser.role, secretaria: (dbUser as any).secretaria?.sigla, setor: (dbUser as any).setor?.nome },
            resumo: { rascunhos: totalRascunho, emRevisao: totalRevisao, aguardandoAssinatura: totalAssinatura, publicadas: totalPublicadas },
            recentes: recentes.map(p => ({ id: p.id, titulo: p.titulo, status: p.status, secretaria: p.secretaria?.sigla })),
        }
    }

    case 'buscar_documentos': {
        const { termo, limite = 5 } = args
        if (!termo || termo.length < 3) return { erro: 'O termo de busca deve ter pelo menos 3 caracteres.' }

        const portarias = await prisma.portaria.findMany({
            where: {
                status: 'PUBLICADA',
                OR: [
                    { titulo: { contains: termo, mode: 'insensitive' } },
                    { descricao: { contains: termo, mode: 'insensitive' } },
                    { numeroOficial: { contains: termo, mode: 'insensitive' } },
                    { formData: { string_contains: termo } },
                ],
            },
            take: limite,
            orderBy: { dataPublicacao: 'desc' },
            select: {
                id: true,
                titulo: true,
                numeroOficial: true,
                dataPublicacao: true,
                secretaria: { select: { sigla: true } },
            },
        })
        return {
            mensagem: portarias.length > 0 ? `Encontradas ${portarias.length} portarias.` : 'Nenhuma portaria encontrada.',
            resultados: portarias,
        }
    }

    case 'resumir_documento': {
        const { portariaId } = args
        const doc = await prisma.portaria.findUnique({
            where: { id: portariaId, status: 'PUBLICADA' },
            include: { secretaria: true, setor: true, modelo: true },
        })
        if (!doc) return { erro: 'Documento não encontrado ou não publicado.' }

        const urlDownload = `/api/publico/portarias/${doc.id}/pdf`
        return {
            id: doc.id,
            titulo: doc.titulo,
            descricao: doc.descricao,
            numeroOficial: doc.numeroOficial,
            dataPublicacao: doc.dataPublicacao,
            orgao: doc.secretaria?.nome,
            assinadoEm: (doc as any).assinadoEm,
            conteudoTexto: JSON.stringify(doc.formData),
            urlDownload,
            instrucaoParaIA: `Gere um resumo (ementa) deste documento e inclua "[Baixar Documento](${urlDownload})" ao final.`,
        }
    }

    case 'submeter_portaria': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
        if (!dbUser) return { erro: 'Usuário não encontrado.' }

        const { portariaId, observacao } = args
        const portaria = await prisma.portaria.findUnique({
            where: { id: portariaId },
            include: { secretaria: { select: { sigla: true, nome: true } } }
        }) as any
        if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada. Use listar_portarias para verificar.` }

        // Apenas o autor ou ADMIN_GERAL pode submeter
        if (portaria.criadoPorId !== dbUser.id && dbUser.role !== 'ADMIN_GERAL') {
            return { erro: 'Apenas o autor da portaria ou um ADMIN_GERAL pode submetê-la para revisão.' }
        }

        if (!['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)) {
            return {
                erro: `Portaria não pode ser submetida no status "${portaria.status}".`,
                statusAtual: portaria.status,
                statusPermitidos: ['RASCUNHO', 'CORRECAO_NECESSARIA'],
            }
        }

        await prisma.$transaction(async (tx) => {
            await (tx.portaria as any).update({
                where: { id: portariaId },
                data: { status: 'EM_REVISAO_ABERTA', statusChangedAt: new Date() },
            })
            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PORTARIA_SUBMETIDA',
                    mensagem: `Documento submetido para revisão por ${dbUser.name} (via assistente IA)${observacao ? `. Obs: "${observacao}"` : ''}`,
                    portariaId,
                    autorId: dbUser.id,
                    secretariaId: portaria.secretariaId,
                    metadata: { via: 'assistente_ia', observacao } as any,
                },
            })
        })

        await logAcaoIA(dbUser.id, `Assistente IA submeteu portaria "${portaria.titulo}" para revisão`, portaria.secretariaId, { acao: 'submeter_portaria', portariaId })
        return {
            mensagem: `Portaria "${portaria.titulo}" submetida para revisão com sucesso!`,
            portaria: { id: portariaId, titulo: portaria.titulo, novoStatus: 'EM_REVISAO_ABERTA', secretaria: portaria.secretaria?.sigla },
            proximoPasso: 'A portaria agora está na fila de revisão. Um revisor irá assumí-la e analisar o documento.',
            aviso: portaria.docxRascunhoUrl ? undefined : 'O documento PDF não foi gerado automaticamente via IA. Para gerar, acesse a portaria na interface e use o botão "Reprocessar PDF".',
        }
    }

    case 'aprovar_revisao': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
        if (!dbUser) return { erro: 'Usuário não encontrado.' }

        if (!['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'].includes(dbUser.role)) {
            return { erro: `Ação negada. Seu cargo "${dbUser.role}" não tem permissão para aprovar revisões. Necessário: REVISOR, SECRETARIO ou ADMIN_GERAL.` }
        }

        const { portariaId, observacao } = args
        const portaria = await prisma.portaria.findUnique({ where: { id: portariaId } }) as any
        if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

        if (portaria.status !== 'EM_REVISAO_ATRIBUIDA') {
            return {
                erro: `Portaria não está em revisão atribuída. Status atual: "${portaria.status}".`,
                statusAtual: portaria.status,
                dica: portaria.status === 'EM_REVISAO_ABERTA'
                    ? 'A portaria ainda não foi atribuída a um revisor. Um revisor precisa assumir a revisão primeiro.'
                    : `Para aprovar, o status deve ser EM_REVISAO_ATRIBUIDA.`,
            }
        }

        if (portaria.revisorAtualId && portaria.revisorAtualId !== dbUser.id && !['ADMIN_GERAL', 'SECRETARIO'].includes(dbUser.role)) {
            return { erro: 'Esta portaria está atribuída a outro revisor. Apenas o revisor designado, um SECRETARIO ou ADMIN_GERAL pode aprová-la.' }
        }

        await prisma.$transaction(async (tx) => {
            await (tx.portaria as any).update({
                where: { id: portariaId },
                data: { status: 'AGUARDANDO_ASSINATURA', statusChangedAt: new Date(), revisorAtualId: null },
            })
            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'MUDANCA_STATUS_APROVAR_REVISAO',
                    mensagem: `Revisão aprovada por ${dbUser.name} (via assistente IA). Aguardando assinatura.${observacao ? ` Parecer: "${observacao}"` : ''}`,
                    portariaId,
                    autorId: dbUser.id,
                    secretariaId: portaria.secretariaId,
                    metadata: { via: 'assistente_ia', action: 'APROVAR_REVISAO', observacao } as any,
                },
            })
        })

        // Notificar o autor (melhor esforço — falha não bloqueia)
        try {
            if (portaria.criadoPorId) {
                await prisma.feedAtividade.create({
                    data: {
                        tipoEvento: 'PORTARIA_APROVADA',
                        mensagem: `Sua portaria foi aprovada na revisão por ${dbUser.name} e agora aguarda assinatura.`,
                        portariaId,
                        autorId: dbUser.id,
                        secretariaId: portaria.secretariaId,
                        metadata: { destinatarioId: portaria.criadoPorId } as any,
                    },
                })
            }
        } catch { /* notificação não crítica */ }

        await logAcaoIA(dbUser.id, `Assistente IA aprovou revisão da portaria "${portaria.titulo}"`, portaria.secretariaId, { acao: 'aprovar_revisao', portariaId })
        return {
            mensagem: `Revisão da portaria "${portaria.titulo}" aprovada com sucesso!`,
            portaria: { id: portariaId, titulo: portaria.titulo, novoStatus: 'AGUARDANDO_ASSINATURA' },
            proximoPasso: 'A portaria agora aguarda assinatura pelo Prefeito. Após a assinatura, estará pronta para publicação no Diário Oficial.',
        }
    }

    case 'verificar_prontidao_publicacao': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
        if (!dbUser) return { erro: 'Usuário não encontrado.' }

        const { portariaId } = args
        const portaria = await prisma.portaria.findUnique({
            where: { id: portariaId },
            include: {
                secretaria: { select: { sigla: true, nome: true } },
                modelo: { select: { nome: true, tipoDocumento: true } },
            },
        }) as any
        if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

        const checks = {
            status: portaria.status === 'PRONTO_PUBLICACAO',
            assinatura: portaria.assinaturaStatus !== 'NAO_ASSINADA',
            pdfGerado: !!portaria.pdfUrl,
            permissao: ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO'].includes(dbUser.role),
        }

        const prontoParaPublicar = Object.values(checks).every(Boolean)

        return {
            portaria: {
                id: portariaId, titulo: portaria.titulo,
                status: portaria.status,
                assinaturaStatus: portaria.assinaturaStatus,
                secretaria: portaria.secretaria?.sigla,
                modelo: portaria.modelo?.nome,
            },
            verificacoes: {
                statusCorreto: { ok: checks.status, detalhe: checks.status ? 'PRONTO_PUBLICACAO ✓' : `Status atual: ${portaria.status} — necessário: PRONTO_PUBLICACAO` },
                assinadaOuDispensada: { ok: checks.assinatura, detalhe: checks.assinatura ? `${portaria.assinaturaStatus} ✓` : 'Portaria não possui assinatura registrada' },
                pdfDisponivel: { ok: checks.pdfGerado, detalhe: checks.pdfGerado ? 'PDF gerado ✓' : 'PDF não gerado — o sistema irá gerar durante a publicação' },
                permissao: { ok: checks.permissao, detalhe: checks.permissao ? `Role ${dbUser.role} pode publicar ✓` : `Role ${dbUser.role} não pode publicar — necessário: PREFEITO, SECRETARIO ou ADMIN_GERAL` },
            },
            prontoParaPublicar,
            instrucao: prontoParaPublicar
                ? `A portaria está pronta! Para publicar, acesse a portaria na interface e clique em "Publicar". A publicação aloca o número oficial, gera o PDF final e registra no Diário Oficial.`
                : `A portaria ainda não pode ser publicada. Corrija os itens marcados com ✗ acima.`,
        }
    }

    case 'deletar_portaria': {
        if (!context?.userAuth?.email) return { erro: 'Ação negada. Usuário não identificado.' }
        const perm = await verificarPermissao(context.userAuth.email, ['OPERADOR', 'SECRETARIO', 'REVISOR', 'PREFEITO', 'ADMIN_GERAL'])
        if (!perm.ok) return { erro: perm.erro }

        const { portariaId } = args
        const portaria = await prisma.portaria.findUnique({
            where: { id: portariaId },
            include: { secretaria: { select: { sigla: true } } }
        })
        if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

        // Apenas autor ou ADMIN_GERAL pode deletar
        if (portaria.criadoPorId !== perm.user!.id && perm.user!.role !== 'ADMIN_GERAL') {
            return { erro: 'Apenas o criador da portaria ou um ADMIN_GERAL pode deletá-la.' }
        }

        // Apenas deletar se for rascunho
        if (portaria.status !== 'RASCUNHO') {
            return { erro: `Não é possível deletar portaria no status "${portaria.status}". Apenas rascunhos podem ser deletados. Para outros status, use reverter_status_portaria.` }
        }

        await prisma.portaria.delete({ where: { id: portariaId } })
        await logAcaoIA(perm.user!.id, `Assistente IA deletou a portaria "${portaria.titulo}" (ID: ${portaria.id})`, portaria.secretariaId, { acao: 'deletar_portaria', portariaId })

        return { mensagem: `Portaria "${portaria.titulo}" deletada com sucesso! Ação desfeita.` }
    }

    case 'reverter_status_portaria': {
        if (!context?.userAuth?.email) return { erro: 'Usuário não identificado.' }
        const dbUser = await prisma.user.findFirst({ where: { email: context.userAuth.email, ativo: true } })
        if (!dbUser) return { erro: 'Usuário não encontrado.' }

        const { portariaId } = args
        const portaria = await prisma.portaria.findUnique({
            where: { id: portariaId },
            include: { secretaria: { select: { sigla: true } } }
        }) as any

        if (!portaria) return { erro: `Portaria com ID "${portariaId}" não encontrada.` }

        let novoStatus = ''
        let revisorId = portaria.revisorAtualId

        switch (portaria.status) {
            case 'EM_REVISAO_ABERTA':     novoStatus = 'RASCUNHO'; break
            case 'EM_REVISAO_ATRIBUIDA':  novoStatus = 'EM_REVISAO_ABERTA'; revisorId = null; break
            case 'AGUARDANDO_ASSINATURA': novoStatus = 'EM_REVISAO_ATRIBUIDA'; break
            case 'PRONTO_PUBLICACAO':     novoStatus = 'AGUARDANDO_ASSINATURA'; break
            case 'PUBLICADA':
                return { erro: 'Não é possível reverter o status de uma portaria já PUBLICADA.' }
            case 'RASCUNHO':
                return { erro: 'A portaria já está no estágio inicial (RASCUNHO). Se quiser apagá-la, use deletar_portaria.' }
            default:
                novoStatus = 'RASCUNHO'
        }

        await prisma.$transaction(async (tx) => {
            await (tx.portaria as any).update({
                where: { id: portariaId },
                data: { status: novoStatus, statusChangedAt: new Date(), revisorAtualId: revisorId },
            })
            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'MUDANCA_STATUS_REVERSAO',
                    mensagem: `Status revertido de ${portaria.status} para ${novoStatus} por ${dbUser.name} (via assistente IA).`,
                    portariaId,
                    autorId: dbUser.id,
                    secretariaId: portaria.secretariaId,
                    metadata: { via: 'assistente_ia', action: 'REVERTER_STATUS' } as any,
                },
            })
        })

        await logAcaoIA(dbUser.id, `Assistente IA reverteu status da portaria "${portaria.titulo}" para ${novoStatus}`, portaria.secretariaId, { acao: 'reverter_status_portaria', portariaId, novoStatus })

        return {
            mensagem: `Ação desfeita com sucesso! O status da portaria "${portaria.titulo}" voltou para ${novoStatus}.`,
            portaria: { id: portariaId, titulo: portaria.titulo, novoStatus },
        }
    }

    default:
        return null
    }
}
