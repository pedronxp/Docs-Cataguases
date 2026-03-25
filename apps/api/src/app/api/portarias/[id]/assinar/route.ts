import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { StorageService } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

interface SessionPayload {
    id: string
    role: string
    name?: string
    username?: string
    secretariaId?: string
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as unknown as SessionPayload

        if (!['SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'].includes(session.role as string)) {
            return NextResponse.json({ success: false, error: 'Sem permissão para registrar assinatura' }, { status: 403 })
        }

        const body = await request.json()
        const { tipoAssinatura, justificativa, comprovanteBase64, comprovanteNome } = body
        const { id } = await params

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        if (portaria.status !== 'AGUARDANDO_ASSINATURA') {
            return NextResponse.json({
                success: false,
                error: 'A portaria não está aguardando assinatura'
            }, { status: 400 })
        }

        const validTypes = ['DIGITAL', 'MANUAL', 'DISPENSADA']
        if (!validTypes.includes(tipoAssinatura)) {
            return NextResponse.json({ success: false, error: 'Tipo de assinatura inválido' }, { status: 400 })
        }

        // Justificativa obrigatória para exceções
        if ((tipoAssinatura === 'MANUAL' || tipoAssinatura === 'DISPENSADA') && !justificativa?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Justificativa é obrigatória para assinatura manual ou dispensada'
            }, { status: 400 })
        }

        // Validação de tamanho do comprovante base64 (máx. 10MB decodificados ≈ ~13.6MB em base64)
        // SEGURANÇA: sem essa validação, um payload malicioso pode causar OOM antes do Buffer.from().
        if (comprovanteBase64) {
            const COMPROVANTE_MAX_B64_CHARS = 14 * 1024 * 1024 // ~10MB decodificados
            if (typeof comprovanteBase64 !== 'string' || comprovanteBase64.length > COMPROVANTE_MAX_B64_CHARS) {
                return NextResponse.json({
                    success: false,
                    error: 'O comprovante excede o tamanho máximo de 10MB'
                }, { status: 400 })
            }
            // Validação de extensão permitida
            if (comprovanteNome) {
                const ext = String(comprovanteNome).split('.').pop()?.toLowerCase()
                const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg']
                if (!ext || !ALLOWED_EXTS.includes(ext)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Tipo de arquivo inválido. Use PDF, PNG ou JPG.'
                    }, { status: 400 })
                }
            }
        }

        // Comprovante obrigatório para assinatura manual
        if (tipoAssinatura === 'MANUAL' && !comprovanteBase64) {
            return NextResponse.json({
                success: false,
                error: 'O anexo do documento assinado é obrigatório para assinatura manual'
            }, { status: 400 })
        }

        const nomeResponsavel = session.name || session.username || 'Responsável'

        // Upload do comprovante para Supabase Storage (se fornecido)
        let comprovanteUrl: string | undefined
        if (comprovanteBase64 && comprovanteNome) {
            try {
                const ext = comprovanteNome.split('.').pop()?.toLowerCase() || 'pdf'
                const contentType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`
                const path = `portarias/${id}/comprovante-assinatura-${Date.now()}.${ext}`
                const buffer = Buffer.from(comprovanteBase64, 'base64')
                await StorageService.uploadBuffer(path, buffer, contentType)
                comprovanteUrl = path
            } catch (uploadErr: any) {
                console.error('[/assinar] Erro ao fazer upload do comprovante:', uploadErr.message)
                // Não bloqueia o fluxo — registra sem o comprovante
            }
        }

        // Define status e mensagem de log por tipo
        let assinaturaStatus: string
        let msgLog: string

        if (tipoAssinatura === 'DIGITAL') {
            assinaturaStatus = 'ASSINADA_DIGITAL'
            msgLog = `Portaria assinada digitalmente por ${nomeResponsavel} (${session.role}) em ${new Date().toLocaleString('pt-BR')}.`
        } else if (tipoAssinatura === 'MANUAL') {
            assinaturaStatus = 'ASSINADA_MANUAL'
            msgLog = `Portaria marcada como assinada manualmente. Responsável pelo registro: ${nomeResponsavel} (${session.role}). Justificativa: "${justificativa}".${comprovanteUrl ? ' Comprovante digitalizado anexado.' : ' Nenhum comprovante anexado.'}`
        } else {
            assinaturaStatus = 'DISPENSADA_COM_JUSTIFICATIVA'
            msgLog = `Assinatura dispensada por decisão formal. Registrado por: ${nomeResponsavel} (${session.role}). Justificativa: "${justificativa}".${comprovanteUrl ? ' Despacho/ato formal anexado.' : ''}`
        }

        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: {
                    assinaturaStatus,
                    assinaturaJustificativa: justificativa || null,
                    assinaturaComprovanteUrl: comprovanteUrl || null,
                    status: 'PRONTO_PUBLICACAO',
                    assinadoPorId: session.id,
                    assinadoEm: new Date(),
                    pdfUrl: null, // Clear cached pdf so it can be regenerated with signature
                    docxRascunhoUrl: null
                }
            })

            // Cria entrada na fila do Jornal (upsert para evitar duplicata)
            await tx.jornalQueue.upsert({
                where: { portariaId: id },
                create: { portariaId: id },
                update: { status: 'PENDENTE', updatedAt: new Date() }
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: `ASSINATURA_${tipoAssinatura}`,
                    mensagem: msgLog,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId,
                    metadata: {
                        tipoAssinatura,
                        temComprovante: !!comprovanteUrl,
                        registradoPor: session.id
                    }
                }
            })

            return p
        }, { timeout: 15000, maxWait: 10000 })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error: any) {
        console.error('[/assinar]', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao registrar assinatura' },
            { status: 500 }
        )
    }
}
