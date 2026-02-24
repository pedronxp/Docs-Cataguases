import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { ModeloService } from '@/services/modelo.service'
import { z } from 'zod'

const variavelSchema = z.object({
    chave: z.string().startsWith('SYS_'),
    valor: z.string().min(1),
    descricao: z.string().min(1),
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

        const result = await ModeloService.salvarVariavelSistema(parsed.data)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro interno ao salvar variável' }, { status: 500 })
    }
}
