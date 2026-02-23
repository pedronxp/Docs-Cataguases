import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const password = await bcrypt.hash('123456', 12)

    const users = [
        {
            name: 'Admin Geral',
            email: 'admin@cataguases.mg.gov.br',
            password,
            role: 'ADMIN_GERAL',
            ativo: true,
        },
        {
            name: 'Prefeito',
            email: 'prefeito@cataguases.mg.gov.br',
            password,
            role: 'PREFEITO',
            ativo: true,
        },
        {
            name: 'Secretário',
            email: 'secretario@cataguases.mg.gov.br',
            password,
            role: 'SECRETARIO',
            ativo: true,
        },
        {
            name: 'Operador',
            email: 'operador@cataguases.mg.gov.br',
            password,
            role: 'OPERADOR',
            ativo: true,
        },
    ]

    console.log('Iniciando seed...')

    for (const user of users) {
        const created = await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: user,
        })
        console.log(`Usuário criado/atualizado: ${created.email}`)
    }

    console.log('Seed finalizado com sucesso!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
