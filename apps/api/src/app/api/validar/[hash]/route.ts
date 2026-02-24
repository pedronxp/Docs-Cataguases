import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
/**
 * GET /api/validar/[hash]
 * Rota pública para validação de autenticidade de documentos.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params

        if (!hash || hash.length !== 64) {
            return NextResponse.json({
                success: false,
                status: 'INVALIDO',
                error: 'Hash de validação malformado.'
            }, { status: 400 })
        }

        const portaria = await prisma.portaria.findFirst({
            where: { hashIntegridade: hash },
            include: {
                secretaria: {
                    select: { nome: true }
                }
            }
        })

        if (!portaria) {
            return NextResponse.json({
                success: false,
                status: 'NAO_ENCONTRADO',
                error: 'Documento não encontrado ou hash inválido.'
            }, { status: 404 })
        }

        // Retorna dados públicos do documento
        return NextResponse.json({
            success: true,
            data: {
                status: 'VALIDO',
                titulo: portaria.titulo,
                numeroOficial: portaria.numeroOficial,
                dataPublicacao: portaria.dataPublicacao || portaria.updatedAt,
                secretaria: portaria.secretaria.nome,
                isPublicado: portaria.status === 'PUBLICADA'
            }
        })
    } catch (error) {
        console.error('Erro na validação pública:', error)
        return NextResponse.json({
            success: false,
            error: 'Erro interno ao validar documento.'
        }, { status: 500 })
    }
}
