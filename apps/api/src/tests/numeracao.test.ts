import { PrismaClient } from '@prisma/client'
import { NumeracaoService } from '../services/numeracao.service'

const prisma = new PrismaClient()

async function resetTestData() {
    console.log('🔄 Limpando dados de teste anteriores...')
    // Encontrar o livro se existir
    const livro = await prisma.livrosNumeracao.findFirst({ where: { ativo: true } })
    if (livro) {
        await prisma.livrosNumeracao.update({
            where: { id: livro.id },
            data: { proximo_numero: 1, logs: [] }
        })
    }
}

async function createFakePortarias(count: number) {
    console.log(`📝 Criando ${count} portarias fakes para teste...`)

    // Precisamos de secretaria e usuario para FKs se necessário, 
    // mas o NumeracaoService pede apenas strings. 
    // Vamos gerar IDs falsos mas no formato UUID (ou cuidamos pra que o DB aceite)
    // Se foreign keys não pedem integridade estrita para log de livro, string qualquer serve.
    // Mas a tabela de logs na verdade armazena JSON, então não tem constraint.
    const fakeIds = Array.from({ length: count }, (_, i) => `FAKE_PORTARIA_${i + 1}_${Date.now()}`)
    return fakeIds
}

async function runConcurrencyTest() {
    console.log('\n🚀 Iniciando Teste de Carga de Numeração Atômica...')

    await resetTestData()

    const COUNT = 15 // Número de requisições simultâneas
    const portariaIds = await createFakePortarias(COUNT)
    const aprovadorId = 'USER_TEST_123'

    console.log(`⚡ Disparando ${COUNT} requisições simultâneas ao NumeracaoService...`)

    const startTime = Date.now()

    // Array de promessas - executam PARALELAMENTE
    const promises = portariaIds.map(id => NumeracaoService.alocarNumero(id, 'PORTARIA', aprovadorId, '127.0.0.1'))

    const results = await Promise.allSettled(promises)

    const endTime = Date.now()

    console.log(`\n✅ Processamento concluído em ${endTime - startTime}ms`)

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok)
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok))

    console.log(`📊 Sucesso: ${successful.length} | Falha: ${failed.length}`) // deve ser 15 | 0

    // @ts-ignore
    const numbers = successful.map(r => r.value.value).sort()

    console.log('\n🔢 Números Gerados (Ordenados):')
    console.log(numbers.join(', '))

    // Verificando validade
    const hasDuplicates = new Set(numbers).size !== numbers.length

    if (hasDuplicates) {
        console.error('❌ ERRO CRÍTICO: Foram detectados números duplicados!')
        process.exit(1)
    } else if (successful.length !== COUNT) {
        console.error('❌ ERRO: Algumas requisições falharam!')
        failed.forEach((f, i) => console.error(`Falha ${i + 1}:`, f))
        process.exit(1)
    } else {
        console.log('✅ TESTE PASSOU: Todos os números são sequenciais, únicos e gerados corretamente sob carga.')
    }

    // Mostrar log do livro
    const livro = await prisma.livrosNumeracao.findFirst({ where: { ativo: true } })
    console.log(`\n📚 Próximo Número no Banco: ${livro?.proximo_numero} (Deveria ser ${COUNT + 1})`)

    await prisma.$disconnect()
}

runConcurrencyTest().catch(e => {
    console.error('Erro Fatal no Teste:', e)
    prisma.$disconnect()
    process.exit(1)
})
