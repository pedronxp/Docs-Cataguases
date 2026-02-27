import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'

export const dynamic = 'force-dynamic'

/**
 * GET: Retorna as portarias pendentes de numeração no Diário Oficial.
 */
export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        // @ts-ignore - Dependemos da geração do Prisma
        const fila = await (prisma as any).jornalQueue.findMany({
            where: { status: 'PENDENTE' },
            include: {
                portaria: {
                    include: {
                        secretaria: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json({ success: true, data: fila })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Erro ao buscar fila do jornal' }, { status: 500 })
    }
}

/**
 * POST: Finaliza a numeração de um documento no Jornal (Step 6).
 */
export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { queueId } = (body as any)

        if (!queueId) {
            return NextResponse.json({ success: false, error: 'queueId é obrigatório' }, { status: 400 })
        }

        // @ts-ignore - Dependemos da geração do Prisma
        const filaItem = await (prisma as any).jornalQueue.findUnique({
            where: { id: String(queueId) },
            include: { portaria: true }
        })

        if (!filaItem) return NextResponse.json({ success: false, error: 'Item não encontrado na fila' }, { status: 404 })

        const resultNum = await NumeracaoService.alocarNumeroPortaria(
            filaItem.portariaId,
            session.id,
            request.headers.get('x-forwarded-for') || '127.0.0.1'
        )

        if (!resultNum.ok) {
            return NextResponse.json({ success: false, error: resultNum.error }, { status: 500 })
        }

        const numeroOficial = resultNum.value

        const resultado = await prisma.$transaction(async (tx) => {
            await tx.portaria.update({
                where: { id: filaItem.portariaId },
                data: {
                    numeroOficial,
                    status: 'PUBLICADA',
                    // @ts-ignore
                    dataPublicacao: new Date()
                }
            })

            // @ts-ignore
            await (tx as any).jornalQueue.update({
                where: { id: queueId },
                data: {
                    status: 'CONCLUIDA',
                    numeroFinal: numeroOficial
                }
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'PUBLICACAO_JORNAL',
                    mensagem: `📜 Documento oficializado com o número ${numeroOficial} e publicado no Diário Oficial.`,
                    portariaId: filaItem.portariaId,
                    autorId: session.id,
                    secretariaId: filaItem.portaria.secretariaId
                }
            })

            return { sucesso: true, numeroOficial }
        })

        return NextResponse.json({ success: true, data: resultado })
    } catch (error: any) {
        console.error('Erro no processamento do Jornal:', error)
        return NextResponse.json({ success: false, error: error.message || 'Erro ao processar publicação' }, { status: 500 })
    }
}
