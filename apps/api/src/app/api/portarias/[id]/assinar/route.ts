import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
        }

        // 1. Validar se o usuário pode assinar
        // Apenas Prefeito, Secretários e Admin Geral podem assinar oficialmente
        const rolesPermitidos = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO']
        const userRole = session.role as string
        const userId = session.id as string
        const userName = session.name as string

        if (!rolesPermitidos.includes(userRole)) {
            return NextResponse.json({
                success: false,
                error: 'Seu perfil não tem permissão para assinar documentos oficialmente.'
            }, { status: 403 })
        }

        const portaria = await prisma.portaria.findUnique({
            where: { id: params.id }
        })

        if (!portaria) {
            return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        }

        if (portaria.status !== 'PENDENTE') {
            return NextResponse.json({
                success: false,
                error: 'Apenas portarias em estado PENDENTE podem ser assinadas.'
            }, { status: 400 })
        }

        // 2. Registrar a assinatura
        const portariaAssinada = await prisma.portaria.update({
            where: { id: params.id },
            data: {
                status: 'ASSINADO',
                assinadoEm: new Date(),
                assinadoPorId: userId,
            }
        })

        // 3. Registrar no Feed de Atividade
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: 'ASSINATURA',
                mensagem: `Portaria assinada digitalmente por ${userName}`,
                portariaId: portaria.id,
                autorId: userId,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId,
                metadata: {
                    role: userRole,
                    timestamp: new Date().toISOString()
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: portariaAssinada,
            message: 'Documento assinado digitalmente com sucesso.'
        })

    } catch (error) {
        console.error('Erro ao assinar portaria:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao processar assinatura' }, { status: 500 })
    }
}
