import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const setorSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    sigla: z.string().min(1).max(20),
})

// GET /api/admin/config/secretarias/[id]/setores
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || !['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO'].includes((session as any).role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const setores = await prisma.setor.findMany({
            where: { secretariaId: id, ativo: true },
            orderBy: { nome: 'asc' },
        })

        return NextResponse.json({ success: true, data: setores })
    } catch (error) {
        console.error('Erro ao listar setores:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/admin/config/secretarias/[id]/setores
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await req.json()
        const parsed = setorSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
        }

        // Verifica se a secretaria existe
        const secretaria = await prisma.secretaria.findUnique({ where: { id: id } })
        if (!secretaria) {
            return NextResponse.json({ success: false, error: 'Secretaria não encontrada' }, { status: 404 })
        }

        const setor = await prisma.setor.create({
            data: {
                nome: parsed.data.nome,
                sigla: parsed.data.sigla.toUpperCase(),
                secretariaId: id,
            },
        })

        return NextResponse.json({ success: true, data: setor }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Já existe um setor com essa sigla nesta secretaria' }, { status: 409 })
        }
        console.error('Erro ao criar setor:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}
