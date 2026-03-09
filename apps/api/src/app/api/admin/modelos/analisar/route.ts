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

        // RECOMENDAÇÕES INTELIGENTES (Identificar padrões no texto)
        // Limpar o HTML para análise de texto puro (removendo tags, mas mantendo o conteúdo)
        const textoLimpo = conteudoHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ')

        const RECOMENDACOES_REGEX = {
            CPF: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
            DATA: /\d{2}\/\d{2}\/\d{4}/g,
            // Nomes em caixa alta (ex: PEDRO HENRIQUE) - 2 ou mais nomes
            NOME_CAPS: /\b([A-ZÀ-Ú]{3,}\s[A-ZÀ-Ú]{2,}(?:\s[A-ZÀ-Ú]{2,})*)\b/g
        }

        // Palavras institucionais que não devem ser sugeridas como variáveis de nome
        const STOPWORDS_INSTITUCIONAIS = new Set([
            'PREFEITURA', 'MUNICIPAL', 'SECRETARIA', 'DEPARTAMENTO', 'CONSIDERANDO',
            'RESOLVE', 'DECRETO', 'PORTARIA', 'RESOLUCAO', 'LEI', 'ARTIGO', 'PARAGRAFO',
            'INCISO', 'ESTADO', 'CATAGUASES', 'REPUBLICA', 'FEDERATIVA', 'BRASIL',
            'MINAS', 'GERAIS', 'GABINETE', 'PREFEITO', 'VICE', 'CIDADE', 'MUNICIPIO',
            'ADMINISTRACAO', 'GOVERNO', 'PODER', 'EXECUTIVO', 'LEGISLATIVO', 'JUDICIARIO',
            'CONTRATO', 'CONVENIO', 'PROCESSO', 'EDITAL', 'LICITACAO', 'CONCURSO'
        ])

        const recomendacoes: any[] = []
        const inseridas = new Set<string>()

        // Função auxiliar para evitar duplicatas e sugerir label
        const sugerirRecomendacao = (texto: string, tipo: string) => {
            if (inseridas.has(texto)) return
            // Se já está dentro de uma tag {{...}}, ignorar
            if (tagsUnicas.some(t => texto.includes(t))) return

            // Fix: manter dígitos na sugestaoChave (ex: CPF fica legível)
            const sugestaoChave = texto
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
                .substring(0, 25)

            recomendacoes.push({
                textoOriginal: texto,
                sugestaoChave,
                tipo
            })
            inseridas.add(texto)
        }

        // Buscar CPFs
        const cpfs = [...textoLimpo.matchAll(RECOMENDACOES_REGEX.CPF)]
        cpfs.forEach(m => sugerirRecomendacao(m[0], 'cpf'))

        // Buscar Datas
        const datas = [...textoLimpo.matchAll(RECOMENDACOES_REGEX.DATA)]
        datas.forEach(m => sugerirRecomendacao(m[0], 'data'))

        // Buscar Nomes — filtrar stopwords institucionais para evitar ruído
        const nomes = [...textoLimpo.matchAll(RECOMENDACOES_REGEX.NOME_CAPS)]
        nomes.forEach(m => {
            const palavras = m[0].split(/\s+/)
            const temStopword = palavras.some(p => STOPWORDS_INSTITUCIONAIS.has(p))
            if (!temStopword) sugerirRecomendacao(m[0], 'nome')
        })

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
                recomendacoes, // Sugestões extras baseadas em padrões
                totalTags: tagsUnicas.length
            }
        })
    } catch (error) {
        console.error('Erro ao analisar modelo:', error)
        return NextResponse.json({ error: 'Erro interno ao analisar template' }, { status: 500 })
    }
}
