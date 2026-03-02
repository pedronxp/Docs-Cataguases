import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { JornalExportService } from '@/services/jornal-export.service'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = (await getSession()) as any
        if (!session || !['JORNALISTA', 'ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const formatoParam = searchParams.get('formato')
        const periodo = searchParams.get('periodo') || 'mes-atual'

        const formatosValidos = ['csv', 'json', 'pdf', 'pdf-analitico']
        if (!formatoParam || !formatosValidos.includes(formatoParam)) {
            return NextResponse.json(
                { success: false, error: `Formato inválido. Use: ${formatosValidos.join(', ')}` },
                { status: 400 }
            )
        }

        const periodosValidos = ['hoje', 'semana', 'mes-atual', 'ano-atual']
        if (!periodosValidos.includes(periodo)) {
            return NextResponse.json(
                { success: false, error: `Período inválido. Use: ${periodosValidos.join(', ')}` },
                { status: 400 }
            )
        }

        const formato = formatoParam as 'csv' | 'json' | 'pdf' | 'pdf-analitico'
        const resultado = await JornalExportService.gerarRelatorio({ formato, periodo })

        return new NextResponse(new Uint8Array(resultado.buffer), {
            headers: {
                'Content-Type': resultado.mimeType,
                'Content-Disposition': `attachment; filename="${resultado.filename}"`,
                'Cache-Control': 'no-store'
            }
        })
    } catch (error: any) {
        console.error('Erro na exportação do Jornal:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Erro ao exportar relatórios' },
            { status: 500 }
        )
    }
}
