import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'

// Endpoint de Upload simplificado para o Ciclo 3.
// Em produção, isso integraria com Supabase Storage.
// Aqui, vamos apenas validar se o usuário pode gerenciar arquivos.

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Lógica de upload (simulada para este estágio)
        // O corpo deve ser um FormData com 'file'
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
        }

        if (!file.name.endsWith('.docx')) {
            return NextResponse.json({ error: 'Somente arquivos .docx são permitidos' }, { status: 400 })
        }

        // Simulação de salvamento
        const fileUrl = `https://storage.cataguases.gov.br/templates/${Date.now()}_${file.name}`

        return NextResponse.json({
            success: true,
            url: fileUrl,
            name: file.name
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro no upload' }, { status: 500 })
    }
}
