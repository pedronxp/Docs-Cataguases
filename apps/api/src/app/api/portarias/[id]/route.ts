import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        const portaria = await prisma.portaria.findUnique({
            where: { id },
            include: {
                criadoPor: {
                    select: { name: true, email: true },
                },
                secretaria: {
                    select: { nome: true, sigla: true },
                },
                modelo: {
                    select: {
                        id: true,
                        nome: true,
                        conteudoHtml: true,
                        variaveis: {
                            orderBy: { ordem: 'asc' },
                            select: { chave: true, label: true, tipo: true, ordem: true }
                        }
                    }
                },
                atividades: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        autor: { select: { name: true, username: true } }
                    }
                }
            },
        })

        if (!portaria) {
            return NextResponse.json(
                { success: false, error: 'Portaria não encontrada' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: portaria,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar portaria' },
            { status: 500 }
        )
    }
}

// Campos que o autor pode editar enquanto a portaria está em rascunho ou correção
const CAMPOS_EDITAVEIS_AUTOR = ['titulo', 'descricao', 'formData', 'docxRascunhoUrl'] as const
// Campos extras que o admin pode atualizar (ex: subir URL do PDF manualmente)
const CAMPOS_EDITAVEIS_ADMIN = [...CAMPOS_EDITAVEIS_AUTOR, 'pdfUrl', 'status'] as const

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const role = (session as any).role as string
        const userId = (session as any).id as string

        const portaria = await prisma.portaria.findUnique({ where: { id } })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        // Apenas o autor edita a própria portaria (salvo admin)
        if (role !== 'ADMIN_GERAL' && portaria.criadoPorId !== userId) {
            return NextResponse.json({ success: false, error: 'Sem permissão para editar esta portaria' }, { status: 403 })
        }

        // Só é editável em estados abertos
        const estadosEditaveis = ['RASCUNHO', 'CORRECAO_NECESSARIA']
        if (role !== 'ADMIN_GERAL' && !estadosEditaveis.includes(portaria.status)) {
            return NextResponse.json({ success: false, error: `Portaria não pode ser editada no status "${portaria.status}"` }, { status: 400 })
        }

        // Whitelist de campos por role
        const camposPermitidos = (role === 'ADMIN_GERAL' ? CAMPOS_EDITAVEIS_ADMIN : CAMPOS_EDITAVEIS_AUTOR) as readonly string[]
        const dadosFiltrados = Object.fromEntries(
            Object.entries(body).filter(([key]) => camposPermitidos.includes(key))
        )

        if (Object.keys(dadosFiltrados).length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum campo válido para atualizar' }, { status: 400 })
        }

        const atualizada = await prisma.portaria.update({
            where: { id },
            data: dadosFiltrados,
        })

        return NextResponse.json({ success: true, data: atualizada })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao atualizar portaria' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()

        if (!session || !['ADMIN', 'GESTOR'].includes(session.role)) {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params

        // Só permite excluir rascunhos e documentos com falha — nunca publicados
        const portaria = await prisma.portaria.findUnique({ where: { id }, select: { status: true } })
        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        const statusPermitidos = ['RASCUNHO', 'FALHA_PROCESSAMENTO']
        if (!statusPermitidos.includes(portaria.status)) {
            return NextResponse.json(
                { success: false, error: `Portarias com status "${portaria.status}" não podem ser excluídas. Documentos publicados ou em fluxo são registros oficiais.` },
                { status: 422 }
            )
        }

        await prisma.portaria.delete({ where: { id } })

        return NextResponse.json({ success: true, message: 'Portaria excluída com sucesso' })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao excluir portaria' },
            { status: 500 }
        )
    }
}
