import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
    FileSignature, PenTool, FileX2, Loader2, ShieldCheck,
    AlertTriangle, Info, Download, Upload, CheckCircle2, ExternalLink
} from 'lucide-react'
import { portariaService } from '@/services/portaria.service'
import { Badge } from '@/components/ui/badge'

interface AssinaturaModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    portariaId: string
    onSigned?: () => void
}

const MAX_FILE_MB = 50

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export function AssinaturaModal({ isOpen, onOpenChange, portariaId, onSigned }: AssinaturaModalProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<'pdf_assinado' | 'manual' | 'dispensada'>('pdf_assinado')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [justificativa, setJustificativa] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [pdfAssinado, setPdfAssinado] = useState<File | null>(null)
    const [pdfBaixado, setPdfBaixado] = useState(false)

    const resetForm = () => {
        setJustificativa('')
        setFile(null)
        setPdfAssinado(null)
        setPdfBaixado(false)
        setActiveTab('pdf_assinado')
    }

    const handleClose = (open: boolean) => {
        if (!open) resetForm()
        onOpenChange(open)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (!selected) return
        if (selected.size > MAX_FILE_MB * 1024 * 1024) {
            toast({
                title: 'Arquivo muito grande',
                description: `O arquivo deve ter no máximo ${MAX_FILE_MB}MB.`,
                variant: 'destructive'
            })
            return
        }
        setFile(selected)
    }

    const handlePdfAssinadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (!selected) return
        if (!selected.name.toLowerCase().endsWith('.pdf')) {
            toast({ title: 'Apenas PDF aceito', description: 'O arquivo assinado deve ser um PDF.', variant: 'destructive' })
            return
        }
        if (selected.size > MAX_FILE_MB * 1024 * 1024) {
            toast({ title: 'Arquivo muito grande', description: `O PDF deve ter no máximo ${MAX_FILE_MB}MB.`, variant: 'destructive' })
            return
        }
        setPdfAssinado(selected)
    }

    const handleBaixarParaAssinar = () => {
        const link = document.createElement('a')
        link.href = `/api/portarias/${portariaId}/stream?type=pdf`
        link.download = `portaria-${portariaId}-para-assinar.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setPdfBaixado(true)
        toast({
            title: 'PDF baixado!',
            description: 'Assine o documento no Adobe Acrobat ou outro assinador digital (ICP-Brasil, GOV.BR) e envie de volta.',
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (activeTab === 'pdf_assinado') {
            if (!pdfAssinado) {
                toast({ title: 'Selecione o PDF assinado', description: 'Faça upload do PDF que foi assinado digitalmente.', variant: 'destructive' })
                return
            }
            setIsSubmitting(true)
            try {
                const result = await portariaService.uploadPdfAssinado(
                    portariaId,
                    pdfAssinado,
                    justificativa || undefined
                )
                if (result.success) {
                    const hash = (result as any).hashIntegridade
                    toast({
                        title: 'PDF assinado enviado com sucesso!',
                        description: hash
                            ? `Portaria pronta para publicação. Hash SHA-256: ${hash.substring(0, 16)}...`
                            : 'Portaria pronta para publicação.',
                    })
                    handleClose(false)
                    if (onSigned) onSigned()
                } else {
                    toast({ title: 'Erro ao enviar PDF', description: result.error, variant: 'destructive' })
                }
            } finally {
                setIsSubmitting(false)
            }
            return
        }

        // Abas: manual e dispensada
        if (!justificativa.trim()) {
            toast({ title: 'Justificativa obrigatória', description: 'Descreva detalhadamente o motivo.', variant: 'destructive' })
            return
        }
        if (activeTab === 'manual' && !file) {
            toast({ title: 'Comprovante obrigatório', description: 'Anexe o documento assinado fisicamente.', variant: 'destructive' })
            return
        }

        setIsSubmitting(true)
        try {
            let comprovanteBase64: string | undefined
            let comprovanteNome: string | undefined
            if (file) {
                comprovanteBase64 = await fileToBase64(file)
                comprovanteNome = file.name
            }

            const tipoAssinatura = activeTab === 'manual' ? 'MANUAL' : 'DISPENSADA'
            const result = await portariaService.assinarComTipo(portariaId, {
                tipoAssinatura,
                justificativa: justificativa.trim(),
                comprovanteBase64,
                comprovanteNome
            })

            if (result.success) {
                toast({
                    title: tipoAssinatura === 'MANUAL' ? 'Assinatura manual registrada!' : 'Dispensa registrada!',
                    description: 'Portaria pronta para publicação.',
                })
                handleClose(false)
                if (onSigned) onSigned()
            } else {
                toast({ title: 'Erro ao registrar', description: result.error, variant: 'destructive' })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">Registrar Assinatura</DialogTitle>
                    <DialogDescription>
                        Escolha o método de assinatura. O método recomendado é a assinatura digital via PDF.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => {
                    setActiveTab(v as typeof activeTab)
                    setJustificativa('')
                    setFile(null)
                    setPdfAssinado(null)
                }} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pdf_assinado" className="text-xs gap-1.5">
                            <FileSignature className="w-3.5 h-3.5" /> Digital (PDF)
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="text-xs gap-1.5">
                            <PenTool className="w-3.5 h-3.5" /> Manual
                        </TabsTrigger>
                        <TabsTrigger value="dispensada" className="text-xs gap-1.5">
                            <FileX2 className="w-3.5 h-3.5" /> Dispensada
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">

                        {/* ── TAB: ASSINATURA DIGITAL COM PDF ── */}
                        <TabsContent value="pdf_assinado" className="space-y-4 outline-none">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600 shrink-0 mt-0.5">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-blue-900 text-sm">Assinatura Digital com Certificado</h4>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Baixe o PDF, assine digitalmente com seu certificado ICP-Brasil, Adobe Acrobat,
                                        GOV.BR ou outro assinador compatível, e envie o PDF assinado de volta.
                                    </p>
                                </div>
                            </div>

                            {/* PASSO 1: Baixar PDF */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${pdfBaixado ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {pdfBaixado ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                                    </div>
                                    <Label className="text-sm font-semibold text-slate-700">Baixar PDF para assinar</Label>
                                </div>
                                <div className="ml-8 space-y-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleBaixarParaAssinar}
                                        className="gap-2 font-semibold border-blue-200 text-blue-700 hover:bg-blue-50 w-full"
                                    >
                                        <Download className="w-4 h-4" /> Baixar PDF Original
                                    </Button>
                                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                        <a
                                            href="https://www.gov.br/governodigital/pt-br/assinatura-eletronica"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Assinar via GOV.BR
                                        </a>
                                        <span className="text-slate-300">|</span>
                                        <a
                                            href="https://www.iti.br/icp-brasil"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3" /> ICP-Brasil / Certificado A1/A3
                                        </a>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-400">Adobe Acrobat Reader</span>
                                    </div>
                                </div>
                            </div>

                            {/* PASSO 2: Enviar PDF assinado */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${pdfAssinado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {pdfAssinado ? <CheckCircle2 className="w-3.5 h-3.5" /> : '2'}
                                    </div>
                                    <Label className="text-sm font-semibold text-slate-700">Enviar PDF assinado digitalmente</Label>
                                </div>
                                <div className="ml-8 space-y-2">
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center group hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={handlePdfAssinadoChange}
                                        />
                                        {pdfAssinado ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-700">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="text-sm font-semibold">{pdfAssinado.name}</span>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                                    {(pdfAssinado.size / 1024 / 1024).toFixed(2)} MB
                                                </Badge>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                <Upload className="w-5 h-5" />
                                                <p className="text-xs font-medium">Clique para selecionar o PDF assinado</p>
                                                <p className="text-[10px]">Apenas .pdf • Máximo {MAX_FILE_MB}MB</p>
                                            </div>
                                        )}
                                    </div>
                                    {pdfAssinado && (
                                        <p className="text-[11px] text-slate-500 leading-relaxed">
                                            ✓ Um hash SHA-256 será calculado e registrado no histórico para garantir a integridade do documento.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Justificativa opcional */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                    Observação (opcional)
                                </Label>
                                <Textarea
                                    placeholder="Ex.: Assinado com certificado A3 emitido pela Certisign em 2026."
                                    value={justificativa}
                                    onChange={(e) => setJustificativa(e.target.value)}
                                    className="resize-none text-sm"
                                    rows={2}
                                />
                            </div>
                        </TabsContent>

                        {/* ── TAB: MANUAL ── */}
                        <TabsContent value="manual" className="space-y-4 outline-none">
                            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-bold">Exceção ao rito padrão.</span> Use apenas quando o responsável assinou fisicamente o documento em papel. Todos os campos são obrigatórios e ficarão registrados na auditoria.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                                    Justificativa da Assinatura Manual <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    placeholder="Ex.: Prefeito sem acesso ao sistema, assinou fisicamente no processo físico nº 123/2026 em 26/02/2026."
                                    value={justificativa}
                                    onChange={(e) => setJustificativa(e.target.value)}
                                    className="resize-none text-sm"
                                    rows={3}
                                />
                                <p className="text-[10px] text-slate-400">Descreva: quem assinou, quando, e em qual documento físico.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                                    Documento Assinado Digitalizado <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="file"
                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                    onChange={handleFileChange}
                                    className="file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-3 file:py-1 hover:file:bg-blue-100 file:mr-4 file:cursor-pointer text-sm"
                                />
                                {file && (
                                    <p className="text-[10px] text-emerald-600 font-medium">
                                        ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                                <p className="text-[10px] text-slate-400">PDF ou imagem (PNG/JPG). Máximo 5MB.</p>
                            </div>
                        </TabsContent>

                        {/* ── TAB: DISPENSADA ── */}
                        <TabsContent value="dispensada" className="space-y-4 outline-none">
                            <div className="bg-red-50 p-3 rounded-md border border-red-200 flex items-start gap-2">
                                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-800 leading-relaxed">
                                    <span className="font-bold">Procedimento excepcional.</span> Publicar sem assinatura requer embasamento legal. Esta decisão ficará marcada permanentemente nos relatórios de auditoria.
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
                                    Justificativa Legal / Embasamento <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    placeholder="Ex.: Assinatura dispensada conforme Portaria Normativa nº X/2026, que autoriza publicação emergencial em caso de calamidade pública declarada pelo Decreto nº Y/2026."
                                    value={justificativa}
                                    onChange={(e) => setJustificativa(e.target.value)}
                                    className="resize-none text-sm"
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                                    Despacho / Ato Formal (Opcional)
                                </Label>
                                <Input
                                    type="file"
                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                    onChange={handleFileChange}
                                    className="file:bg-slate-100 file:text-slate-700 file:border-0 file:rounded-md file:px-3 file:py-1 hover:file:bg-slate-200 file:mr-4 file:cursor-pointer text-sm"
                                />
                                {file && (
                                    <p className="text-[10px] text-emerald-600 font-medium">
                                        ✓ {file.name}
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <div className="pt-4 flex justify-end gap-3 border-t">
                            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={
                                    activeTab === 'pdf_assinado'
                                        ? 'bg-blue-600 hover:bg-blue-700 min-w-[180px]'
                                        : activeTab === 'manual'
                                            ? 'bg-amber-600 hover:bg-amber-700 min-w-[200px]'
                                            : 'bg-red-600 hover:bg-red-700 min-w-[180px]'
                                }
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {activeTab === 'pdf_assinado'
                                    ? 'Enviar PDF Assinado'
                                    : activeTab === 'manual'
                                        ? 'Registrar Assinatura Manual'
                                        : 'Confirmar Dispensa'}
                            </Button>
                        </div>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
