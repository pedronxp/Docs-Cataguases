import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        // Busca todas as secretarias
        // No momento, como ainda não implementamos o modelo de Secretaria no Prisma, 
        // vamos retornar uma lista fixa baseada no MOCKS.md para que o frontend funcione.
        const secretarias = [
            { id: 'sec-saude', nome: 'Secretaria de Saúde', sigla: 'SMS', cor: '#ef4444' },
            { id: 'sec-educacao', nome: 'Secretaria de Educação', sigla: 'SME', cor: '#3b82f6' },
            { id: 'sec-fazenda', nome: 'Secretaria de Fazenda', sigla: 'SEFAZ', cor: '#10b981' },
            { id: 'sec-adm', nome: 'Secretaria de Administração', sigla: 'SEMAD', cor: '#6366f1' },
        ]

        return NextResponse.json({
            success: true,
            data: secretarias,
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao listar secretarias' },
            { status: 500 }
        )
    }
}
