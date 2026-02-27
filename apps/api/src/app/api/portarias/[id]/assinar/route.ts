import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session || !['SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado a assinar' }, { status: 403 })
        }

        const body = await request.json()
        const { tipoAssinatura, justificativa, comprovanteUrl } = body
        const { id } = await params

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })

        if (portaria.status !== 'AGUARDANDO_ASSINATURA') {
            return NextResponse.json({ success: false, error: 'A portaria não está aguardando assinatura' }, { status: 400 })
        }

        const validTypes = ['DIGITAL', 'MANUAL', 'DISPENSADA']
        if (!validTypes.includes(tipoAssinatura)) {
            return NextResponse.json({ success: false, error: 'Tipo de assinatura inválido' }, { status: 400 })
        }

        if (tipoAssinatura === 'MANUAL' || tipoAssinatura === 'DISPENSADA') {
            if (!justificativa) return NextResponse.json({ success: false, error: 'Justificativa é obrigatória para este tipo' }, { status: 400 })
        }

        let dbStatus = 'NAO_ASSINADA'
        let msgLog = ''

        if (tipoAssinatura === 'DIGITAL') {
            dbStatus = 'ASSINADA_DIGITAL'
            msgLog = `Assinada digitalmente por ${session.name || session.username}`
        } else if (tipoAssinatura === 'MANUAL') {
            dbStatus = 'ASSINADA_MANUAL'
            msgLog = `Assinatura manual registrada por ${session.name || session.username}. Justificativa: '${justificativa}'.${comprovanteUrl ? ' Arquivo anexado.' : ''}`
        } else {
            dbStatus = 'DISPENSADA_COM_JUSTIFICATIVA'
            msgLog = `Assinatura dispensada por ${session.name || session.username}. Justificativa: '${justificativa}'.`
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: {
                    assinaturaStatus: dbStatus,
                    assinaturaJustificativa: justificativa,
                    assinaturaComprovanteUrl: comprovanteUrl,
                    status: 'PRONTO_PUBLICACAO',
                    assinadoPorId: tipoAssinatura === 'DIGITAL' ? session.id : null,
                    assinadoEm: new Date()
                }
            })

            await tx.jornalQueue.create({
                data: { portariaId: id }
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: `ASSINATURA_${tipoAssinatura}`,
                    mensagem: msgLog,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId
                }
            })
            return p
        })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro ao assinar' }, { status: 500 })
    }
}
