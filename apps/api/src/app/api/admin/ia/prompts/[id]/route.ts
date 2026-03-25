/**
 * API — Operações em prompt específico
 *
 * GET    /api/admin/ia/prompts/:id   — Detalhe
 * PATCH  /api/admin/ia/prompts/:id   — Atualiza
 * DELETE /api/admin/ia/prompts/:id   — Remove
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const atualizarPromptSchema = z.object({
    nome:      z.string().min(3).max(120).optional(),
    categoria: z.enum(['SISTEMA', 'PORTARIA', 'REVISAO', 'CHAT_GERAL', 'MODELO', 'CUSTOM']).optional(),
    conteudo:  z.string().min(10).optional(),
    ativo:     z.boolean().optional(),
    ordem:     z.number().int().min(0).optional(),
})

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const usuario = await getAuthUser()
    if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (usuario.role !== 'ADMIN_GERAL') {
        return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const [prompt]: any[] = await prisma.$queryRaw`
        SELECT p.*, u.name as "criadoPorNome"
        FROM "LlmPrompt" p
        LEFT JOIN "User" u ON u.id = p."criadoPorId"
        WHERE p.id = ${id}
    `;
    if (!prompt) return NextResponse.json({ error: 'Prompt não encontrado' }, { status: 404 });

    return NextResponse.json({
        success: true,
        data: { ...prompt, criadoPor: prompt.criadoPorNome ? { id: prompt.criadoPorId, name: prompt.criadoPorNome } : null }
    })
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const usuario = await getAuthUser()
    if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (usuario.role !== 'ADMIN_GERAL') {
        return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    let body: any
    try { body = await req.json() } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const parsed = atualizarPromptSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    // Verifica se existe
    const [existente]: any[] = await prisma.$queryRaw`SELECT id FROM "LlmPrompt" WHERE id = ${id}`;
    if (!existente) return NextResponse.json({ error: 'Prompt não encontrado' }, { status: 404 });

    const { nome, categoria, conteudo, ativo, ordem } = parsed.data

    // Monta SET dinâmico manualmente (prisma $queryRaw não suporta SET dinâmico facilmente)
    const sets: string[] = ['\"atualizadoEm\" = NOW()']
    const values: any[] = []

    if (nome      !== undefined) { sets.push(`\"nome\" = $${values.length + 1}`);      values.push(nome) }
    if (categoria !== undefined) { sets.push(`\"categoria\" = $${values.length + 1}`); values.push(categoria) }
    if (conteudo  !== undefined) { sets.push(`\"conteudo\" = $${values.length + 1}`);  values.push(conteudo) }
    if (ativo     !== undefined) { sets.push(`\"ativo\" = $${values.length + 1}`);     values.push(ativo) }
    if (ordem     !== undefined) { sets.push(`\"ordem\" = $${values.length + 1}`);     values.push(ordem) }

    values.push(id) // para o WHERE

    // Usa queryRawUnsafe para SET dinâmico (seguro pois os valores são parametrizados)
    await prisma.$executeRawUnsafe(
        `UPDATE "LlmPrompt" SET ${sets.join(', ')} WHERE "id" = $${values.length}`,
        ...values
    )

    const [updated]: any[] = await prisma.$queryRaw`SELECT * FROM "LlmPrompt" WHERE id = ${id}`;
    return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const usuario = await getAuthUser()
    if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (usuario.role !== 'ADMIN_GERAL') {
        return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const [existente]: any[] = await prisma.$queryRaw`SELECT id, nome FROM "LlmPrompt" WHERE id = ${id}`;
    if (!existente) return NextResponse.json({ error: 'Prompt não encontrado' }, { status: 404 });

    await prisma.$executeRaw`DELETE FROM "LlmPrompt" WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Prompt excluído com sucesso' })
}
