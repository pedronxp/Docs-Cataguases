import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { NumeracaoService } from '@/services/numeracao.service'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })

        const portaria = await prisma.portaria.findUnique({
            where: { id: params.id }
        })

        if (!portaria) return NextResponse.json({ success: false, error: 'Portaria não encontrada' }, { status: 404 })
        if (portaria.status !== 'RASCUNHO') {
            return NextResponse.json({ success: false, error: 'Apenas rascunhos podem ser submetidos' }, { status: 400 })
        }

        // 1. Aloca número oficial se ainda não tiver
        let numeroOficial = portaria.numeroOficial
        if (!numeroOficial) {
            const numRes = await NumeracaoService.alocarNumero(portaria.secretariaId, portaria.setorId)
            if (numRes.ok) {
                numeroOficial = numRes.value
            }
        }

        // 2. Atualiza status para PROCESSANDO (Simulando o início da geração de PDF)
        const portariaAtualizada = await prisma.portaria.update({
            where: { id: params.id },
            data: {
                status: 'PROCESSANDO',
                numeroOficial,
            }
        })

        // TODO: Aqui dispararíamos o worker de Puppeteer para gerar o PDF
        // Como estamos em integração frontend, vamos deixar o status em PENDENTE após um "delay" simulado no backend ou apenas mudar agora

        // Simulando que o processamento "acabou" rápido para fins de teste UI
        const final = await prisma.portaria.update({
            where: { id: params.id },
            data: { status: 'PENDENTE' }
        })

        return NextResponse.json({ success: true, data: final })
    } catch (error) {
        console.error('Erro na submissão:', error)
        return NextResponse.json({ success: false, error: 'Erro ao submeter portaria' }, { status: 500 })
    }
}
