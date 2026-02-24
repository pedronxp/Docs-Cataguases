import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const variavelSchema = z.object({
    chave: z.string().startsWith('SYS_'),
    valor: z.string(),
    descricao: z.string(),
    resolvidaAutomaticamente: z.boolean().optional()
})

const patchVariavelSchema = z.object({
    valor: z.string().optional(),
    descricao: z.string().optional()
})

export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const variaveis = await prisma.variavelSistema.findMany({
            orderBy: { chave: 'asc' }
        })

        return NextResponse.json(variaveis)
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao listar variáveis' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'VariavelSistema' as any))
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

        const body = await req.json()
        const parsed = variavelSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const variavel = await prisma.variavelSistema.create({
            data: parsed.data
        })

        return NextResponse.json(variavel, { status: 201 })
    } catch (error) {
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ error: 'Chave já existe' }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro ao criar variável' }, { status: 500 })
    }
}
