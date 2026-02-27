import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { FileSignature, PenTool, FileX2, UploadCloud, Loader2 } from 'lucide-react'
import { portariaService } from '@/services/portaria.service'

interface AssinaturaModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    portariaId: string
    onSigned?: () => void
}

export function AssinaturaModal({ isOpen, onOpenChange, portariaId, onSigned }: AssinaturaModalProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('digital')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [justificativa, setJustificativa] = useState('')
    const [file, setFile] = useState<File | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (activeTab !== 'digital' && !justificativa.trim()) {
            toast({
                title: 'Justificativa Obrigatória',
                description: 'Por favor, informe a justificativa para este tipo de assinatura.',
                variant: 'destructive'
            })
            return
        }

        setIsSubmitting(true)

        try {
            let comprovanteUrl = undefined
            if (file) {
                comprovanteUrl = `https://armazenamentofake.gov.br/${file.name}`
            }

            const tipoAssinatura = activeTab === 'digital' ? 'DIGITAL' :
                activeTab === 'manual' ? 'MANUAL' : 'DISPENSADA'

            const res = await fetch(`/api/portarias/${portariaId}/assinar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipoAssinatura,
                    justificativa: justificativa || undefined,
                    comprovanteUrl
                })
            })

            const data = await res.json()

            if (data.success) {
                toast({
                    title: 'Sucesso!',
                    description: 'Assinatura processada. A Portaria foi enviada para a Fila do Jornal.',
                })
                onOpenChange(false)
                if (onSigned) onSigned()
            } else {
                toast({
                    title: 'Erro ao assinar',
                    description: data.error,
                    variant: 'destructive'
                })
            }
        } catch (error) {
            toast({
                title: 'Erro de conexão',
                description: 'Falha ao processar a requisição de assinatura.',
                variant: 'destructive'
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl">Assinar Portaria</DialogTitle>
                    <DialogDescription>
                        Selecione o método oficial de assinatura ou justifique a alteração do rito padrão.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="digital" className="text-xs">
                            <FileSignature className="w-4 h-4 mr-2" /> Digital
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="text-xs">
                            <PenTool className="w-4 h-4 mr-2" /> Manual
                        </TabsTrigger>
                        <TabsTrigger value="dispensada" className="text-xs">
                            <FileX2 className="w-4 h-4 mr-2" /> Ausente
                        </TabsTrigger>
                    </TabsList>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <TabsContent value="digital" className="space-y-4 pt-4 outline-none">
                            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600 shrink-0">
                                    <FileSignature className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-medium text-blue-900 text-sm">Assinatura Digital via Certificado</h4>
                                    <p className="text-xs text-blue-700/80 leading-relaxed">
                                        Seu usuário será autenticado criptograficamente. Ao confirmar, o sistema vai gerar o Hash oficial do documento e inserir na Fila do Jornal.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="manual" className="space-y-4 pt-4 outline-none">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Justificativa da Exceção *</Label>
                                    <Textarea
                                        placeholder="Por que este documento foi assinado fisicamente na caneta em vez do sistema?"
                                        value={justificativa}
                                        onChange={(e) => setJustificativa(e.target.value)}
                                        required={activeTab === 'manual'}
                                        className="resize-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Anexar Documento Escaneado *</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={handleFileChange}
                                            required={activeTab === 'manual'}
                                            className="file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-3 file:py-1 hover:file:bg-blue-100 file:mr-4 file:cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400">PDF ou Imagem (Máx 5MB). Ficará visível na Timeline de auditoria.</p>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="dispensada" className="space-y-4 pt-4 outline-none">
                            <div className="space-y-3">
                                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
                                    <p className="text-xs text-amber-800">
                                        <span className="font-bold">Atenção:</span> Publicar um documento sem a assinatura final é um procedimento de exceção e ficará marcado nos relatórios de auditoria da prefeitura.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Justificativa Legal / Embasamento *</Label>
                                    <Textarea
                                        placeholder="Ex: Assinatura dispensada conforme portaria normativa X ou despacho anexo devido a afastamento urgente..."
                                        value={justificativa}
                                        onChange={(e) => setJustificativa(e.target.value)}
                                        required={activeTab === 'dispensada'}
                                        className="resize-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Anexo Comprobatório (Opcional)</Label>
                                    <Input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={handleFileChange}
                                        className="file:bg-slate-100 file:text-slate-700 file:border-0 file:rounded-md file:px-3 file:py-1 hover:file:bg-slate-200 file:mr-4 file:cursor-pointer"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <div className="pt-6 flex justify-end gap-3 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[140px]">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {activeTab === 'digital' ? 'Assinar Original' : activeTab === 'manual' ? 'Salvar Anexo' : 'Confirmar Publicação'}
                            </Button>
                        </div>
                    </form>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
