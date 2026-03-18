import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'

export const dynamic = 'force-dynamic'

const MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

/**
 * Resolve as variáveis de sistema (SYS_*) para injetar no template DOCX.
 * Usa os mesmos dados que a rota /submeter usa para o HTML/PDF.
 */
async function resolverVariaveisSistema(portaria: any): Promise<Record<string, string>> {
    const agora = new Date()
    const dataBR = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const dataExtenso = `${agora.getDate()}º de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`

    // Carrega todas as variáveis fixas da tabela VariavelSistema
    const varsBD = await prisma.variavelSistema.findMany()
    const varsMap: Record<string, string> = {}
    for (const v of varsBD) {
        varsMap[v.chave] = v.valor
    }

    // Sobrescreve / adiciona variáveis dinâmicas
    varsMap['SYS_DATA'] = dataBR
    varsMap['SYS_DATA_EXTENSO'] = dataExtenso
    // Número ainda não alocado no rascunho
    varsMap['SYS_NUMERO'] = portaria.numeroOficial || '______'

    // Resolve SYS_PREFEITO a partir dos dados de gestão
    try {
        const gestao = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
        if (gestao?.valor) {
            const dados = JSON.parse(gestao.valor)
            const gestaoAtual = Array.isArray(dados) ? dados[0] : dados
            varsMap['SYS_PREFEITO'] = gestaoAtual?.prefeito || varsMap['SYS_PREFEITO'] || 'PREFEITO NÃO CONFIGURADO'
        }
    } catch {
        // mantém valor padrão já carregado
    }

    // Variáveis contextuais da portaria
    if (portaria.secretaria) {
        varsMap['SYS_SECRETARIA'] = portaria.secretaria.nome || ''
        varsMap['SYS_SECRETARIA_SIGLA'] = portaria.secretaria.sigla || ''
    }
    if (portaria.setor) {
        varsMap['SYS_SETOR'] = portaria.setor.nome || ''
        varsMap['SYS_SETOR_SIGLA'] = portaria.setor.sigla || ''
    }
    if (portaria.criadoPor) {
        varsMap['SYS_AUTOR'] = portaria.criadoPor.name || portaria.criadoPor.username || ''
    }

    return varsMap
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: { select: { docxTemplateUrl: true, nome: true } },
                secretaria: { select: { nome: true, sigla: true } },
                setor:      { select: { nome: true, sigla: true } },
                criadoPor:  { select: { name: true, username: true } },
            }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        const docxRascunhoUrl = (portaria as any).docxRascunhoUrl as string | null

        // ── 1. Rascunho já gerado anteriormente → retorna direto ──────────────
        // Passa ?regenerar=true para forçar regeneração com as variáveis atuais
        const { searchParams } = new URL(request.url)
        const regenerar = searchParams.get('regenerar') === 'true'

        if (docxRascunhoUrl && !regenerar) {
            const url = docxRascunhoUrl.startsWith('http')
                ? docxRascunhoUrl
                : await StorageService.getSignedUrl(docxRascunhoUrl, 3600)
            // Registra log de visualização
            await prisma.feedAtividade.create({
                data: {
                    tipoEvento: 'DOCX_VISUALIZADO',
                    mensagem: `Rascunho DOCX visualizado por ${(session as any).name || (session as any).username || 'usuário'}`,
                    portariaId: id,
                    autorId: (session as any).id,
                    secretariaId: portaria.secretariaId,
                    setorId: portaria.setorId,
                    metadata: { acao: 'visualizar' },
                }
            }).catch(() => {/* log não crítico */})
            return NextResponse.json({ success: true, data: { url } })
        }

        // ── 2. Gera rascunho preenchido a partir do template ──────────────────
        const templatePath = portaria.modelo?.docxTemplateUrl
        if (!templatePath) {
            return NextResponse.json(
                { success: false, error: 'Modelo não possui template DOCX configurado.' },
                { status: 404 }
            )
        }

        const formData = (portaria.formData ?? {}) as Record<string, any>

        // Monta o mapa completo de variáveis: sistema + formData do usuário
        // formData tem prioridade para sobrescrever eventuais colisões
        const varsistema = await resolverVariaveisSistema(portaria)
        const allVariables: Record<string, any> = { ...varsistema, ...formData }

        console.log('[/docx] Template path:', templatePath)
        console.log('[/docx] Variáveis do formData:', Object.keys(formData))
        console.log('[/docx] Variáveis de sistema:', Object.keys(varsistema))
        console.log('[/docx] Total variáveis:', Object.keys(allVariables).length)

        let filledBuffer: Buffer
        try {
            filledBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
            console.log('[/docx] DOCX gerado com sucesso, tamanho:', filledBuffer.byteLength, 'bytes')
        } catch (genError: any) {
            console.error('[/docx] Erro ao preencher template:', genError)
            return NextResponse.json(
                { success: false, error: genError.message || 'Erro ao gerar documento preenchido.' },
                { status: 500 }
            )
        }

        // ── 3. Salva no Storage e atualiza portaria ───────────────────────────

        // Monta nome amigável: "Nomeação - Pedro Paulo.docx"
        // Procura chaves comuns que identificam o destinatário
        const CHAVES_PESSOA = ['NOMEADO', 'NOME', 'SERVIDOR', 'DESIGNADO', 'EXONERADO', 'CONTRATADO', 'INTERESSADO']
        const pessoa = CHAVES_PESSOA
            .map(k => allVariables[k] || allVariables[k.toLowerCase()])
            .find(v => v && String(v).trim() !== '')

        const modeloNome = portaria.modelo?.nome || 'Documento'
        const sufixo = pessoa ? ` - ${String(pessoa).trim()}` : ''
        // Sanitiza para uso como nome de arquivo (remove caracteres proibidos)
        const baseName = `${modeloNome}${sufixo}`.replace(/[<>:"/\\|?*]/g, '').trim()
        const fileName = `${baseName}.docx`
        const storagePath = `${portaria.secretariaId}/${fileName}`

        await StorageService.uploadBuffer(
            storagePath,
            filledBuffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

        await prisma.portaria.update({
            where: { id: portaria.id },
            data: { docxRascunhoUrl: storagePath },
        })

        const signedUrl = await StorageService.getSignedUrl(storagePath, 3600)

        // Registra log de download/regeneração
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: 'DOCX_BAIXADO',
                mensagem: `Rascunho DOCX ${regenerar ? 'regenerado e baixado' : 'gerado e baixado'} por ${(session as any).name || (session as any).username || 'usuário'}`,
                portariaId: id,
                autorId: (session as any).id,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId,
                metadata: { acao: regenerar ? 'regenerar' : 'gerar', arquivo: storagePath },
            }
        }).catch(() => {/* log não crítico */})

        return NextResponse.json({ success: true, data: { url: signedUrl } })

    } catch (error: any) {
        console.error('[/docx]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao obter DOCX' },
            { status: 500 }
        )
    }
}
