import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const modelos = await prisma.modeloDocumento.findMany({
            include: {
                variaveis: {
                    orderBy: { ordem: 'asc' }
                }
            },
            orderBy: { nome: 'asc' }
        })

        return NextResponse.json({ success: true, data: modelos })
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao listar modelos' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'PREFEITO')) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { nome, descricao, docxTemplateUrl, secretariaId, variaveis } = body

        const modelo = await prisma.modeloDocumento.create({
            data: {
                nome,
                descricao,
                docxTemplateUrl,
                secretariaId,
                ativo: true,
                variaveis: {
                    create: variaveis.map((v: any, index: number) => ({
                        chave: v.chave,
                        label: v.label,
                        tipo: v.tipo || 'texto',
                        opcoes: v.opcoes || [],
                        obrigatorio: v.obrigatorio ?? true,
                        ordem: v.ordem ?? index,
                    }))
                }
            },
            include: {
                variaveis: true
            }
        })

        return NextResponse.json({ success: true, data: modelo })
    } catch (error) {
        console.error('Erro ao criar modelo:', error)
        return NextResponse.json({ success: false, error: 'Erro ao criar modelo' }, { status: 500 })
    }
}
