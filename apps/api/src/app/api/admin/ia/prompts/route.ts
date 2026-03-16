/**
 * API — Gerenciamento de Prompts de Treinamento da IA
 * Somente ADMIN_GERAL pode criar/listar/editar/excluir prompts.
 *
 * GET  /api/admin/ia/prompts   — Lista todos os prompts
 * POST /api/admin/ia/prompts   — Cria novo prompt
 *
 * Nota: usa $queryRaw porque o Prisma client ainda não inclui o modelo LlmPrompt
 * (pendente regeneração). A tabela já existe no banco via migration direta.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const criarPromptSchema = z.object({
    nome:      z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(120),
    categoria: z.enum(['SISTEMA', 'PORTARIA', 'REVISAO', 'CHAT_GERAL', 'MODELO', 'CUSTOM']),
    conteudo:  z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
    ativo:     z.boolean().optional().default(true),
    ordem:     z.number().int().min(0).optional().default(0),
})

export async function GET(req: NextRequest) {
    const usuario = await getAuthUser()
    if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (usuario.role !== 'ADMIN_GERAL') {
        return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoria = searchParams.get('categoria')
    const apenasAtivos = searchParams.get('ativos') === 'true'

    let prompts: any[]

    if (categoria && apenasAtivos) {
        prompts = await prisma.$queryRaw`
            SELECT p.*, u.name as "criadoPorNome"
            FROM "LlmPrompt" p
            LEFT JOIN "User" u ON u.id = p."criadoPorId"
            WHERE p.categoria = ${categoria} AND p.ativo = true
            ORDER BY p.ordem ASC, p."criadoEm" ASC
        `
    } else if (categoria) {
        prompts = await prisma.$queryRaw`
            SELECT p.*, u.name as "criadoPorNome"
            FROM "LlmPrompt" p
            LEFT JOIN "User" u ON u.id = p."criadoPorId"
            WHERE p.categoria = ${categoria}
            ORDER BY p.ordem ASC, p."criadoEm" ASC
        `
    } else if (apenasAtivos) {
        prompts = await prisma.$queryRaw`
            SELECT p.*, u.name as "criadoPorNome"
            FROM "LlmPrompt" p
            LEFT JOIN "User" u ON u.id = p."criadoPorId"
            WHERE p.ativo = true
            ORDER BY p.ordem ASC, p."criadoEm" ASC
        `
    } else {
        prompts = await prisma.$queryRaw`
            SELECT p.*, u.name as "criadoPorNome"
            FROM "LlmPrompt" p
            LEFT JOIN "User" u ON u.id = p."criadoPorId"
            ORDER BY p.ordem ASC, p."criadoEm" ASC
        `
    }

    // Formata para o frontend
    const data = prompts.map((p: any) => ({
        ...p,
        criadoPor: p.criadoPorNome ? { id: p.criadoPorId, name: p.criadoPorNome } : null,
    }))

    return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
    const usuario = await getAuthUser()
    if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (usuario.role !== 'ADMIN_GERAL') {
        return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    let body: any
    try { body = await req.json() } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const parsed = criarPromptSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }

    const id = randomUUID()
    const { nome, categoria, conteudo, ativo, ordem } = parsed.data
    const criadoPorId = usuario.id as string

    await prisma.$executeRaw`
        INSERT INTO "LlmPrompt" ("id", "nome", "categoria", "conteudo", "ativo", "ordem", "criadoPorId", "criadoEm", "atualizadoEm")
        VALUES (${id}, ${nome}, ${categoria}, ${conteudo}, ${ativo}, ${ordem}, ${criadoPorId}, NOW(), NOW())
    `

    const [prompt]: any[] = await prisma.$queryRaw`
        SELECT * FROM "LlmPrompt" WHERE id = ${id}
    `

    return NextResponse.json({ success: true, data: prompt }, { status: 201 })
}
