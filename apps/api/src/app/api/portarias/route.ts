import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'

export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const {
            titulo,
            descricao,
            modeloId,
            formData,
            secretariaId,
            setorId,
            submetido = false
        } = body

        // 1. Cria a portaria no banco
        const portaria = await prisma.portaria.create({
            data: {
                titulo,
                descricao,
                modeloId,
                formData,
                secretariaId: secretariaId || (session as any).secretariaId,
                setorId: setorId || (session as any).setorId,
                criadoPorId: session.id as string,
                status: submetido ? 'PROCESSANDO' : 'RASCUNHO',
            },
        })

        // 2. Se for submetida, aloca o número oficial imediatamente
        if (submetido) {
            const result = await NumeracaoService.alocarNumero(
                portaria.secretariaId,
                portaria.setorId
            )

            if (result.ok) {
                const portariaAtualizada = await prisma.portaria.update({
                    where: { id: portaria.id },
                    data: {
                        numeroOficial: result.value,
                    },
                })

                return NextResponse.json({
                    success: true,
                    data: portariaAtualizada,
                })
            } else {
                // Se falhar a numeração, mantemos a portaria mas avisamos o erro
                return NextResponse.json({
                    success: true,
                    data: portaria,
                    warning: 'Portaria criada, mas houve um erro ao gerar o número oficial. O sistema tentará gerar novamente em breve.',
                })
            }
        }

        return NextResponse.json({
            success: true,
            data: portaria,
        })
    } catch (error) {
        console.error('Erro ao criar portaria:', error)
        return NextResponse.json(
            { success: false, error: 'Erro interno ao criar portaria' },
            { status: 500 }
        )
    }
}

export async function GET(request: Request) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const portarias = await prisma.portaria.findMany({
            where: {
                ...(status && { status: status as any }),
                // Operadores só veem suas próprias portarias ou de sua secretaria
                ...(session.role === 'OPERADOR' && {
                    OR: [
                        { criadoPorId: session.id as string },
                        { secretariaId: (session as any).secretariaId },
                    ],
                }),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                criadoPor: {
                    select: { name: true, email: true },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: portarias,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao listar portarias' },
            { status: 500 }
        )
    }
}
