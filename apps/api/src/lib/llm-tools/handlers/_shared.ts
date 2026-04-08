import prisma from '@/lib/prisma'

// ── Cache server-side para análise de DOCX (reexportado do módulo central) ──
// Definido aqui para evitar dependência circular entre handlers e llm-tools.ts
const docxAnaliseCache = new Map<string, { conteudoHtml: string; variaveis: any[]; timestamp: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutos

export function setDocxAnalise(userId: string, data: { conteudoHtml: string; variaveis: any[] }) {
    docxAnaliseCache.set(userId, { ...data, timestamp: Date.now() })
    setTimeout(() => docxAnaliseCache.delete(userId), CACHE_TTL_MS)
}

export function getDocxAnalise(userId: string) {
    const cached = docxAnaliseCache.get(userId)
    if (!cached) return null
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        docxAnaliseCache.delete(userId)
        return null
    }
    return { conteudoHtml: cached.conteudoHtml, variaveis: cached.variaveis }
}

export function clearDocxAnalise(userId: string) {
    docxAnaliseCache.delete(userId)
}

export type ToolContext = {
    userAuth?: { nome: string; email: string; role?: string }
    secretariaId?: string
    setorId?: string
}

// ── Helper: verificar permissão do usuário ─────────────────────────────────────
export async function verificarPermissao(
    email: string,
    rolesPermitidos: string[]
): Promise<{ ok: boolean; user?: any; erro?: string }> {
    const user = await prisma.user.findFirst({
        where: { email, ativo: true },
    })
    if (!user) {
        return { ok: false, erro: `Usuário com e-mail "${email}" não encontrado no sistema ou inativo.` }
    }
    if (!rolesPermitidos.includes(user.role)) {
        return {
            ok: false,
            erro: `Ação negada. Seu cargo é "${user.role}", mas esta ação exige um dos seguintes: ${rolesPermitidos.join(', ')}.`,
        }
    }
    return { ok: true, user }
}

// ── Helper: registrar ação do assistente de IA no feed de auditoria ──────────
export async function logAcaoIA(
    autorId: string,
    mensagem: string,
    secretariaId?: string,
    metadata?: Record<string, unknown>
) {
    try {
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: 'ACAO_ASSISTENTE_IA',
                mensagem,
                autorId,
                secretariaId: secretariaId ?? null,
                metadata: (metadata ?? {}) as object,
            },
        })
    } catch (e) {
        // Log de auditoria nunca deve quebrar a operação principal
        console.warn('[LLM Tools] Falha ao registrar log de auditoria:', e)
    }
}

export { prisma }
