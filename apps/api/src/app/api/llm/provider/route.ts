import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setActiveProvider, getActiveProvider, type LLMProvider } from '@/services/llm.service'

// GET /api/llm/provider — retorna provider ativo
export async function GET(_req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    return NextResponse.json({ activeProvider: getActiveProvider() })
}

// PATCH /api/llm/provider — troca o provider ativo (só ADMIN)
export async function PATCH(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    if (!['ADMIN_GERAL', 'ADMIN'].includes(session.role as string)) {
        return NextResponse.json({ error: 'Apenas administradores podem trocar o provider LLM.' }, { status: 403 })
    }

    let body: any
    try { body = await req.json() } catch {
        return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const { provider } = body
    if (!['groq', 'openrouter', 'cerebras'].includes(provider)) {
        return NextResponse.json({ error: 'Provider inválido. Use "groq", "openrouter" ou "cerebras".' }, { status: 400 })
    }

    setActiveProvider(provider as LLMProvider)
    return NextResponse.json({ success: true, activeProvider: provider })
}
