import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { AcervoService, FiltrosAcervo } from '@/services/acervo.service'

export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'ADMIN_GERAL') {
            return NextResponse.json(
                { success: false, error: 'Apenas administradores podem exportar o acervo.' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)

        // Filtros para exportação (geralmente sem paginação ou com limite alto)
        const filtros: FiltrosAcervo = {
            termo: searchParams.get('q') || undefined,
            secretariaId: searchParams.get('secretariaId') || undefined,
            status: searchParams.get('status') || undefined,
            ano: searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : undefined,
            page: 1,
            limit: 1000 // Limite de segurança para exportação
        }

        const result = await AcervoService.listarPortarias(filtros)

        if (result.ok) {
            const { itens } = result.value

            // Gera CSV simples
            const header = 'ID,Numero,Titulo,Secretaria,Status,DataCriacao,HashIntegridade\n'
            const rows = itens.map(i => {
                return `${i.id},"${i.numeroOficial || ''}","${i.titulo}","${i.secretariaId}","${i.status}","${i.createdAt.toISOString()}","${i.hashIntegridade || ''}"`
            }).join('\n')

            const csv = header + rows

            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="acervo-portarias.csv"'
                }
            })
        }

        return NextResponse.json({ success: false, error: result.error }, { status: 500 })

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Erro ao exportar' }, { status: 500 })
    }
}
