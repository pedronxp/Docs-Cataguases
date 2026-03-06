import { useState } from 'react'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Building2, Clock, FileText } from 'lucide-react'
import { DocumentPDFPreview } from './document-pdf-preview'

interface FilaItem {
    id: string
    portariaId: string
    tipoDocumento: string
    createdAt: string
    portaria: {
        titulo: string
        assinaturaStatus: string
        assinaturaJustificativa: string | null
        secretaria: {
            nome: string
            sigla: string
            cor: string
        }
    }
}

interface DocumentPreviewDialogProps {
    item: FilaItem | null
    proximoNumero: string | null
    isSubmitting: boolean
    onConfirm: () => void
    onCancel: () => void
}

function AssinaturaStatusBadge({ status }: { status: string }) {
    if (status === 'ASSINADA_DIGITAL') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" variant="outline">Assinada digitalmente</Badge>
    if (status === 'ASSINADA_MANUAL') return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100" variant="outline">Assinada manualmente</Badge>
    if (status === 'DISPENSADA_COM_JUSTIFICATIVA') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100" variant="outline">Assinatura dispensada</Badge>
    return <Badge variant="outline" className="text-slate-500">Assinatura pendente</Badge>
}

export function DocumentPreviewDialog({
    item,
    proximoNumero,
    isSubmitting,
    onConfirm,
    onCancel,
}: DocumentPreviewDialogProps) {
    const [activeTab, setActiveTab] = useState<'resumo' | 'preview'>('resumo')

    if (!item) return null

    return (
        <Dialog open onOpenChange={(open) => !open && !isSubmitting && onCancel()}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-semibold text-slate-900">Confirmar numeração</DialogTitle>
                    <DialogDescription>
                        O número será atribuído <strong>definitivamente</strong>. Esta operação não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="resumo" className="gap-2">
                            <FileText className="h-3.5 w-3.5" />
                            Resumo
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-2">
                            <FileText className="h-3.5 w-3.5" />
                            Visualizar Documento
                        </TabsTrigger>
                    </TabsList>

                    {/* Aba Resumo */}
                    <TabsContent value="resumo" className="mt-4 space-y-3">
                        {/* Documento */}
                        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Documento</p>
                                <p className="text-sm font-semibold text-slate-800 leading-snug">{item.portaria.titulo}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Secretaria</p>
                                        <p className="text-sm font-medium text-slate-700">{item.portaria.secretaria.nome}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Entrada</p>
                                        <p className="text-sm font-medium text-slate-700">
                                            {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Assinatura</p>
                                <AssinaturaStatusBadge status={item.portaria.assinaturaStatus} />
                                {item.portaria.assinaturaJustificativa && (
                                    <p className="text-xs text-slate-500 mt-1 italic">{item.portaria.assinaturaJustificativa}</p>
                                )}
                            </div>
                        </div>

                        {/* Número que será atribuído */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Número estimado</p>
                                <p className="text-xl font-bold text-slate-900 font-mono">{proximoNumero ?? '—'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Será atribuído atomicamente ao confirmar</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">Operação atômica</Badge>
                        </div>
                    </TabsContent>

                    {/* Aba Preview PDF */}
                    <TabsContent value="preview" className="mt-4">
                        <DocumentPDFPreview portariaId={item.portariaId} />
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={onConfirm} disabled={isSubmitting} className="font-semibold">
                        {isSubmitting
                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</>
                            : 'Confirmar numeração'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
