import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
import { buildAbility } from '@/lib/ability'
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

        const result = await PortariaService.criar({
            ...parsed.data,
            criadoPorId: usuario.id as string,
            secretariaId: parsed.data.secretariaId || (usuario as any).secretariaId,
            setorId: parsed.data.setorId || (usuario as any).setorId,
        })

        if (!result.ok) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json(result.value, { status: 201 })
    } catch (error) {
        console.error('Erro ao criar portaria:', error)
        return NextResponse.json(
            { error: 'Erro interno ao criar portaria' },
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
            orderBy: { createdAt: 'desc' },
            include: {
                criadoPor: {
                    select: { name: true, email: true },
                },
            },
        })

        // Filtra pela habilidade CASL no backend
        const filtradas = portarias.filter(p => ability.can('ler', 'Portaria', p as any))

        return NextResponse.json(filtradas)
    } catch (error) {
        console.error('Erro ao listar portarias:', error)
        return NextResponse.json(
            { error: 'Erro ao listar portarias' },
            { status: 500 }
        )
    }
}
