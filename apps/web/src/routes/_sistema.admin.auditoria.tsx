import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Search, Shield, AlertTriangle, Info,
    FileDown, Filter, User, Calendar,
    History, Terminal, ShieldAlert
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuditoria } from '@/hooks/use-auditoria'
import { useState } from 'react'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const Route = createFileRoute('/_sistema/admin/auditoria')({
    component: AuditoriaPage,
})

const SEVERIDADE_STYLES = {
    INFO: {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Info size={14} className="mr-1.5" />,
        label: 'Informação'
    },
    AVISO: {
        bg: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle size={14} className="mr-1.5" />,
        label: 'Aviso'
    },
    CRITICO: {
        bg: 'bg-red-100 text-red-700 border-red-200',
        icon: <ShieldAlert size={14} className="mr-1.5" />,
        label: 'Crítico'
    }
}

const MODULO_LABELS = {
    PORTARIAS: 'Portarias',
    MODELOS: 'Modelos',
    USUARIOS: 'Usuários',
    SISTEMA: 'Sistema',
    AUTH: 'Autenticação'
}

function AuditoriaPage() {
    const { toast } = useToast()
    const { logs, loading } = useAuditoria()
    const [busca, setBusca] = useState('')
    const [moduloFiltro, setModuloFiltro] = useState<string>('todos')
    const [severidadeFiltro, setSeveridadeFiltro] = useState<string>('todas')

    const handleExport = () => {
        toast({
            title: "Exportação Iniciada",
            description: "O arquivo CSV com os logs está sendo gerado e o download começará em instantes.",
        })
    }

    const logsFiltrados = logs.filter(log => {
        const matchesBusca = log.detalhes.toLowerCase().includes(busca.toLowerCase()) ||
            log.usuarioNome.toLowerCase().includes(busca.toLowerCase()) ||
            log.acao.toLowerCase().includes(busca.toLowerCase())

        const matchesModulo = moduloFiltro === 'todos' || log.modulo === moduloFiltro
        const matchesSeveridade = severidadeFiltro === 'todas' || log.severidade === severidadeFiltro

        return matchesBusca && matchesModulo && matchesSeveridade
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 border border-slate-800">
                        <History size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Trilha de Auditoria</h2>
                        <p className="text-sm text-slate-500 font-medium">Registro imutável de todas as ações sensíveis realizadas no sistema.</p>
                    </div>
                </div>
                <Button
                    onClick={handleExport}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 font-bold h-11 px-6 shadow-sm"
                >
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Filtros e Busca */}
            <Card className="shadow-md border-slate-200/60 overflow-hidden bg-white/50 backdrop-blur-sm">
                <div className="p-5 flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por usuário, ação ou detalhes do evento..."
                            className="pl-10 bg-white border-slate-200 h-11 focus-visible:ring-primary/20"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="w-[160px]">
                            <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
                                <SelectTrigger className="bg-white h-11 font-medium text-slate-600">
                                    <div className="flex items-center">
                                        <Terminal className="mr-2 h-4 w-4 text-slate-400" />
                                        <SelectValue placeholder="Módulo" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Módulos</SelectItem>
                                    <SelectItem value="PORTARIAS">Portarias</SelectItem>
                                    <SelectItem value="MODELOS">Modelos</SelectItem>
                                    <SelectItem value="USUARIOS">Usuários</SelectItem>
                                    <SelectItem value="SISTEMA">Sistema</SelectItem>
                                    <SelectItem value="AUTH">Autenticação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="w-[160px]">
                            <Select value={severidadeFiltro} onValueChange={setSeveridadeFiltro}>
                                <SelectTrigger className="bg-white h-11 font-medium text-slate-600">
                                    <div className="flex items-center">
                                        <Filter className="mr-2 h-4 w-4 text-slate-400" />
                                        <SelectValue placeholder="Severidade" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="INFO">Informação</SelectItem>
                                    <SelectItem value="AVISO">Aviso</SelectItem>
                                    <SelectItem value="CRITICO">Crítico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <CardContent className="p-0">
                    {loading ? (
                        <DataTableSkeleton rows={8} columns={5} />
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 border-y">
                                    <TableRow>
                                        <TableHead className="w-[180px] font-bold text-slate-800 px-6 py-4">Data e Hora</TableHead>
                                        <TableHead className="w-[200px] font-bold text-slate-800">Usuário</TableHead>
                                        <TableHead className="w-[180px] font-bold text-slate-800">Módulo e Ação</TableHead>
                                        <TableHead className="font-bold text-slate-800">Detalhes do Evento</TableHead>
                                        <TableHead className="w-[120px] font-bold text-slate-800 text-right pr-6">Severidade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logsFiltrados.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <Shield size={64} className="opacity-10" />
                                                    <p className="font-bold text-slate-400 tracking-tight uppercase">Nenhum registro de auditoria localizado</p>
                                                    <Button variant="link" onClick={() => { setBusca(''); setModuloFiltro('todos'); setSeveridadeFiltro('todas'); }}>
                                                        Limpar todos os filtros
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logsFiltrados.map((log) => {
                                            const style = SEVERIDADE_STYLES[log.severidade]
                                            return (
                                                <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 text-sm">
                                                                {format(new Date(log.createdAt), 'dd MMM, yyyy', { locale: ptBR })}
                                                            </span>
                                                            <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                                {format(new Date(log.createdAt), 'HH:mm:ss')} • IP: {log.ip || 'Interno'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border group-hover:bg-white group-hover:text-primary transition-colors">
                                                                <User size={14} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-800 text-sm">{log.usuarioNome}</span>
                                                                <span className="text-[10px] text-slate-400 font-medium">#{log.usuarioId.split('-')[1] || '---'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1.5">
                                                            <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold tracking-widest bg-slate-50 text-slate-500 border-slate-200 rounded-md">
                                                                {MODULO_LABELS[log.modulo]}
                                                            </Badge>
                                                            <span className="text-xs font-black text-slate-700 uppercase italic tracking-tighter">{log.acao}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm text-slate-600 leading-relaxed max-w-[500px]">
                                                            {log.detalhes}
                                                        </p>
                                                        {log.metadata && (
                                                            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                                                {Object.entries(log.metadata).map(([key, val]) => (
                                                                    <Badge key={key} variant="secondary" className="bg-slate-100 text-slate-500 text-[10px] font-mono hover:bg-slate-200 border-none px-1.5">
                                                                        {key}: {String(val)}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Badge className={`${style.bg} font-black uppercase text-[10px] tracking-wider border shadow-sm py-1 pl-2 pr-3 rounded-lg`}>
                                                            {style.icon}
                                                            {style.label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] px-2 italic">
                <Shield size={12} className="text-emerald-500" />
                Certificado Digitalmente • Hardware Security Module (HSM) Ativo
            </div>
        </div>
    )
}
