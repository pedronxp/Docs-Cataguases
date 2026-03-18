import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const rawKey = 'sk-9Vcv2F67LtEWbNj5Db2yoj4NgmaAwHXaBLiKwch1S1pS6QSn'
    const mask = rawKey.substring(0, 7) + '••••••••' + rawKey.substring(rawKey.length - 4)

    await prisma.llmApiKey.create({
        data: {
            provider: 'kimi',
            label: 'Moonshot AI (Kimi)',
            keyEncrypted: rawKey,
            mask,
            ativo: true
        }
    })
    console.log("Kimi key inserted!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
