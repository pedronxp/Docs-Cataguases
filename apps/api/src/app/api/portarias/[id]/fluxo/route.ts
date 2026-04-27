import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import {
    criarNotificacao,
    criarNotificacoes,
    buscarRevisoresDaSecretaria,
} from '@/services/notificacao.service'
import { WorkflowService } from '@/services/workflow.service'

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
    modelo: { tipoDocumento: string } | null
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

        const _portaria = await prisma.portaria.findUnique({ 
            where: { id },
            include: { modelo: true }
        })
        if (!_portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        const portaria = _portaria as typeof _portaria & PortariaComRevisao

        const portariaLabel = portaria.numeroOficial
            ? `"${portaria.titulo}" (Nº ${portaria.numeroOficial})`
            : `"${portaria.titulo}"`

        let novoStatus = portaria.status
        let mensagemLog = ''
        let revisorAtualId = portaria.revisorAtualId
        let revisoesCount = portaria.revisoesCount

        const nomeAutor = session.name || session.username || 'Sistema'

        // 1. Tratar overrides de sistema (não mapeados rigidamente na state machine)
        if (action === 'CANCELAR_PORTARIA') {
            if (portaria.status === 'PUBLICADA') {
                return NextResponse.json({ success: false, error: 'Portarias publicadas não podem ser canceladas' }, { status: 400 })
            }
            const isAutor = portaria.criadoPorId === (session.id as string)
            if (!isAutor && session.role !== 'ADMIN_GERAL') {
                return NextResponse.json({ success: false, error: 'Apenas o autor ou administrador pode cancelar' }, { status: 403 })
            }
            if (!justificativa) {
                return NextResponse.json({ success: false, error: 'Justificativa obrigatória para cancelamento' }, { status: 400 })
            }
            novoStatus = 'CANCELADA'
            revisorAtualId = null
            mensagemLog = `Documento cancelado por ${nomeAutor}. Motivo: "${justificativa}"`
            
        } else if (action === 'TRANSFERIR_REVISAO') {
            if (portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode transferir' }, { status: 403 })
            }
            if (!['EM_REVISAO_ATRIBUIDA', 'REVISAO_CHEFIA'].includes(portaria.status)) {
                return NextResponse.json({ success: false, error: 'Documento não está em revisão atribuída' }, { status: 400 })
            }
            if (!revisorId) {
                return NextResponse.json({ success: false, error: 'Informe o revisor de destino' }, { status: 400 })
            }
            if (!justificativa) {
                return NextResponse.json({ success: false, error: 'Justificativa obrigatória para transferência' }, { status: 400 })
            }
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
            // Mantém no mesmo status, só altera o ID
            revisorAtualId = revisorId
            mensagemLog = `Revisão transferida de ${nomeAutor} para ${revisorDestino.name}. Justificativa: "${justificativa}"`
            
        } else {
            // 2. Transições guiadas pelo WorkflowService
            const acaoDesejada = action === 'SOLICITAR_REVISAO' ? 'ASSUMIR_REVISAO' : action
            
            const validacao = await WorkflowService.validarTransicao({
                tipoDocumento: portaria.modelo?.tipoDocumento || 'PORTARIA',
                secretariaId: portaria.secretariaId,
                statusAtual: portaria.status,
                acaoDesejada,
                roleUsuario: session.role
            })

            if (!validacao.ok) {
                return NextResponse.json({ success: false, error: validacao.error }, { status: 400 })
            }

            const transicao = validacao.value
            novoStatus = transicao.para

            // Validação de regras de negócio (Side effects) baseadas na ação
            switch (acaoDesejada) {
                case 'ENVIAR_REVISAO':
                    mensagemLog = `Documento enviado para revisão por ${nomeAutor}`
                    break
                    
                case 'ASSUMIR_REVISAO':
                    if (portaria.revisorAtualId) {
                        return NextResponse.json({ success: false, error: 'Esta portaria já foi aceita por outro revisor' }, { status: 409 })
                    }
                    revisorAtualId = (session.id as string)
                    mensagemLog = `Revisão atribuída a ${nomeAutor}`
                    break
                    
                case 'APROVAR_REVISAO':
                case 'APROVAR_CHEFIA':
                    if (portaria.revisorAtualId && portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                        return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode aprovar' }, { status: 403 })
                    }
                    revisorAtualId = null
                    mensagemLog = `Revisão aprovada por ${nomeAutor}. Aguardando próxima etapa.`
                    break
                    
                case 'REJEITAR_REVISAO':
                case 'REJEITAR_CHEFIA':
                    if (portaria.revisorAtualId && portaria.revisorAtualId !== (session.id as string) && session.role !== 'ADMIN_GERAL') {
                        return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode rejeitar' }, { status: 403 })
                    }
                    if (!observacao) {
                        return NextResponse.json({ success: false, error: 'Informe o motivo da devolução' }, { status: 400 })
                    }
                    revisoesCount += 1
                    revisorAtualId = null
                    
                    if (revisoesCount >= 3) {
                        mensagemLog = `Devolvida para correção por ${nomeAutor}: "${observacao}". ATENÇÃO: Limite de rejeições atingido. A portaria foi escalada.`
                    } else {
                        mensagemLog = `Devolvida para correção por ${nomeAutor}: "${observacao}"`
                    }
                    break
                    
                case 'ROLLBACK_RASCUNHO':
                    const isAutorRollback = portaria.criadoPorId === (session.id as string)
                    if (!isAutorRollback && session.role !== 'ADMIN_GERAL') {
                        return NextResponse.json({ success: false, error: 'Apenas o autor do documento pode reverter para rascunho' }, { status: 403 })
                    }
                    revisorAtualId = null
                    mensagemLog = `Documento revertido para rascunho por ${nomeAutor}${justificativa ? `: "${justificativa}"` : ''}`
                    break
            }
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await (tx.portaria as any).update({
                where: { id },
                data: {
                    status: novoStatus,
                    statusChangedAt: novoStatus !== portaria.status ? new Date() : undefined,
                    revisorAtualId,
                    revisoesCount
                }
            })

            const tipoEventoNormalizado = action === 'ASSUMIR_REVISAO'
                ? 'MUDANCA_STATUS_SOLICITAR_REVISAO'
                : action === 'CANCELAR_PORTARIA' 
                ? 'EXCLUSAO' 
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

            // Notificação pro autor na devolução
            if (action === 'REJEITAR_REVISAO' || action === 'REJEITAR_CHEFIA') {
                if (portaria.criadoPorId) {
                    await tx.feedAtividade.create({
                        data: {
                            tipoEvento: 'DOCUMENTO_DEVOLVIDO_AUTOR',
                            mensagem: `Seu documento foi devolvido para correção por ${nomeAutor}: "${observacao}"`,
                            portariaId: id,
                            autorId: (session.id as string),
                            secretariaId: portaria.secretariaId,
                            metadata: { action, observacao, destinatarioId: portaria.criadoPorId }
                        }
                    })
                }
            }

            return p
        })

        // ── Notificações direcionadas ──────────────────────────────
        try {
            if (action === 'ENVIAR_REVISAO') {
                // Notifica se o status foi pra EM_REVISAO_ABERTA ou REVISAO_CHEFIA
                if (novoStatus === 'EM_REVISAO_ABERTA' || novoStatus === 'REVISAO_CHEFIA') {
                    const revisores = await buscarRevisoresDaSecretaria(portaria.secretariaId)
                    await criarNotificacoes(
                        revisores.map((r) => ({
                            userId: r.id,
                            tipo: 'PORTARIA_SUBMETIDA',
                            mensagem: `${nomeAutor} enviou ${portariaLabel} para revisão. Acesse para analisar.`,
                            portariaId: id,
                            metadata: { action },
                        }))
                    )
                }
            }

            if (action === 'SOLICITAR_REVISAO' || action === 'ASSUMIR_REVISAO') {
                if (portaria.criadoPorId) {
                    await criarNotificacao({
                        userId: portaria.criadoPorId,
                        tipo: 'REVISAO_ATRIBUIDA',
                        mensagem: `${nomeAutor} assumiu a revisão de ${portariaLabel}.`,
                        portariaId: id,
                        metadata: { action },
                    })
                }
            }

            if (action === 'REJEITAR_REVISAO' || action === 'REJEITAR_CHEFIA') {
                if (portaria.criadoPorId) {
                    await criarNotificacao({
                        userId: portaria.criadoPorId,
                        tipo: 'DOCUMENTO_DEVOLVIDO_AUTOR',
                        mensagem: `${portariaLabel} foi devolvida para correção por ${nomeAutor}${observacao ? ` — Motivo: "${observacao}"` : ''}. Acesse para corrigir e reenviar.`,
                        portariaId: id,
                        metadata: { action, observacao },
                    })
                }
            }

            if (action === 'APROVAR_REVISAO' || action === 'APROVAR_CHEFIA') {
                if (portaria.criadoPorId) {
                    await criarNotificacao({
                        userId: portaria.criadoPorId,
                        tipo: 'PORTARIA_APROVADA',
                        mensagem: `${portariaLabel} foi aprovada na etapa de revisão por ${nomeAutor} e avançou de fase.`,
                        portariaId: id,
                        metadata: { action },
                    })
                }
            }

            if (action === 'TRANSFERIR_REVISAO' && revisorId) {
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
