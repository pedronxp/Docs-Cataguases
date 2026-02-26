import { PrismaClient } from '@prisma/client'

async function main() {
    const prisma = new PrismaClient()
    try {
        const userCount = await prisma.user.count()
        console.log('Sucesso! Total de usuários:', userCount)
    } catch (error) {
        console.error('Erro ao conectar:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
