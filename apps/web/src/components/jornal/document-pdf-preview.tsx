import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, RefreshCw, FileX, AlertTriangle } from 'lucide-react'
import api from '@/lib/api'

interface DocumentPDFPreviewProps {
    portariaId: string
}

type PreviewState = 'loading' | 'success' | 'no-pdf' | 'error'

export function DocumentPDFPreview({ portariaId }: DocumentPDFPreviewProps) {
    const [state, setState] = useState<PreviewState>('loading')
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const loadPDF = async () => {
        setState('loading')
        setErrorMsg(null)
        try {
            const res = await api.get(`/api/portarias/${portariaId}`)
            const url = res.data?.data?.pdfUrl

            if (!url) {
                setState('no-pdf')
                return
            }

            setPdfUrl(url)
            setState('success')
        } catch (err: any) {
            const msg = err?.response?.status === 404
                ? 'Portaria não encontrada.'
                : 'Erro ao carregar o documento. Verifique a conexão.'
            setErrorMsg(msg)
            setState('error')
        }
    }

    useEffect(() => {
        loadPDF()
    }, [portariaId])

    if (state === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Carregando documento...</span>
            </div>
        )
    }

    if (state === 'no-pdf') {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <div className="p-3 rounded-full bg-slate-100">
                    <FileX className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-center">
                    <p className="font-medium text-slate-600 text-sm">PDF não disponível</p>
                    <p className="text-xs text-slate-400 mt-1">Este documento ainda não possui PDF gerado.</p>
                </div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 border border-dashed border-red-200 rounded-lg bg-red-50/50">
                <div className="p-3 rounded-full bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="text-center">
                    <p className="font-medium text-red-600 text-sm">Falha ao carregar</p>
                    <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPDF}
                    className="gap-1.5 text-slate-600 mt-1"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Tentar novamente
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pré-visualização do documento</span>
                <Button variant="outline" size="sm" asChild className="gap-1.5 text-slate-600">
                    <a href={pdfUrl!} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir em nova aba
                    </a>
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-slate-50">
                <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    className="w-full h-[460px]"
                    title="Pré-visualização do documento"
                    sandbox="allow-same-origin allow-scripts allow-popups"
                />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                    Verifique cuidadosamente o conteúdo antes de confirmar. A numeração é <strong>definitiva e irreversível</strong>.
                </p>
            </div>
        </div>
    )
}
