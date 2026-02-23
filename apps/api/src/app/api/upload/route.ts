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

        // Garante que o bucket existe
        const { data: buckets } = await supabaseAdmin.storage.listBuckets()
        const bucketName = 'docs-cataguases'
        const bucketExists = buckets?.some(b => b.name === bucketName)

        if (!bucketExists) {
            console.log(`Criando bucket ${bucketName}...`)
            await supabaseAdmin.storage.createBucket(bucketName, {
                public: true,
                allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                fileSizeLimit: 5242880 // 5MB
            })
        }

        const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (error) {
            console.error('Erro no upload Storage:', error)
            return NextResponse.json({ success: false, error: `Erro no Storage: ${error.message}` }, { status: 500 })
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(fileName)

        return NextResponse.json({ success: true, url: publicUrl })
    } catch (error: any) {
        console.error('Erro crítico no upload:', error)
        return NextResponse.json({ success: false, error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
