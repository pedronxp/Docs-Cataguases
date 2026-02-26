
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AcervoService } from '@/services/acervo.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const secretariaId = searchParams.get('secretariaId') || undefined

        const result = await AcervoService.obterEstatisticas(secretariaId)

        if (result.ok) {
            return NextResponse.json({ success: true, data: result.value })
        }

        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    } catch (error) {
        console.error('Erro na rota de estatisticas:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}
