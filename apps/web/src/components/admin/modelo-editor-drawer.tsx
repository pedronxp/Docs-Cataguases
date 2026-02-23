import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus, Trash2, FileText,
    Settings2, Save, Type, Calendar,
    Hash, List, AlignLeft, CreditCard, DollarSign
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ModeloDocumento, ModeloVariavel } from '@/types/domain'

interface ModeloEditorDrawerProps {
    modelo: ModeloDocumento | null // null means creating new
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (modelo: Omit<ModeloDocumento, 'id'>) => Promise<void>
}

const TIPO_VARIAVEL_ICONS = {
    texto: <Type size={14} />,
    data: <Calendar size={14} />,
    numero: <Hash size={14} />,
    select: <List size={14} />,
    textarea: <AlignLeft size={14} />,
    cpf: <CreditCard size={14} />,
    moeda: <DollarSign size={14} />,
}

export function ModeloEditorDrawer({ modelo, open, onOpenChange, onSave }: ModeloEditorDrawerProps) {
    const [formData, setFormData] = useState<Omit<ModeloDocumento, 'id'>>({
        nome: '',
        descricao: '',
        secretariaId: null,
        docxTemplateUrl: '',
        variaveis: [],
        ativo: true,
    })
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (modelo) {
            setFormData({
                nome: modelo.nome,
                descricao: modelo.descricao,
                secretariaId: modelo.secretariaId,
                docxTemplateUrl: modelo.docxTemplateUrl,
                variaveis: [...modelo.variaveis],
                ativo: modelo.ativo,
            })
        } else {
            setFormData({
                nome: '',
                descricao: '',
                secretariaId: null,
                docxTemplateUrl: '',
                variaveis: [],
                ativo: true,
            })
        }
    }, [modelo, open])

    const handleAddVariable = () => {
        const newVar: ModeloVariavel = {
            id: `temp-${Date.now()}`,
            modeloId: modelo?.id || '',
            chave: '',
            label: '',
            tipo: 'texto',
            opcoes: [],
            obrigatorio: true,
            ordem: formData.variaveis.length + 1,
            descricao: '',
        }
        setFormData(prev => ({
            ...prev,
            variaveis: [...prev.variaveis, newVar]
        }))
    }

    const handleUpdateVariable = (index: number, updates: Partial<ModeloVariavel>) => {
        const newVars = [...formData.variaveis]
        newVars[index] = { ...newVars[index], ...updates }
        setFormData(prev => ({ ...prev, variaveis: newVars }))
    }

    const handleRemoveVariable = (index: number) => {
        setFormData(prev => ({
            ...prev,
            variaveis: prev.variaveis.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            await onSave(formData)
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl flex flex-col p-0">
                <ScrollArea className="flex-1 px-6 pt-6 overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <div className="flex items-center gap-2 text-primary">
                            <Settings2 className="h-6 w-6" />
                            <SheetTitle className="text-2xl font-black">
                                {modelo ? 'Editar Modelo' : 'Novo Modelo de Documento'}
                            </SheetTitle>
                        </div>
                        <SheetDescription>
                            Configure o template DOCX e defina as variáveis dinâmicas que serão preenchidas no wizard.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6 pb-20">
                        {/* Seção 1: Informações Básicas */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">Informações Básicas</h3>
                            <div className="grid gap-4 p-4 border rounded-xl bg-slate-50/50">
                                <div className="grid gap-2">
                                    <Label htmlFor="nome" className="font-bold">Nome do Modelo</Label>
                                    <Input
                                        id="nome"
                                        value={formData.nome}
                                        onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                        placeholder="Ex: Portaria de Nomeação"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="descricao" className="font-bold">Descrição curta</Label>
                                    <Input
                                        id="descricao"
                                        value={formData.descricao}
                                        onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                        placeholder="Para que serve este modelo?"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="font-bold">Template DOCX (Simulação)</Label>
                                    <div className="flex items-center gap-2 border-2 border-dashed rounded-lg p-3 bg-white hover:border-primary/50 transition-colors cursor-pointer group">
                                        <FileText className="text-slate-400 group-hover:text-primary transition-colors" />
                                        <span className="text-sm text-slate-500 font-medium">modelo-oficial.docx</span>
                                        <Badge variant="outline" className="ml-auto text-[10px] uppercase font-bold text-slate-400">Alterar</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Variáveis do Documento */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-1">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Variáveis Dinâmicas</h3>
                                <Button size="sm" variant="ghost" className="text-primary font-bold h-8" onClick={handleAddVariable}>
                                    <Plus className="mr-1 h-4 w-4" /> Add Variável
                                </Button>
                            </div>

                            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="w-[30%] font-bold text-slate-700">Etiqueta e Chave</TableHead>
                                            <TableHead className="w-[30%] font-bold text-slate-700">Tipo de Dado</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {formData.variaveis.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-32 text-center text-slate-400 font-medium italic">
                                                    Nenhuma variável definida. Adicione campos para o usuário preencher.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            formData.variaveis.map((v, idx) => (
                                                <TableRow key={v.id} className="group">
                                                    <TableCell className="align-top">
                                                        <div className="space-y-1.5 pt-1">
                                                            <Input
                                                                value={v.label}
                                                                onChange={e => handleUpdateVariable(idx, { label: e.target.value })}
                                                                placeholder="Pergunta ao usuário"
                                                                className="h-8 text-xs font-bold border-transparent bg-transparent hover:border-slate-200 focus:bg-white transition-all px-1.5"
                                                            />
                                                            <Input
                                                                value={v.chave}
                                                                onChange={e => handleUpdateVariable(idx, { chave: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                                                                placeholder="CHAVE_NO_DOCX"
                                                                className="h-7 text-[10px] font-mono border-transparent bg-transparent hover:border-slate-200 focus:bg-white transition-all px-1.5 text-slate-500"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="align-top pt-2.5">
                                                        <Select
                                                            value={v.tipo}
                                                            onValueChange={(val: any) => handleUpdateVariable(idx, { tipo: val })}
                                                        >
                                                            <SelectTrigger className="h-8 text-[11px] font-semibold bg-slate-50 border-slate-200 min-w-[140px]">
                                                                <div className="flex items-center gap-2">
                                                                    {TIPO_VARIAVEL_ICONS[v.tipo]}
                                                                    <SelectValue />
                                                                </div>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="texto" className="text-xs">Texto Curto</SelectItem>
                                                                <SelectItem value="textarea" className="text-xs">Texto Longo</SelectItem>
                                                                <SelectItem value="data" className="text-xs">Data</SelectItem>
                                                                <SelectItem value="numero" className="text-xs">Número</SelectItem>
                                                                <SelectItem value="select" className="text-xs">Seleção (Lista)</SelectItem>
                                                                <SelectItem value="cpf" className="text-xs font-bold text-primary">CPF (Máscara)</SelectItem>
                                                                <SelectItem value="moeda" className="text-xs font-bold text-primary">Moeda (Máscara)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {v.tipo === 'select' && (
                                                            <Input
                                                                placeholder="Opções (sep. por vírgula)"
                                                                value={v.opcoes.join(',')}
                                                                onChange={e => handleUpdateVariable(idx, { opcoes: e.target.value.split(',').filter(o => !!o) })}
                                                                className="mt-2 h-7 text-[10px] bg-white border-blue-100"
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="align-top pt-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleRemoveVariable(idx)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="p-3 border-t bg-slate-50/30">
                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed border-2 hover:border-primary hover:text-primary transition-all font-bold h-10 bg-white"
                                        onClick={handleAddVariable}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar nova variável ao formulário
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="p-6 border-t bg-slate-50 flex sm:flex-row gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-bold">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90 font-bold">
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {modelo ? 'Salvar Alterações' : 'Criar Modelo'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

function Loader2(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
}
