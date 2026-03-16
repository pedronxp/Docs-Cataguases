import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Prisma } from '@prisma/client'

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
                tipoDocumento: data.tipoDocumento || 'PORTARIA',
                formato_base: data.formato_base || "PORT-{N}/CATAGUASES",
                proximo_numero: Number(data.proximo_numero) || 1,
                numero_inicial: Number(data.numero_inicial) || 1,
                ativo: data.ativo ?? true
            },
        })

        return NextResponse.json({
            success: true,
            data: livro,
        })
    } catch (error) {
        console.error('Erro ao criar livro:', error)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { success: false, error: 'Já existe um livro com esse nome. Escolha um nome diferente.' },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { success: false, error: 'Erro ao criar livro de numeração' },
            { status: 500 }
        )
    }
}

/**
 * DELETE: Remove um livro de numeração
 * Proteção: não permite excluir livros que já emitiram numerações (proximo_numero > numero_inicial)
 */
export async function DELETE(request: Request) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Apenas Administradores podem excluir livros' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ success: false, error: 'ID do livro é obrigatório' }, { status: 400 })

        const livro = await prisma.livrosNumeracao.findUnique({ where: { id } })
        if (!livro) return NextResponse.json({ success: false, error: 'Livro não encontrado' }, { status: 404 })

        if (livro.proximo_numero > livro.numero_inicial) {
            return NextResponse.json(
                { success: false, error: `Este livro já emitiu ${livro.proximo_numero - livro.numero_inicial} numeração(ões). Não é possível excluí-lo para preservar a integridade do histórico. Desative-o em vez disso.` },
                { status: 409 }
            )
        }

        await prisma.livrosNumeracao.delete({ where: { id } })

        return NextResponse.json({ success: true, data: { id } })
    } catch (error) {
        console.error('Erro ao excluir livro:', error)
        return NextResponse.json({ success: false, error: 'Erro ao excluir livro de numeração' }, { status: 500 })
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

        const { id, pinSeguranca, ...data } = await request.json()
        if (!id) return NextResponse.json({ success: false, error: 'ID do livro é obrigatório' }, { status: 400 })

        const livroAtual = await prisma.livrosNumeracao.findUnique({ where: { id } })
        if (!livroAtual) return NextResponse.json({ success: false, error: 'Livro não encontrado' }, { status: 404 })

        // Se o próximo número for alterado, validar PIN
        if (data.proximo_numero !== undefined && Number(data.proximo_numero) !== livroAtual.proximo_numero) {
            const user = await prisma.user.findUnique({ where: { id: session.id as string } })
            if (!user?.pinSeguranca || user.pinSeguranca !== pinSeguranca) {
                return NextResponse.json({ success: false, error: 'PIN de Segurança inválido. Confirme o Token no seu Perfil.' }, { status: 403 })
            }
        }

        const livro = await prisma.livrosNumeracao.update({
            where: { id },
            data: {
                nome: data.nome,
                formato_base: data.formato_base,
                proximo_numero: data.proximo_numero !== undefined ? Number(data.proximo_numero) : undefined,
                ativo: data.ativo,
                tipoDocumento: data.tipoDocumento
            }
        })

        return NextResponse.json({ success: true, data: livro })
    } catch (error) {
        console.error('Erro ao atualizar livro:', error)
        return NextResponse.json({ success: false, error: 'Erro ao atualizar livro' }, { status: 500 })
    }
}
