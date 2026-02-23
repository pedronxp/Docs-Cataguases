import { createFileRoute, Link } from '@tanstack/react-router'
import { usePortarias } from '@/hooks/use-portarias'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
    Search, Plus, FileText, AlertCircle, CheckCircle2,
    Clock, Eye, FileDown, MoreVertical, Filter, PenTool
} from 'lucide-react'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import type { StatusPortaria } from '@/types/domain'

export const Route = createFileRoute('/_sistema/administrativo/portarias/')({
    component: PortariasListPage,
})

const STATUS_LABELS: Record<StatusPortaria, string> = {
    RASCUNHO: 'Rascunho',
    PROCESSANDO: 'Processando',
    PENDENTE: 'Aguardando Revisão',
    APROVADA: 'Aguardando Assinatura',
    PUBLICADA: 'Publicada',
    FALHA_PROCESSAMENTO: 'Falha no PDF',
    ERRO_GERACAO: 'Erro de Geração'
}

function PortariasListPage() {
    const { portarias, loading, filters, updateFilters } = usePortarias()

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Portarias</h2>
                    <p className="text-sm text-slate-500 font-medium">Visualize, edite e acompanhe o fluxo de publicação oficial.</p>
                </div>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 shadow-md shadow-primary/10">
                    <Link to="/_sistema/administrativo/portarias/novo">
                        <Plus className="mr-2 h-4 w-4" /> Nova Portaria
                    </Link>
                </Button>
            </div>

            {/* Filtros */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 bg-slate-50/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por número ou título..."
                            className="pl-10 bg-white border-slate-200 h-10"
                            value={filters.busca || ''}
                            onChange={(e) => updateFilters({ busca: e.target.value })}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={(val) => updateFilters({ status: val === 'all' ? undefined : val as any })}
                        >
                            <SelectTrigger className="bg-white border-slate-200 h-10">
                                <div className="flex items-center gap-2">
                                    <Filter size={14} className="text-slate-400" />
                                    <SelectValue placeholder="Filtrar por Status" />
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
                </CardContent>

                <div className="border-t border-slate-200 bg-white min-h-[400px]">
                    {loading ? (
                        <div className="p-0">
                            <DataTableSkeleton rows={6} columns={5} />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-32 font-bold text-slate-700">Número</TableHead>
                                    <TableHead className="font-bold text-slate-700">Título / Assunto</TableHead>
                                    <TableHead className="font-bold text-slate-700">Status</TableHead>
                                    <TableHead className="font-bold text-slate-700">Data de Registro</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portarias.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <FileText size={48} className="opacity-20" />
                                                <p className="font-medium">Nenhuma portaria encontrada</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    portarias.map((doc) => (
                                        <TableRow
                                            key={doc.id}
                                            className={`hover:bg-slate-50/80 transition-colors ${doc.status === 'FALHA_PDF' ? 'bg-rose-50/30' : ''}`}
                                        >
                                            <TableCell className="font-mono text-sm font-bold text-slate-500">
                                                {doc.numeroSistematico || <span className="text-slate-300 italic">Pendente</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800 leading-tight line-clamp-1">{doc.titulo}</span>
                                                    <span className="text-xs text-slate-400 font-medium">Modelo: {doc.modeloId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={doc.status} />
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm font-medium">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                                                            <MoreVertical size={16} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link to="/_sistema/administrativo/portarias/$id" params={{ id: doc.id }}>
                                                                <Eye className="mr-2 h-4 w-4" /> Visualizar
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {doc.status === 'RASCUNHO' && (
                                                            <DropdownMenuItem asChild className="cursor-pointer">
                                                                <Link to="/_sistema/administrativo/portarias/revisao/$id" params={{ id: doc.id }}>
                                                                    <FileDown className="mr-2 h-4 w-4" /> Editar / Upload
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        {doc.status === 'FALHA_PDF' && (
                                                            <DropdownMenuItem className="text-rose-600 font-bold">
                                                                <AlertCircle className="mr-2 h-4 w-4" /> Tentar Novamente
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: StatusPortaria }) {
    switch (status) {
        case 'PUBLICADA':
            return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 pointer-events-none font-bold"><CheckCircle2 size={12} className="mr-1" /> Publicada</Badge>
        case 'RASCUNHO':
            return <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50 font-bold"><Clock size={12} className="mr-1" /> Rascunho</Badge>
        case 'PENDENTE':
            return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 pointer-events-none font-bold"><AlertCircle size={12} className="mr-1" /> Revisão</Badge>
        case 'APROVADA':
            return <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 pointer-events-none font-bold"><PenTool size={12} className="mr-1" /> Assinatura</Badge>
        case 'FALHA_PROCESSAMENTO':
            return <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 pointer-events-none font-bold"><AlertCircle size={12} className="mr-1" /> Falha</Badge>
        default:
            return <Badge variant="outline" className="font-bold">{STATUS_LABELS[status]}</Badge>
    }
}
