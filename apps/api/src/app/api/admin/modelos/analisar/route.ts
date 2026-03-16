import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { LibreOfficeConvertService } from '@/services/libreoffice-convert.service'
import { CloudConvertService } from '@/services/cloudconvert.service'
import { DocxImageService } from '@/services/docx-image.service'
import { DocxHeaderService } from '@/services/docx-header.service'
import { setDocxAnalise } from '@/lib/llm-tools'

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

            // ── Tentativa 1: LibreOffice local ──────────────────────────────────────
            // Converte DOCX → HTML incluindo cabeçalho (brasão) e convertendo EMF→PNG.
            // É mais completo que CloudConvert pois inclui headers/footers do documento.
            const loResult = await LibreOfficeConvertService.convertDocxToHtml(buffer, file.name)

            if (loResult.ok) {
                conteudoHtml = loResult.value

                // Nota: LibreOfficeConvertService já injeta o cabeçalho (brasão) internamente.
                // Não reinjetar aqui para evitar duplicidade.

                // Injetar imagens do body que o LibreOffice pode ter referenciado como paths externos
                conteudoHtml = DocxImageService.processHtml(buffer, conteudoHtml)

                console.log('[analisar] Conversão feita pelo LibreOffice local (header já injetado no serviço).')
            } else {
                // ── Fallback: CloudConvert ───────────────────────────────────────────
                // Usado apenas se LibreOffice falhar (ex: servidor sem soffice).
                console.warn('[analisar] LibreOffice falhou, tentando CloudConvert:', loResult.error)

                const ccResult = await CloudConvertService.extractToHtml(buffer, file.name)

                if (!ccResult.ok) {
                    console.error('[analisar] CloudConvert também falhou:', ccResult.error)
                    return NextResponse.json({
                        error: 'Não foi possível processar o documento no momento. Verifique se o arquivo é um DOCX válido e tente novamente.'
                    }, { status: 500 })
                }

                // DocxImageService como segurança extra: injeta imagens PNG/JPG do DOCX ZIP
                // que o CloudConvert possa ter perdido (não substitui data: URIs já presentes)
                conteudoHtml = DocxImageService.processHtml(buffer, ccResult.value)

                // Injetar cabeçalho (brasão) também no path do CloudConvert
                // O CloudConvert não inclui headers/footers do DOCX no HTML
                try {
                    const headerHtml = await DocxHeaderService.extractHeaderHtml(buffer)
                    if (headerHtml) {
                        if (/<body[^>]*>/i.test(conteudoHtml)) {
                            conteudoHtml = conteudoHtml.replace(/(<body[^>]*>)/i, `$1\n${headerHtml}`)
                        } else {
                            conteudoHtml = headerHtml + '\n' + conteudoHtml
                        }
                        console.log('[analisar] Cabeçalho (brasão) injetado no HTML do CloudConvert.')
                    }
                } catch (hdrErr: any) {
                    console.warn('[analisar] Erro ao injetar cabeçalho (não crítico):', hdrErr?.message)
                }

                console.log('[analisar] Conversão feita pelo CloudConvert (fallback).')
            }
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

        // Cache do HTML completo + variáveis para uso pelo chatbot (criar_modelo)
        setDocxAnalise(usuario.id, { conteudoHtml, variaveis })

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
