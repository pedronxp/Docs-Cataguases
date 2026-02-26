import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/admin/config/secretarias
export async function GET() {
    try {
        const secretarias = await prisma.secretaria.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
            include: { _count: { select: { setores: true, usuarios: true } } },
        })

        return NextResponse.json({ success: true, data: secretarias })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao listar secretarias' }, { status: 500 })
    }
}

const secretariaSchema = z.object({
    nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    sigla: z.string().min(1).max(20),
    cor: z.string().optional().default('slate'),
})

// POST /api/admin/config/secretarias
export async function POST(req: NextRequest) {
    try {
        const session = await getAuthUser()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await req.json()
        const parsed = secretariaSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
        }

        const siglaUpper = parsed.data.sigla.toUpperCase()

        // Verifica se já existe uma secretaria com essa sigla (ativa ou inativa)
        const existe = await prisma.secretaria.findUnique({
            where: { sigla: siglaUpper }
        })

        if (existe) {
            if (existe.ativo) {
                return NextResponse.json({ success: false, error: 'Já existe uma secretaria com essa sigla' }, { status: 409 })
            }

            // Reativa a secretaria existente
            const reativada = await prisma.secretaria.update({
                where: { id: existe.id },
                data: {
                    nome: parsed.data.nome,
                    cor: parsed.data.cor,
                    ativo: true
                }
            })
            return NextResponse.json({ success: true, data: reativada })
        }

        const secretaria = await prisma.secretaria.create({
            data: {
                nome: parsed.data.nome,
                sigla: siglaUpper,
                cor: parsed.data.cor,
            },
        })

        return NextResponse.json({ success: true, data: secretaria }, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Já existe uma secretaria com essa sigla' }, { status: 409 })
        }
        console.error('Erro ao criar secretaria:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}
