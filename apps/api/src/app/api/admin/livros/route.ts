import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET: Lista todos os livros de numeração
 */
export async function GET() {
    try {
        const session = await getSession()

        if (!session || (session.role !== 'ADMIN_GERAL' && session.role !== 'SECRETARIO')) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const livros = await prisma.livrosNumeracao.findMany({
            orderBy: { criado_em: 'desc' },
        })

        return NextResponse.json({
            success: true,
            data: livros,
        })
    } catch (error) {
        console.error('Erro ao listar livros:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao listar livros de numeração' },
            { status: 500 }
        )
    }
}

/**
 * POST: Cria um novo livro de numeração
 */
export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Apenas Administradores podem criar livros' },
                { status: 403 }
            )
        }

        const data = await request.json()

        const livro = await prisma.livrosNumeracao.create({
            data: {
                nome: data.nome || "Novo Livro de Numeração",
                formato_base: data.formato_base || "PORT-{N}/CATAGUASES",
                proximo_numero: Number(data.proximo_numero) || 1,
                numero_inicial: Number(data.numero_inicial) || 1,
                tipos_suportados: data.tipos_suportados || { PORTARIA: 1 },
                ativo: data.ativo ?? true
            },
        })

        return NextResponse.json({
            success: true,
            data: livro,
        })
    } catch (error) {
        console.error('Erro ao criar livro:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao criar livro de numeração' },
            { status: 500 }
        )
    }
}

/**
 * PATCH: Atualiza configurações de um livro (Reset contador, Mudar status)
 */
export async function PATCH(request: Request) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const { id, ...data } = await request.json()
        if (!id) return NextResponse.json({ success: false, error: 'ID do livro é obrigatório' }, { status: 400 })

        const livro = await prisma.livrosNumeracao.update({
            where: { id },
            data: {
                nome: data.nome,
                formato_base: data.formato_base,
                proximo_numero: data.proximo_numero !== undefined ? Number(data.proximo_numero) : undefined,
                ativo: data.ativo,
                tipos_suportados: data.tipos_suportados
            }
        })

        return NextResponse.json({ success: true, data: livro })
    } catch (error) {
        console.error('Erro ao atualizar livro:', error)
        return NextResponse.json({ success: false, error: 'Erro ao atualizar livro' }, { status: 500 })
    }
}
