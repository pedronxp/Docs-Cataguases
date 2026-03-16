import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getSession()

        // Exclusão em lote é estrita para Administradores
        if (!session || !['ADMIN_GERAL', 'PREFEITO'].includes(session.role as string)) {
            return NextResponse.json(
                { success: false, error: 'Apenas Administradores podem realizar exclusão em lote' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { ids, motivo } = body

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nenhum documento selecionado para exclusão' },
                { status: 400 }
            )
        }

        if (!motivo) {
            return NextResponse.json(
                { success: false, error: 'Motivo da exclusão é obrigatório para operações em lote' },
                { status: 400 }
            )
        }

        // Busca documentos para registrar o log com os números originais
        const portarias = await prisma.portaria.findMany({
            where: { id: { in: ids } },
            select: { id: true, numeroOficial: true }
        })

        if (portarias.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum documento encontrado' }, { status: 404 })
        }

        await prisma.$transaction(async (tx) => {
            // Remove atividades vinculadas às portarias em lote
            await tx.feedAtividade.deleteMany({
                where: { portariaId: { in: ids } }
            })

            // Remove das filas do jornal
            await tx.jornalQueue.deleteMany({
                where: { portariaId: { in: ids } }
            })

            // Deleta as portarias fisicamente
            await tx.portaria.deleteMany({
                where: { id: { in: ids } }
            })

            const numeros = portarias.map(p => p.numeroOficial || p.id).join(', ')

            // Regista a exclusão em lote no feed global
            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'EXCLUSAO_LOTE',
                    mensagem: `Exclusão em massa (${portarias.length} itens) realizada. Documentos: ${numeros}. Motivo: ${motivo}`,
                    autorId: session.id as string,
                    metadata: { ids, numeros, motivo }
                }
            })
        })

        return NextResponse.json({ success: true, message: `${portarias.length} documentos excluídos com sucesso` })
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao processar exclusão em lote' },
            { status: 500 }
        )
    }
}
