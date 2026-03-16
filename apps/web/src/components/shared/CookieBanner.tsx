/**
 * CookieBanner — Banner de consentimento de cookies conforme LGPD (Lei nº 13.709/2018).
 *
 * Exibe um banner na parte inferior da tela solicitando consentimento para cookies.
 * A preferência é salva no localStorage e o banner não reaparece após aceite ou recusa.
 *
 * Cookies utilizados:
 * - Sessão/autenticação (essenciais — sempre habilitados)
 * - Analytics de uso interno (opcionais)
 */
import { useState, useEffect } from 'react'
import { X, Cookie, Shield, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

const STORAGE_KEY = 'docs-cataguases-cookie-consent'

type ConsentStatus = 'accepted' | 'declined' | 'essential-only' | null

export function CookieBanner() {
    const [status, setStatus] = useState<ConsentStatus>(null)
    const [visible, setVisible] = useState(false)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as ConsentStatus | null
        if (!saved) {
            // Aguarda 1s antes de exibir para não competir com o carregamento inicial
            const t = setTimeout(() => setVisible(true), 1000)
            return () => clearTimeout(t)
        }
        setStatus(saved)
    }, [])

    function save(choice: Exclude<ConsentStatus, null>) {
        localStorage.setItem(STORAGE_KEY, choice)
        setStatus(choice)
        setVisible(false)
    }

    if (!visible || status !== null) return null

    return (
        <div
            role="dialog"
            aria-label="Aviso de cookies"
            aria-live="polite"
            className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-300"
        >
            <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden">
                {/* Barra de destaque */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary/60" />

                <div className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* Ícone */}
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                            <Cookie className="w-5 h-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h2 className="text-sm font-bold text-slate-900">
                                    Privacidade & Cookies
                                </h2>
                                <button
                                    onClick={() => save('declined')}
                                    className="shrink-0 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label="Fechar aviso de cookies"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                Utilizamos cookies essenciais para o funcionamento do sistema e,
                                com seu consentimento, cookies de analytics para melhorar a experiência.
                                Tudo em conformidade com a{' '}
                                <span className="font-semibold text-slate-700">LGPD (Lei nº 13.709/2018)</span>.
                            </p>

                            {/* Detalhes expandidos */}
                            {expanded && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                                        <Shield className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-green-800">Essenciais</p>
                                            <p className="text-green-700 mt-0.5">
                                                Sessão de autenticação e segurança. Sempre ativos e necessários para o sistema funcionar.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                                        <BarChart2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-blue-800">Analytics (opcional)</p>
                                            <p className="text-blue-700 mt-0.5">
                                                Dados de uso anônimos para melhorar o sistema. Coletados internamente pela Prefeitura.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="mt-2 text-[11px] text-primary hover:underline font-medium"
                            >
                                {expanded ? 'Ocultar detalhes' : 'Ver tipos de cookies'}
                            </button>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="mt-4 flex flex-col-reverse sm:flex-row items-center gap-2 sm:justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full sm:w-auto text-xs h-8 text-slate-500 hover:text-slate-700"
                            onClick={() => save('essential-only')}
                        >
                            Somente essenciais
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto text-xs h-8 border-slate-200"
                            onClick={() => save('declined')}
                        >
                            Recusar opcionais
                        </Button>
                        <Button
                            size="sm"
                            className="w-full sm:w-auto text-xs h-8 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm shadow-primary/20"
                            onClick={() => save('accepted')}
                        >
                            Aceitar todos
                        </Button>
                    </div>

                    <p className="mt-3 text-[10px] text-slate-400 text-center sm:text-right">
                        Prefeitura de Cataguases — Sistema Doc's Cataguases v2.0
                        {' · '}
                        <Link to={'/sobre' as any} className="hover:underline text-primary/70">
                            Política de Privacidade
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

/** Hook para verificar se o usuário aceitou cookies de analytics */
export function useCookieConsent(): { analytics: boolean; essentialOnly: boolean } {
    const status = localStorage.getItem(STORAGE_KEY) as ConsentStatus | null
    return {
        analytics: status === 'accepted',
        essentialOnly: status === 'essential-only',
    }
}
