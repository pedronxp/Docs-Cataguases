import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { PdfService } from '@/services/pdf.service'
import { StorageService } from '@/services/storage.service'
import { DocxGeneratorService } from '@/services/docx-generator.service'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                modelo: { select: { docxTemplateUrl: true, conteudoHtml: true, nome: true } },
                secretaria: { select: { nome: true, sigla: true } },
                setor:      { select: { nome: true, sigla: true } },
                criadoPor:  { select: { name: true, username: true } },
                assinadoPor: { select: { name: true } }
            }
        })

        if (!portaria) return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })

        // ── 1. Já tem PDF salvo → retorna URL assinada ──────────────────────────
        if (portaria.pdfUrl) {
            try {
                const signedUrl = await StorageService.getSignedUrl(portaria.pdfUrl)
                // Registra log de visualização do PDF
                await prisma.feedAtividade.create({
                    data: {
                        tipoEvento: 'PDF_VISUALIZADO',
                        mensagem: `PDF visualizado por ${usuario.name || usuario.username || 'usuário'}`,
                        portariaId: id,
                        autorId: usuario.id,
                        secretariaId: portaria.secretariaId,
                        setorId: portaria.setorId ?? null,
                        metadata: { acao: 'visualizar_pdf' },
                    }
                }).catch(() => {/* log não crítico */})
                return NextResponse.json({ url: signedUrl })
            } catch {
                console.warn('[PDF Route] URL assinada falhou — regenerando PDF...')
            }
        }

        // ── 2. Tenta gerar via DOCX (mesmo template do rascunho) ────────────────
        const templatePath = portaria.modelo?.docxTemplateUrl

        if (templatePath) {
            try {
                // Resolve variáveis de sistema
                const agora = new Date()
                const MESES = ['janeiro','fevereiro','março','abril','maio','junho',
                               'julho','agosto','setembro','outubro','novembro','dezembro']
                const varsBD = await prisma.variavelSistema.findMany()
                const varsMap: Record<string, string> = {}
                for (const v of varsBD) varsMap[v.chave] = v.valor
                varsMap['SYS_DATA'] = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                varsMap['SYS_DATA_EXTENSO'] = `${agora.getDate()}º de ${MESES[agora.getMonth()]} de ${agora.getFullYear()}`
                varsMap['SYS_NUMERO'] = portaria.numeroOficial || '______'

                try {
                    const gestao = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
                    if (gestao?.valor) {
                        const dados = JSON.parse(gestao.valor)
                        const g = Array.isArray(dados) ? dados[0] : dados
                        varsMap['SYS_PREFEITO'] = g?.prefeito || varsMap['SYS_PREFEITO'] || 'PREFEITO NÃO CONFIGURADO'
                    }
                } catch { /* mantém padrão */ }

                if (portaria.secretaria) {
                    varsMap['SYS_SECRETARIA'] = portaria.secretaria.nome || ''
                    varsMap['SYS_SECRETARIA_SIGLA'] = portaria.secretaria.sigla || ''
                }
                if ((portaria as any).setor) {
                    varsMap['SYS_SETOR'] = (portaria as any).setor.nome || ''
                }
                if (portaria.criadoPor) {
                    varsMap['SYS_AUTOR'] = portaria.criadoPor.name || portaria.criadoPor.username || ''
                }

                // Texto simples de assinatura para DOCX
                if (portaria.assinaturaStatus === 'ASSINADA_DIGITAL' || portaria.assinaturaStatus === 'ASSINADA_MANUAL') {
                    const strTipo = portaria.assinaturaStatus === 'ASSINADA_DIGITAL' ? 'DIGITALMENTE' : 'MANUALMENTE'
                    const nomeStr = (portaria as any).assinadoPor?.name || 'Autoridade'
                    const dataStr = portaria.assinadoEm ? new Date(portaria.assinadoEm).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')
                    varsMap['SYS_ASSINATURA'] = `DOCUMENTO ASSINADO ${strTipo} POR ${nomeStr} EM ${dataStr}`
                } else {
                    varsMap['SYS_ASSINATURA'] = ''
                }

                const formData = (portaria.formData ?? {}) as Record<string, any>
                const allVariables = { ...varsMap, ...formData }

                const docxBuffer = await DocxGeneratorService.generate(templatePath, allVariables)
                const pdfResult = await PdfService.docxToPdf(docxBuffer)

                if (pdfResult.ok) {
                    const filePath = `portarias/${portaria.id}/pdf-${Date.now()}.pdf`
                    await StorageService.uploadBuffer(filePath, pdfResult.value, 'application/pdf')
                    await prisma.portaria.update({ where: { id: portaria.id }, data: { pdfUrl: filePath } })
                    const signedUrl = await StorageService.getSignedUrl(filePath)
                    return NextResponse.json({ url: signedUrl })
                }

                console.warn('[PDF Route] docxToPdf falhou, tentando HTML fallback:', pdfResult.error)
            } catch (docxErr: any) {
                console.warn('[PDF Route] Erro no fluxo DOCX→PDF:', docxErr?.message)
            }
        }

        // ── 3. Fallback: HTML → PDF (legado, sem brasão) ────────────────────────
        const htmlBase = portaria.modelo?.conteudoHtml
        if (!htmlBase) {
            return NextResponse.json({ error: 'Modelo sem conteúdo configurado' }, { status: 404 })
        }

        // Resolve variáveis de sistema para o fallback HTML
        const agora2 = new Date()
        const MESES2 = ['janeiro','fevereiro','março','abril','maio','junho',
                       'julho','agosto','setembro','outubro','novembro','dezembro']
        const varsBD2 = await prisma.variavelSistema.findMany()
        const fallbackVarsMap: Record<string, string> = {}
        for (const v of varsBD2) fallbackVarsMap[v.chave] = v.valor
        fallbackVarsMap['SYS_DATA'] = agora2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        fallbackVarsMap['SYS_DATA_EXTENSO'] = `${agora2.getDate()}º de ${MESES2[agora2.getMonth()]} de ${agora2.getFullYear()}`
        fallbackVarsMap['SYS_NUMERO'] = portaria.numeroOficial || '______'

        try {
            const gestao2 = await prisma.variavelSistema.findUnique({ where: { chave: 'SYS_GESTAO_DADOS' } })
            if (gestao2?.valor) {
                const dados2 = JSON.parse(gestao2.valor)
                const g2 = Array.isArray(dados2) ? dados2[0] : dados2
                fallbackVarsMap['SYS_PREFEITO'] = g2?.prefeito || fallbackVarsMap['SYS_PREFEITO'] || 'PREFEITO NÃO CONFIGURADO'
            }
        } catch { /* mantém padrão */ }

        if (portaria.secretaria) {
            fallbackVarsMap['SYS_SECRETARIA'] = portaria.secretaria.nome || ''
            fallbackVarsMap['SYS_SECRETARIA_SIGLA'] = portaria.secretaria.sigla || ''
        }
        if ((portaria as any).setor) {
            fallbackVarsMap['SYS_SETOR'] = (portaria as any).setor.nome || ''
        }
        if (portaria.criadoPor) {
            fallbackVarsMap['SYS_AUTOR'] = portaria.criadoPor.name || portaria.criadoPor.username || ''
        }

        let html = htmlBase
        const formData2 = portaria.formData as Record<string, any>
        const allFallbackVars = { ...fallbackVarsMap, ...formData2 }
        Object.entries(allFallbackVars).forEach(([key, value]) => {
            html = html.split(`{{${key}}}`).join(String(value))
        })

        // INJEÇÃO DA ASSINATURA NO HTML PARA PREVIEW
        if (portaria.assinaturaStatus === 'ASSINADA_DIGITAL' || portaria.assinaturaStatus === 'ASSINADA_MANUAL') {
            const assinadoEmFormatado = portaria.assinadoEm 
                ? new Date(portaria.assinadoEm).toLocaleString('pt-BR') 
                : agora2.toLocaleString('pt-BR');
            
            const strTipo = portaria.assinaturaStatus === 'ASSINADA_DIGITAL' ? 'DIGITALMENTE' : 'MANUALMENTE';
            const blocoAssinatura = `
<div style="margin-top: 40px; padding: 15px; border: 1px solid #ddd; border-radius: 4px; font-family: sans-serif; font-size: 10pt; max-width: 450px; text-align: left; background-color: #fcfcfc;">
    <div style="font-weight: bold; margin-bottom: 5px; color: #333;">DOCUMENTO ASSINADO ${strTipo}</div>
    <div style="color: #444; margin-bottom: 3px;"><strong>Assinado por:</strong> ${(portaria as any).assinadoPor?.name || 'Autoridade'}</div>
    <div style="color: #444; margin-bottom: 3px;"><strong>Data e Hora:</strong> ${assinadoEmFormatado}</div>
    ${portaria.hashIntegridade ? `<div style="color: #666; font-size: 8pt; margin-top: 5px; word-break: break-all;"><strong>Hash de Autenticidade:</strong> ${portaria.hashIntegridade}</div>` : ''}
</div>`;
            
            if (html.includes('{{SYS_ASSINATURA}}')) {
                html = html.split('{{SYS_ASSINATURA}}').join(blocoAssinatura);
            } else {
                if (html.includes('</body>')) {
                    html = html.replace('</body>', blocoAssinatura + '</body>');
                } else {
                    html += '<br/><br/>' + blocoAssinatura;
                }
            }
        } else {
            html = html.split('{{SYS_ASSINATURA}}').join('');
        }

        const pdfResult = await PdfService.htmlToPdf(html)
        if (!pdfResult.ok) {
            return NextResponse.json({ error: `Falha na geração do PDF: ${pdfResult.error}` }, { status: 500 })
        }

        const filePath = `${portaria.secretariaId}/portaria_${portaria.id}_${Date.now()}.pdf`
        await StorageService.uploadBuffer(filePath, pdfResult.value, 'application/pdf')
        await prisma.portaria.update({ where: { id: portaria.id }, data: { pdfUrl: filePath } })

        const signedUrl = await StorageService.getSignedUrl(filePath)
        return NextResponse.json({ url: signedUrl })

    } catch (error: any) {
        console.error('[PDF Route] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao processar PDF' }, { status: 500 })
    }
}
