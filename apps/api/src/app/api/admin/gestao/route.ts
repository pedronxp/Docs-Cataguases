import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const GESTAO_KEY = 'SYS_GESTAO_DADOS'

// GET /api/admin/gestao
export async function GET() {
    try {
        const usuario = await getAuthUser()
        if (!usuario) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const config = await prisma.variavelSistema.findUnique({
            where: { chave: GESTAO_KEY }
        })

        if (!config) {
            // Se não existir, retorna um estado inicial padrão para não quebrar o frontend
            const defaultGestao = [{
                id: 'gestao-atual',
                nomeGestao: 'Gestão Atual',
                dataInicio: '',
                dataFim: '',
                prefeito: '',
                vicePrefeito: '',
                chefeGabinete: '',
                secretarios: {}
            }]
            return NextResponse.json({ success: true, data: defaultGestao })
        }

        const data = JSON.parse(config.valor)
        return NextResponse.json({ success: true, data: data })
    } catch (error) {
        console.error('Erro ao listar gestões:', error)
        return NextResponse.json({ success: false, error: 'Erro ao listar gestões' }, { status: 500 })
    }
}

// POST /api/admin/gestao
export async function POST(req: NextRequest) {
    try {
        const usuario = await getAuthUser()
        if (!usuario || (usuario as any).role !== 'ADMIN_GERAL') {
            return NextResponse.json({ error: 'Apenas administradores podem gerenciar a gestão' }, { status: 403 })
        }

        const body = await req.json()

        // Formato esperado: DadosGestao ou DadosGestao[]
        // O frontend envia um objeto único ao salvar (handleSave)
        // mas a página espera receber um array no GET.
        // Vamos normalizar para sempre salvar o estado completo.

        let gestaoParaSalvar: any[] = []

        // Se recebermos um objeto único (vários campos de gestão), encontramos no array atual e atualizamos
        const configAtual = await prisma.variavelSistema.findUnique({ where: { chave: GESTAO_KEY } })
        let gestoesAtuais = configAtual ? JSON.parse(configAtual.valor) : []
        if (!Array.isArray(gestoesAtuais)) gestoesAtuais = []

        if (body.id) {
            // É um objeto de DadosGestao
            const existe = gestoesAtuais.findIndex((g: any) => g.id === body.id)
            if (existe >= 0) {
                gestoesAtuais[existe] = body
            } else {
                gestoesAtuais.unshift(body)
            }
            gestaoParaSalvar = gestoesAtuais
        } else if (Array.isArray(body)) {
            gestaoParaSalvar = body
        } else {
            return NextResponse.json({ success: false, error: 'Formato de dados inválido' }, { status: 400 })
        }

        const v = await prisma.variavelSistema.upsert({
            where: { chave: GESTAO_KEY },
            update: { valor: JSON.stringify(gestaoParaSalvar) },
            create: {
                chave: GESTAO_KEY,
                valor: JSON.stringify(gestaoParaSalvar),
                descricao: 'Dados institucional da Gestão Municipal (Prefeito, Secretários, etc)'
            }
        })

        return NextResponse.json({ success: true, data: body })
    } catch (error) {
        console.error('Erro ao salvar gestão:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao salvar gestão' }, { status: 500 })
    }
}
