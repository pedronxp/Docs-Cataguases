import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
import { subject } from '@casl/ability'
import { PortariaService } from '@/services/portaria.service'
import { z } from 'zod'

const criarSchema = z.object({
    titulo: z.string().min(1),
    descricao: z.string().optional(),
    modeloId: z.string().min(1),
    formData: z.record(z.string(), z.any()),
    secretariaId: z.string().optional(),
    setorId: z.string().optional(),
    submetido: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)
        if (!ability.can('criar', 'Portaria'))
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

        const body = await req.json()
        const parsed = criarSchema.safeParse(body)
        if (!parsed.success)
            return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

        // Resolve secretariaId: payload > usuário > modelo (fallback para ADMIN_GERAL)
        let secretariaId: string | undefined =
            parsed.data.secretariaId || (usuario as any).secretariaId || undefined

        if (!secretariaId) {
            const modelo = await prisma.modeloDocumento.findUnique({
                where: { id: parsed.data.modeloId },
                select: { secretariaId: true },
            })
            secretariaId = modelo?.secretariaId ?? undefined
        }

        if (!secretariaId) {
            return NextResponse.json(
                { error: 'É necessário informar a secretaria para criar a portaria.' },
                { status: 400 }
            )
        }

        // Resolve setorId: payload > usuário (se compatível com a secretaria)
        let resolvedSetorId: string | undefined = parsed.data.setorId || undefined
        if (!resolvedSetorId && (usuario as any).setorId) {
            // Só usa o setor do usuário se pertence à secretaria selecionada
            const setorUsuario = await prisma.setor.findFirst({
                where: { id: (usuario as any).setorId, secretariaId, ativo: true }
            })
            if (setorUsuario) resolvedSetorId = (usuario as any).setorId
        }

        // Valida que o setor pertence à secretaria
        if (resolvedSetorId) {
            const setor = await prisma.setor.findFirst({
                where: { id: resolvedSetorId, secretariaId, ativo: true }
            })
            if (!setor) {
                return NextResponse.json(
                    { error: 'O setor informado não pertence à secretaria selecionada ou está inativo.' },
                    { status: 400 }
                )
            }
        }

        const result = await PortariaService.criar({
            ...parsed.data,
            criadoPorId: usuario.id as string,
            secretariaId,
            setorId: resolvedSetorId,
        })

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.value, { status: 201 })
    } catch (error: any) {
        console.error('Erro ao criar portaria:', error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno ao criar portaria' },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const ability = buildAbility(usuario as any)

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        // Busca básica
        const portarias = await prisma.portaria.findMany({
            where: {
                ...(status && { status: status as any }),
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                criadoPor: {
                    select: { id: true, name: true, email: true },
                },
                revisorAtual: {
                    select: { id: true, name: true, email: true },
                },
                secretaria: {
                    select: { id: true, nome: true, sigla: true },
                },
                setor: {
                    select: { id: true, nome: true, sigla: true },
                },
                modelo: {
                    select: { id: true, nome: true },
                },
            },
        })

        // Filtra pela habilidade CASL no backend
        const filtradas = portarias.filter(p => ability.can('ler', subject('Portaria', p as any)))

        return NextResponse.json(filtradas)
    } catch (error) {
        console.error('Erro ao listar portarias:', error)
        return NextResponse.json(
            { error: 'Erro ao listar portarias' },
            { status: 500 }
        )
    }
}
