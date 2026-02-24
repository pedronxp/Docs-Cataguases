import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { FeedService } from '@/services/feed.service'

export async function GET(request: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '20')

        const user = usuario as any
        const result = await FeedService.listarAtividades({
            secretariaId: user.secretariaId as string | undefined,
            setorId: user.setorId as string | undefined,
            role: user.role as string,
            page,
            pageSize
        })

        if (!result.ok) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            data: result.value
        })
    } catch (error) {
        console.error('Erro no endpoint de feed:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao processar feed.' }, { status: 500 })
    }
}
