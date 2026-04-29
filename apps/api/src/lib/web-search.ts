export interface WebSearchResult {
    title: string
    url: string
    snippet: string
    content: string
    source: 'google'
}

export interface WebSearchResponse {
    query: string
    results: WebSearchResult[]
    provider: 'google'
    configured: boolean
    error?: string
}

const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1'
const SEARCH_TIMEOUT_MS = 8_000
const CONTENT_TIMEOUT_MS = 5_000
const MAX_QUERY_CHARS = 280
const MAX_CONTENT_BYTES = 350_000

function cleanText(value: string): string {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
}

function uniqueResults(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set<string>()
    return results.filter((item) => {
        const key = item.url || item.title
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
    })
}

async function fetchWithTimeout(url: string, timeoutMs: number, accept: string): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: {
                accept,
                'user-agent': "Docs Cataguases Assistant/1.0",
            },
        })
    } finally {
        clearTimeout(timeout)
    }
}

async function readLimitedText(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) return response.text()

    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_CONTENT_BYTES) {
        const { done, value } = await reader.read()
        if (done || !value) break
        chunks.push(value)
        total += value.byteLength
    }

    try {
        await reader.cancel()
    } catch {
        // noop
    }

    const merged = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        merged.set(chunk.slice(0, Math.max(0, Math.min(chunk.byteLength, total - offset))), offset)
        offset += chunk.byteLength
        if (offset >= total) break
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(merged)
}

function extractReadableContent(html: string): string {
    const meta = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i)

    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(match => cleanText(match[1]))
        .filter(text => text.length >= 80)
        .slice(0, 4)

    const parts = [
        meta?.[1] ? cleanText(meta[1]) : '',
        ...paragraphs,
    ].filter(Boolean)

    return cleanText(parts.join(' ')).slice(0, 1_200)
}

async function fetchSourceContent(url: string): Promise<string> {
    if (!/^https?:\/\//i.test(url)) return ''

    try {
        const response = await fetchWithTimeout(url, CONTENT_TIMEOUT_MS, 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5')
        const contentType = response.headers.get('content-type') || ''
        if (!response.ok || !/(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) return ''

        const text = await readLimitedText(response)
        return contentType.includes('text/plain')
            ? cleanText(text).slice(0, 1_200)
            : extractReadableContent(text)
    } catch (error) {
        console.warn('[WebSearch] Falha ao ler fonte Google:', { url, error })
        return ''
    }
}

function googleConfig() {
    const key = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CUSTOM_SEARCH_CX
    return { key, cx }
}

export async function searchWeb(rawQuery: string): Promise<WebSearchResponse> {
    const query = cleanText(rawQuery).slice(0, MAX_QUERY_CHARS)
    const { key, cx } = googleConfig()

    if (!query) {
        return { query: '', results: [], provider: 'google', configured: Boolean(key && cx) }
    }

    if (!key || !cx) {
        return {
            query,
            results: [],
            provider: 'google',
            configured: false,
            error: 'Pesquisa Google nao configurada. Defina GOOGLE_SEARCH_API_KEY e GOOGLE_SEARCH_ENGINE_ID no backend.',
        }
    }

    try {
        const params = new URLSearchParams({
            key,
            cx,
            q: query,
            num: '5',
            safe: 'active',
            hl: 'pt-BR',
            gl: 'br',
        })
        const response = await fetchWithTimeout(`${GOOGLE_SEARCH_URL}?${params.toString()}`, SEARCH_TIMEOUT_MS, 'application/json')
        const data: any = await response.json().catch(() => ({}))

        if (!response.ok) {
            return {
                query,
                results: [],
                provider: 'google',
                configured: true,
                error: data?.error?.message || `Google Search retornou HTTP ${response.status}.`,
            }
        }

        const baseResults: WebSearchResult[] = (data?.items || []).map((item: any) => ({
            title: cleanText(item.title || 'Resultado Google'),
            url: cleanText(item.link || ''),
            snippet: cleanText(item.snippet || item.htmlSnippet || ''),
            content: '',
            source: 'google' as const,
        }))

        const unique = uniqueResults(baseResults).slice(0, 5)
        const enriched = await Promise.all(unique.map(async (item) => ({
            ...item,
            content: await fetchSourceContent(item.url),
        })))

        return {
            query,
            provider: 'google',
            configured: true,
            results: enriched,
        }
    } catch (error: any) {
        console.warn('[WebSearch] Google Search falhou:', error)
        return {
            query,
            results: [],
            provider: 'google',
            configured: true,
            error: error?.message || 'Falha ao consultar Google Search.',
        }
    }
}

export function formatWebSearchContext(search: WebSearchResponse): string {
    if (!search.configured) {
        return `[PESQUISA GOOGLE]\nConsulta: ${search.query}\nStatus: Google Search nao configurado no backend.\nOriente o usuario a configurar GOOGLE_SEARCH_API_KEY e GOOGLE_SEARCH_ENGINE_ID para ativar o modo pesquisa.`
    }

    if (search.results.length === 0) {
        return `[PESQUISA GOOGLE]\nConsulta: ${search.query}\nErro/observacao: ${search.error || 'Nenhum resultado retornado pelo Google.'}\nResponda deixando claro que nao foi possivel confirmar na web agora.`
    }

    const sources = search.results
        .map((item, index) => {
            const content = item.content || item.snippet || 'Sem trecho de conteudo disponivel.'
            return `${index + 1}. ${item.title}\nURL: ${item.url}\nResumo Google: ${item.snippet || 'Sem resumo.'}\nConteudo extraido da fonte: ${content}`
        })
        .join('\n\n')

    return `[PESQUISA GOOGLE]\nConsulta: ${search.query}\nProvedor: Google Programmable Search JSON API.\nUse as fontes abaixo para responder com explicacao mais completa. Cite os links usados. Se as fontes nao sustentarem uma afirmacao, diga isso claramente.\n\n${sources}`
}
