import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const formData = await request.formData()
        const file = formData.get('file') as File
        if (!file) return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 })

        const buffer = await file.arrayBuffer()
        const fileName = `templates/${Date.now()}-${file.name}`

        const { data, error } = await supabaseAdmin.storage
            .from('docs-cataguases')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) throw error

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('docs-cataguases')
            .getPublicUrl(fileName)

        return NextResponse.json({ success: true, url: publicUrl })
    } catch (error: any) {
        console.error('Erro no upload:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
