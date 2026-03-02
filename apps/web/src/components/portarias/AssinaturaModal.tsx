import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { FileSignature, PenTool, FileX2, Loader2, ShieldCheck, AlertTriangle, Info } from 'lucide-react'

interface AssinaturaModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    portariaId: string
    onSigned?: () => void
}

const MAX_FILE_MB = 5

function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // remove "data:...;base64," prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export function AssinaturaModal({ isOpen, onOpenChange, portariaId, onSigned }: AssinaturaModalProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState<'digital' | 'manual' | 'dispensada'>('digital')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [justificativa, setJustificativa] = useState('')
    const [file, setFile] = useState<File | null>(null)

    const resetForm = () => {
        setJustificativa('')
        setFile(null)
        setActiveTab('digital')
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
                description: `O comprovante deve ter no máximo ${MAX_FILE_MB}MB.`,
                variant: 'destructive'
            })
            return
        }
        setFile(selected)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (activeTab !== 'digital' && !justificativa.trim()) {
            toast({
                title: 'Justificativa obrigatória',
                description: 'Descreva detalhadamente o motivo da exceção.',
                variant: 'destructive'
            })
            return
        }

        if (activeTab === 'manual' && !file) {
            toast({
                title: 'Comprovante obrigatório',
                description: 'Anexe o documento assinado fisicamente (PDF ou imagem).',
                variant: 'destructive'
            })
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

            const tipoAssinatura = activeTab === 'digital' ? 'DIGITAL' :
                activeTab === 'manual' ? 'MANUAL' : 'DISPENSADA'

            const res = await fetch(`/api/portarias/${portariaId}/assinar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoAssinatura,
                    justificativa: justificativa.trim() || undefined,
                    comprovanteBase64,
                    comprovanteNome
                })
            })

            const data = await res.json()

            if (data.success) {
                toast({
                    title: 'Assinatura registrada!',
                    description: tipoAssinatura === 'DIGITAL'
                        ? 'Portaria assinada digitalmente. Pronta para publicação.'
                        : tipoAssinatura === 'MANUAL'
                            ? 'Assinatura manual registrada com comprovante. Pronta para publicação.'
                            : 'Assinatura dispensada com justificativa registrada. Pronta para publicação.'
                })
                handleClose(false)
                if (onSigned) onSigned()
            } else {
                toast({
                    title: 'Erro ao registrar assinatura',
                    description: data.error,
                    variant: 'destructive'
                })
            }
        } catch (error) {
            toast({
                title: 'Erro de conexão',
                description: 'Falha ao processar a requisição. Tente novamente.',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Registrar Assinatura</DialogTitle>
                    <DialogDescription>
                        Selecione o método de assinatura. Exceções exigem justificativa detalhada e ficam registradas na auditoria.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setJustificativa(''); setFile(null) }} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="digital" className="text-xs gap-1.5">
                            <FileSignature className="w-3.5 h-3.5" /> Digital
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="text-xs gap-1.5">
                            <PenTool className="w-3.5 h-3.5" /> Manual
                        </TabsTrigger>
                        <TabsTrigger value="dispensada" className="text-xs gap-1.5">
                            <FileX2 className="w-3.5 h-3.5" /> Dispensada
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">

                        {/* TAB: DIGITAL */}
                        <TabsContent value="digital" className="space-y-4 outline-none">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600 shrink-0 mt-0.5">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-blue-900 text-sm">Assinatura Digital — Rito Padrão</h4>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Ao confirmar, o sistema registrará sua autenticação criptográfica como signatário oficial. O hash SHA-256 do documento já foi calculado no momento da submissão.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB: MANUAL */}
                        <TabsContent value="manual" className="space-y-4 outline-none">
                            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-bold">Exceção ao rito padrão.</span> Use apenas quando o responsável assinou fisicamente o documento em papel, mas não no sistema. Todos os campos abaixo são obrigatórios e ficarão visíveis na auditoria.
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
                                <p className="text-[10px] text-slate-400">Descreva claramente: quem assinou, quando, e em qual documento físico.</p>
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
                                <p className="text-[10px] text-slate-400">PDF ou imagem (PNG/JPG). Máximo {MAX_FILE_MB}MB. Ficará disponível para consulta na timeline.</p>
                            </div>
                        </TabsContent>

                        {/* TAB: DISPENSADA */}
                        <TabsContent value="dispensada" className="space-y-4 outline-none">
                            <div className="bg-red-50 p-3 rounded-md border border-red-200 flex items-start gap-2">
                                <Info className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-800 leading-relaxed">
                                    <span className="font-bold">Procedimento excepcional.</span> Publicar sem nenhuma forma de assinatura requer embasamento legal ou despacho formal. Esta decisão ficará marcada permanentemente nos relatórios de auditoria da prefeitura.
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
                                <p className="text-[10px] text-slate-400">Inclua o número do ato normativo que ampara esta decisão.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-600 font-semibold uppercase tracking-wider">
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
                                        ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <div className="pt-4 flex justify-end gap-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleClose(false)}
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className={
                                    activeTab === 'digital'
                                        ? 'bg-blue-600 hover:bg-blue-700 min-w-[160px]'
                                        : activeTab === 'manual'
                                            ? 'bg-amber-600 hover:bg-amber-700 min-w-[160px]'
                                            : 'bg-red-600 hover:bg-red-700 min-w-[160px]'
                                }
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {activeTab === 'digital'
                                    ? 'Assinar Digitalmente'
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
