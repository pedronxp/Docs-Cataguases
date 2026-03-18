import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

const ADMIN_ROLES = ['ADMIN_GERAL', 'ADMIN']

function maskKey(key: string): string {
    const visible = key.slice(-4)
    const prefix = key.split('-').slice(0, 2).join('-')
    return `${prefix}-••••••••${visible}`
}

// GET — lista todas as chaves (nunca expõe a chave real)
export async function GET(_req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.role as string)) return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

    const keys = await prisma.llmApiKey.findMany({
        select: {
            id: true,
            provider: true,
            label: true,
            mask: true,
            ativo: true,
            requisicoes: true,
            tokensTotal: true,
            esgotada: true,
            esgotadaAte: true,
            criadoEm: true,
        },
        orderBy: { criadoEm: 'desc' },
    })

    // Auto-reativar chaves cujo cooldown já expirou
    const now = new Date()
    for (const key of keys) {
        if (key.esgotada && key.esgotadaAte && key.esgotadaAte < now) {
            key.esgotada = false
            key.esgotadaAte = null
            await prisma.llmApiKey.update({
                where: { id: key.id },
                data: { esgotada: false, esgotadaAte: null },
            })
        }
    }

    const groq = keys.filter(k => k.provider === 'groq')
    const openrouter = keys.filter(k => k.provider === 'openrouter')
    const cerebras = keys.filter(k => k.provider === 'cerebras')
    const mistral = keys.filter(k => k.provider === 'mistral')
    const kimi = keys.filter(k => k.provider === 'kimi')

    return NextResponse.json({
        keys,
        stats: {
            cerebras: {
                total: cerebras.length,
                ativas: cerebras.filter(k => k.ativo && !k.esgotada).length,
                esgotadas: cerebras.filter(k => k.esgotada).length,
            },
            mistral: {
                total: mistral.length,
                ativas: mistral.filter(k => k.ativo && !k.esgotada).length,
                esgotadas: mistral.filter(k => k.esgotada).length,
            },
            groq: {
                total: groq.length,
                ativas: groq.filter(k => k.ativo && !k.esgotada).length,
                esgotadas: groq.filter(k => k.esgotada).length,
            },
            openrouter: {
                total: openrouter.length,
                ativas: openrouter.filter(k => k.ativo && !k.esgotada).length,
                esgotadas: openrouter.filter(k => k.esgotada).length,
            },
            kimi: {
                total: kimi.length,
                ativas: kimi.filter(k => k.ativo && !k.esgotada).length,
                esgotadas: kimi.filter(k => k.esgotada).length,
            },
        },
    })
}

// POST — adiciona nova chave
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!ADMIN_ROLES.includes(session.role as string)) return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

    let body: any
    try { body = await req.json() } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
    }

    const { provider, label, key } = body

    if (!provider || !['groq', 'openrouter', 'cerebras', 'mistral', 'kimi'].includes(provider)) {
        return NextResponse.json({ error: 'Provider inválido. Use "cerebras", "mistral", "groq", "openrouter" ou "kimi".' }, { status: 400 })
    }
    if (!label || label.trim().length < 3) {
        return NextResponse.json({ error: 'Label deve ter pelo menos 3 caracteres.' }, { status: 400 })
    }
    if (!key || key.trim().length < 10) {
        return NextResponse.json({ error: 'API Key inválida.' }, { status: 400 })
    }

    const trimmedKey = key.trim()
    const mask = maskKey(trimmedKey)

    try {
        const created = await prisma.llmApiKey.create({
            data: {
                provider,
                label: label.trim(),
                keyEncrypted: trimmedKey,
                mask,
            },
            select: { id: true, provider: true, label: true, mask: true, ativo: true, criadoEm: true },
        })
        return NextResponse.json({ success: true, key: created }, { status: 201 })
    } catch (err: any) {
        if (err.code === 'P2002') {
            return NextResponse.json({ error: 'Essa API Key já está cadastrada.' }, { status: 409 })
        }
        console.error('[LLM Keys] Erro ao criar chave:', err)
        return NextResponse.json({ error: 'Erro interno ao salvar chave.' }, { status: 500 })
    }
}
