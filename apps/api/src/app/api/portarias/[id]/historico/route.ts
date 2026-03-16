import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portarias/:id/historico
 * Retorna todos os eventos de FeedAtividade associados a uma portaria específica,
 * ordenados do mais antigo para o mais recente (linha do tempo).
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params

        // Verifica se a portaria existe e se o usuário tem acesso
        const portaria = await prisma.portaria.findUnique({
            where: { id },
            select: { id: true, secretariaId: true, criadoPorId: true },
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        const role = (session as any).role as string
        const userId = (session as any).id as string
        const secretariaId = (session as any).secretariaId as string | null

        // Restrição de acesso: ADMIN_GERAL e PREFEITO veem tudo;
        // outros só veem portarias da própria secretaria ou que criaram
        const podeVer =
            ['ADMIN_GERAL', 'PREFEITO'].includes(role) ||
            portaria.criadoPorId === userId ||
            (secretariaId && portaria.secretariaId === secretariaId)

        if (!podeVer) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
        }

        const eventos = await prisma.feedAtividade.findMany({
            where: { portariaId: id },
            orderBy: { createdAt: 'asc' },
            include: {
                autor: {
                    select: { id: true, name: true, username: true, role: true }
                },
            },
        })

        return NextResponse.json({ success: true, data: eventos })
    } catch (error: any) {
        console.error('[GET /historico]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao buscar histórico' },
            { status: 500 }
        )
    }
}
