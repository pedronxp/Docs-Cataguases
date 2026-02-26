import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import { z } from 'zod'

const modeloSchema = z.object({
    nome: z.string().min(1),
    descricao: z.string().min(1),
    categoria: z.string().default('Outros'),
    secretariaId: z.string().optional().nullable(),
    docxTemplateUrl: z.string().url().optional().nullable(),
    conteudoHtml: z.string().min(1),
    variaveis: z.array(z.object({
        chave: z.string().min(1),
        label: z.string().min(1),
        tipo: z.string().default('texto'),
        opcoes: z.array(z.string()).optional(),
        obrigatorio: z.boolean().default(true),
        ordem: z.number().default(0)
    })).default([])
})

export async function GET(request: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const secretariaId = searchParams.get('secretariaId') ?? undefined

        const result = await ModeloService.listarTodos(secretariaId)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'Modelo')) {
            return NextResponse.json({ error: 'Sem permissão para criar modelos' }, { status: 403 })
        }

        const body = await req.json()
        const parsed = modeloSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

        const result = await ModeloService.criar(parsed.data)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value }, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno ao criar modelo' }, { status: 500 })
    }
}
