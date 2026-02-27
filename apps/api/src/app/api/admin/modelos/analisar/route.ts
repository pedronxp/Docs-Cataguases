import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { CloudConvertService } from '@/services/cloudconvert.service'

export const dynamic = 'force-dynamic'

// Regex que captura {{TAG}} ou {{ TAG }}
const TAG_REGEX = /\{\{\s*([A-Z0-9_a-z]+)\s*\}\}/g
// Prefixos de variáveis de sistema
const SYS_PREFIXES = ['SYS_']

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        let conteudoHtml = ''
        const contentType = req.headers.get('content-type') || ''

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData()
            const file = formData.get('file') as File | null

            if (!file) {
                return NextResponse.json({ error: 'Arquivo DOCX não enviado no formulário' }, { status: 400 })
            }

            // Converte DOCX para HTML via CloudConvert
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const extractionResult = await CloudConvertService.extractToHtml(buffer, file.name)

            if (!extractionResult.ok) {
                return NextResponse.json({ error: extractionResult.error }, { status: 500 })
            }

            conteudoHtml = extractionResult.value
        } else {
            // Suporte legado para JSON
            const body = await req.json()
            conteudoHtml = body.conteudoHtml
        }

        if (!conteudoHtml) {
            return NextResponse.json({ error: 'Conteúdo para análise não encontrado' }, { status: 400 })
        }

        // Extrair todas as tags únicas do HTML
        const matches = [...conteudoHtml.matchAll(TAG_REGEX)]
        const tagsUnicas = [...new Set(matches.map(m => m[1].trim()))]

        // Separar variáveis de usuário das variáveis de sistema (SYS_*)
        const variaveisUsuario = tagsUnicas.filter(
            tag => !SYS_PREFIXES.some(prefix => tag.startsWith(prefix))
        )
        const variaveisSistema = tagsUnicas.filter(
            tag => SYS_PREFIXES.some(prefix => tag.startsWith(prefix))
        )

        // Gerar estrutura de variáveis
        const variaveis = variaveisUsuario.map((chave, index) => ({
            chave,
            label: chave
                .toLowerCase()
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()),
            tipo: 'texto',
            obrigatorio: true,
            opcoes: [],
            ordem: index + 1
        }))

        return NextResponse.json({
            success: true,
            data: {
                conteudoHtml,
                variaveis,
                variaveisSistema,
                totalTags: tagsUnicas.length
            }
        })
    } catch (error) {
        console.error('Erro ao analisar modelo:', error)
        return NextResponse.json({ error: 'Erro interno ao analisar template' }, { status: 500 })
    }
}
