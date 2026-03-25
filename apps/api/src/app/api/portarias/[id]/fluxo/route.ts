import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
    criarNotificacao,
    criarNotificacoes,
    buscarRevisoresDaSecretaria,
} from '@/services/notificacao.service'

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
    username?: string
    secretariaId?: string
    setorId?: string
}

interface PortariaComRevisao {
    id: string
    status: string
    secretariaId: string
    revisorAtualId: string | null
    revisoesCount: number
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        const session = rawSession as unknown as SessionPayload

        const body = await request.json()
        const { action, observacao, revisorId, justificativa } = body
        const { id } = await params

        const _portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!_portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        const portaria = _portaria as typeof _portaria & PortariaComRevisao

        // Label legível para usar nas mensagens de notificação
        const portariaLabel = portaria.numeroOficial
            ? `"${portaria.titulo}" (Nº ${portaria.numeroOficial})`
            : `"${portaria.titulo}"`

        let novoStatus = portaria.status
        let mensagemLog = ''
        let revisorAtualId = portaria.revisorAtualId
        let revisoesCount = portaria.revisoesCount

        const rolesRevisor = ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO']
        const nomeAutor = session.name || session.username || 'Sistema'

        switch (action) {
            case 'ENVIAR_REVISAO':
                if (!['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)) {
                    return NextResponse.json({ success: false, error: 'Apenas portarias em rascunho ou correção podem ser enviadas para revisão' }, { status: 400 })
                }
                novoStatus = 'EM_REVISAO_ABERTA'
                mensagemLog = `Portaria enviada para revisão por ${nomeAutor}`
                break

            // SOLICITAR_REVISAO é o novo nome; ASSUMIR_REVISAO mantido por compatibilidade
            case 'SOLICITAR_REVISAO':
            case 'ASSUMIR_REVISAO':
                if (!rolesRevisor.includes(session.role as string)) {
                    return NextResponse.json({ success: false, error: 'Sem permissão para revisar portarias' }, { status: 403 })
                }
                if (portaria.status !== 'EM_REVISAO_ABERTA') {
                    return NextResponse.json({ success: false, error: 'Portaria não está disponível para revisão' }, { status: 400 })
                }
                // Bloqueia race condition: outro usuário já assumiu enquanto esta requisição chegava
                if (portaria.revisorAtualId) {
                    return NextResponse.json({ success: false, error: 'Esta portaria já foi aceita por outro revisor' }, { status: 409 })
                }
                novoStatus = 'EM_REVISAO_ATRIBUIDA'
                revisorAtualId = (session.id as string)
                mensagemLog = `Revisão solicitada e atribuída a ${nomeAutor}`
                break

            case 'APROVAR_REVISAO':
                if (portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode aprovar' }, { status: 403 })
                }
                if (portaria.status !== 'EM_REVISAO_ATRIBUIDA') {
                    return NextResponse.json({ success: false, error: 'Portaria não está em revisão atribuída' }, { status: 400 })
                }
                novoStatus = 'AGUARDANDO_ASSINATURA'
                revisorAtualId = null
                mensagemLog = `Revisão aprovada por ${nomeAutor}. Aguardando assinatura.`
                break

            case 'REJEITAR_REVISAO':
                if (portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode rejeitar' }, { status: 403 })
                }
                if (portaria.status !== 'EM_REVISAO_ATRIBUIDA') {
                    return NextResponse.json({ success: false, error: 'Portaria não está em revisão atribuída' }, { status: 400 })
                }
                if (!observacao) {
                    return NextResponse.json({ success: false, error: 'Informe o motivo da devolução' }, { status: 400 })
                }
                novoStatus = 'CORRECAO_NECESSARIA'
                revisoesCount += 1
                revisorAtualId = null
                
                if (revisoesCount >= 3) {
                    mensagemLog = `Devolvida para correção por ${nomeAutor}: "${observacao}". ATENÇÃO: Limite de rejeições atingido. A portaria foi escalada.`
                    // Aqui pode-se disparar flag de escalada se houver campo na tabela, mas o importante é o evento
                } else {
                    mensagemLog = `Devolvida para correção por ${nomeAutor}: "${observacao}"`
                }
                break

            case 'CANCELAR_PORTARIA': {
                if (portaria.status === 'PUBLICADA') {
                    return NextResponse.json({ success: false, error: 'Portarias publicadas não podem ser canceladas' }, { status: 400 })
                }
                const portariaParaCancelar = await prisma.portaria.findUnique({
                    where: { id },
                    select: { criadoPorId: true }
                }) as any
                const isAutor = portariaParaCancelar?.criadoPorId === (session.id as string)
                if (!isAutor && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o autor ou administrador pode cancelar' }, { status: 403 })
                }
                if (!justificativa) {
                    return NextResponse.json({ success: false, error: 'Justificativa obrigatória para cancelamento' }, { status: 400 })
                }
                novoStatus = 'CANCELADA'
                revisorAtualId = null
                mensagemLog = `Portaria cancelada por ${nomeAutor}. Motivo: "${justificativa}"`
                break
            }

            // Bloco {} obrigatório para permitir declaração de const dentro do case (no-case-declarations)
            case 'TRANSFERIR_REVISAO': {
                if (portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode transferir' }, { status: 403 })
                }
                if (portaria.status !== 'EM_REVISAO_ATRIBUIDA') {
                    return NextResponse.json({ success: false, error: 'Portaria não está em revisão atribuída' }, { status: 400 })
                }
                if (!revisorId) {
                    return NextResponse.json({ success: false, error: 'Informe o revisor de destino' }, { status: 400 })
                }
                if (!justificativa) {
                    return NextResponse.json({ success: false, error: 'Justificativa obrigatória para transferência' }, { status: 400 })
                }
                // Verifica se o revisor de destino existe e tem permissão (Admin/Prefeito ignoram secretaria)
                const revisorDestino = await prisma.user.findFirst({
                    where: {
                        id: revisorId,
                        role: { in: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'] },
                        ativo: true,
                        OR: [
                            { secretariaId: portaria.secretariaId },
                            { role: { in: ['ADMIN_GERAL', 'PREFEITO'] } }
                        ]
                    }
                })
                if (!revisorDestino) {
                    return NextResponse.json({ success: false, error: 'Revisor de destino inválido ou não pertence à mesma secretaria' }, { status: 400 })
                }
                novoStatus = 'EM_REVISAO_ATRIBUIDA'
                revisorAtualId = revisorId
                mensagemLog = `Revisão transferida de ${nomeAutor} para ${revisorDestino.name}. Justificativa: "${justificativa}"`
                break
            }

            case 'ROLLBACK_RASCUNHO': {
                // Somente o autor ou ADMIN_GERAL podem fazer rollback de CORRECAO_NECESSARIA → RASCUNHO
                if (portaria.status !== 'CORRECAO_NECESSARIA') {
                    return NextResponse.json({ success: false, error: 'Apenas portarias com correção pendente podem voltar para rascunho' }, { status: 400 })
                }
                // Verifica se é o autor
                const portariaParaRollback = await prisma.portaria.findUnique({
                    where: { id },
                    select: { criadoPorId: true }
                }) as any
                const isAutor = portariaParaRollback?.criadoPorId === (session.id as string)
                if (!isAutor && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o autor do documento pode reverter para rascunho' }, { status: 403 })
                }
                novoStatus = 'RASCUNHO'
                revisorAtualId = null
                mensagemLog = `Documento revertido para rascunho por ${nomeAutor}${justificativa ? `: "${justificativa}"` : ''}`
                break
            }

            default:
                return NextResponse.json({ success: false, error: 'Ação inválida no fluxo' }, { status: 400 })
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await (tx.portaria as any).update({
                where: { id },
                data: {
                    status: novoStatus,
                    revisorAtualId,
                    revisoesCount
                }
            })

            // Normaliza o tipoEvento para SOLICITAR_REVISAO mesmo se vier ASSUMIR_REVISAO
            const tipoEventoNormalizado = action === 'ASSUMIR_REVISAO'
                ? 'MUDANCA_STATUS_SOLICITAR_REVISAO'
                : `MUDANCA_STATUS_${action}`

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: tipoEventoNormalizado,
                    mensagem: mensagemLog,
                    portariaId: id,
                    autorId: (session.id as string),
                    secretariaId: portaria.secretariaId,
                    metadata: { action, observacao }
                }
            })

