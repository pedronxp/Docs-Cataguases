import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { StorageService } from '@/services/storage.service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/portarias/[id]/upload-assinado
 *
 * Recebe um arquivo PDF já assinado digitalmente (via Adobe, ICP-Brasil, GOV.BR etc.)
 * e o salva no Supabase Storage, atualizando o pdfUrl da portaria.
 *
 * O usuário deve:
 * 1. Baixar o PDF original via /stream?type=pdf
 * 2. Assinar digitalmente no software de sua preferência
 * 3. Fazer upload do PDF assinado nesta rota
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rawSession = await getSession()
        if (!rawSession) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        const session = rawSession as any

        // Apenas assinantes podem fazer upload
        if (!['SECRETARIO', 'ADMIN_GERAL', 'PREFEITO'].includes(session.role)) {
            return NextResponse.json({ error: 'Sem permissão para registrar assinatura' }, { status: 403 })
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            select: { id: true, status: true, titulo: true, secretariaId: true }
        })

        if (!portaria) {
            return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })
        }

        if (portaria.status !== 'AGUARDANDO_ASSINATURA') {
            return NextResponse.json({
                error: 'A portaria não está aguardando assinatura'
            }, { status: 400 })
        }

        const formData = await req.formData()
        const file = formData.get('pdf') as File | null
        const justificativa = (formData.get('justificativa') as string | null) || ''

        if (!file) {
            return NextResponse.json({ error: 'Arquivo PDF não enviado' }, { status: 400 })
        }

        const extensao = file.name.split('.').pop()?.toLowerCase()
        if (extensao !== 'pdf') {
            return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos' }, { status: 400 })
        }

        // Limite de 50MB para PDF assinado
        const MAX_SIZE = 50 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'O arquivo PDF não pode exceder 50MB' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Calcula hash SHA-256 do PDF assinado (integridade)
        const hashIntegridade = crypto.createHash('sha256').update(buffer).digest('hex')

        // Salva o PDF assinado no Supabase Storage
        const path = `portarias/${id}/assinado-${Date.now()}.pdf`
        await StorageService.uploadBuffer(path, buffer, 'application/pdf')

        // Atualiza a portaria: status → PRONTO_PUBLICACAO, salva pdfUrl do assinado
        const nomeResponsavel = session.name || session.username || 'Responsável'
        const atualizada = await prisma.$transaction(async (tx) => {
            const p = await tx.portaria.update({
                where: { id },
                data: {
                    pdfUrl: path,
                    hashIntegridade,
                    assinaturaStatus: 'ASSINADA_DIGITAL',
                    assinaturaJustificativa: justificativa || null,
                    status: 'PRONTO_PUBLICACAO',
                    assinadoPorId: session.id,
                    assinadoEm: new Date(),
                }
            })

            // Cria entrada na fila do Jornal
            await tx.jornalQueue.upsert({
                where: { portariaId: id },
                create: { portariaId: id },
                update: { status: 'PENDENTE', updatedAt: new Date() }
            })

            await tx.feedAtividade.create({
                data: {
                    tipoEvento: 'ASSINATURA_DIGITAL',
                    mensagem: `PDF assinado digitalmente por ${nomeResponsavel} (${session.role}) e enviado ao sistema. Hash: ${hashIntegridade.substring(0, 16)}...`,
                    portariaId: id,
                    autorId: session.id,
                    secretariaId: portaria.secretariaId,
                    metadata: {
                        tipoAssinatura: 'DIGITAL_PDF',
                        hashIntegridade,
                        tamanhoArquivo: file.size,
                        registradoPor: session.id
                    }
                }
            })

            return p
        }, { timeout: 15000 })

        return NextResponse.json({
            success: true,
            data: atualizada,
            hashIntegridade
        })

    } catch (error: any) {
        console.error('[upload-assinado]', error)
        return NextResponse.json(
            { error: error.message || 'Erro ao processar PDF assinado' },
            { status: 500 }
        )
    }
}
