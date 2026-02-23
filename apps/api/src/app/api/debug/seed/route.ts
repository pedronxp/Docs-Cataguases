import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
    try {
        const password = await bcrypt.hash('123456', 12)

        // Seed Usuários
        const users = [
            { name: 'Admin Geral', email: 'admin@cataguases.mg.gov.br', password, role: 'ADMIN_GERAL', ativo: true },
            { name: 'Prefeito', email: 'prefeito@cataguases.mg.gov.br', password, role: 'PREFEITO', ativo: true },
        ]

        for (const user of users) {
            await prisma.user.upsert({
                where: { email: user.email },
                update: {},
                create: user,
            })
        }

        // Seed Modelos
        const modelos = [
            {
                id: 'modelo-nomeacao-id',
                nome: 'Portaria de Nomeação',
                descricao: 'Para nomear servidores em cargos efetivos ou comissionados.',
                docxTemplateUrl: 'https://mock.storage/template-nomeacao.docx',
                variaveis: {
                    create: [
                        { chave: 'NOME_SERVIDOR', label: 'Nome Completo do Servidor', tipo: 'texto', obrigatorio: true, ordem: 1, descricao: 'Nome conforme registro no RH.' },
                        { chave: 'CARGO', label: 'Cargo de Destino', tipo: 'texto', obrigatorio: true, ordem: 2, descricao: 'Cargo a ser ocupado.' },
                        { chave: 'DATA_INICIO', label: 'Data de Início', tipo: 'data', obrigatorio: true, ordem: 3 },
                    ]
                }
            },
            {
                id: 'modelo-gratificacao-id',
                nome: 'Portaria de Gratificação',
                descricao: 'Para concessão de benefícios pecuniários.',
                docxTemplateUrl: 'https://mock.storage/template-gratificacao.docx',
                secretariaId: 'sec-rh',
                variaveis: {
                    create: [
                        { chave: 'NOME_SERVIDOR', label: 'Nome do Servidor', tipo: 'texto', obrigatorio: true, ordem: 1 },
                        { chave: 'PERCENTUAL', label: 'Percentual (%)', tipo: 'numero', obrigatorio: true, ordem: 2 },
                        { chave: 'JUSTIFICATIVA', label: 'Justificativa', tipo: 'textarea', obrigatorio: true, ordem: 3 },
                    ]
                }
            }
        ]

        for (const m of modelos) {
            await prisma.modeloDocumento.upsert({
                where: { id: m.id },
                update: {},
                create: m
            })
        }

        return NextResponse.json({ success: true, message: 'Seed realizado com sucesso!' })
    } catch (error: any) {
        console.error('Erro no seed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
