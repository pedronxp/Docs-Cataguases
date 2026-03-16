/**
 * Script para registrar a chave Cerebras no banco de dados
 * Execute: npx ts-node scripts/seed-cerebras-key.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const key = 'csk-c9jke66mmwctkwwd466vfd49etphxejerhv4f9v33ny46rr5'
    const provider = 'cerebras'
    const label = 'Cerebras Cloud — Conta Principal'
    const mask = 'csk-••••••••rr5'

    const existing = await prisma.llmApiKey.findFirst({
        where: { keyEncrypted: key },
    })

    if (existing) {
        console.log('✅ Chave Cerebras já existe no banco:', existing.id)
        return
    }

    const created = await prisma.llmApiKey.create({
        data: { provider, label, keyEncrypted: key, mask, ativo: true },
    })

    console.log('✅ Chave Cerebras registrada com sucesso! ID:', created.id)
}

main()
    .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
