import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { WorkflowService } from '@/services/workflow.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/workflow
 * Lista workflows configurados + workflow padrão.
 */
export async function GET(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const url = new URL(request.url)
        const tipoDocumento = url.searchParams.get('tipo') || 'PORTARIA'
        const secretariaId = url.searchParams.get('secretariaId') || undefined

        // Se pede workflow específico, retorna ele
        if (url.searchParams.get('mapa') === 'true') {
            const result = await WorkflowService.obterMapaVisual(tipoDocumento, secretariaId)
            if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
            return NextResponse.json({ success: true, data: result.value })
        }

        // Lista todos os workflows
        const result = await WorkflowService.listarWorkflows()
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

        return NextResponse.json({
            success: true,
            data: {
                workflows: result.value,
                padrao: WorkflowService.getWorkflowPadrao(),
            }
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar workflows' }, { status: 500 })
    }
}

/**
 * POST /api/admin/workflow
 * Salva workflow customizado (apenas ADMIN_GERAL).
 */
export async function POST(request: Request) {
    try {
        const usuario = await getAuthUser()
        if (!usuario || (usuario as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ error: 'Apenas administradores podem configurar workflows' }, { status: 403 })
        }

        const body = await request.json()
        const result = await WorkflowService.salvarWorkflow(body)

        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
        return NextResponse.json({ success: true, data: result.value })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao salvar workflow' }, { status: 500 })
    }
}
