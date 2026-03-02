import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { AcervoService, FiltrosAcervo } from '@/services/acervo.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Acesso restrito ao funcionalismo.' },
                { status: 401 }
            )
        }

        const ability = buildAbility(session as any)
        const podeVerTudo = ability.can('manage', 'all') || ability.can('visualizar' as any, 'PortariaGlobal' as any)

        const { searchParams } = new URL(request.url)

        const filtros: FiltrosAcervo = {
            termo: searchParams.get('q') || undefined,
            // ABAC: se não tem permissão global, ignora secretariaId do querystring e força a do usuário
            secretariaId: podeVerTudo
                ? (searchParams.get('secretariaId') || undefined)
                : (session.secretariaId ?? undefined),
            setorId: searchParams.get('setorId') || undefined,
            status: searchParams.get('status') || undefined,
            ano: searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : undefined,
            page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
            limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10
        }

        const result = await AcervoService.listarPortarias(filtros)

        if (result.ok) {
            return NextResponse.json({
                success: true,
                data: result.value.itens,
                meta: result.value.meta
            })
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
        )

    } catch (error) {
        console.error('Erro na rota de acervo:', error)
        return NextResponse.json(
            { success: false, error: 'Erro interno ao processar busca' },
            { status: 500 }
        )
    }
}
