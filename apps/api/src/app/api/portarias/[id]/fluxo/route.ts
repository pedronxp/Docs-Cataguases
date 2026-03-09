import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

            case 'ASSUMIR_REVISAO':
                if (!rolesRevisor.includes(session.role)) {
                    return NextResponse.json({ success: false, error: 'Sem permissão para revisar portarias' }, { status: 403 })
                }
                if (portaria.status !== 'EM_REVISAO_ABERTA') {
                    return NextResponse.json({ success: false, error: 'Portaria não está disponível para revisão' }, { status: 400 })
                }
                novoStatus = 'EM_REVISAO_ATRIBUIDA'
                revisorAtualId = session.id
                mensagemLog = `Revisão assumida por ${nomeAutor}`
                break

            case 'APROVAR_REVISAO':
                if (portaria.revisorAtualId !== session.id && session.role !== 'ADMIN_GERAL') {
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
                if (portaria.revisorAtualId !== session.id && session.role !== 'ADMIN_GERAL') {
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
                mensagemLog = `Devolvida para correção por ${nomeAutor}: "${observacao}"`
                break

            case 'TRANSFERIR_REVISAO':
                if (portaria.revisorAtualId !== session.id && session.role !== 'ADMIN_GERAL') {
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
                // Verifica se o revisor de destino existe e é REVISOR ativo da mesma secretaria
                const revisorDestino = await prisma.user.findFirst({
                    where: { id: revisorId, role: 'REVISOR', ativo: true, secretariaId: portaria.secretariaId }
                })
                if (!revisorDestino) {
                    return NextResponse.json({ success: false, error: 'Revisor de destino inválido ou não pertence à mesma secretaria' }, { status: 400 })
                }
                novoStatus = 'EM_REVISAO_ATRIBUIDA'
                revisorAtualId = revisorId
                mensagemLog = `Revisão transferida de ${nomeAutor} para ${revisorDestino.name}. Justificativa: "${justificativa}"`
                break

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

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: `MUDANCA_STATUS_${action}`,
                    mensagem: mensagemLog,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId,
                    metadata: { action, observacao }
                }
            })

            return p
        })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Erro ao processar fluxo' }, { status: 500 })
    }
}
