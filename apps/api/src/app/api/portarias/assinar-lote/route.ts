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
}

const ROLES_ASSINAR = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO']

export async function POST(request: Request) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload

        if (!ROLES_ASSINAR.includes(session.role as string)) {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para assinar portarias' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const ids = body.ids as string[]

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, error: 'Lista de IDs inválida' }, { status: 400 })
        }

        const portarias = await prisma.portaria.findMany({
            where: { id: { in: ids }, status: 'AGUARDANDO_ASSINATURA' }
        })

        if (portarias.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma portaria válida encontrada para assinar' }, { status: 400 })
        }

        const idsParaAssinar = portarias.map((p) => p.id)
        const nomeResponsavel = session.name || session.username || 'Sistema'
        const msgLog = `Portaria assinada digitalmente (Lote) por ${nomeResponsavel} (${session.role}) em ${new Date().toLocaleString('pt-BR')}.`

        await prisma.$transaction(async (tx) => {
            // Atualizar as portarias
            await tx.portaria.updateMany({
                where: { id: { in: idsParaAssinar } },
                data: {
                    assinaturaStatus: 'ASSINADA_DIGITAL',
                    status: 'PRONTO_PUBLICACAO',
                    assinadoPorId: session.id,
                    assinadoEm: new Date()
                }
            })

            // Criar feedAtividade
            for (const p of portarias) {
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'ASSINATURA_DIGITAL',
                        mensagem: msgLog,
                        portariaId: p.id,
                        autorId: session.id,
                        secretariaId: p.secretariaId,
                        metadata: { emLote: true }
                    }
                })

                // Colfila do Jornal
                await tx.jornalQueue.upsert({
                    where: { portariaId: p.id },
                    create: { portariaId: p.id },
                    update: { status: 'PENDENTE', updatedAt: new Date() }
                })
            }
        })

        return NextResponse.json({ success: true, message: `${idsParaAssinar.length} portarias assinadas com sucesso` })
    } catch (error: any) {
        console.error('[/assinar-lote]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao assinar portarias em lote' },
            { status: 500 }
        )
    }
}
