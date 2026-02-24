import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // No momento, como ainda não configuramos um bucket S3/Supabase Storage real,
        // vamos simular o upload e retornar uma URL fake para o rascunho.
        // O frontend deve enviar um FormData com o campo 'file'.

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
        }

        // Mock de URL de retorno
        const fileUrl = `/uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

        return NextResponse.json({
            success: true,
            data: {
                url: fileUrl,
                name: file.name,
                size: file.size,
                type: file.type
            }
        })
    } catch (error) {
        console.error('Erro no upload:', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
}
