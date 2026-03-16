import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { AssinaturaICPService } from '@/services/assinatura-icp.service'
import { StorageService, supabaseAdmin } from '@/services/storage.service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/assinatura-icp
 * Assina um documento com certificado ICP-Brasil.
 *
 * Body JSON: { portariaId, certificadoBase64, senhaCertificado, usarCarimboDeTempo? }
 */
export async function POST(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const role = (usuario as any).role
        if (!['PREFEITO', 'SECRETARIO', 'ADMIN_GERAL'].includes(role)) {
            return NextResponse.json({ error: 'Apenas autoridades podem assinar documentos.' }, { status: 403 })
        }

        const body = await request.json()
        const { portariaId, certificadoBase64, senhaCertificado, usarCarimboDeTempo } = body

        if (!portariaId) return NextResponse.json({ error: 'portariaId obrigatório' }, { status: 400 })
        if (!certificadoBase64) return NextResponse.json({ error: 'Certificado digital não enviado' }, { status: 400 })

        // Baixar o PDF da portaria do storage
        const portaria = await (await import('@/lib/prisma')).default.portaria.findUnique({
            where: { id: portariaId },
            select: { pdfUrl: true, status: true }
        })

        if (!portaria) return NextResponse.json({ error: 'Portaria não encontrada' }, { status: 404 })
        if (!portaria.pdfUrl) return NextResponse.json({ error: 'PDF ainda não foi gerado para esta portaria' }, { status: 400 })

        if (!['AGUARDANDO_ASSINATURA', 'PRONTO_PUBLICACAO'].includes(portaria.status)) {
            return NextResponse.json({
                error: `Portaria não está em status válido para assinatura (atual: ${portaria.status})`
            }, { status: 400 })
        }

        // Baixar PDF do storage
        const safePath = StorageService.sanitizePath(portaria.pdfUrl)
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
            .from('portarias')
            .download(safePath)

        if (downloadError || !blob) {
            return NextResponse.json({ error: 'Erro ao baixar PDF do storage' }, { status: 500 })
        }

        const pdfBuffer = Buffer.from(await blob.arrayBuffer())

        // Executar assinatura ICP-Brasil
        const result = await AssinaturaICPService.assinarDocumento({
            portariaId,
            pdfBuffer,
            usuarioId: (usuario as any).id,
            config: {
                certificadoBase64,
                senhaCertificado,
                usarCarimboDeTempo: usarCarimboDeTempo ?? true,
                tsaUrl: process.env.TSA_URL,
            }
        })

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            data: {
                id: result.value.id,
                padrao: result.value.padraoAssinatura,
                algoritmo: result.value.algoritmo,
                certificado: {
                    titular: result.value.certificado.titular.nome,
                    emissor: result.value.certificado.emissor.nome,
                    tipo: result.value.certificado.tipo,
                    cadeia: result.value.certificado.cadeia,
                    valido: result.value.certificado.status === 'VALIDO',
                },
                hash: result.value.hashDocumento,
                carimboDeTempo: result.value.carimboDeTempo,
                dataAssinatura: result.value.dataAssinatura,
            }
        })
    } catch (error: any) {
        console.error('[AssinaturaICP API] Erro:', error)
        return NextResponse.json({ error: 'Erro interno na assinatura digital' }, { status: 500 })
    }
}

/**
 * GET /api/assinatura-icp?portariaId=xxx
 * Verifica assinatura e lista assinaturas de uma portaria.
 */
export async function GET(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const url = new URL(request.url)
        const portariaId = url.searchParams.get('portariaId')

        if (!portariaId) return NextResponse.json({ error: 'portariaId obrigatório' }, { status: 400 })

        const result = await AssinaturaICPService.listarAssinaturas(portariaId)
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
    }
}
