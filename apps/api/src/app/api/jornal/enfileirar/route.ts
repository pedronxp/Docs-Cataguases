import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/jornal/enfileirar
 * Enfileira qualquer tipo de documento para numeração no Jornal.
 * Suporta polimorfismo completo: portaria, memorando, ofício, lei.
 */
export async function POST(request: Request) {
    try {
        const session = (await getSession()) as any
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { documentoId, tipoDocumento, portariaId, prioridade = 0, metadados = {} } = body

        // Aceita tanto portariaId (legacy) quanto documentoId (novo)
        const docId = documentoId || portariaId
        const tipo = tipoDocumento || 'PORTARIA'

        if (!docId) {
            return NextResponse.json(
                { success: false, error: 'documentoId ou portariaId é obrigatório' },
                { status: 400 }
            )
        }

        const tiposValidos = ['PORTARIA', 'MEMORANDO', 'OFICIO', 'LEI']
        if (!tiposValidos.includes(tipo)) {
            return NextResponse.json(
                { success: false, error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` },
                { status: 400 }
            )
        }

        // Verifica se já está enfileirado (evita duplicatas)
        const jaExiste = await (prisma as any).jornalQueue.findFirst({
            where: {
                status: 'PENDENTE',
                OR: [
                    { documentoId: docId },
                    { portariaId: tipo === 'PORTARIA' ? docId : undefined }
                ]
            }
        })

        if (jaExiste) {
            return NextResponse.json(
                { success: false, error: 'Documento já está na fila do Jornal' },
                { status: 409 }
            )
        }

        // Cria entrada na fila
        const itemFila = await (prisma as any).jornalQueue.create({
            data: {
                documentoId: docId,
                tipoDocumento: tipo,
                // Mantém portariaId para retrocompatibilidade quando for portaria
                portariaId: tipo === 'PORTARIA' ? docId : null,
                prioridade,
                metadados,
                status: 'PENDENTE'
            }
        })

        return NextResponse.json({ success: true, data: itemFila }, { status: 201 })
    } catch (error: any) {
        console.error('Erro ao enfileirar documento:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao enfileirar documento' },
            { status: 500 }
        )
    }
}
