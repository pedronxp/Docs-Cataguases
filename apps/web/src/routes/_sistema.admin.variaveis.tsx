import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2, HelpCircle, AlertTriangle, Type, Hash, Calendar, CalendarDays, FileDigit, Coins, FileSignature, List } from 'lucide-react'
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

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

const DEFAULT_FORM = { id: '', chave: '', valor: '', descricao: '', resolvidaAutomaticamente: false, tipo: 'texto' }

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    texto:       { label: 'Texto',       icon: Type,          color: 'bg-slate-100 text-slate-700' },
    numero:      { label: 'Número',      icon: Hash,          color: 'bg-blue-50 text-blue-700' },
    data:        { label: 'Data',        icon: Calendar,      color: 'bg-violet-50 text-violet-700' },
    data_extenso:{ label: 'Data Extenso',icon: CalendarDays,  color: 'bg-purple-50 text-purple-700' },
    cpf:         { label: 'CPF',         icon: FileDigit,     color: 'bg-orange-50 text-orange-700' },
    moeda:       { label: 'Moeda',       icon: Coins,         color: 'bg-emerald-50 text-emerald-700' },
    assinatura:  { label: 'Assinatura',  icon: FileSignature, color: 'bg-rose-50 text-rose-700' },
    select:      { label: 'Lista',       icon: List,          color: 'bg-amber-50 text-amber-700' },
}

function TipoBadge({ tipo }: { tipo: string }) {
    const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.texto
    const Icon = cfg.icon
    return (
        <Badge variant="outline" className={`gap-1 font-normal ${cfg.color} border-transparent`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </Badge>
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
            loadVariaveis()
        } else {
            toast({ title: 'Erro ao excluir', description: res.error, variant: 'destructive' })
        }
        setDeleting(false)
    }

    const isAutomatic = !!formData.resolvidaAutomaticamente

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Variáveis Globais</h2>
                    <p className="text-sm text-slate-500">Administre tags de substituição que podem ser usadas em qualquer modelo de documento.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" asChild className="w-full sm:w-auto shadow-sm text-slate-600">
                        <Link to="/admin/variaveis-dicas">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Dicas de Uso
                        </Link>
                    </Button>
                    <Button onClick={openCreateModal} className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Variável
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white rounded-t-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por chave ou descrição..."
                            className="pl-9 bg-slate-50 border-slate-200"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[220px]">Chave (Tag)</TableHead>
                                <TableHead>Valor Resolvido</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="w-[130px]">Tipo Visual</TableHead>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">Carregando variáveis...</TableCell>
                                </TableRow>
                            ) : variavisFiltradas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        {searchQuery ? `Nenhuma variável encontrada para "${searchQuery}".` : 'Nenhuma variável cadastrada.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                variavisFiltradas.map(v => (
                                    <TableRow key={v.id} className={`hover:bg-slate-50 transition-colors ${v.resolvidaAutomaticamente ? 'opacity-60' : ''}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Variable className={v.resolvidaAutomaticamente ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-[#1351B4]'} />
                                                <span className="font-mono text-sm font-semibold text-slate-800">{`{{${v.chave}}}`}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={v.resolvidaAutomaticamente ? 'text-sm font-mono text-slate-500 italic' : 'text-sm text-slate-800 font-medium'}>
                                                {v.resolvidaAutomaticamente ? 'Autogerado via Sistema' : v.valor}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600">{v.descricao}</span>
                                        </TableCell>
                                        <TableCell>
                                            <TipoBadge tipo="texto" />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={v.resolvidaAutomaticamente ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'text-blue-700 border-blue-200 bg-blue-50'}>
                                                {v.resolvidaAutomaticamente ? 'Dinâmica' : 'Estática'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={() => openEditModal(v)}
                                                    className="text-slate-500 hover:text-[#1351B4]"
                                                    title={v.resolvidaAutomaticamente ? 'Gerenciada pelo sistema' : 'Editar'}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {!v.resolvidaAutomaticamente && (
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => setDeleteTarget(v)}
                                                        className="text-slate-500 hover:text-rose-600"
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
                </CardContent>
            </Card>

            {/* Modal Criar/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Editar Variável Global' : 'Nova Variável Global'}</DialogTitle>
                        <DialogDescription>
                            Esta variável poderá ser usada em qualquer modelo inserindo a chave entre chaves duplas.
                        </DialogDescription>
                    </DialogHeader>

                    {isAutomatic && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                            <span>Esta variável é gerada automaticamente pelo sistema e não pode ser editada.</span>
                        </div>
                    )}

                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="chave">Chave (Tag) <span className="text-red-500">*</span></Label>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 focus-within:ring-1 focus-within:ring-[#1351B4] focus-within:border-[#1351B4]">
                                <span className="text-slate-400 font-mono text-sm">{'{{'}  </span>
                                <input
                                    id="chave"
                                    value={formData.chave}
                                    disabled={!!formData.id || isAutomatic}
                                    onChange={e => setFormData({ ...formData, chave: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                    className="font-mono text-sm bg-transparent border-0 focus:outline-none p-0 h-10 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="NOME_PREFEITURA"
                                />
                                <span className="text-slate-400 font-mono text-sm">{'}}'}</span>
                            </div>
                            {!formData.id && !isAutomatic && (
                                <p className="text-xs text-slate-500">Apenas letras maiúsculas, números e underline. O prefixo SYS_ é adicionado automaticamente.</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="valor">Valor Resolvido <span className="text-red-500">*</span></Label>
                            <Input
                                id="valor"
                                value={formData.valor}
                                disabled={isAutomatic}
                                onChange={e => setFormData({ ...formData, valor: e.target.value })}
                                placeholder="Ex: Prefeitura Municipal de Cataguases"
                                className="disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tipo">Tipo de Entrada Visual <span className="text-xs text-slate-400">(cosmético)</span></Label>
                            <Select value={formData.tipo} onValueChange={val => setFormData({ ...formData, tipo: val })} disabled={isAutomatic}>
                                <SelectTrigger className="disabled:opacity-50 disabled:cursor-not-allowed">
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
                            <p className="text-xs text-slate-500">Apenas visual — identifica o formato esperado desta variável.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="descricao">Descrição (Opcional)</Label>
                            <Textarea
                                id="descricao"
                                value={formData.descricao}
                                disabled={isAutomatic}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Breve explicação sobre onde essa variável é usada..."
                                className="resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || isAutomatic} className="bg-[#1351B4] hover:bg-[#0f4496] text-white">
                            {saving ? 'Salvando...' : 'Salvar Variável'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Confirmação de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-700">
                            <AlertTriangle className="h-5 w-5" />
                            Excluir variável?
                        </DialogTitle>
                        <DialogDescription className="pt-2 space-y-2">
                            <span className="block">
                                Você está prestes a excluir{' '}
                                <code className="font-mono bg-slate-100 px-1 rounded text-slate-800">{`{{${deleteTarget?.chave}}}`}</code>.
                            </span>
                            <span className="block text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                                ⚠️ Esta variável pode estar em uso em modelos de documento ativos. Esta ação não pode ser desfeita.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                            {deleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
