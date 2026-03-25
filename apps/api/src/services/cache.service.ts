/**
 * CacheService — Camada de cache inteligente com suporte a Redis + fallback in-memory.
 *
 * Estratégia: Cache-Aside (Lazy Loading)
 * - Primeiro verifica o cache → se existe, retorna direto (HIT)
 * - Se não existe, executa a query, salva no cache e retorna (MISS)
 * - Invalidação explícita por chave ou padrão (prefix)
 *
 * Quando Redis está disponível (REDIS_URL), usa Redis.
 * Quando não está, usa Map<string, CacheEntry> em memória (zero-config).
 */

interface CacheEntry<T = any> {
    value: T
    expiresAt: number // timestamp ms
    tags: string[]
}

interface CacheStats {
    hits: number
    misses: number
    sets: number
    deletes: number
    provider: 'redis' | 'memory'
    entries: number
}

// ── Configurações de TTL por domínio ────────────────────────────────────────
export const CACHE_TTL = {
    SIDEBAR_COUNTS: 15,       // 15s — atualiza frequentemente
    FEED: 30,                 // 30s — feed de atividades
    SECRETARIAS: 300,         // 5min — raramente muda
    SETORES: 300,             // 5min
    MODELOS: 120,             // 2min
    ANALYTICS_DASHBOARD: 60,  // 1min — dados agregados
    ANALYTICS_SERIES: 30,     // 30s
    ACERVO_LISTA: 60,         // 1min
    ACERVO_STATS: 120,        // 2min — contadores do acervo
    PORTARIA_DETALHE: 30,     // 30s
    USUARIOS_LISTA: 120,      // 2min
    LLM_KEYS: 600,            // 10min — admin only
    VARIAVEIS_SISTEMA: 600,   // 10min
} as const

// ── Tags para invalidação em grupo ──────────────────────────────────────────
export const CACHE_TAGS = {
    PORTARIAS: 'portarias',
    SECRETARIAS: 'secretarias',
    SETORES: 'setores',
    MODELOS: 'modelos',
    USUARIOS: 'usuarios',
    ANALYTICS: 'analytics',
    LLM: 'llm',
    VARIAVEIS: 'variaveis',
} as const

// ── Provider Interface ──────────────────────────────────────────────────────
interface CacheProvider {
    get<T>(key: string): Promise<T | null>
    set<T>(key: string, value: T, ttlSeconds: number, tags?: string[]): Promise<void>
    del(key: string): Promise<void>
    delByPattern(pattern: string): Promise<number>
    delByTag(tag: string): Promise<number>
    flush(): Promise<void>
    size(): Promise<number>
}

// ── In-Memory Provider ──────────────────────────────────────────────────────
class MemoryCacheProvider implements CacheProvider {
    private store = new Map<string, CacheEntry>()
    private tagIndex = new Map<string, Set<string>>() // tag → keys

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key)
        if (!entry) return null
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key)
            this.removeFromTagIndex(key, entry.tags)
            return null
        }
        return entry.value as T
    }

    async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
        // Limpar entry antiga se existir
        const old = this.store.get(key)
        if (old) this.removeFromTagIndex(key, old.tags)

        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000),
            tags,
        })

        // Indexar por tags
        for (const tag of tags) {
            if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set())
            this.tagIndex.get(tag)!.add(key)
        }

        // GC: limitar tamanho do cache em memória (max 500 entries)
        if (this.store.size > 500) {
            this.evictExpired()
        }
    }

    async del(key: string): Promise<void> {
        const entry = this.store.get(key)
        if (entry) {
            this.removeFromTagIndex(key, entry.tags)
            this.store.delete(key)
        }
    }

    async delByPattern(pattern: string): Promise<number> {
        const prefix = pattern.replace(/\*/g, '')
        let count = 0
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                await this.del(key)
                count++
            }
        }
        return count
    }

    async delByTag(tag: string): Promise<number> {
        const keys = this.tagIndex.get(tag)
        if (!keys) return 0
        let count = 0
        for (const key of keys) {
            this.store.delete(key)
            count++
        }
        this.tagIndex.delete(tag)
        return count
    }

    async flush(): Promise<void> {
        this.store.clear()
        this.tagIndex.clear()
    }

    async size(): Promise<number> {
        return this.store.size
    }

    private removeFromTagIndex(key: string, tags: string[]) {
        for (const tag of tags) {
            this.tagIndex.get(tag)?.delete(key)
        }
    }

    private evictExpired() {
        const now = Date.now()
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.removeFromTagIndex(key, entry.tags)
                this.store.delete(key)
            }
        }
    }
}

