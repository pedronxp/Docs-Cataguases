import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileText, Settings, Copy, Power } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import { modeloService } from '@/services/modelo.service'
import type { ModeloDocumento } from '@/types/domain'
import { Skeleton } from '@/components/ui/skeleton'

import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2 } from 'lucide-react'

export const Route = createFileRoute('/_sistema/admin/modelos')({
    component: ModelosDocumentoPage,
})

function ModelosDocumentoPage() {
    const [modelos, setModelos] = useState<ModeloDocumento[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [openDialog, setOpenDialog] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [novoModelo, setNovoModelo] = useState({
        nome: '',
        descricao: '',
        docxTemplateUrl: '',
        secretariaId: null as string | null,
        variaveis: [] as any[]
    })

    const { toast } = useToast()

    const loadData = async () => {
        setLoading(true)
        const res = await modeloService.listarModelosAdmin()
        if (res.success) {
            setModelos(res.data)
        } else {
            toast({
                title: 'Erro ao carregar modelos',
                description: res.error,
                variant: 'destructive'
            })
        }
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSalvar = async () => {
        if (!novoModelo.nome || !novoModelo.docxTemplateUrl) {
            toast({ title: 'Campos obrigatórios', description: 'Nome e URL do template são necessários.', variant: 'destructive' })
            return
        }

        setIsSaving(true)
        const res = await modeloService.criarModelo(novoModelo)
        if (res.success) {
            toast({ title: 'Sucesso', description: 'Modelo criado com sucesso!' })
            setOpenDialog(false)
            setNovoModelo({ nome: '', descricao: '', docxTemplateUrl: '', secretariaId: null, variaveis: [] })
            loadData()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setIsSaving(false)
    }

    const addVariavel = () => {
        setNovoModelo(prev => ({
            ...prev,
            variaveis: [...prev.variaveis, { chave: '', label: '', tipo: 'texto', ordem: prev.variaveis.length }]
        }))
    }

    const removeVariavel = (index: number) => {
        setNovoModelo(prev => ({
            ...prev,
            variaveis: prev.variaveis.filter((_, i) => i !== index)
        }))
    }

    const updateVariavel = (index: number, field: string, value: any) => {
        const newVars = [...novoModelo.variaveis]
        newVars[index] = { ...newVars[index], [field]: value }
        setNovoModelo(prev => ({ ...prev, variaveis: newVars }))
    }

    const handleAcao = (acao: string) => {
        if (acao === 'Novo Modelo') {
            setOpenDialog(true)
            return
        }
        toast({
            title: "Em Desenvolvimento",
            description: `A ação '${acao}' será totalmente implementada na próxima fase.`,
        })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsSaving(true)
        toast({ title: 'Enviando...', description: 'Estamos subindo seu arquivo Word para o servidor.' })

        const res = await modeloService.uploadTemplate(file)
        if (res.success) {
            setNovoModelo(prev => ({ ...prev, docxTemplateUrl: res.data }))
            toast({ title: 'Upload concluído!', description: 'Arquivo armazenado com sucesso.' })

            // Inicia análise automática
            handleAnalisar(res.data)
        } else {
            toast({ title: 'Erro no Upload', description: res.error, variant: 'destructive' })
        }
        setIsSaving(false)
    }

    const handleAnalisar = async (url: string) => {
        setIsAnalyzing(true)
        toast({ title: 'Analisando...', description: 'Buscando variáveis {{...}} dentro do seu documento Word.' })

        const res = await modeloService.analisarModelo(url)
        if (res.success) {
            setNovoModelo(prev => ({
                ...prev,
                variaveis: res.data.variaveis
            }))
            toast({
                title: 'Análise concluída!',
                description: `Encontramos ${res.data.variaveis.length} variáveis no documento.`
            })
        } else {
            toast({
                title: 'Aviso',
                description: 'Não foi possível analisar as variáveis automaticamente. Você pode adicioná-las manualmente.',
                variant: 'default'
            })
        }
        setIsAnalyzing(false)
    }

    const modelosFiltrados = modelos.filter(m =>
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.descricao?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Modelos de Documento</h2>
                    <p className="text-sm text-slate-500">Gerencie os templates DOCX base para a geração de portarias e documentos.</p>
                </div>
                <Button onClick={() => handleAcao('Novo Modelo')} className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Modelo
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white rounded-t-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelos por nome ou descrição..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[300px]">Nome do Modelo</TableHead>
                                <TableHead>Secretaria</TableHead>
                                <TableHead>Variáveis Mapeadas</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : modelosFiltrados.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-500 italic">
                                        Nenhum modelo encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                modelosFiltrados.map((modelo) => (
                                    <TableRow key={modelo.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-1 p-1.5 rounded-md ${modelo.ativo ? 'bg-blue-50 text-[#1351B4]' : 'bg-slate-100 text-slate-500'}`}>
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`font-semibold ${modelo.ativo ? 'text-slate-800' : 'text-slate-500'}`}>{modelo.nome}</span>
                                                    <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">{modelo.descricao || 'Sem descrição.'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-normal">
                                                {modelo.secretariaId ? 'Especifica' : 'Todas (Global)'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-blue-50 text-[#1351B4]">
                                                    {modelo.variaveis?.length || 0} Variáveis
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={modelo.ativo ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'text-slate-500 border-slate-300 bg-slate-50'}>
                                                {modelo.ativo ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button onClick={() => handleAcao('Duplicar')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Duplicar">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button onClick={() => handleAcao('Configurar')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Configurar">
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                                {!modelo.ativo && (
                                                    <Button onClick={() => handleAcao('Ativar')} variant="ghost" size="icon" className="text-slate-500 hover:text-emerald-600" title="Ativar">
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal Novo Modelo */}
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Criar Novo Modelo de Documento</DialogTitle>
                        <DialogDescription>Define o nome e as variáveis do template DOCX.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Modelo</Label>
                                <Input
                                    placeholder="Ex: Portaria de Nomeação"
                                    value={novoModelo.nome}
                                    onChange={e => setNovoModelo({ ...novoModelo, nome: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Template Word (.docx)</Label>
                                <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${novoModelo.docxTemplateUrl ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                    {novoModelo.docxTemplateUrl ? (
                                        <div className="text-center space-y-2">
                                            <FileText className="h-10 w-10 text-green-600 mx-auto" />
                                            <p className="text-sm font-medium text-green-700">Arquivo Carregado!</p>
                                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{novoModelo.docxTemplateUrl}</p>
                                            <Button variant="ghost" size="sm" onClick={() => setNovoModelo({ ...novoModelo, docxTemplateUrl: '' })} className="text-xs text-red-500 hover:text-red-600">
                                                Remover e subir outro
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-3">
                                            <div className="relative">
                                                <Button variant="outline" size="sm" className="relative z-10" disabled={isSaving || isAnalyzing}>
                                                    <Plus className="h-4 w-4 mr-2" /> Selecionar DOCX
                                                </Button>
                                                <input
                                                    type="file"
                                                    accept=".docx"
                                                    onChange={handleFileUpload}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                                    disabled={isSaving || isAnalyzing}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400">Arraste um arquivo .docx para configurar o template.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Textarea
                                placeholder="Breve descrição do uso deste modelo..."
                                value={novoModelo.descricao}
                                onChange={e => setNovoModelo({ ...novoModelo, descricao: e.target.value })}
                            />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <Label className="text-base font-semibold">Variáveis Dinâmicas</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addVariavel}>
                                    <Plus className="h-4 w-4 mr-1" /> Add Campo
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {novoModelo.variaveis.map((v, i) => (
                                    <div key={i} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Chave (ex: nome_servidor)</Label>
                                            <Input
                                                value={v.chave}
                                                onChange={e => updateVariavel(i, 'chave', e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-xs">Label (ex: Nome do Servidor)</Label>
                                            <Input
                                                value={v.label}
                                                onChange={e => updateVariavel(i, 'label', e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <Label className="text-xs">Tipo</Label>
                                            <Select value={v.tipo} onValueChange={val => updateVariavel(i, 'tipo', val)}>
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="texto">Texto</SelectItem>
                                                    <SelectItem value="data">Data</SelectItem>
                                                    <SelectItem value="selecao">Seleção</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeVariavel(i)} className="text-red-500 h-8 w-8">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {novoModelo.variaveis.length === 0 && (
                                    <p className="text-center text-xs text-slate-400 py-4 border-2 border-dashed rounded-lg">
                                        Nenhuma variável adicionada. Utilize o botão acima.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSalvar} disabled={isSaving || isAnalyzing} className="bg-[#1351B4]">
                            {(isSaving || isAnalyzing) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {isAnalyzing ? 'Analisando DOCX...' : 'Salvar Modelo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
