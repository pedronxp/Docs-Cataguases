import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, Book, Edit, History, RefreshCcw, RefreshCw,
    User as UserIcon, Calendar, Network, Loader2, Trash2, Search,
    ShieldAlert
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'

import { useState, useEffect } from 'react'
import { livroService } from '@/services/livro.service'
import type { LivrosNumeracao } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/livros')({
    component: LivrosNumeracaoPage,
})

function LivrosNumeracaoPage() {
    const { toast } = useToast()
    const [livros, setLivros] = useState<LivrosNumeracao[]>([])
    const [loading, setLoading] = useState(true)
    const [editLivro, setEditLivro] = useState<LivrosNumeracao | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [viewLogs, setViewLogs] = useState<LivrosNumeracao | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newLivro, setNewLivro] = useState({ nome: '', formato_base: 'PORT-{N}/CATAGUASES', numero_inicial: 1 })
    const [deleteTarget, setDeleteTarget] = useState<LivrosNumeracao | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
    // Auth & PIN
    const [pinSeguranca, setPinSeguranca] = useState('')
    const [resetTarget, setResetTarget] = useState<LivrosNumeracao | null>(null)

    useEffect(() => {
        loadLivros()
    }, [])

    async function loadLivros() {
        setLoading(true)
        const res = await livroService.listarLivros()
        if (res.success) {
            setLivros(res.data)
        } else {
            toast({ title: 'Erro ao carregar livros', description: res.error, variant: 'destructive' })
        }
        setLoading(false)
    }

    const handleUpdate = async (payload: any) => {
        const res = await livroService.atualizarLivro({ ...payload, pinSeguranca })
        if (res.success) {
            toast({ title: 'Sucesso', description: 'Livro atualizado com sucesso.' })
            setIsEditOpen(false)
            setResetTarget(null)
            setPinSeguranca('')
            loadLivros()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    const handleResetConfirm = () => {
        if (!resetTarget) return
        if (!pinSeguranca) {
            toast({ title: 'PIN Obrigatório', description: 'Informe seu PIN de Segurança para confirmar.', variant: 'destructive' })
            return
        }
        handleUpdate({ id: resetTarget.id, proximo_numero: resetTarget.numero_inicial })
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        const res = await livroService.excluirLivro(deleteTarget.id)
        setIsDeleting(false)
        if (res.success) {
            toast({ title: 'Livro excluído', description: `"${deleteTarget.nome}" foi removido.` })
            setDeleteTarget(null)
            loadLivros()
        } else {
            toast({ title: 'Não foi possível excluir', description: res.error, variant: 'destructive' })
        }
    }

    const handleCreate = async () => {
        if (!newLivro.nome.trim()) {
            toast({ title: 'Campo obrigatório', description: 'Informe o nome do livro.', variant: 'destructive' })
            return
        }
        if (!newLivro.formato_base.includes('{N}')) {
            toast({ title: 'Formato inválido', description: 'O formato deve conter {N} para o número.', variant: 'destructive' })
            return
        }
        setIsCreating(true)
        const res = await livroService.criarLivro({
            nome: newLivro.nome.trim(),
            formato_base: newLivro.formato_base.trim(),
            numero_inicial: newLivro.numero_inicial,
            proximo_numero: newLivro.numero_inicial,
        })
        setIsCreating(false)
        if (res.success) {
            toast({ title: 'Livro criado', description: `"${res.data.nome}" foi criado com sucesso.` })
            setIsCreateOpen(false)
            setNewLivro({ nome: '', formato_base: 'PORT-{N}/CATAGUASES', numero_inicial: 1 })
            loadLivros()
        } else {
            toast({ title: 'Erro ao criar', description: res.error, variant: 'destructive' })
        }
    }

    const filteredLivros = livros.filter(
        l => l.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.formato_base.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 max-w-5xl pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Livros de Numeração</h2>
                    <p className="text-sm text-slate-500">Gestão centralizada de numeração de documentos oficiais.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadLivros}
                        disabled={loading}
                        className={`text-slate-500 hover:text-primary ${loading ? 'animate-spin' : ''}`}
                        title="Atualizar dados"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Novo Livro
                    </Button>
                </div>
            </div>

            {/* Main Data Container */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Livros Cadastrados ({filteredLivros.length})
                    </CardTitle>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar livro ou formato..."
                            className="pl-9 h-9 bg-white text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                    ) : livros.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-sm">
                            <Book className="h-8 w-8 mx-auto mb-3 opacity-20" />
                            Nenhum livro cadastrado. Clique em "Novo Livro" para começar.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredLivros.map(livro => (
                                <div key={livro.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition-colors group gap-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Icon */}
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                            <Book className="h-4 w-4 sm:h-5 sm:w-5 text-slate-600" />
                                        </div>

                                        {/* Name & Format */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{livro.nome}</p>
                                                {livro.ativo ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] px-1.5 py-0 h-4">Ativo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px] px-1.5 py-0 h-4">Inativo</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <Badge variant="secondary" className="font-mono text-[10px] text-slate-500 bg-slate-100/80 hover:bg-slate-100/80">
                                                    {livro.formato_base}
                                                </Badge>
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {(livro.proximo_numero - livro.numero_inicial).toLocaleString('pt-BR')} alocados
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Numbers/Stats */}
                                    <div className="hidden sm:flex items-center gap-8 px-4 border-l border-slate-100">
                                        <div className="text-right">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Próximo</p>
                                            <p className="text-sm font-bold text-primary">{livro.formato_base.replace('{N}', String(livro.proximo_numero).padStart(4, '0'))}</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end sm:justify-start border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 mt-2 sm:mt-0">
                                        {/* Mobile view of next number */}
                                        <div className="sm:hidden text-right flex-1 pr-4">
                                            <p className="text-xs font-bold text-primary">{livro.formato_base.replace('{N}', String(livro.proximo_numero).padStart(4, '0'))}</p>
                                        </div>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0"
                                            onClick={() => setViewLogs(livro)}
                                            title="Histórico Completo"
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0"
                                            onClick={() => { setEditLivro(livro); setIsEditOpen(true); }}
                                            title="Editar Livro"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 shrink-0"
                                            onClick={() => setResetTarget(livro)}
                                            title="Resetar Contador"
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                            onClick={() => setDeleteTarget(livro)}
                                            title="Excluir Livro"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog de Criação */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!isCreating) setIsCreateOpen(open) }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Novo Livro de Numeração</DialogTitle>
                        <DialogDescription>
                            Configure o livro que controlará a numeração sequencial dos documentos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="novo-nome">Nome do Livro</Label>
                            <Input
                                id="novo-nome"
                                placeholder="Ex: Portarias 2026"
                                value={newLivro.nome}
                                onChange={e => setNewLivro({ ...newLivro, nome: e.target.value })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="novo-formato">Formato Base</Label>
                            <Input
                                id="novo-formato"
                                placeholder="PORT-{N}/CATAGUASES"
                                value={newLivro.formato_base}
                                onChange={e => setNewLivro({ ...newLivro, formato_base: e.target.value })}
                            />
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                <p className="text-[11px] text-slate-500">Use <span className="font-mono bg-slate-100 rounded px-1">{'{N}'}</span> onde o número será inserido.</p>
                                {newLivro.formato_base.includes('{N}') && (
                                    <span className="text-[11px] font-mono font-medium text-primary bg-primary/5 rounded px-1.5 py-0.5 inline-block w-fit">
                                        Ex: {newLivro.formato_base.replace('{N}', String(newLivro.numero_inicial).padStart(4, '0'))}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="novo-inicial">Número Inicial</Label>
                            <Input
                                id="novo-inicial"
                                type="number"
                                min={1}
                                value={newLivro.numero_inicial}
                                onChange={e => setNewLivro({ ...newLivro, numero_inicial: Math.max(1, Number(e.target.value)) })}
                            />
                            <p className="text-[11px] text-slate-500">O contador iniciará a partir deste número. Geralmente inicia em 1.</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateOpen(false)}
                            disabled={isCreating}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            {isCreating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
                            ) : (
                                'Criar Livro'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Edição */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Livro</DialogTitle>
                        <DialogDescription>
                            Ajuste as configurações deste livro de numeração.
                        </DialogDescription>
                    </DialogHeader>
                    {editLivro && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome">Nome do Livro</Label>
                                <Input
                                    id="nome"
                                    value={editLivro.nome}
                                    onChange={e => setEditLivro({ ...editLivro, nome: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="formato">Formato Base</Label>
                                <Input
                                    id="formato"
                                    value={editLivro.formato_base}
                                    onChange={e => setEditLivro({ ...editLivro, formato_base: e.target.value })}
                                />
                                <p className="text-[11px] text-slate-500">Lembre-se de manter o <span className="font-mono bg-slate-100 rounded px-1">{'{N}'}</span> no formato.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="proximo">Próximo Número</Label>
                                <Input
                                    id="proximo"
                                    type="number"
                                    value={editLivro.proximo_numero}
                                    onChange={e => setEditLivro({ ...editLivro, proximo_numero: Number(e.target.value) })}
                                />
                                <p className="text-[11px] mt-1 font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                    Atenção: Mudar este valor manualmente exige o seu PIN de Segurança.
                                </p>
                            </div>
                            
                            {/* Mostra PIN se número mudou */}
                            {livros.find(l => l.id === editLivro.id)?.proximo_numero !== editLivro.proximo_numero && (
                                <div className="grid gap-2 border-t pt-4 mt-2">
                                    <Label htmlFor="pin-edit" className="text-red-700 font-bold flex items-center gap-1">
                                        <ShieldAlert className="h-4 w-4" /> PIN de Segurança
                                    </Label>
                                    <Input
                                        id="pin-edit"
                                        type="password"
                                        maxLength={6}
                                        placeholder="••••••"
                                        value={pinSeguranca}
                                        onChange={e => setPinSeguranca(e.target.value)}
                                        className="font-mono text-xl tracking-widest text-center"
                                    />
                                    <p className="text-[10px] text-slate-500 text-center">Digite seu PIN para autorizar a alteração do contador.</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={() => handleUpdate(editLivro)}
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Exclusão */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!isDeleting && !open) setDeleteTarget(null) }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Excluir Livro</DialogTitle>
                        <DialogDescription>
                            Esta ação é permanente e não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-1">
                            <p className="text-sm text-slate-600">Livro que será removido:</p>
                            <p className="text-base font-semibold text-slate-900">{deleteTarget?.nome}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">
                                Formato: {deleteTarget?.formato_base}
                            </p>
                        </div>
                        {deleteTarget && deleteTarget.proximo_numero > deleteTarget.numero_inicial && (
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                                    Atenção: Livro já possui numerações em uso. Esta operação pode falhar devido à integridade referencial mantida no servidor.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            variant="destructive"
                        >
                            {isDeleting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
                            ) : (
                                'Confirmar Exclusão'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Drawer (Sheet) de Logs Históricos */}
            <Sheet open={!!viewLogs} onOpenChange={(open) => { if (!open) setViewLogs(null) }}>
                <SheetContent className="sm:max-w-md w-full sm:w-[500px] overflow-y-auto flex flex-col">
                    <SheetHeader className="pb-4 border-b border-slate-100 shrink-0">
                        <SheetTitle className="text-lg font-bold flex items-center gap-2">
                            <History className="h-5 w-5 text-slate-500" /> Histórico de Emissões
                        </SheetTitle>
                        <SheetDescription>
                            {viewLogs?.nome}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-5 space-y-4 flex-1">
                        {viewLogs?.logs && viewLogs.logs.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                                Nenhuma numeração emitida neste livro ainda.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {viewLogs?.logs.slice().reverse().map((log, idx) => (
                                    <div key={idx} className="flex flex-col p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                                            <span className="text-base font-bold text-primary">#{log.numero}</span>
                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">ID: {log.portaria_id.slice(-8)}</span>
                                        </div>
                                        <div className="grid gap-2">
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate flex-1 font-medium">{log.aprovador}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span>{new Date(log.data).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Network className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                <span className="font-mono">{log.ip}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
