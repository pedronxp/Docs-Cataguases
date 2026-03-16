import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2, HelpCircle, AlertTriangle, Type, Hash, Calendar, CalendarDays, FileDigit, Coins, FileSignature, List, X, Loader2, Copy, Check, ExternalLink, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { variavelService } from '@/services/variavel.service'
import type { VariavelSistema } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

const DEFAULT_FORM = { id: '', chave: '', valor: '', descricao: '', resolvidaAutomaticamente: false, tipo: 'texto' }

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    texto:       { label: 'Texto',       icon: Type,          color: 'bg-[#f8f9fa] text-[#333333] border-[#cccccc]' },
    numero:      { label: 'Número',      icon: Hash,          color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]' },
    data:        { label: 'Data',        icon: Calendar,      color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]' },
    data_extenso:{ label: 'Data Extenso',icon: CalendarDays,  color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]' },
    cpf:         { label: 'CPF',         icon: FileDigit,     color: 'bg-[#fff5eb] text-[#c55a00] border-[#c55a00]' },
    moeda:       { label: 'Moeda',       icon: Coins,         color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]' },
    assinatura:  { label: 'Assinatura',  icon: FileSignature, color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]' },
    select:      { label: 'Lista',       icon: List,          color: 'bg-[#fef6e0] text-[#a06b00] border-[#a06b00]' },
}

