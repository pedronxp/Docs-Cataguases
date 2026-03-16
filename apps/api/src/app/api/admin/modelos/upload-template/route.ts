import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/modelos/upload-template
 *
 * Faz upload do arquivo .docx template para o Supabase Storage
 * na pasta "modelos/". Retorna o path do arquivo no bucket.
 *
 * Este path é salvo como `docxTemplateUrl` no modelo e usado
 * pelo DocxGeneratorService para preencher variáveis ao gerar portarias.
 */
export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const ability = buildAbility(usuario as any)
        if (!ability.can('gerenciar', 'Modelo')) {
            return NextResponse.json({ error: 'Sem permissão para fazer upload de templates' }, { status: 403 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'Arquivo DOCX não enviado' }, { status: 400 })
        }

        const extensao = file.name.split('.').pop()?.toLowerCase()
        if (extensao !== 'docx') {
            return NextResponse.json({ error: 'Apenas arquivos .docx são aceitos como template' }, { status: 400 })
        }

        // Tamanho máximo: 20MB
        const MAX_SIZE = 20 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'O arquivo template não pode exceder 20MB' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Path único no bucket: modelos/{timestamp}_{nome-sanitizado}.docx
        const nomeSeguro = StorageService.sanitizePath(file.name)
        const path = `modelos/${Date.now()}_${nomeSeguro}`

        await StorageService.uploadBuffer(
            path,
            buffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

        return NextResponse.json({
            success: true,
            data: {
                path,           // Caminho no bucket (salvar como docxTemplateUrl)
                originalName: file.name,
                size: file.size,
            }
        })

    } catch (error: any) {
        console.error('[upload-template]', error)
        return NextResponse.json(
            { error: error.message || 'Erro ao fazer upload do template' },
            { status: 500 }
        )
    }
}
