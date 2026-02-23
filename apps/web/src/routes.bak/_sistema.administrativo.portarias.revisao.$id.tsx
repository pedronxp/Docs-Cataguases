import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { portariaService } from '@/services/portaria.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FileText, Upload, CheckCircle2, AlertCircle,
    ArrowLeft, FileDown, Eye, Send, History
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Portaria } from '@/types/domain'

export const Route = createFileRoute('/_sistema/administrativo/portarias/revisao/$id')({
    component: PortariaRevisaoPage,
})

function PortariaRevisaoPage() {
    const { id } = Route.useParams()
    const { toast } = useToast()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [portaria, setPortaria] = useState<Portaria | null>(null)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        async function load() {
            setLoading(true)
            const res = await portariaService.obterPortaria(id)
            if (res.success) setPortaria(res.data)
            setLoading(false)
        }
        load()
    }, [id])

    const handleUpload = async () => {
        setUploading(true)
        // Mock de upload
        setTimeout(() => {
            setUploading(false)
            toast({
                title: "Arquivo processado!",
                description: "O DOCX foi recebido e o PDF está sendo gerado.",
            })
            navigate({ to: '/_sistema/administrativo/portarias' })
        }, 1500)
    }

    if (loading) return <div>Carregando...</div>
    if (!portaria) return <div>Portaria não encontrada</div>

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <Button variant="ghost" asChild className="text-slate-600 hover:text-primary h-10 px-0 hover:bg-transparent font-bold">
                    <button onClick={() => window.history.back()} className="flex items-center gap-2">
                        <ArrowLeft size={16} /> Voltar para lista
                    </button>
                </Button>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 h-8 px-3 font-bold">
                        <Clock className="mr-2 h-3 w-3" /> Revisão Pendente
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Detalhes e Upload */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-primary/50">
                        <CardHeader className="bg-slate-50/50 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl text-primary shadow-sm">
                                    <FileText size={24} />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold tracking-tight text-slate-900">{portaria.titulo}</CardTitle>
                                    <CardDescription className="font-medium">Identificado pelo sistema em {new Date(portaria.createdAt).toLocaleDateString()}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secretaria</p>
                                    <p className="text-sm font-bold text-slate-700">Gabinete do Prefeito</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo de Documento</p>
                                    <p className="text-sm font-bold text-slate-700">{portaria.modeloId}</p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-4 py-12 group hover:border-primary/50 hover:bg-slate-100/50 transition-all">
                                <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:shadow-lg transition-all">
                                    <Upload size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-900 leading-tight">Clique para carregar o arquivo DOCX definitivo</h4>
                                    <p className="text-xs text-slate-500 font-medium">O sistema processará o documento e extrairá as variáveis automaticamente</p>
                                </div>
                                <input type="file" className="hidden" id="file-upload" onChange={handleUpload} />
                                <Button asChild variant="outline" className="border-slate-300 font-bold bg-white rounded-xl shadow-sm">
                                    <label htmlFor="file-upload" className="cursor-pointer">Selecionar Arquivo</label>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-slate-400" />
                                <h3 className="font-bold text-slate-900">Histórico de Alterações</h3>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                <div className="p-4 flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <CheckCircle2 size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Rascunho criado via Wizard</p>
                                        <p className="text-xs text-slate-500 font-medium">Ações automáticas do sistema . hoje às 14:20</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar de Ações */}
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-lg overflow-hidden border-t-4 border-t-amber-400">
                        <CardHeader className="bg-amber-50/50 pb-4">
                            <CardTitle className="text-md font-black text-amber-800 uppercase tracking-tight">Status da Revisão</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <AlertCircle className="text-amber-500 h-4 w-4" />
                                    <span>Pendente de Arquivo Original</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Para seguir para a etapa de assinatura, você deve realizar o upload do arquivo DOCX preenchido.
                                </p>
                            </div>
                            <Button disabled className="w-full bg-primary/40 text-white font-bold h-11 shadow-sm opacity-50 cursor-not-allowed">
                                <Send className="mr-2 h-4 w-4" /> Enviar para Assinatura
                            </Button>
                        </CardContent>
                        <CardFooter className="bg-slate-50 p-4 border-t border-slate-100">
                            <Button variant="ghost" className="w-full text-xs text-rose-600 font-bold hover:bg-rose-50 h-8">
                                <AlertCircle className="mr-2 h-3 w-3" /> Cancelar esta Portaria
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-slate-200 shadow-sm overflow-hidden bg-slate-900 text-white border-none">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/10 rounded-lg text-white">
                                    <BookOpen size={18} />
                                </div>
                                <h3 className="font-bold">Dica de Revisão</h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Certifique-se de que os nomes e cargos no arquivo DOCX correspondem exatamente aos dados do usuário para evitar reprovações na assinatura digital.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Clock(props: any) {
    return <ClockIcon {...props} />
}

function ClockIcon({ size = 16, className = "" }: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}
