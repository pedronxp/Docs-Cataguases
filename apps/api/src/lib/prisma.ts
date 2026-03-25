import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL!
    const pool = new Pool({
        connectionString,
        // TODO (segurança): substituir rejectUnauthorized: false pelo certificado CA do Supabase.
        // Instrução: https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-connections
        // Por ora, mantido para compatibilidade com o ambiente atual.
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    })
    const adapter = new PrismaPg(pool)

    // SEGURANÇA: em produção, 'query' expõe SQL com parâmetros sensíveis nos logs do servidor.
    // Apenas 'error' e 'warn' são logados em produção.
    const isProduction = process.env.NODE_ENV === 'production'

    return new PrismaClient({
        adapter,
        log: isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
    })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()


export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