function TipoBadge({ tipo }: { tipo: string }) {
    const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.texto
    const Icon = cfg.icon
    return (
        <Badge variant="outline" className={`gap-1.5 font-bold text-xs px-2.5 py-1 rounded ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </Badge>
    )
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className={`h-8 px-3 text-xs font-bold rounded transition-all ${
                copied
                    ? 'bg-[#e6f4eb] text-[#008833] border-[#008833]'
                    : 'border-[#cccccc] text-[#555555] hover:bg-[#f0f4f8]'
            }`}
        >
            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            {copied ? 'Copiado!' : 'Copiar'}
        </Button>
    )
}

function VariaveisGlobaisPage() {
    const { toast } = useToast()
    const [variaveis, setVariaveis] = useState<VariavelSistema[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState(DEFAULT_FORM)
    const [deleteTarget, setDeleteTarget] = useState<VariavelSistema | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [selectedVar, setSelectedVar] = useState<VariavelSistema | null>(null)

    useEffect(() => { loadVariaveis() }, [])

    async function loadVariaveis() {
        setLoading(true)
        const res = await variavelService.listarVariaveis()
        if (res.success) setVariaveis(res.data)
        else toast({ title: 'Erro ao carregar variáveis', description: res.error, variant: 'destructive' })
        setLoading(false)
    }

    const variavisFiltradas = variaveis.filter(v =>
        v.chave.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.descricao ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const openCreateModal = () => { setFormData(DEFAULT_FORM); setIsModalOpen(true) }

    const openEditModal = (v: VariavelSistema) => {
        setFormData({ id: v.id, chave: v.chave, valor: v.valor, descricao: v.descricao || '', resolvidaAutomaticamente: !!v.resolvidaAutomaticamente, tipo: 'texto' })
        setSelectedVar(null)
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.chave || !formData.valor) {
            toast({ title: 'Aviso', description: 'Preencha a chave e o valor da variável.', variant: 'destructive' })
            return
        }
        const formattedKey = formData.chave.toUpperCase().replace(/[^A-Z0-9_]/g, '')
        const finalKey = formattedKey.startsWith('SYS_') ? formattedKey : `SYS_${formattedKey}`
        setSaving(true)
        const res = await variavelService.salvarVariavel({ ...formData, chave: finalKey })
        if (res.success) {
            toast({ title: 'Sucesso', description: 'Variável salva.', className: 'bg-green-600 text-white' })
            setIsModalOpen(false)
            loadVariaveis()
        } else {
            toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const res = await variavelService.excluirVariavel(deleteTarget.id)
        if (res.success) {
            toast({ title: 'Variável excluída', description: `{{${deleteTarget.chave}}} foi removida.` })
            setDeleteTarget(null)
            setSelectedVar(null)
            loadVariaveis()
        } else {
            toast({ title: 'Erro ao excluir', description: res.error, variant: 'destructive' })
        }
        setDeleting(false)
    }

    const isAutomatic = !!formData.resolvidaAutomaticamente

    const countStatic = variaveis.filter(v => !v.resolvidaAutomaticamente).length
    const countDynamic = variaveis.filter(v => v.resolvidaAutomaticamente).length

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Variáveis Globais</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        Tags de substituição automática para modelos de documento.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" asChild className="w-full sm:w-auto border-[#cccccc] text-[#555555] hover:bg-[#f0f4f8] rounded font-bold">
                        <Link to="/admin/variaveis-dicas">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Dicas de Uso
                        </Link>
                    </Button>
                    <Button onClick={openCreateModal} className="bg-[#1351B4] hover:bg-[#0c326f] text-white w-full sm:w-auto font-bold rounded shadow-none">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Variável
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#edf5ff] flex items-center justify-center shrink-0">
                        <Variable className="h-6 w-6 text-[#1351b4]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{variaveis.length}</p>
                        <p className="text-sm text-[#555555] font-medium">Total de Variáveis</p>
                    </div>
                </div>
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#edf5ff] flex items-center justify-center shrink-0">
                        <Type className="h-6 w-6 text-[#1351b4]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{countStatic}</p>
                        <p className="text-sm text-[#555555] font-medium">Estáticas (manual)</p>
                    </div>
                </div>
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#e6f4eb] flex items-center justify-center shrink-0">
                        <Hash className="h-6 w-6 text-[#008833]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{countDynamic}</p>
                        <p className="text-sm text-[#555555] font-medium">Dinâmicas (sistema)</p>
                    </div>
                </div>
            </div>

            {/* Tabela simplificada */}
            <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                <div className="p-5 border-b border-[#e6e6e6] flex flex-col sm:flex-row gap-3 bg-[#f8f9fa] flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-[#555555]" />
                        <Input
                            placeholder="Buscar por chave ou descrição..."
                            className="pl-10 bg-white border-[#cccccc] h-11 focus-visible:ring-[#1351b4] focus-visible:border-[#1351b4] rounded text-base"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 px-3 text-[#555555] hover:text-[#e52207] hover:bg-[#ffefec]"
                            onClick={() => setSearchQuery('')}
                        >
                            <X className="h-4 w-4 mr-1" /> Limpar
                        </Button>
                    )}
                    <p className="text-sm text-[#555555] ml-auto hidden sm:block">
                        {variavisFiltradas.length} variáve{variavisFiltradas.length === 1 ? 'l' : 'is'}
                    </p>
                </div>
                <CardContent className="p-0">
                    {/* Desktop table — 3 colunas */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader className="bg-[#f8f9fa] border-b-2 border-[#1351b4]">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-[#333333] font-bold py-4">Variável</TableHead>
                                    <TableHead className="text-[#333333] font-bold py-4 w-[120px]">Status</TableHead>
                                    <TableHead className="text-right text-[#333333] font-bold py-4 w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-16 text-[#555555] font-medium text-lg">
                                            <div className="flex items-center justify-center gap-3">
                                                <Loader2 className="h-5 w-5 animate-spin text-[#1351b4]" />
                                                Carregando variáveis...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : variavisFiltradas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-16 text-[#555555] font-medium text-lg">
                                            {searchQuery ? `Nenhuma variável encontrada para "${searchQuery}".` : 'Nenhuma variável cadastrada.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    variavisFiltradas.map(v => (
                                        <TableRow
                                            key={v.id}
                                            className={`hover:bg-[#f0f4f8] transition-colors border-b border-[#e6e6e6] cursor-pointer ${v.resolvidaAutomaticamente ? 'bg-[#fafbfc]' : ''}`}
                                            onClick={() => setSelectedVar(v)}
                                        >
                                            <TableCell className="py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                                                        v.resolvidaAutomaticamente ? 'bg-[#e6f4eb]' : 'bg-[#edf5ff]'
                                                    }`}>
                                                        <Variable className={`h-4 w-4 ${v.resolvidaAutomaticamente ? 'text-[#008833]' : 'text-[#1351b4]'}`} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <code className="font-mono text-sm font-bold text-[#333333]">{`{{${v.chave}}}`}</code>
                                                        {v.descricao && (
                                                            <p className="text-xs text-[#555555] mt-0.5 truncate max-w-lg">{v.descricao}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Badge variant="outline" className={
                                                    v.resolvidaAutomaticamente
                                                        ? 'text-[#008833] border-[#008833] bg-[#e6f4eb] font-bold px-2.5 py-1 rounded text-xs'
                                                        : 'text-[#1351b4] border-[#1351b4] bg-[#edf5ff] font-bold px-2.5 py-1 rounded text-xs'
                                                }>
                                                    {v.resolvidaAutomaticamente ? 'Dinâmica' : 'Estática'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right py-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => openEditModal(v)}
                                                        className="text-[#1351b4] hover:bg-[#edf5ff] h-8 w-8"
                                                        title="Editar"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    {!v.resolvidaAutomaticamente && (
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            onClick={() => setDeleteTarget(v)}
                                                            className="text-[#e52207] hover:bg-[#ffefec] h-8 w-8"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-[#e6e6e6]">
                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-16 text-[#555555]">
                                <Loader2 className="h-5 w-5 animate-spin text-[#1351b4]" />
                                Carregando...
                            </div>
                        ) : variavisFiltradas.length === 0 ? (
                            <div className="text-center py-16 text-[#555555] font-medium px-4">
                                {searchQuery ? `Nenhuma variável encontrada para "${searchQuery}".` : 'Nenhuma variável cadastrada.'}
                            </div>
                        ) : (
                            variavisFiltradas.map(v => (
                                <div
                                    key={v.id}
                                    className={`p-4 space-y-2 cursor-pointer active:bg-[#f0f4f8] transition-colors ${
                                        v.resolvidaAutomaticamente ? 'bg-[#fafbfc]' : 'bg-white'
                                    }`}
                                    onClick={() => setSelectedVar(v)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Variable className={`h-4 w-4 shrink-0 ${v.resolvidaAutomaticamente ? 'text-[#008833]' : 'text-[#1351b4]'}`} />
                                            <code className="font-mono text-sm font-bold text-[#333333] truncate">{`{{${v.chave}}}`}</code>
                                        </div>
                                        <Badge variant="outline" className={
                                            v.resolvidaAutomaticamente
                                                ? 'text-[#008833] border-[#008833] bg-[#e6f4eb] font-bold px-2 py-0.5 rounded text-xs shrink-0'
                                                : 'text-[#1351b4] border-[#1351b4] bg-[#edf5ff] font-bold px-2 py-0.5 rounded text-xs shrink-0'
                                        }>
                                            {v.resolvidaAutomaticamente ? 'Dinâmica' : 'Estática'}
                                        </Badge>
                                    </div>
                                    {v.descricao && (
                                        <p className="text-xs text-[#555555] pl-6 truncate">{v.descricao}</p>
                                    )}
                                    <p className="text-xs text-[#1351b4] font-medium pl-6 flex items-center gap-1">
                                        <ExternalLink className="h-3 w-3" /> Clique para ver detalhes
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Sheet lateral — Detalhes da variável */}
            <Sheet open={!!selectedVar} onOpenChange={open => { if (!open) setSelectedVar(null) }}>
                <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto p-0">
                    {selectedVar && (
                        <div className="flex flex-col h-full">
                            {/* Header do Sheet */}
                            <div className="p-6 border-b border-[#e6e6e6] bg-[#f8f9fa]">
                                <SheetHeader>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                                            selectedVar.resolvidaAutomaticamente ? 'bg-[#e6f4eb]' : 'bg-[#edf5ff]'
                                        }`}>
                                            <Variable className={`h-5 w-5 ${selectedVar.resolvidaAutomaticamente ? 'text-[#008833]' : 'text-[#1351b4]'}`} />
                                        </div>
                                        <div>
                                            <SheetTitle className="text-lg font-black text-[#333333]">Detalhes da Variável</SheetTitle>
                                            <SheetDescription className="text-xs text-[#555555]">
                                                {selectedVar.resolvidaAutomaticamente ? 'Gerada automaticamente pelo sistema' : 'Configurada manualmente'}
                                            </SheetDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className={
                                            selectedVar.resolvidaAutomaticamente
                                                ? 'text-[#008833] border-[#008833] bg-[#e6f4eb] font-bold px-2.5 py-1 rounded text-xs'
                                                : 'text-[#1351b4] border-[#1351b4] bg-[#edf5ff] font-bold px-2.5 py-1 rounded text-xs'
                                        }>
                                            {selectedVar.resolvidaAutomaticamente ? 'Dinâmica' : 'Estática'}
                                        </Badge>
                                        <TipoBadge tipo="texto" />
                                    </div>
                                </SheetHeader>
                            </div>

                            {/* Corpo do Sheet */}
                            <div className="flex-1 p-6 space-y-6">
                                {/* Chave */}
                                <div>
                                    <p className="text-xs font-bold text-[#555555] uppercase tracking-wider mb-2">Chave (Tag)</p>
                                    <code className="font-mono text-lg font-black text-[#333333] bg-[#f8f9fa] px-3 py-2 rounded border border-[#e6e6e6] block text-center">
                                        {`{{${selectedVar.chave}}}`}
                                    </code>
                                </div>

                                {/* Valor Resolvido */}
                                <div>
                                    <p className="text-xs font-bold text-[#555555] uppercase tracking-wider mb-2">Valor Resolvido</p>
                                    <div className="bg-white border border-[#e6e6e6] rounded p-3">
                                        {selectedVar.resolvidaAutomaticamente ? (
                                            <p className="text-sm font-mono text-[#555555] italic">
                                                Autogerado via Sistema — valor resolvido em tempo de execução.
                                            </p>
                                        ) : (
                                            <p className="text-sm text-[#333333] font-medium break-words">{selectedVar.valor}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Descrição */}
                                {selectedVar.descricao && (
                                    <div>
                                        <p className="text-xs font-bold text-[#555555] uppercase tracking-wider mb-2">Descrição</p>
                                        <div className="bg-white border border-[#e6e6e6] rounded p-3">
                                            <p className="text-sm text-[#555555] leading-relaxed">{selectedVar.descricao}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Como usar */}
                                <div className="bg-[#edf5ff] border border-[#1351b4]/20 rounded p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="h-4 w-4 text-[#1351b4]" />
                                        <p className="text-sm font-bold text-[#1351b4]">Como usar no template</p>
                                    </div>
                                    <p className="text-xs text-[#555555] mb-3">
                                        Copie a tag abaixo e cole no seu arquivo .docx ou diretamente no editor de modelos:
                                    </p>
                                    <div className="flex items-center justify-between gap-2 bg-white border border-[#cccccc] rounded px-3 py-2">
                                        <code className="font-mono text-sm font-bold text-[#333333]">
                                            {`{{${selectedVar.chave}}}`}
                                        </code>
                                        <CopyButton text={`{{${selectedVar.chave}}}`} />
                                    </div>
                                </div>
                            </div>

                            {/* Footer do Sheet */}
                            <div className="p-6 border-t border-[#e6e6e6] bg-[#f8f9fa] flex gap-2">
                                <Button
                                    onClick={() => openEditModal(selectedVar)}
                                    className="flex-1 bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold rounded shadow-none h-10"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                                {!selectedVar.resolvidaAutomaticamente && (
                                    <Button
                                        variant="outline"
                                        onClick={() => { setDeleteTarget(selectedVar); setSelectedVar(null) }}
                                        className="border-[#e52207] text-[#e52207] hover:bg-[#ffefec] font-bold rounded h-10"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Modal Criar/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="font-black text-[#333333] text-lg">
                            {formData.id ? 'Editar Variável Global' : 'Nova Variável Global'}
                        </DialogTitle>
                        <DialogDescription className="text-[#555555]">
                            Esta variável poderá ser usada em qualquer modelo inserindo a chave entre chaves duplas.
                        </DialogDescription>
                    </DialogHeader>

                    {isAutomatic && (
                        <div className="flex items-start gap-2 bg-[#fef6e0] border border-[#dba900] rounded p-3 text-sm text-[#6a5100]">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-[#a06b00]" />
                            <span>Esta variável é gerada automaticamente pelo sistema e não pode ser editada.</span>
                        </div>
                    )}

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="chave" className="font-bold text-[#333333]">Chave (Tag) <span className="text-[#e52207]">*</span></Label>
                            <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#cccccc] rounded px-3 focus-within:ring-1 focus-within:ring-[#1351B4] focus-within:border-[#1351B4]">
                                <span className="text-[#555555] font-mono text-sm">{'{{'}</span>
                                <input
                                    id="chave"
                                    value={formData.chave}
                                    disabled={!!formData.id || isAutomatic}
                                    onChange={e => setFormData({ ...formData, chave: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                    className="font-mono text-sm bg-transparent border-0 focus:outline-none p-0 h-11 w-full disabled:opacity-50 disabled:cursor-not-allowed text-[#333333]"
                                    placeholder="NOME_PREFEITURA"
                                />
                                <span className="text-[#555555] font-mono text-sm">{'}}'}</span>
                            </div>
                            {!formData.id && !isAutomatic && (
                                <p className="text-xs text-[#555555]">Apenas letras maiúsculas, números e underline. O prefixo SYS_ é adicionado automaticamente.</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="valor" className="font-bold text-[#333333]">Valor Resolvido <span className="text-[#e52207]">*</span></Label>
                            <Input
                                id="valor"
                                value={formData.valor}
                                disabled={isAutomatic}
                                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                                placeholder="Ex: Prefeitura Municipal de Cataguases"
                                className="disabled:opacity-50 disabled:cursor-not-allowed border-[#cccccc] rounded h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tipo" className="font-bold text-[#333333]">
                                Tipo de Entrada Visual <span className="text-xs text-[#555555] font-normal">(cosmético)</span>
                            </Label>
                            <Select value={formData.tipo} onValueChange={val => setFormData({ ...formData, tipo: val })} disabled={isAutomatic}>
                                <SelectTrigger className="disabled:opacity-50 disabled:cursor-not-allowed border-[#cccccc] rounded h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="texto">Texto Curto</SelectItem>
                                    <SelectItem value="numero">Número</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="cpf">Máscara CPF</SelectItem>
                                    <SelectItem value="moeda">Moeda Monetária</SelectItem>
                                    <SelectItem value="assinatura">Assinatura Digital</SelectItem>
                                    <SelectItem value="select">Lista Redirecionada</SelectItem>
                                    <SelectItem value="data_extenso">Data por Extenso</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-[#555555]">Apenas visual — identifica o formato esperado desta variável.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="descricao" className="font-bold text-[#333333]">Descrição (Opcional)</Label>
                            <Textarea
                                id="descricao"
                                value={formData.descricao}
                                disabled={isAutomatic}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Breve explicação sobre onde essa variável é usada..."
                                className="resize-none disabled:opacity-50 disabled:cursor-not-allowed border-[#cccccc] rounded"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded border-[#cccccc]">Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || isAutomatic} className="bg-[#1351B4] hover:bg-[#0c326f] text-white font-bold rounded">
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                                </span>
                            ) : 'Salvar Variável'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#e52207] font-black text-lg">
                            <AlertTriangle className="h-5 w-5" />
                            Excluir variável?
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-3">
                            <span className="block text-[#333333]">
                                Você está prestes a excluir{' '}
                                <code className="font-mono bg-[#f8f9fa] px-1.5 py-0.5 rounded text-[#333333] border border-[#e6e6e6] font-bold">{`{{${deleteTarget?.chave}}}`}</code>.
                            </span>
                            <span className="block text-[#6a5100] bg-[#fef6e0] border border-[#dba900] rounded p-3 text-xs font-medium">
                                ⚠️ Esta variável pode estar em uso em modelos de documento ativos. Esta ação não pode ser desfeita.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded border-[#cccccc]">Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} className="font-bold rounded">
                            {deleting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Excluindo...
                                </span>
                            ) : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
