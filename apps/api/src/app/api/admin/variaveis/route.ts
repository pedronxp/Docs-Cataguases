import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import { z } from 'zod'
import prisma from '@/lib/prisma'

const variavelSchema = z.object({
    chave: z.string().startsWith('SYS_'),
    valor: z.string().default(''),
    descricao: z.string().optional().default(''),
})

export async function GET() {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const result = await ModeloService.listarVariaveisSistema()
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
        if (!ability.can('gerenciar', 'VariavelSistema')) {
            return NextResponse.json({ error: 'Sem permissão para gerenciar variáveis' }, { status: 403 })
        }

        const body = await req.json()
        const parsed = variavelSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

        // Detecta se é criação ou edição (upsert por chave)
        const existente = await prisma.variavelSistema.findUnique({ where: { chave: parsed.data.chave } })
        const result = await ModeloService.salvarVariavelSistema(parsed.data)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        const tipoEvento = existente ? 'VARIAVEL_EDITADA' : 'VARIAVEL_CRIADA'
        const mensagem = existente
            ? `Variável {{${parsed.data.chave}}} atualizada`
            : `Variável {{${parsed.data.chave}}} criada`

        await prisma.feedAtividade.create({
            data: {
                tipoEvento,
                mensagem,
                autorId: (usuario as any).id,
                secretariaId: null,
                portariaId: null,
                metadata: { chave: parsed.data.chave }
            }
        }).catch(() => { /* não bloquear por falha no feed */ })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno ao salvar variável' }, { status: 500 })
    }
}
