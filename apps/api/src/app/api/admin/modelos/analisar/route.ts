import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { DocxService } from '@/services/docx.service'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { url } = await request.json()
        if (!url) return NextResponse.json({ success: false, error: 'URL do template necessária' }, { status: 400 })

        // 1. Converte DOCX para HTML
        const html = await DocxService.convertToHtml(url)

        // 2. Extrai variáveis usando Regex {{variavel}}
        const regex = /{{(.*?)}}/g
        const matches = html.matchAll(regex)
        const labels: Set<string> = new Set()

        for (const match of matches) {
            labels.add(match[1].trim())
        }

        const variaveisEncontradas = Array.from(labels).map((label, index) => ({
            chave: label.toLowerCase().replace(/\s+/g, '_'),
            label: label.charAt(0).toUpperCase() + label.slice(1),
            tipo: 'texto',
            ordem: index
        }))

        return NextResponse.json({
            success: true,
            data: {
                html,
                variaveis: variaveisEncontradas
            }
        })

    } catch (error: any) {
        if (error.message?.includes('CLOUDCONVERT_API_KEY')) {
            return NextResponse.json({
                success: true,
                data: { html: '', variaveis: [] },
                warning: 'CloudConvert não configurado. As variáveis não puderam ser extraídas automaticamente.'
            })
        }
        console.error('Erro ao analisar modelo:', error)
        return NextResponse.json({ success: false, error: error.message || 'Erro ao processar documento' }, { status: 500 })
    }
}
