import { Link, useRouter } from '@tanstack/react-router'
import { AlertTriangle, Home, RefreshCw, ChevronLeft, ServerCrash, WifiOff, ShieldX, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Tipos de erro com configuração visual ────────────────────────────────────

type ErrorKind = '500' | '403' | '408' | 'network' | 'unknown'

function detectErrorKind(error?: Error | unknown): ErrorKind {
    if (!error) return 'unknown'
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    if (msg.includes('401') || msg.includes('403') || msg.includes('forbidden') || msg.includes('não autorizado')) return '403'
    if (msg.includes('408') || msg.includes('timeout') || msg.includes('timed out')) return '408'
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('net::')) return 'network'
    return '500'
}

const ERROR_CONFIG: Record<ErrorKind, {
    code: string
    title: string
    desc: string
    icon: React.ReactNode
    iconBg: string
    accentColor: string
}> = {
    '500': {
        code: '500',
        title: 'Erro interno do servidor',
        desc: 'Algo deu errado no sistema. Nossa equipe foi notificada. Tente novamente em alguns instantes.',
        icon: <ServerCrash className="w-12 h-12 text-rose-500" />,
        iconBg: 'bg-rose-50 border-rose-100',
        accentColor: 'text-rose-600'
    },
    '403': {
        code: '403',
        title: 'Acesso não permitido',
        desc: 'Você não tem permissão para acessar este recurso. Verifique com o administrador do sistema.',
        icon: <ShieldX className="w-12 h-12 text-amber-500" />,
        iconBg: 'bg-amber-50 border-amber-100',
        accentColor: 'text-amber-600'
    },
    '408': {
        code: '408',
        title: 'Tempo esgotado',
        desc: 'A requisição demorou muito para ser processada. Verifique sua conexão e tente novamente.',
        icon: <Clock className="w-12 h-12 text-blue-500" />,
        iconBg: 'bg-blue-50 border-blue-100',
        accentColor: 'text-blue-600'
    },
    'network': {
        code: 'ERR',
        title: 'Sem conexão',
        desc: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
        icon: <WifiOff className="w-12 h-12 text-slate-500" />,
        iconBg: 'bg-slate-100 border-slate-200',
        accentColor: 'text-slate-600'
    },
    'unknown': {
        code: '!',
        title: 'Algo deu errado',
        desc: 'Ocorreu um erro inesperado. Por favor, recarregue a página ou volte ao painel.',
        icon: <AlertTriangle className="w-12 h-12 text-orange-500" />,
        iconBg: 'bg-orange-50 border-orange-100',
        accentColor: 'text-orange-600'
    }
}

// ── Componente principal ─────────────────────────────────────────────────────

interface ErrorPageProps {
    error?: Error | unknown
    /** Se verdadeiro, renderiza dentro do layout do sistema (sem min-h-screen) */
    inline?: boolean
    onRetry?: () => void
}

export function ErrorPage({ error, inline = false, onRetry }: ErrorPageProps) {
    const router = useRouter()
    const kind = detectErrorKind(error)
    const cfg = ERROR_CONFIG[kind]

    const errorMessage = error instanceof Error ? error.message : undefined

    function handleRetry() {
        if (onRetry) {
            onRetry()
        } else {
            router.invalidate()
        }
    }

    return (
        <div className={`flex flex-col items-center justify-center p-6 bg-slate-50/60 ${inline ? 'min-h-[420px]' : 'min-h-[100dvh]'}`}>
            <div className="max-w-md w-full text-center space-y-6">

                {/* Ícone */}
                <div className={`w-24 h-24 rounded-2xl border-2 ${cfg.iconBg} flex items-center justify-center mx-auto shadow-sm`}>
                    {cfg.icon}
                </div>

                {/* Código + título */}
                <div className="space-y-1">
                    <p className={`text-5xl font-black tracking-tight ${cfg.accentColor}`}>{cfg.code}</p>
                    <h1 className="text-xl font-bold text-slate-800">{cfg.title}</h1>
                </div>

                {/* Descrição */}
                <p className="text-sm text-slate-500 leading-relaxed">{cfg.desc}</p>

                {/* Detalhe técnico (só em dev ou quando disponível) */}
                {errorMessage && (
                    <details className="text-left">
                        <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors">
                            Ver detalhes técnicos
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-900 text-slate-300 text-[10px] rounded-lg overflow-auto max-h-32 leading-relaxed whitespace-pre-wrap break-all">
                            {errorMessage}
                        </pre>
                    </details>
                )}

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button
                        variant="outline"
                        onClick={() => router.history.back()}
                        className="gap-2 text-sm font-semibold border-slate-200 text-slate-600 hover:border-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" /> Voltar
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleRetry}
                        className="gap-2 text-sm font-semibold border-slate-200 text-slate-600 hover:border-slate-300"
                    >
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                    </Button>

                    <Link to="/dashboard">
                        <Button className="gap-2 text-sm font-bold bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
                            <Home className="w-4 h-4" /> Painel principal
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ── Wrapper para TanStack Router errorComponent ───────────────────────────────

interface RouterErrorComponentProps {
    error: Error
    reset: () => void
}

export function RouterErrorComponent({ error, reset }: RouterErrorComponentProps) {
    return <ErrorPage error={error} onRetry={reset} />
}

// ── Wrapper inline (dentro do layout do sistema) ──────────────────────────────

export function InlineErrorPage({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
    return <ErrorPage error={error} inline onRetry={onRetry} />
}
