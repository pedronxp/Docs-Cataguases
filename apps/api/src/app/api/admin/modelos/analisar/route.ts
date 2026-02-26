import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const analisarSchema = z.object({
    conteudoHtml: z.string().min(1, 'Conteúdo HTML é obrigatório')
})

// Regex que captura {{TAG}} ou {{ TAG }} — igual ao padrão definido em GESTAO_MODELOS.md
const TAG_REGEX = /\{\{\s*([A-Z0-9_a-z]+)\s*\}\}/g
// Prefixos de variáveis de sistema (preenchidas automaticamente pelo backend)
const SYS_PREFIXES = ['SYS_']

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await req.json()
        const parsed = analisarSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
        }

        const { conteudoHtml } = parsed.data

        // Extrair todas as tags únicas do HTML
        const matches = [...conteudoHtml.matchAll(TAG_REGEX)]
        const tagsUnicas = [...new Set(matches.map(m => m[1].trim()))]

        // Separar variáveis de usuário (que o Wizard exibe) das variáveis de sistema (SYS_*)
        const variaveisUsuario = tagsUnicas.filter(
            tag => !SYS_PREFIXES.some(prefix => tag.startsWith(prefix))
        )
        const variaveisSistema = tagsUnicas.filter(
            tag => SYS_PREFIXES.some(prefix => tag.startsWith(prefix))
        )

        // Gerar estrutura de variáveis com defaults para o Admin configurar
        const variaveis = variaveisUsuario.map((chave, index) => ({
            chave,
            label: chave
                .toLowerCase()
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase()), // "NOME_SERVIDOR" → "Nome Servidor"
            tipo: 'texto',
            obrigatorio: true,
            opcoes: [],
            ordem: index + 1
        }))

        return NextResponse.json({
            success: true,
            data: {
                variaveis,
                variaveisSistema, // Apenas para informação — não aparecem no Wizard
                totalTags: tagsUnicas.length
            }
        })
    } catch (error) {
        console.error('Erro ao analisar modelo:', error)
        return NextResponse.json({ error: 'Erro interno ao analisar template' }, { status: 500 })
    }
}
