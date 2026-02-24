import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildAbility } from '@/lib/ability'
import prisma from '@/lib/prisma'

// Este endpoint gerencia Secretarias e Setores. 
// No schema atual, não há modelo 'Secretaria', mas os IDs são usados em outros lugares.
// Para fins de Ciclo 3, vamos fornecer a listagem de secretarias e setores existentes no banco 
// baseando-se nos usuários e portarias, ou retornar uma lista fixa se for o caso de configuração.

export async function GET(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario)
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // No momento, as secretarias são apenas IDs de texto no banco.
        // Em um cenário real, teríamos uma tabela para elas.
        // Vamos retornar os filtros dinâmicos baseados no que já existe.

        const secretarias = await prisma.portaria.findMany({
            select: { secretariaId: true },
            distinct: ['secretariaId']
        })

        const setores = await prisma.portaria.findMany({
            select: { setorId: true },
            where: { NOT: { setorId: null } },
            distinct: ['setorId']
        })

        return NextResponse.json({
            secretarias: secretarias.map(s => s.secretariaId),
            setores: setores.map(s => s.setorId)
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao listar estrutura' }, { status: 500 })
    }
}
