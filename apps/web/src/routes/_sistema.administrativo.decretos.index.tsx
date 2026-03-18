import { createFileRoute, Link } from '@tanstack/react-router'
import { usePortarias } from '@/hooks/use-portarias'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
    Search, Plus, Stamp, AlertCircle, CheckCircle2,
    Clock, Eye, FileDown, MoreVertical, Filter, PenTool, UserCheck, Trash2,
    User,
} from 'lucide-react'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { STATUS_PORTARIA, type StatusPortaria, type Portaria } from '@/types/domain'
import { useState } from 'react'
import { BatchActionBar } from '@/components/portarias/batch-action-bar'
import { portariaService } from '@/services/portaria.service'
import { useAuthStore } from '@/store/auth.store'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_sistema/administrativo/decretos/')({
    component: DecretosListPage,
})

const STATUS_LABELS: Partial<Record<StatusPortaria, string>> = {
    RASCUNHO: 'Rascunho',
    EM_REVISAO_ABERTA: 'Aguardando Revisor',
    EM_REVISAO_ATRIBUIDA: 'Em Revisão',
    CORRECAO_NECESSARIA: 'Correção Necessária',
    AGUARDANDO_ASSINATURA: 'Aguardando Assinatura',
    PRONTO_PUBLICACAO: 'Fila do Diário',
    PUBLICADA: 'Publicado',
    FALHA_PROCESSAMENTO: 'Falha no PDF',
    ERRO_GERACAO: 'Erro de Geração',
}

function getResponsavel(doc: Portaria): { tipo: string; nome: string } | null {
    const p = doc as any
    if (doc.status === STATUS_PORTARIA.EM_REVISAO_ABERTA) return { tipo: 'Aguarda revisor', nome: '' }
    if (doc.status === STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA && doc.revisorAtual?.name) {
        return { tipo: 'Revisor', nome: doc.revisorAtual.name }
    }
    if (doc.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA) {
        if (p.secretaria?.titular?.name) return { tipo: 'Assina', nome: p.secretaria.titular.name }
        if (doc.secretaria?.sigla) return { tipo: 'Assina', nome: `Titular da ${doc.secretaria.sigla}` }
        return { tipo: 'Assina', nome: 'Secretário(a)' }
    }
    if (doc.revisorAtual?.name) return { tipo: 'Revisor', nome: doc.revisorAtual.name }
    return null
}

const TABS = [
    { key: 'all', label: 'Todos' },
    { key: 'RASCUNHO', label: 'Rascunho' },
    { key: 'EM_REVISAO_ABERTA', label: 'Em Revisão' },
    { key: 'CORRECAO_NECESSARIA', label: 'Correção' },
    { key: 'AGUARDANDO_ASSINATURA', label: 'Assinatura' },
    { key: 'PRONTO_PUBLICACAO', label: 'Diário' },
    { key: 'PUBLICADA', label: 'Publicados' },
]

