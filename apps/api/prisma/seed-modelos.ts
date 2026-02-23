import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Semeando modelos de documento...')

    const modelos = [
        {
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
        await prisma.modeloDocumento.create({
            data: m
        })
    }

    console.log('✅ Modelos semeados!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
