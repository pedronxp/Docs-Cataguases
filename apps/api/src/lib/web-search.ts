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
    method: 'api' | 'public' | 'news'
    error?: string
}

const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1'
const GOOGLE_PUBLIC_SEARCH_URL = 'https://www.google.com/search'
const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss/search'
const SEARCH_TIMEOUT_MS = 8_000
const CONTENT_TIMEOUT_MS = 5_000
const MAX_QUERY_CHARS = 280
const MAX_CONTENT_BYTES = 350_000

function cleanText(value: string): string {
    return value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/&ndash;/g, '-')
        .replace(/&mdash;/g, '-')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
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

function normalizeGoogleUrl(href: string): string {
    const cleanHref = cleanText(href)

    try {
        if (cleanHref.startsWith('/url?')) {
            const parsed = new URL(`https://www.google.com${cleanHref}`)
            return parsed.searchParams.get('q') || ''
        }
        if (cleanHref.startsWith('https://www.google.com/url?')) {
            const parsed = new URL(cleanHref)
            return parsed.searchParams.get('q') || ''
        }
        if (/^https?:\/\//i.test(cleanHref)) return cleanHref
    } catch {
        return ''
    }

    return ''
}

function getXmlTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return cleanText(match?.[1] || '')
}

function getXmlAttr(xml: string, tag: string, attr: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i'))
    return cleanText(match?.[1] || '')
}

function isGoogleInternalUrl(url: string): boolean {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '')
        return host === 'google.com'
            || host === 'google.com.br'
            || host.endsWith('.google.com')
            || host.endsWith('.google.com.br')
            || host === 'googleusercontent.com'
            || host.endsWith('.googleusercontent.com')
    } catch {
        return true
    }
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

function extractPublicGoogleResults(html: string): WebSearchResult[] {
    const results: WebSearchResult[] = []
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    let match: RegExpExecArray | null

    while ((match = linkRegex.exec(html)) && results.length < 8) {
        const url = normalizeGoogleUrl(match[1])
        if (!url || isGoogleInternalUrl(url)) continue

        const title = cleanText(match[2])
        if (!title || title.length < 4 || /^cached|similar|translate/i.test(title)) continue

        const afterLink = html.slice(linkRegex.lastIndex, linkRegex.lastIndex + 900)
        const snippet = cleanText(afterLink)
            .replace(/^https?:\/\/\S+\s*/i, '')
            .slice(0, 260)

        results.push({
            title: title.slice(0, 140),
            url,
            snippet,
            content: '',
            source: 'google',
        })
    }

    return uniqueResults(results).slice(0, 5)
}

async function searchGooglePublic(query: string): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
        q: query,
        num: '5',
        safe: 'active',
        hl: 'pt-BR',
        gl: 'br',
        udm: '14',
    })

    const response = await fetchWithTimeout(
        `${GOOGLE_PUBLIC_SEARCH_URL}?${params.toString()}`,
        SEARCH_TIMEOUT_MS,
        'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
    )
    if (!response.ok) return []

    const html = await response.text()
    const baseResults = extractPublicGoogleResults(html)
    return Promise.all(baseResults.map(async (item) => ({
        ...item,
        content: await fetchSourceContent(item.url),
    })))
}

function buildNewsQuery(query: string): string {
    const normalized = query.toLowerCase()
    if (normalized.includes('resultado') && !normalized.includes('placar')) {
        return `${query} placar`
    }
    if (normalized.includes('flamengo') && !normalized.includes('placar')) {
        return `${query} placar`
    }
    return query
}

function extractGoogleNewsResults(xml: string): WebSearchResult[] {
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    const results = items.map((match) => {
        const itemXml = match[1]
        const title = getXmlTag(itemXml, 'title')
        const link = getXmlTag(itemXml, 'link')
        const description = getXmlTag(itemXml, 'description')
        const pubDate = getXmlTag(itemXml, 'pubDate')
        const sourceName = getXmlTag(itemXml, 'source')
        const sourceUrl = getXmlAttr(itemXml, 'source', 'url')
        const sourceLabel = sourceName ? `Fonte: ${sourceName}.` : ''
        const dateLabel = pubDate ? `Publicado em: ${new Date(pubDate).toLocaleString('pt-BR')}.` : ''

        return {
            title,
            url: link || sourceUrl,
            snippet: description || title,
            content: cleanText(`${sourceLabel} ${dateLabel} ${description || title}`),
            source: 'google' as const,
        }
    })

    return uniqueResults(results.filter(item => item.title && item.url)).slice(0, 5)
}

