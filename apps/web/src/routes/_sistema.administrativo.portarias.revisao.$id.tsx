import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileText, Upload, CheckCircle2, AlertCircle,
    ChevronLeft, FileDown, Clock, Send, Loader2, X, AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { Portaria } from '@/types/domain'

export const Route = createFileRoute('/_sistema/administrativo/portarias/revisao/$id')({
    component: PortariaRevisaoPage,
})

const MAX_FILE_SIZE_MB = 10
const ACCEPTED_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

interface VariavelInfo {
    chave: string
    label: string
}

function PortariaRevisaoPage() {
    const { id } = Route.useParams()
    const { toast } = useToast()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [variaveis, setVariaveis] = useState<VariavelInfo[]>([])
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const res = await portariaService.obterPortaria(id)
            if (res.success) {
                setPortaria(res.data)
                // Extrai variaveis do modelo para exibir labels corretos
                const modelo = (res.data as any).modelo
                if (modelo?.variaveis) {
                    setVariaveis(modelo.variaveis as VariavelInfo[])
                }
            }
            setLoading(false)
        }
        load()
    }, [id])

    const validateFile = (file: File): string | null => {
        if (file.type !== ACCEPTED_TYPE && !file.name.endsWith('.docx')) {
            return 'Apenas arquivos .docx são aceitos.'
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            return `O arquivo deve ter no máximo ${MAX_FILE_SIZE_MB}MB.`
        }
        return null
    }

    const handleFileSelect = (file: File) => {
        const error = validateFile(file)
        if (error) {
            toast({ title: 'Arquivo inválido', description: error, variant: 'destructive' })
            return
        }
        setUploadedFile(file)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileSelect(file)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFileSelect(file)
    }

    const handleDownloadDocx = async () => {
        setDownloading(true)
        const res = await portariaService.downloadDocx(id)
        setDownloading(false)
        if (res.success) {
            window.open(res.data.url, '_blank')
        } else {
            toast({ title: 'Erro ao baixar DOCX', description: res.error, variant: 'destructive' })
        }
    }

    const handleSubmit = async () => {
        if (!uploadedFile || !portaria) return
        setSubmitting(true)
        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1]
            const res = await portariaService.submeterPortaria({
                portariaId: portaria.id,
                docxEditadoBase64: base64,
            })
            if (res.success) {
                toast({ title: 'Documento submetido!', description: 'Portaria enviada para revisão com sucesso.' })
                navigate({ to: '/administrativo/portarias/$id', params: { id: portaria.id } })
            } else {
                toast({ title: 'Erro ao submeter', description: res.error, variant: 'destructive' })
                setSubmitting(false)
            }
        }
        reader.readAsDataURL(uploadedFile)
    }

    const getLabelForKey = (chave: string): string => {
        const v = variaveis.find(v => v.chave === chave)
        return v?.label || chave.replace(/_/g, ' ')
    }

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl animate-pulse">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-64 rounded-lg" />
                        <Skeleton className="h-48 rounded-lg" />
                    </div>
                    <Skeleton className="h-80 rounded-lg" />
                </div>
            </div>
        )
    }

    if (!portaria) {
        return (
            <div className="flex flex-col items-center gap-4 py-20 text-slate-400">
                <AlertTriangle size={40} className="opacity-30" />
                <p className="font-semibold text-slate-600">Portaria não encontrada</p>
                <Button variant="outline" asChild><Link to="/administrativo/portarias">Voltar à lista</Link></Button>
            </div>
        )
    }

    const isEditavel = ['RASCUNHO', 'CORRECAO_NECESSARIA'].includes(portaria.status)
    const dadosLista = Object.entries(portaria.formData || {})

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild className="text-slate-500 hover:text-primary font-semibold -ml-2 h-9">
                    <Link to="/administrativo/portarias">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Voltar à lista
                    </Link>
                </Button>
                <StatusBadgeRevisao status={portaria.status} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Card de Informações */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold text-slate-900 leading-tight">{portaria.titulo}</CardTitle>
                                    <CardDescription className="text-xs font-medium">
                                        Criado em {new Date(portaria.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            {/* Dados do formulário com labels corretos */}
                            {dadosLista.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Dados Preenchidos</p>
                                    <div className="rounded-md border border-slate-200 divide-y divide-slate-100 bg-slate-50">
                                        {dadosLista.map(([chave, valor]) => (
                                            <div key={chave} className="flex items-start px-4 py-2.5 gap-4">
                                                <span className="text-xs font-semibold text-slate-500 w-40 shrink-0 mt-0.5 uppercase tracking-wide">
                                                    {getLabelForKey(chave)}
                                                </span>
                                                <span className="text-sm font-medium text-slate-800 flex-1">{String(valor)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Passo 1: Download */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 bg-primary text-white rounded-full text-xs font-black flex items-center justify-center shrink-0">1</span>
                                    <p className="text-sm font-bold text-slate-700">Baixe o rascunho gerado pelo sistema</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                    onClick={handleDownloadDocx}
                                    disabled={downloading}
                                >
                                    {downloading
                                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Obtendo link...</>
                                        : <><FileDown className="mr-2 h-4 w-4 text-slate-500" /> Baixar Rascunho .docx</>
                                    }
                                </Button>
                            </div>

                            {/* Passo 2: Upload (apenas se editável) */}
                            {isEditavel && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 bg-primary text-white rounded-full text-xs font-black flex items-center justify-center shrink-0">2</span>
                                        <p className="text-sm font-bold text-slate-700">Edite no Word e faça upload do arquivo final</p>
                                    </div>

                                    {!uploadedFile ? (
                                        <div
                                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${dragOver
                                                ? 'border-primary bg-primary/5 scale-[1.01]'
                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                                }`}
                                            onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                        >
                                            <Upload className={`h-10 w-10 mx-auto mb-3 transition-colors ${dragOver ? 'text-primary' : 'text-slate-300'}`} />
                                            <p className="font-semibold text-slate-700 text-sm">Arraste o .docx editado aqui</p>
                                            <p className="text-xs text-slate-400 mt-1 font-medium">ou clique para selecionar</p>
                                            <p className="text-[11px] text-slate-400 mt-3 font-medium">Apenas arquivos .docx • Máximo {MAX_FILE_SIZE_MB}MB</p>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                className="hidden"
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-emerald-800 truncate">{uploadedFile.name}</p>
                                                <p className="text-xs text-emerald-600 font-medium">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Pronto para envio</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-emerald-600 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => setUploadedFile(null)}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status EM_REVISAO_ABERTA ou superior */}
                            {!isEditavel && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                                    <p className="text-sm font-medium text-blue-700">
                                        Documento já enviado para revisão. Aguarde o resultado.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Histórico simplificado */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Rascunho criado via Wizard</p>
                            <p className="text-xs text-slate-400 font-medium">Sistema automático · {new Date(portaria.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto shrink-0" />
                    </div>
                </div>

                {/* Sidebar de Ações */}
                <div className="space-y-4">
                    <Card className={`border-2 shadow-sm overflow-hidden ${isEditavel ? 'border-amber-200' : 'border-blue-200 bg-blue-50'}`}>
                        <CardHeader className={`p-5 border-b ${isEditavel ? 'border-slate-100' : 'border-blue-100'}`}>
                            <CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wider">Ação Requerida</CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {isEditavel ? (
                                <>
                                    {!uploadedFile && (
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                Baixe o rascunho, edite no Word com os dados corretos e faça o upload do arquivo final (.docx).
                                            </p>
                                        </div>
                                    )}
                                    {uploadedFile && (
                                        <div className="flex items-start gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                                Arquivo selecionado. Clique em <strong>"Submeter Documento"</strong> para enviar para revisão.
                                            </p>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!uploadedFile || submitting}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 shadow-md shadow-primary/20"
                                    >
                                        {submitting ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submetendo...</>
                                        ) : (
                                            <><Send className="mr-2 h-4 w-4" /> Submeter Documento Oficial</>
                                        )}
                                    </Button>
                                    <p className="text-[11px] text-slate-400 text-center font-medium leading-tight">
                                        Após submeter, o documento será enviado para revisão e um PDF será gerado.
                                    </p>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <Clock className="h-8 w-8 text-blue-500" />
                                    <p className="text-sm font-semibold text-blue-700">Em Revisão</p>
                                    <p className="text-xs text-blue-500 font-medium">O documento está aguardando revisão.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate({ to: '/administrativo/portarias/$id', params: { id } })}
                                    >
                                        Ver detalhes
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tip Card */}
                    <div className="p-4 bg-slate-800 rounded-lg text-white space-y-2">
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400">💡 Dica</p>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            Certifique-se que as variáveis entre <code className="bg-slate-700 px-1 rounded text-slate-100">{"{{ }}"}</code> foram substituídas corretamente antes de fazer o upload.
                        </p>
                    </div>

                    {/* Cancelar (só se editável) */}
                    {isEditavel && (
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold h-9"
                            onClick={() => {
                                if (confirm('Tem certeza que deseja cancelar esta portaria?')) {
                                    navigate({ to: '/administrativo/portarias' })
                                }
                            }}
                        >
                            <X className="mr-2 h-3 w-3" /> Cancelar esta Portaria
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatusBadgeRevisao({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
        RASCUNHO: {
            label: 'Aguardando Upload',
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            icon: <Clock className="mr-1.5 h-3 w-3" />,
        },
        CORRECAO_NECESSARIA: {
            label: 'Correção Necessária',
            className: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: <AlertCircle className="mr-1.5 h-3 w-3" />,
        },
        EM_REVISAO_ABERTA: {
            label: 'Em Revisão',
            className: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: <Clock className="mr-1.5 h-3 w-3" />,
        },
    }
    const c = config[status] ?? config.RASCUNHO
    return (
        <Badge variant="outline" className={`${c.className} h-8 px-3 font-semibold flex items-center`}>
            {c.icon} {c.label}
        </Badge>
    )
}
