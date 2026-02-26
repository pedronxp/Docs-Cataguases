import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    ShieldCheck, Search, CheckCircle2, XCircle, FileText,
    AlertTriangle, Building2, Loader2, ExternalLink
} from 'lucide-react'
import { portariaService } from '@/services/portaria.service'
import type { Portaria } from '@/types/domain'

// Validar route — public, no login required
export const Route = createFileRoute('/validar')({
    validateSearch: (search: Record<string, unknown>) => ({
        hash: (search.hash as string) ?? '',
    }),
    component: ValidarPage,
})

// --- Real lookup moved to portariaService.validarDocumento ---

type VerificationState = 'idle' | 'loading' | 'valid' | 'invalid'

function ValidarPage() {
    const { hash: initialHash } = Route.useSearch()
    const [codigo, setCodigo] = useState(initialHash ?? '')
    const [state, setState] = useState<VerificationState>(initialHash ? 'loading' : 'idle')
    const [portaria, setPortaria] = useState<Portaria | null>(null)

    // Auto-search if hash came from URL
    useState(() => {
        if (initialHash) handleVerificar(initialHash)
    })

    async function handleVerificar(overrideHash?: string) {
        const query = overrideHash ?? codigo
        if (!query.trim()) return
        setState('loading')
        setPortaria(null)

        const res = await portariaService.validarDocumento(query.trim())
        if (res.success && res.data.status === 'PUBLICADA') {
            setPortaria(res.data)
            setState('valid')
        } else {
            setState('invalid')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
            {/* Topo institucional */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary text-white rounded-lg shadow shadow-primary/20">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">Prefeitura Municipal de</p>
                            <p className="text-sm font-black text-slate-900 leading-tight">Cataguases — MG</p>
                        </div>
                    </div>
                    <Link to="/login">
                        <Button variant="ghost" size="sm" className="text-slate-500 font-semibold text-xs">
                            <ExternalLink size={12} className="mr-1.5" /> Área Restrita
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center px-6 py-16 max-w-3xl mx-auto w-full">
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-2xl mb-2 ring-8 ring-primary/5">
                        <ShieldCheck size={40} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Validação de Documento Oficial
                    </h1>
                    <p className="text-slate-500 text-base font-medium max-w-xl mx-auto leading-relaxed">
                        Verifique a autenticidade de portarias e documentos emitidos pela Prefeitura Municipal de Cataguases. Insira o código ou hash de autenticidade.
                    </p>
                </div>

                {/* Barra de pesquisa */}
                <div className="w-full max-w-xl space-y-3">
                    <div className="flex gap-2">
                        <Input
                            value={codigo}
                            onChange={e => setCodigo(e.target.value)}
                            placeholder="Digite o código ou hash do documento..."
                            className="h-12 border-slate-200 bg-white shadow-sm text-slate-800 font-mono text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleVerificar()}
                        />
                        <Button
                            onClick={() => handleVerificar()}
                            disabled={state === 'loading' || !codigo.trim()}
                            className="h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/20 shrink-0"
                        >
                            {state === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search size={18} />}
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400 text-center font-medium">
                        O código está impresso ao final de todo documento oficial emitido pelo sistema
                    </p>
                </div>

                {/* Resultado: VÁLIDO */}
                {state === 'valid' && portaria && (
                    <div className="w-full max-w-xl mt-10 space-y-4 animate-in slide-in-from-bottom duration-400">
                        <div className="p-5 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full shrink-0">
                                <CheckCircle2 size={28} />
                            </div>
                            <div>
                                <p className="font-black text-emerald-800 text-base">✅ Documento Autêntico</p>
                                <p className="text-sm text-emerald-700 font-medium">Este documento é oficial e foi publicado pela Prefeitura Municipal de Cataguases.</p>
                            </div>
                        </div>

                        {/* Certificado */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100 overflow-hidden">
                            <div className="px-5 py-4 bg-slate-50 flex items-center gap-3">
                                <FileText size={18} className="text-primary" />
                                <p className="font-black text-slate-800">Detalhes do Documento</p>
                                <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-xs">Publicado</Badge>
                            </div>
                            <CertRow label="Título" value={portaria.titulo} />
                            <CertRow label="Número Oficial" value={portaria.numeroOficial ?? '—'} />
                            <CertRow label="Data de Publicação" value={new Date(portaria.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
                            <CertRow label="Hash de Autenticidade" value={(portaria as any).hashIntegridade ?? portaria.hashAssinatura ?? '—'} mono />
                            <CertRow label="Secretaria Emissora" value={portaria.secretaria?.nome || portaria.secretariaId} />
                        </div>

                        <div className="flex items-start gap-2 px-1">
                            <ShieldCheck size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Verificação realizada via sistema Doc's Cataguases em {new Date().toLocaleString('pt-BR')}. Este documento possui assinatura digital e valor jurídico nos termos da MP 2.200-2/2001.
                            </p>
                        </div>
                    </div>
                )}

                {/* Resultado: INVÁLIDO */}
                {state === 'invalid' && (
                    <div className="w-full max-w-xl mt-10 animate-in slide-in-from-bottom duration-400">
                        <div className="p-5 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                                <XCircle size={28} />
                            </div>
                            <div>
                                <p className="font-black text-red-800 text-base">❌ Documento não localizado</p>
                                <p className="text-sm text-red-700 font-medium">
                                    Nenhum documento oficial foi encontrado com este código. Verifique se o código foi digitado corretamente.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 px-1">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                Se você acredita que este documento é legítimo, entre em contato com a Secretaria emissora para verificação presencial.
                            </p>
                        </div>
                    </div>
                )}

                {/* Seção de códigos de teste removida (Produção) */}
            </main>

            {/* Rodapé */}
            <footer className="border-t border-slate-200 py-5 text-center">
                <p className="text-xs text-slate-400 font-medium">
                    © {new Date().getFullYear()} Prefeitura Municipal de Cataguases · Sistema Doc's Cataguases · Todos os direitos reservados
                </p>
            </footer>
        </div>
    )
}

function CertRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider sm:w-44 shrink-0">{label}</span>
            <span className={`text-sm font-semibold text-slate-800 break-all ${mono ? 'font-mono text-xs text-slate-500' : ''}`}>{value}</span>
        </div>
    )
}
