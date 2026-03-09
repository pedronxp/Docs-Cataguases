import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { UsuarioService } from '@/services/usuario.service'
import { FeedService } from '@/services/feed.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true, name: true, email: true, role: true, ativo: true,
                secretariaId: true, setorId: true, permissoesExtra: true, createdAt: true,
                secretaria: { select: { id: true, nome: true, sigla: true } },
                setor: { select: { id: true, nome: true } },
            },
        })

        if (!user) {
            return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: user })
    } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}

const ROLES_REQUEREM_SECRETARIA = ['REVISOR', 'OPERADOR', 'SECRETARIO'] as const

const userUpdateSchema = z.object({
    role: z.enum(['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'REVISOR', 'OPERADOR', 'PENDENTE']).optional(),
    ativo: z.boolean().optional(),
    permissoesExtra: z.array(z.string()).optional(),
    secretariaId: z.string().nullable().optional(),
    setorId: z.string().nullable().optional(),
}).refine((data) => {
    if (data.role && ROLES_REQUEREM_SECRETARIA.includes(data.role as any)) {
        return !!data.secretariaId
    }
    return true
}, {
    message: 'Secretaria é obrigatória para Revisor, Operador e Secretário.',
    path: ['secretariaId'],
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await getAuthUser()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Não autorizado' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const parsed = userUpdateSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
        }

        // Busca estado atual do usuário para gerar mensagem de auditoria
        const usuarioAntes = await prisma.user.findUnique({
            where: { id },
            select: { name: true, role: true, secretariaId: true }
        })

        const result = await UsuarioService.atualizarDadosAdmin(id, parsed.data)

        if (!result.ok) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 })
        }

        // Auditoria: registra no FeedAtividade (fire-and-forget)
        if (usuarioAntes) {
            let tipoEvento = 'USUARIO_ATUALIZADO'
            let mensagem = `Dados de ${usuarioAntes.name} atualizados`

            if (usuarioAntes.role === 'PENDENTE' && parsed.data.role && parsed.data.role !== 'PENDENTE' && parsed.data.ativo === true) {
                tipoEvento = 'ACESSO_APROVADO'
                mensagem = `Acesso liberado: ${usuarioAntes.name} agora é ${parsed.data.role}`
            } else if (parsed.data.role && parsed.data.role !== usuarioAntes.role) {
                tipoEvento = 'ROLE_ALTERADA'
                mensagem = `Nível de acesso de ${usuarioAntes.name} alterado: ${usuarioAntes.role} → ${parsed.data.role}`
            } else if (parsed.data.permissoesExtra) {
                tipoEvento = 'PERMISSOES_ALTERADAS'
                mensagem = `Permissões especiais de ${usuarioAntes.name} atualizadas`
            }

            FeedService.registrarEvento({
                tipoEvento,
                mensagem,
                autorId: session.id,
                secretariaId: result.value.secretariaId ?? null,
                metadata: { targetUserId: id, changes: parsed.data }
            }).catch(e => console.error('Falha ao registrar auditoria:', e))
        }

        return NextResponse.json({
            success: true,
            data: result.value
        })
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error)
        return NextResponse.json(
            { success: false, error: 'Ocorreu um erro interno no servidor' },
            { status: 500 }
        )
    }
}
