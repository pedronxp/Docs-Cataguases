import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import { z } from 'zod'

const criarModeloSchema = z.object({
    nome: z.string().min(1),
    descricao: z.string().min(1),
    docxTemplateUrl: z.string().url(),
    secretariaId: z.string().optional(),
    variaveis: z.array(z.object({
        chave: z.string(),
        label: z.string(),
        tipo: z.string().optional(),
        opcoes: z.array(z.string()).optional(),
        obrigatorio: z.boolean().optional(),
        ordem: z.number().optional()
    }))
})

export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // No CASL aqui, ler modelos é permitido para todos autenticados
        const result = await ModeloService.listarTodos()

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.value)
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao listar modelos' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'ModeloDocumento'))
            return NextResponse.json({ error: 'Sem permissão para criar modelos' }, { status: 403 })

        const body = await req.json()
        const parsed = criarModeloSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const result = await ModeloService.criar(parsed.data)

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.value, { status: 201 })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar modelo' }, { status: 500 })
    }
}