// ── Upstash Redis Provider ──────────────────────────────────────────────────
//
// Usa @upstash/redis — cliente HTTP/REST, sem conexões TCP persistentes.
// Compatível com Vercel Edge/Serverless e Supabase Edge Functions.
//
// Variáveis de ambiente necessárias:
//   UPSTASH_REDIS_REST_URL   — ex: https://xxxxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN — token de acesso (painel Upstash → REST API)
//
class UpstashRedisCacheProvider implements CacheProvider {
    private client: any = null   // Redis | null

    private async getClient(): Promise<any | null> {
        if (this.client) return this.client
        try {
            // IMPORTANTE: usar eval() para evitar que o Next.js resolva o import
            // estaticamente em build time — o pacote pode não estar instalado no ambiente
            // de desenvolvimento e o fallback para MemoryCache deve continuar funcionando.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { Redis } = await (eval('import("@upstash/redis")') as Promise<any>)
            this.client = new Redis({
                url: process.env.UPSTASH_REDIS_REST_URL!,
                token: process.env.UPSTASH_REDIS_REST_TOKEN!,
            })
            console.log('[Cache] Upstash Redis client inicializado')
            return this.client
        } catch (err: any) {
            console.warn('[Cache] Upstash Redis indisponível, fallback para memória:', err.message)
            return null
        }
    }

    private prefixed(key: string) { return `docs:${key}` }
    private tagKey(tag: string)   { return `docs:tag:${tag}` }

    async get<T>(key: string): Promise<T | null> {
        const r = await this.getClient()
        if (!r) return null
        try {
            // @upstash/redis desserializa JSON automaticamente
            return (await r.get(this.prefixed(key))) as T
        } catch {
            return null
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
        const r = await this.getClient()
        if (!r) return
        try {
            const fullKey = this.prefixed(key)
            await r.set(fullKey, value, { ex: ttlSeconds })
            // Indexar por tags — pipeline para reduzir round-trips
            if (tags.length > 0) {
                const pipe = r.pipeline()
                for (const tag of tags) {
                    pipe.sadd(this.tagKey(tag), fullKey)
                }
                await pipe.exec()
            }
        } catch (err: any) {
            console.warn('[Cache] Upstash set error:', err.message)
        }
    }

    async del(key: string): Promise<void> {
        const r = await this.getClient()
        if (!r) return
        try { await r.del(this.prefixed(key)) } catch {}
    }

    async delByPattern(pattern: string): Promise<number> {
        const r = await this.getClient()
        if (!r) return 0
        try {
            // Upstash expõe SCAN via r.keys() — padrão glob
            const prefix = pattern.replace(/\*/g, '')
            const keys: string[] = await r.keys(`docs:${prefix}*`)
            if (keys.length === 0) return 0
            await r.del(...keys)
            return keys.length
        } catch {
            return 0
        }
    }

    async delByTag(tag: string): Promise<number> {
        const r = await this.getClient()
        if (!r) return 0
        try {
            const tKey = this.tagKey(tag)
            const keys: string[] = await r.smembers(tKey)
            if (keys.length === 0) return 0
            await r.del(...keys, tKey)
            return keys.length
        } catch {
            return 0
        }
    }

    async flush(): Promise<void> {
        const r = await this.getClient()
        if (!r) return
        try {
            const keys: string[] = await r.keys('docs:*')
            if (keys.length > 0) await r.del(...keys)
        } catch {}
    }

    async size(): Promise<number> {
        const r = await this.getClient()
        if (!r) return 0
        try {
            const keys: string[] = await r.keys('docs:*')
            return keys.filter((k: string) => !k.startsWith('docs:tag:')).length
        } catch {
            return 0
        }
    }
}

// ── Singleton CacheService ──────────────────────────────────────────────────
class CacheServiceImpl {
    private provider: CacheProvider
    private stats: CacheStats

