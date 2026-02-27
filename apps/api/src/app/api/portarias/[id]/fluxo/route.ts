import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { action, observacao } = body
        const { id } = await params

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })

        let novoStatus = portaria.status
        let mensagemLog = ''
        let revisorAtualId = portaria.revisorAtualId
        let revisoesCount = portaria.revisoesCount

        switch (action) {
            case 'ENVIAR_REVISAO':
                novoStatus = 'EM_REVISAO_ABERTA'
                mensagemLog = `Portaria enviada para revisão por ${session.name || session.username || 'Sistema'}`
                break

            case 'ASSUMIR_REVISAO':
                if (session.role !== 'REVISOR' && session.role !== 'SECRETARIO' && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Sem permissão para revisar' }, { status: 403 })
                }
                novoStatus = 'EM_REVISAO_ATRIBUIDA'
                revisorAtualId = session.id
                mensagemLog = `Portaria atribuída para revisão a ${session.name || session.username || 'Revisor'}`
                break

            case 'APROVAR_REVISAO':
                if (portaria.revisorAtualId !== session.id && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode aprovar' }, { status: 403 })
                }
                novoStatus = 'AGUARDANDO_ASSINATURA'
                mensagemLog = `Revisão aprovada por ${session.name || session.username || 'Revisor'}`
                break

            case 'REJEITAR_REVISAO':
                if (portaria.revisorAtualId !== session.id && session.role !== 'ADMIN_GERAL') {
                    return NextResponse.json({ success: false, error: 'Apenas o revisor atual pode rejeitar' }, { status: 403 })
                }
                if (!observacao) return NextResponse.json({ success: false, error: 'Observação é obrigatória para rejeitar' }, { status: 400 })

                novoStatus = 'CORRECAO_NECESSARIA'
                revisoesCount += 1
                mensagemLog = `Rejeitada por ${session.name || session.username || 'Revisor'}: '${observacao}'`

                if (revisoesCount >= 3) {
                    mensagemLog += ' | Escalado automaticamente devido a múltiplas rejeições.'
                }
                revisorAtualId = null
                break

            default:
                return NextResponse.json({ success: false, error: 'Ação inválida no fluxo' }, { status: 400 })
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
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
