import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { z } from 'zod'

const secretariaSchema = z.object({
    nome: z.string().min(1),
    sigla: z.string().min(1),
    cor: z.string().regex(/^#[0-9A-F]{6}$/i).default('#6366f1'),
})

const setorSchema = z.object({
    nome: z.string().min(1),
    sigla: z.string().min(1),
    secretariaId: z.string().min(1),
})

export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') // 'secretaria' ou 'setor'

        if (type === 'setor') {
            const secId = searchParams.get('secretariaId')
            const setores = await prisma.setor.findMany({
                where: secId ? { secretariaId: secId } : {},
                include: { secretaria: true },
                orderBy: { nome: 'asc' }
            })
            return NextResponse.json({ success: true, data: setores })
        }

        const secretarias = await prisma.secretaria.findMany({
            where: { ativo: true },
            include: { setores: true },
            orderBy: { nome: 'asc' }
        })
        return NextResponse.json({ success: true, data: secretarias })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao listar estrutura municipal' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario || usuario.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ error: 'Apenas administradores podem gerenciar a estrutura' }, { status: 403 })
        }

        const body = await req.json()
        const { type, ...data } = body

        if (type === 'secretaria') {
            const parsed = secretariaSchema.safeParse(data)
            if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

            const sec = await prisma.secretaria.create({ data: parsed.data })
            return NextResponse.json({ success: true, data: sec })
        }

        if (type === 'setor') {
            const parsed = setorSchema.safeParse(data)
            if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

            const setor = await prisma.setor.create({ data: parsed.data })
            return NextResponse.json({ success: true, data: setor })
        }

        return NextResponse.json({ error: 'Tipo inválido (secretaria ou setor)' }, { status: 400 })
    } catch (error) {
        console.error('Erro na gestão municipal:', error)
        return NextResponse.json({ error: 'Erro interno ao salvar estrutura' }, { status: 500 })
    }
}
