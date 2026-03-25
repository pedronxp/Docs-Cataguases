import type { NextConfig } from "next";

// ─── Origens permitidas (CORS) ────────────────────────────────────────────────
// Em produção defina CORS_ORIGINS (separado por vírgula) ou CORS_ORIGIN (legado)
// Ex.: CORS_ORIGINS="https://docs.cataguases.mg.gov.br,https://www.docs.cataguases.mg.gov.br"
function getAllowedOrigins(): string[] {
    const multi  = process.env.CORS_ORIGINS
    const single = process.env.CORS_ORIGIN || process.env.FRONTEND_URL

    if (multi) return multi.split(',').map(o => o.trim()).filter(Boolean)
    if (single) return [single]
    return ['http://localhost:5173']
}

const ALLOWED_ORIGINS = getAllowedOrigins()

// ─── Content-Security-Policy ──────────────────────────────────────────────────
// Este é o servidor de API (Next.js route handlers) — devolve primariamente JSON.
// A política abaixo bloqueia execução de scripts inline e iframes de origens externas
// nas raras páginas HTML que a API possa gerar (erros 404/500 do Next.js).
const CSP = [
    "default-src 'self'",
    "script-src 'self'",               // sem inline scripts
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.upstash.io",
    "frame-ancestors 'none'",          // equivalente a X-Frame-Options: DENY
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
].join('; ')

// ─── Security headers aplicados a todas as rotas ──────────────────────────────
const SECURITY_HEADERS = [
    // Evita que o browser "adivinhe" o Content-Type
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Proíbe embedding em iframes (clickjacking)
    { key: 'X-Frame-Options', value: 'DENY' },
    // Limita informações enviadas no Referer header
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Desativa APIs do browser que não são necessárias para uma API pública
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    // Força HTTPS por 1 ano (habilita HSTS preloading em produção)
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
    },
    // Content Security Policy
    { key: 'Content-Security-Policy', value: CSP },
    // Remove header de fingerprint do servidor
    { key: 'X-Powered-By', value: '' },  // Next.js remove automaticamente, mas explicita a intenção
]

// ─── CORS headers para rotas de API ──────────────────────────────────────────
// Nota: a origem dinâmica é tratada por middleware; aqui setamos os headers
// que independem da origem (método, credenciais, headers aceitos).
const CORS_HEADERS = [
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
    { key: 'Access-Control-Allow-Methods',     value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
    {
        key: 'Access-Control-Allow-Headers',
        value: [
            'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version',
            'Content-Length', 'Content-MD5', 'Content-Type', 'Date',
            'X-Api-Version', 'Authorization',
        ].join(', '),
    },
    // Expõe os rate-limit headers para o frontend poder ler
    {
        key: 'Access-Control-Expose-Headers',
        value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After',
    },
    // Resultado do preflight pode ser cacheado por 2h
    { key: 'Access-Control-Max-Age', value: '7200' },
]

const nextConfig: NextConfig = {
    serverExternalPackages: ['@prisma/client', '.prisma/client'],

    // Remove o header X-Powered-By (fingerprint)
    poweredByHeader: false,

    async headers() {
        return [
            // ── Security headers em todas as rotas ────────────────────────────
            {
                source: '/:path*',
                headers: SECURITY_HEADERS,
            },

            // ── CORS origin estático para origem primária ─────────────────────
            // Para múltiplas origens dinâmicas, o middleware (middleware.ts) trata
            // individualmente. Aqui aplicamos a origem primária como fallback.
            {
                source: '/api/:path*',
                headers: [
                    ...CORS_HEADERS,
                    { key: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGINS[0] },
                ],
            },

            // ── Health check: sem cache (sempre fresco) ────────────────────────
            {
                source: '/api/health',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
                ],
            },
        ]
    },
}

export default nextConfig