    constructor() {
        const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
        if (hasUpstash) {
            this.provider = new UpstashRedisCacheProvider()
            this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, provider: 'redis', entries: 0 }
            console.log('[Cache] Iniciando com Upstash Redis provider')
        } else {
            this.provider = new MemoryCacheProvider()
            this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0, provider: 'memory', entries: 0 }
            console.log('[Cache] Iniciando com Memory provider (UPSTASH_REDIS_REST_URL não definida)')
        }
    }

    /**
     * Cache-Aside: tenta ler do cache, senão executa a função e salva.
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number,
        tags: string[] = []
    ): Promise<T> {
        // Tentar ler do cache
        const cached = await this.provider.get<T>(key)
        if (cached !== null) {
            this.stats.hits++
            return cached
        }

        // Cache miss: executar query
        this.stats.misses++
        const value = await fetcher()

        // Salvar no cache (fire-and-forget para não atrasar a resposta)
        this.provider.set(key, value, ttlSeconds, tags).then(() => {
            this.stats.sets++
        }).catch(() => {})

        return value
    }

    /**
     * Lê direto do cache sem fallback.
     */
    async get<T>(key: string): Promise<T | null> {
        const cached = await this.provider.get<T>(key)
        if (cached !== null) {
            this.stats.hits++
            return cached
        }
        this.stats.misses++
        return null
    }

    /**
     * Salva direto no cache.
     */
    async set<T>(key: string, value: T, ttlSeconds: number, tags: string[] = []): Promise<void> {
        await this.provider.set(key, value, ttlSeconds, tags)
        this.stats.sets++
    }

    /**
     * Invalida uma chave específica.
     */
    async invalidate(key: string): Promise<void> {
        await this.provider.del(key)
        this.stats.deletes++
    }

    /**
     * Invalida todas as chaves com um prefixo (ex: "analytics:*").
     */
    async invalidateByPattern(pattern: string): Promise<number> {
        const count = await this.provider.delByPattern(pattern)
        this.stats.deletes += count
        return count
    }

    /**
     * Invalida todas as chaves marcadas com uma tag.
     * Útil para invalidar tudo de "portarias" quando uma portaria muda.
     */
    async invalidateByTag(tag: string): Promise<number> {
        const count = await this.provider.delByTag(tag)
        this.stats.deletes += count
        return count
    }

    /**
     * Limpa todo o cache.
     */
    async flush(): Promise<void> {
        await this.provider.flush()
        this.stats = { ...this.stats, hits: 0, misses: 0, sets: 0, deletes: 0 }
    }

    /**
     * Retorna estatísticas do cache para monitoramento.
     */
    async getStats(): Promise<CacheStats> {
        const entries = await this.provider.size()
        return {
            ...this.stats,
            entries,
        }
    }

    /**
     * Helper: gera chave de cache composta.
     */
    key(...parts: (string | undefined | null)[]): string {
        return parts.filter(Boolean).join(':')
    }
}

// ── Singleton Export ────────────────────────────────────────────────────────
const cacheServiceSingleton = () => new CacheServiceImpl()

declare global {
    var cacheService: undefined | CacheServiceImpl
}

export const CacheService = globalThis.cacheService ?? cacheServiceSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.cacheService = CacheService