async function searchGoogleNews(query: string): Promise<WebSearchResult[]> {
    const params = new URLSearchParams({
        q: buildNewsQuery(query),
        hl: 'pt-BR',
        gl: 'BR',
        ceid: 'BR:pt-419',
    })

    const response = await fetchWithTimeout(
        `${GOOGLE_NEWS_RSS_URL}?${params.toString()}`,
        SEARCH_TIMEOUT_MS,
        'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8'
    )
    if (!response.ok) return []

    return extractGoogleNewsResults(await response.text())
}

function googleConfig() {
    const key = process.env.GOOGLE_SEARCH_API_KEY
        || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
        || process.env.GOOGLE_API_KEY
        || process.env.GOOGLE_CLOUD_API_KEY
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID
        || process.env.GOOGLE_SEARCH_CX
        || process.env.GOOGLE_CUSTOM_SEARCH_CX
        || process.env.GOOGLE_CSE_ID
        || process.env.GOOGLE_CX
        || process.env.GOOGLE_PROGRAMMABLE_SEARCH_ENGINE_ID
    return { key, cx }
}

export async function searchWeb(rawQuery: string): Promise<WebSearchResponse> {
    const query = cleanText(rawQuery).slice(0, MAX_QUERY_CHARS)
    const { key, cx } = googleConfig()

    if (!query) {
        return { query: '', results: [], provider: 'google', configured: Boolean(key && cx), method: key && cx ? 'api' : 'public' }
    }

    if (!key || !cx) {
        try {
            let publicResults = await searchGooglePublic(query)
            let method: WebSearchResponse['method'] = 'public'
            if (publicResults.length === 0) {
                publicResults = await searchGoogleNews(query)
                method = 'news'
            }

            return {
                query,
                results: publicResults,
                provider: 'google',
                configured: false,
                method,
                error: publicResults.length > 0
                    ? undefined
                    : 'Google Search e Google Noticias nao retornaram resultados legiveis agora.',
            }
        } catch (error: any) {
            console.warn('[WebSearch] Google Search publico falhou:', error)
        }

        return {
            query,
            results: [],
            provider: 'google',
            configured: false,
            method: 'public',
            error: 'Nao foi possivel consultar o Google Search publico agora.',
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
                method: 'api',
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
            method: 'api',
            results: enriched,
        }
    } catch (error: any) {
        console.warn('[WebSearch] Google Search falhou:', error)
        return {
            query,
            results: [],
            provider: 'google',
            configured: true,
            method: 'api',
            error: error?.message || 'Falha ao consultar Google Search.',
        }
    }
}

export function formatWebSearchContext(search: WebSearchResponse): string {
    if (search.results.length === 0) {
        return `[PESQUISA GOOGLE]\nConsulta: ${search.query}\nErro/observacao: ${search.error || 'Nenhum resultado retornado pelo Google.'}\nNao liste tarefas internas, nao diga para o usuario configurar variaveis e nao invente fontes. Responda em uma frase curta que nao foi possivel obter fontes do Google para essa consulta agora e peça para tentar novamente mais tarde ou refinar a pergunta.`
    }

    const sources = search.results
        .map((item, index) => {
            const content = item.content || item.snippet || 'Sem trecho de conteudo disponivel.'
            return `${index + 1}. ${item.title}\nURL: ${item.url}\nResumo Google: ${item.snippet || 'Sem resumo.'}\nConteudo extraido da fonte: ${content}`
        })
        .join('\n\n')

    const methodLabel = search.method === 'api'
        ? 'Google Programmable Search JSON API'
        : search.method === 'news'
        ? 'Google Noticias RSS'
        : 'Google Search publico'

    return `[PESQUISA GOOGLE]\nConsulta: ${search.query}\nProvedor: ${methodLabel}.\nUse as fontes abaixo para responder com explicacao mais completa. Cite os links usados. Se as fontes nao sustentarem uma afirmacao, diga isso claramente. Nao diga que a pesquisa nao esta configurada quando houver fontes listadas.\n\n${sources}`
}