            // Quando o revisor rejeita, cria notificação adicional voltada ao autor
            if (action === 'REJEITAR_REVISAO') {
                const portariaComAutor = await (tx.portaria as any).findUnique({
                    where: { id },
                    include: { criadoPor: { select: { id: true } } }
                })
                if (portariaComAutor?.criadoPorId) {
                    await tx.feedAtividade.create({
                        data: {
                            tipoEvento: 'DOCUMENTO_DEVOLVIDO_AUTOR',
                            mensagem: `Seu documento foi devolvido para correção por ${nomeAutor}: "${observacao}"`,
                            portariaId: id,
                            autorId: (session.id as string),
                            secretariaId: portaria.secretariaId,
                            metadata: { action, observacao, destinatarioId: portariaComAutor.criadoPorId }
                        }
                    })
                }
            }

            // Quando revisão é solicitada, cria notificação adicional visível ao secretário/admin
            if (action === 'SOLICITAR_REVISAO' || action === 'ASSUMIR_REVISAO') {
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'REVISAO_ATRIBUIDA',
                        mensagem: `${nomeAutor} assumiu a revisão do documento`,
                        portariaId: id,
                        autorId: (session.id as string),
                        secretariaId: portaria.secretariaId,
                        metadata: { action, revisorId: (session.id as string) }
                    }
                })
            }

            return p
        })

        // ── Notificações direcionadas por userId ──────────────────────────────
        // Executado fora da transação (falha não bloqueia o fluxo principal)
        try {
            if (action === 'ENVIAR_REVISAO') {
                // Notifica todos os revisores/secretários da secretaria
                const revisores = await buscarRevisoresDaSecretaria(portaria.secretariaId)
                await criarNotificacoes(
                    revisores.map((r) => ({
                        userId: r.id,
                        tipo: 'PORTARIA_SUBMETIDA',
                        mensagem: `${nomeAutor} enviou ${portariaLabel} para revisão. Acesse para revisar.`,
                        portariaId: id,
                        metadata: { action },
                    }))
                )
            }

            if (action === 'SOLICITAR_REVISAO' || action === 'ASSUMIR_REVISAO') {
                // Notifica o autor de que a revisão foi assumida
                const portariaComAutor = await prisma.portaria.findUnique({
                    where: { id },
                    select: { criadoPorId: true },
                }) as any
                if (portariaComAutor?.criadoPorId) {
                    await criarNotificacao({
                        userId: portariaComAutor.criadoPorId,
                        tipo: 'REVISAO_ATRIBUIDA',
                        mensagem: `${nomeAutor} assumiu a revisão de ${portariaLabel}.`,
                        portariaId: id,
                        metadata: { action },
                    })
                }
            }

            if (action === 'REJEITAR_REVISAO') {
                // Notifica o autor sobre a devolução (notificação direcionada)
                const portariaComAutor = await prisma.portaria.findUnique({
                    where: { id },
                    select: { criadoPorId: true },
                }) as any
                if (portariaComAutor?.criadoPorId) {
                    await criarNotificacao({
                        userId: portariaComAutor.criadoPorId,
                        tipo: 'DOCUMENTO_DEVOLVIDO_AUTOR',
                        mensagem: `${portariaLabel} foi devolvida para correção por ${nomeAutor}${observacao ? ` — Motivo: "${observacao}"` : ''}. Acesse para corrigir e reenviar.`,
                        portariaId: id,
                        metadata: { action, observacao },
                    })
                }
            }

            if (action === 'APROVAR_REVISAO') {
                // Notifica o autor que a portaria foi aprovada na revisão
                const portariaComAutor = await prisma.portaria.findUnique({
                    where: { id },
                    select: { criadoPorId: true },
                }) as any
                if (portariaComAutor?.criadoPorId) {
                    await criarNotificacao({
                        userId: portariaComAutor.criadoPorId,
                        tipo: 'PORTARIA_APROVADA',
                        mensagem: `${portariaLabel} foi aprovada na revisão por ${nomeAutor} e agora aguarda assinatura.`,
                        portariaId: id,
                        metadata: { action },
                    })
                }
            }

            if (action === 'TRANSFERIR_REVISAO' && revisorId) {
                // Notifica o novo revisor
                await criarNotificacao({
                    userId: revisorId,
                    tipo: 'REVISAO_ATRIBUIDA',
                    mensagem: `${nomeAutor} transferiu a revisão de ${portariaLabel} para você${justificativa ? ` — Justificativa: "${justificativa}"` : ''}.`,
                    portariaId: id,
                    metadata: { action, justificativa },
                })
            }
        } catch (notifErr) {
            console.warn('[Fluxo] Falha ao criar notificações direcionadas:', notifErr)
        }

        return NextResponse.json({ success: true, data: atualizada })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Erro ao processar fluxo' }, { status: 500 })
    }
}
