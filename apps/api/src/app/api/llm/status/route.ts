import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLLMStats, fetchOpenRouterCredits } from '@/services/llm.service'

export async function GET(_req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Atualizar créditos do OpenRouter de forma não-bloqueante
    fetchOpenRouterCredits().catch(() => {})

    return NextResponse.json(getLLMStats())
}
