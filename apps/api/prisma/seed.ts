import prisma from '../src/lib/prisma'

async function main() {
    console.log('Iniciando seed...')

    // Livros de Numeração — um por tipo de documento
    const livrosPadrao = [
        { nome: 'Portarias Cataguases',   tipoDocumento: 'PORTARIA',  formato_base: 'PORT-{N}/{ANO}' },
        { nome: 'Memorandos Cataguases',  tipoDocumento: 'MEMORANDO', formato_base: 'MEM-{N}/{ANO}'       },
        { nome: 'Ofícios Cataguases',     tipoDocumento: 'OFICIO',    formato_base: 'OF-{N}/{ANO}'        },
        { nome: 'Leis Cataguases',        tipoDocumento: 'LEI',       formato_base: 'LEI-{N}/{ANO}'       },
    ]

    for (const livro of livrosPadrao) {
        await (prisma.livrosNumeracao as any).upsert({
            where: { tipoDocumento: livro.tipoDocumento },
            update: { nome: livro.nome, formato_base: livro.formato_base },
            create: { ...livro, proximo_numero: 1, numero_inicial: 1, ativo: true }
        })
    }

    console.log('Livros de numeração criados/atualizados.')

    console.log('Iniciando seed de Variáveis de Sistema...')

    const variaveisPadrao = [
        {
            chave: 'SYS_NUMERO',
            valor: 'Gerado na publicação',
            descricao: 'Número sequencial oficial gerado com lock atômico — ex: PORT-001/2026.',
            resolvidaAutomaticamente: true
        },
        {
            chave: 'SYS_DATA',
            valor: 'Gerado na submissão',
            descricao: 'Data atual no formato DD/MM/AAAA. Registrada quando o documento é submetido.',
            resolvidaAutomaticamente: true
        },
        {
            chave: 'SYS_DATA_EXTENSO',
            valor: 'Gerado na submissão',
            descricao: 'Data por extenso — ex: 1º de março de 2026. Ideal para o corpo textual da portaria.',
            resolvidaAutomaticamente: true
        },
        {
            chave: 'SYS_PREFEITO',
            valor: 'Nome do Prefeito em Exercício',
            descricao: 'Nome do Prefeito conforme cadastrado em Admin → Gestão Municipal.',
            resolvidaAutomaticamente: true
        },
        {
            chave: 'SYS_NOME_PREFEITURA',
            valor: 'Prefeitura Municipal de Cataguases',
            descricao: 'Nome oficial da instituição em documentos governamentais.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_CNPJ_PREFEITURA',
            valor: '12.345.678/0001-90',
            descricao: 'CNPJ oficial da instituição pública.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_ENDERECO_PREFEITURA',
            valor: 'Praça Rui Barbosa, 150 - Centro, Cataguases - MG, 36770-000',
            descricao: 'Endereço físico da Sede, útil para rodapés e cabeçalhos oficiais.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_TELEFONE',
            valor: '(32) 3422-1000',
            descricao: 'Telefone oficial de contato da Prefeitura.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_SITE_OFICIAL',
            valor: 'www.cataguases.mg.gov.br',
            descricao: 'Website oficial disponibilizado ao público.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_MUNICIPIO',
            valor: 'Cataguases',
            descricao: 'Nome do município sede da prefeitura.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_ESTADO',
            valor: 'Minas Gerais',
            descricao: 'Nome por extenso do Estado.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_ESTADO_SIGLA',
            valor: 'MG',
            descricao: 'Sigla da Unidade Federativa.',
            resolvidaAutomaticamente: false
        },
        {
            chave: 'SYS_GESTAO_PERIODO',
            valor: '2025-2028',
            descricao: 'Período da gestão municipal atual.',
            resolvidaAutomaticamente: false
        }
    ]

    for (const v of variaveisPadrao) {
        await prisma.variavelSistema.upsert({
            where: { chave: v.chave },
            update: v,
            create: v
        })
    }

    console.log('Seed de Variavéis finalizado com sucesso!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