function DecretosListPage() {
    // Reutiliza o hook de portarias mas filtra pelo tipoDocumento DECRETO
    // Enquanto não existe um hook separado, lista portarias e filtra localmente
    const { portarias: todasPortarias, loading, filters, updateFilters, refresh } = usePortarias()

    // Filtra apenas decretos (tipoDocumento === 'DECRETO') — quando disponível no tipo
    // Por enquanto, exibe todos (o modelo ainda não tem tipo separado)
    const portarias = todasPortarias

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [deleteIds, setDeleteIds] = useState<string[]>([])
    const [deleteMotivo, setDeleteMotivo] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [activeTab, setActiveTab] = useState<string>('all')
    const { usuario } = useAuthStore()
    const { toast } = useToast()

    const canDelete = usuario?.role === 'ADMIN_GERAL'

    const handleConfirmDelete = async () => {
        if (deleteIds.length === 0) return
        setIsDeleting(true)
        try {
            const res = deleteIds.length === 1
                ? await portariaService.deletar(deleteIds[0], deleteMotivo || undefined)
                : await portariaService.deletarLote(deleteIds, deleteMotivo)
            if (!res.success) {
                toast({ title: 'Erro', description: res.error || 'Erro ao excluir decreto', variant: 'destructive' })
            } else {
                toast({ title: deleteIds.length > 1 ? 'Decretos excluídos' : 'Decreto excluído' })
                setDeleteIds([])
                setDeleteMotivo('')
                setSelectedIds([])
                refresh()
            }
        } catch (e: any) {
            toast({ title: 'Erro', description: e?.message || 'Erro ao excluir decreto', variant: 'destructive' })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        updateFilters({ status: tab === 'all' ? undefined : tab as any })
        setSelectedIds([])
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === portarias.length ? [] : portarias.map(p => p.id))
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Stamp className="text-primary h-4 w-4" />
                            </div>
                            Gestão de Decretos
                        </h1>
                    </div>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                        Visualize, edite e acompanhe o fluxo de publicação de decretos.
                    </p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-5 rounded-xl shadow-md shadow-primary/20 text-sm">
                    <Link to="/administrativo/decretos/novo">
                        <Plus className="mr-1.5 h-4 w-4" /> Novo Decreto
                    </Link>
                </Button>
            </div>

            {/* Abas */}
            <div className="flex gap-1 flex-wrap border-b border-slate-200 pb-0">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all -mb-px ${
                            activeTab === tab.key
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Container principal */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Filtros */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 bg-slate-50/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                            placeholder="Buscar por número ou título..."
                            className="pl-10 bg-white border-slate-200 h-9 text-sm rounded-xl"
                            value={filters.busca || ''}
                            onChange={(e) => updateFilters({ busca: e.target.value })}
                        />
                    </div>
                    <div className="w-full sm:w-56">
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(val) => {
                                updateFilters({ status: val === 'all' ? undefined : val as any })
                                setActiveTab(val)
                            }}
                        >
                            <SelectTrigger className="bg-white border-slate-200 h-9 text-sm rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Filter size={13} className="text-slate-400 shrink-0" />
                                    <SelectValue placeholder="Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabela */}
                <div className="min-h-[420px]">
                    {loading ? (
                        <DataTableSkeleton rows={6} columns={5} />
                    ) : portarias.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-8">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <Stamp className="h-8 w-8 text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-600">Nenhum decreto encontrado</p>
                                <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou crie um novo decreto.</p>
                            </div>
                            <Button asChild variant="outline" className="rounded-xl font-semibold text-xs h-9 border-slate-200">
                                <Link to="/administrativo/decretos/novo">
                                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Criar Decreto
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="w-10 px-4">
                                        <input
                                            type="checkbox"
                                            checked={portarias.length > 0 && selectedIds.length === portarias.length}
                                            onChange={toggleSelectAll}
                                            className="rounded"
                                        />
                                    </TableHead>
                                    <TableHead className="w-28 text-[10px] font-black uppercase tracking-widest text-slate-400">Número</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título / Assunto</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Responsável</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 hidden lg:table-cell">Data</TableHead>
                                    <TableHead className="w-12" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portarias.map((doc, idx) => {
                                    const responsavel = getResponsavel(doc)
                                    const autor = (doc as any).criadoPor?.name || doc.autor?.name
                                    const isSelected = selectedIds.includes(doc.id)
                                    const isError = doc.status === 'FALHA_PROCESSAMENTO' || doc.status === 'ERRO_GERACAO'

                                    return (
                                        <TableRow
                                            key={doc.id}
                                            className={`border-slate-100 transition-colors animate-in fade-in duration-150 ${
                                                isError ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/80'
                                            } ${isSelected ? '!bg-primary/5' : ''}`}
                                            style={{ animationDelay: `${idx * 20}ms` }}
                                        >
                                            <TableCell className="w-10 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(doc.id)}
                                                    className="rounded"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {doc.numeroOficial ? (
                                                    <span className="font-mono text-sm font-black text-primary">{doc.numeroOficial}</span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 italic font-normal">sem nº</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[260px]">
                                                <Link
                                                    to="/administrativo/portarias/$id"
                                                    params={{ id: doc.id }}
                                                    className="group block"
                                                >
                                                    <p className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors leading-tight line-clamp-1">
                                                        {doc.titulo}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {(doc as any).modelo?.nome ?? '—'}
                                                        </span>
                                                        {autor && (
                                                            <>
                                                                <span className="text-slate-200 text-xs">·</span>
                                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                                    <User className="h-2.5 w-2.5" />
                                                                    {autor.split(' ')[0]}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {responsavel ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{responsavel.tipo}</span>
                                                        {responsavel.nome ? (
                                                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                                {doc.status === STATUS_PORTARIA.AGUARDANDO_ASSINATURA
                                                                    ? <PenTool className="h-2.5 w-2.5 text-primary" />
                                                                    : <UserCheck className="h-2.5 w-2.5 text-amber-500" />
                                                                }
                                                                <span className="truncate max-w-[120px]">{responsavel.nome}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Livre para aceitar</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200 text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DecretoStatusBadge status={doc.status} />
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {new Date(doc.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">
                                                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: ptBR })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg">
                                                            <MoreVertical size={15} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                        <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                                                            <Link to="/administrativo/portarias/$id" params={{ id: doc.id }}>
                                                                <Eye className="mr-2 h-3.5 w-3.5" /> Visualizar
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {(doc.status === STATUS_PORTARIA.RASCUNHO || doc.status === STATUS_PORTARIA.CORRECAO_NECESSARIA) && (
                                                            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                                                                <Link to="/administrativo/portarias/revisao/$id" params={{ id: doc.id }}>
                                                                    <FileDown className="mr-2 h-3.5 w-3.5" /> Editar / Upload
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canDelete && (doc.status === STATUS_PORTARIA.RASCUNHO || doc.status === STATUS_PORTARIA.FALHA_PROCESSAMENTO) && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600 font-bold cursor-pointer focus:text-red-600 focus:bg-red-50 rounded-lg"
                                                                    onClick={() => setDeleteIds([doc.id])}
                                                                >
                                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {portarias.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-semibold">
                            {portarias.length} decreto{portarias.length !== 1 ? 's' : ''}
                            {selectedIds.length > 0 && ` · ${selectedIds.length} selecionado${selectedIds.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                )}
            </div>

            <BatchActionBar
                selectedCount={selectedIds.length}
                onClear={() => setSelectedIds([])}
                onAction={() => {}}
                onDeleteAction={() => setDeleteIds(selectedIds)}
                canDelete={canDelete}
            />

            <AlertDialog open={deleteIds.length > 0} onOpenChange={(open) => { if (!open) { setDeleteIds([]); setDeleteMotivo('') } }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Decreto{deleteIds.length > 1 ? 's' : ''}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir {deleteIds.length > 1 ? 'estes decretos' : 'este decreto'}? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            placeholder="Motivo da exclusão..."
                            value={deleteMotivo}
                            onChange={(e) => setDeleteMotivo(e.target.value)}
                            className="rounded-xl"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                        >
                            {isDeleting ? 'Excluindo...' : 'Confirmar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function DecretoStatusBadge({ status }: { status: StatusPortaria }) {
    switch (status) {
        case STATUS_PORTARIA.PUBLICADA:
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[10px]"><CheckCircle2 size={10} className="mr-1" /> Publicado</Badge>
        case STATUS_PORTARIA.PRONTO_PUBLICACAO:
            return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]"><CheckCircle2 size={10} className="mr-1" /> Fila do Diário</Badge>
        case STATUS_PORTARIA.RASCUNHO:
            return <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 font-bold text-[10px]"><Clock size={10} className="mr-1" /> Rascunho</Badge>
        case STATUS_PORTARIA.EM_REVISAO_ABERTA:
            return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]"><Clock size={10} className="mr-1" /> Ag. Revisor</Badge>
        case STATUS_PORTARIA.EM_REVISAO_ATRIBUIDA:
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px]"><UserCheck size={10} className="mr-1" /> Em Revisão</Badge>
        case STATUS_PORTARIA.CORRECAO_NECESSARIA:
            return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold text-[10px]"><AlertCircle size={10} className="mr-1" /> Correção</Badge>
        case STATUS_PORTARIA.AGUARDANDO_ASSINATURA:
            return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px]"><PenTool size={10} className="mr-1" /> Assinatura</Badge>
        default:
            return <Badge variant="outline" className="font-bold text-[10px]">{String(status).replace(/_/g, ' ')}</Badge>
    }
}
