const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@cataguases.mg.gov.br' },
        select: { id: true, email: true, role: true, ativo: true }
    })
    console.log('USER_INFO:', JSON.stringify(user))
    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
