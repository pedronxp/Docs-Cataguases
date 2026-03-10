import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'
import { JornalService } from '@/services/jornal.service'

export const dynamic = 'force-dynamic'

/**
 * GET: Retorna fila de pendentes + métricas do dashboard do Jornal.
 * Suporta paginação cursor-based.
 */
export async function GET(request: Request) {
    try {
        const session = (await getSession()) as any
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const cursor = searchParams.get('cursor') || undefined
        const limit = parseInt(searchParams.get('limit') || '50')
        const tipo = searchParams.get('tipo') || undefined
        const usePagination = searchParams.has('cursor') || searchParams.has('limit')

        // Caso antigo: carrega tudo sem paginação (legado)
        if (!usePagination) {
            const [fila, metricas] = await Promise.all([
                (prisma as any).jornalQueue.findMany({
                    where: { status: 'PENDENTE' },
                    include: {
                        portaria: {
                            include: { secretaria: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }),
                JornalService.getMetricas()
            ])

            return NextResponse.json({
                success: true,
                data: {
                    fila,
                    metricas
                }
            })
        }

        // Nova implementação com paginação e filtro de tipo
        const [filaData, metricas] = await Promise.all([
            JornalService.getFilaPaginada({ cursor, limit, tipo: tipo ? [tipo] : undefined }),
            JornalService.getMetricas()
        ])

        return NextResponse.json({
            success: true,
            data: {
                fila: filaData.items,
                pagination: {
                    nextCursor: filaData.nextCursor,
                    hasMore: filaData.hasMore,
                    total: filaData.total
                },
                metricas
            }
        })
    } catch (error: any) {
        console.error('Erro ao buscar fila do jornal:', error)
        return NextResponse.json({ success: false, error: error.message || 'Erro ao buscar fila do jornal' }, { status: 500 })
    }
}

/**
 * POST: Finaliza a numeração de um documento no Jornal.
 * Switch polimórfico completo por tipoDocumento (Fase 3).
 */
export async function POST(request: Request) {
    try {
        const session = (await getSession()) as any
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { queueId } = (body as any)

        if (!queueId) {
            return NextResponse.json({ success: false, error: 'queueId é obrigatório' }, { status: 400 })
        }

        const filaItem = await (prisma as any).jornalQueue.findUnique({
            where: { id: String(queueId) },
            include: { portaria: { include: { secretaria: true } } }
        })

        if (!filaItem) {
            return NextResponse.json({ success: false, error: 'Item não encontrado na fila' }, { status: 404 })
        }

        // Usa o tipoDocumento real do item para alocar o número correto
        const resultNum = await NumeracaoService.alocarNumero(
            filaItem.portariaId ?? queueId,  // fallback para documentos sem portaria
            filaItem.tipoDocumento ?? 'PORTARIA',
            session.id,
            request.headers.get('x-forwarded-for') || '127.0.0.1'
        )

        if (!resultNum.ok) {
            return NextResponse.json({ success: false, error: resultNum.error }, { status: 500 })
        }

        const numeroOficial = resultNum.value

        const resultado = await prisma.$transaction(async (tx) => {
            // Atualiza portaria se existir (polimorfismo: pode não ter portaria)
            if (filaItem.portariaId) {
                await tx.portaria.update({
                    where: { id: filaItem.portariaId },
                    data: {
                        numeroOficial,
                        status: 'PUBLICADA',
                        // @ts-ignore
                        dataPublicacao: new Date()
                    }
                })
            }

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
                    mensagem: `Documento ${filaItem.tipoDocumento} oficializado com o número ${numeroOficial} e publicado no Diário Oficial.`,
                    portariaId: filaItem.portariaId ?? null,
                    autorId: session.id,
                    secretariaId: filaItem.portaria?.secretariaId ?? null
                }
            })

            return { sucesso: true, numeroOficial, tipoDocumento: filaItem.tipoDocumento }
        })

        return NextResponse.json({ success: true, data: resultado })
    } catch (error: any) {
        console.error('Erro no processamento do Jornal:', error)
        return NextResponse.json({ success: false, error: error.message || 'Erro ao processar publicação' }, { status: 500 })
    }
}
