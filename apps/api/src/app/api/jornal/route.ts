import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'

export const dynamic = 'force-dynamic'

/**
 * GET: Retorna fila de pendentes + métricas do dashboard do Jornal.
 */
export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role as string)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const inicioAno = new Date(hoje.getFullYear(), 0, 1)

        const [fila, publicadasHoje, totalAno, livroAtivo] = await Promise.all([
            (prisma as any).jornalQueue.findMany({
                where: { status: 'PENDENTE' },
                include: {
                    portaria: {
                        include: { secretaria: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.portaria.count({
                where: {
                    status: 'PUBLICADA',
                    dataPublicacao: { gte: hoje }
                }
            }),
            prisma.portaria.count({
                where: {
                    status: 'PUBLICADA',
                    dataPublicacao: { gte: inicioAno }
                }
            }),
            (prisma as any).livrosNumeracao.findFirst({
                where: { ativo: true },
                orderBy: { criado_em: 'asc' }
            })
        ])

        const proximoNumero = livroAtivo
            ? livroAtivo.formato_base.replace('{N}', String(livroAtivo.proximo_numero).padStart(4, '0'))
            : null

        return NextResponse.json({
            success: true,
            data: {
                fila,
                metricas: {
                    pendentes: fila.length,
                    publicadasHoje,
                    totalAno,
                    proximoNumero
                }
            }
        })
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
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role as string)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { queueId } = (body as any)

        if (!queueId) {
            return NextResponse.json({ success: false, error: 'queueId é obrigatório' }, { status: 400 })
        }

        // @ts-ignore
        const filaItem = await (prisma as any).jornalQueue.findUnique({
            where: { id: String(queueId) },
            include: { portaria: true }
        })

        if (!filaItem) return NextResponse.json({ success: false, error: 'Item não encontrado na fila' }, { status: 404 })

        const resultNum = await NumeracaoService.alocarNumero(
            filaItem.portariaId,
            'PORTARIA',
            session.id as string,
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
                    mensagem: `Documento oficializado com o número ${numeroOficial} e publicado no Diário Oficial.`,
                    portariaId: filaItem.portariaId,
                    autorId: session.id as string,
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
