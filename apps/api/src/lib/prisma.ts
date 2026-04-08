import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    // IMPORTANTE: O @prisma/adapter-pg gerencia seu próprio pool e é incompatível
    // com PgBouncer (DATABASE_URL, porta 6543, pgbouncer=true).
    // Usar DIRECT_URL (porta 5432) para conexão direta ao PostgreSQL.
    const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!
    const pool = new Pool({
        connectionString,
        // SSL seguro: carrega certificado CA do Supabase se disponível,
        // caso contrário usa rejectUnauthorized: true (rejeita certs inválidos).
        // Para obter o cert: https://supabase.com/docs/guides/database/connecting-to-postgres#ssl-connections
        // Configure SUPABASE_SSL_CERT no .env com o conteúdo PEM do certificado CA.
        ssl: process.env.SUPABASE_SSL_CERT
            ? { rejectUnauthorized: true, ca: process.env.SUPABASE_SSL_CERT }
            : { rejectUnauthorized: true },
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
