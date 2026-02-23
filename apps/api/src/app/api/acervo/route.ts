import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AcervoService, FiltrosAcervo } from '@/services/acervo.service'

export async function GET(request: Request) {
    try {
        const session = await getSession()

        // Na fase atual, permitimos que apenas usuários logados vejam o acervo completo.
        // Em uma fase futura, poderíamos permitir busca pública de documentos ASSINADOS.
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Acesso restrito ao funcionalismo.' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)

        const filtros: FiltrosAcervo = {
            termo: searchParams.get('q') || undefined,
            secretariaId: searchParams.get('secretariaId') || undefined,
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
