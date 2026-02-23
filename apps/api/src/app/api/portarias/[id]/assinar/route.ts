import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AssinaturaService } from '@/services/assinatura.service'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        const result = await AssinaturaService.assinarDocumento(
            id,
            session.id as string,
            session.role as string
        )

        if (result.ok) {
            return NextResponse.json({
                success: true,
                data: result.value,
                message: 'Documento assinado com sucesso.'
            })
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 400 }
        )
    } catch (error) {
        console.error('Erro no endpoint de assinatura:', error)
        return NextResponse.json(
            { success: false, error: 'Erro interno ao processar assinatura' },
            { status: 500 }
        )
    }
}
