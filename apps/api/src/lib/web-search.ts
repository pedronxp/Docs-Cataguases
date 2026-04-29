export interface WebSearchResult {
    title: string
    url: string
    snippet: string
    source: 'duckduckgo'
}

export interface WebSearchResponse {
    query: string
    results: WebSearchResult[]
    provider: 'duckduckgo'
}

const DDG_INSTANT_URL = 'https://api.duckduckgo.com/'
const DDG_HTML_URL = 'https://duckduckgo.com/html/'
const SEARCH_TIMEOUT_MS = 7_000
const MAX_QUERY_CHARS = 280

function cleanText(value: string): string {
    return value
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

function normalizeUrl(url: string): string {
    const decoded = cleanText(url)
    if (decoded.startsWith('//duckduckgo.com/l/?')) {
        try {
            const parsed = new URL(`https:${decoded}`)
            const target = parsed.searchParams.get('uddg')
            if (target) return target
        } catch {
            return decoded
        }
    }
    if (decoded.startsWith('/l/?')) {
        try {
            const parsed = new URL(`https://duckduckgo.com${decoded}`)
            const target = parsed.searchParams.get('uddg')
            if (target) return target
        } catch {
            return decoded
        }
    }
    return decoded
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

async function fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
    try {
        return await fetch(url, {
            signal: controller.signal,
            headers: {
                'accept': 'text/html,application/json;q=0.9,*/*;q=0.8',
                'user-agent': "Docs Cataguases Assistant/1.0",
            },
        })
    } finally {
        clearTimeout(timeout)
    }
}

function flattenRelatedTopics(topics: any[]): any[] {
    return topics.flatMap((topic) => Array.isArray(topic?.Topics) ? flattenRelatedTopics(topic.Topics) : [topic])
}

async function searchInstantAnswer(query: string): Promise<WebSearchResult[]> {
    const url = `${DDG_INSTANT_URL}?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`
    const response = await fetchWithTimeout(url)
    if (!response.ok) return []

    const data: any = await response.json()
    const results: WebSearchResult[] = []

    if (data?.AbstractText && data?.AbstractURL) {
        results.push({
            title: cleanText(data.Heading || 'Resposta instantanea'),
            url: normalizeUrl(data.AbstractURL),
            snippet: cleanText(data.AbstractText),
            source: 'duckduckgo',
        })
    }

    const related = flattenRelatedTopics(data?.RelatedTopics || [])
    for (const item of related.slice(0, 6)) {
        if (!item?.Text || !item?.FirstURL) continue
        results.push({
            title: cleanText(item.Text).split(' - ')[0].slice(0, 120),
            url: normalizeUrl(item.FirstURL),
            snippet: cleanText(item.Text),
            source: 'duckduckgo',
        })
    }

    return uniqueResults(results).slice(0, 5)
}

async function searchHtml(query: string): Promise<WebSearchResult[]> {
    const url = `${DDG_HTML_URL}?q=${encodeURIComponent(query)}`
    const response = await fetchWithTimeout(url)
    if (!response.ok) return []

    const html = await response.text()
    const results: WebSearchResult[] = []
    const itemRegex = /<div class="result[\s\S]*?<\/div>\s*<\/div>/g
    const items = html.match(itemRegex) || []

    for (const item of items) {
        const link = item.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
        if (!link) continue

        const snippet = item.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
            || item.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/)

        results.push({
            title: cleanText(link[2]),
            url: normalizeUrl(link[1]),
            snippet: cleanText(snippet?.[1] || ''),
            source: 'duckduckgo',
        })
    }

    return uniqueResults(results).slice(0, 5)
}

export async function searchWeb(rawQuery: string): Promise<WebSearchResponse> {
    const query = cleanText(rawQuery).slice(0, MAX_QUERY_CHARS)
    if (!query) return { query: '', results: [], provider: 'duckduckgo' }

    let results: WebSearchResult[] = []
    try {
        results = await searchInstantAnswer(query)
    } catch (error) {
        console.warn('[WebSearch] DuckDuckGo instant answer falhou:', error)
    }

    if (results.length < 3) {
        try {
            const htmlResults = await searchHtml(query)
            results = uniqueResults([...results, ...htmlResults]).slice(0, 5)
        } catch (error) {
            console.warn('[WebSearch] DuckDuckGo HTML falhou:', error)
        }
    }

    return { query, results, provider: 'duckduckgo' }
}

export function formatWebSearchContext(search: WebSearchResponse): string {
    if (search.results.length === 0) {
        return `[PESQUISA NA INTERNET]\nConsulta: ${search.query}\nNenhum resultado confiavel retornado pelo provedor gratuito. Responda deixando claro que nao foi possivel confirmar na web agora.`
    }

    const sources = search.results
        .map((item, index) => `${index + 1}. ${item.title}\nURL: ${item.url}\nResumo: ${item.snippet || 'Sem resumo disponivel.'}`)
        .join('\n\n')

    return `[PESQUISA NA INTERNET]\nConsulta: ${search.query}\nProvedor: DuckDuckGo sem chave de API.\nUse somente as fontes abaixo para informacoes atuais. Cite links quando usar dados da pesquisa. Se as fontes nao responderem diretamente, diga isso.\n\n${sources}`
}
