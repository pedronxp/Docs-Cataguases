import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Search, ShieldAlert, PowerOff, Power, X,
    Users, UserCheck, UserX, Building2, Shield,
    Settings
} from 'lucide-react'
import { Input } from '@/components/ui/input'

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUsuarios } from '@/hooks/use-usuarios'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useEffect, useMemo } from 'react'
import type { Usuario, RoleUsuario, Secretaria } from '@/types/domain'
import { listarSetores, type Setor, listarSecretarias } from '@/services/secretaria.service'

import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_sistema/admin/usuarios/')({
    component: UsuariosPage,
})

const ROLE_LABELS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'Administrador Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    REVISOR: 'Revisor',
    OPERADOR: 'Operador',
    PENDENTE: 'Aguardando Liberação',
}

const ROLE_COLORS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'border-purple-300 text-purple-700 bg-purple-50',
    PREFEITO: 'border-amber-300 text-amber-700 bg-amber-50',
    SECRETARIO: 'border-blue-300 text-[#1351B4] bg-blue-50',
    REVISOR: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    OPERADOR: 'border-slate-300 text-slate-600 bg-slate-50',
    PENDENTE: 'border-orange-300 text-orange-700 bg-orange-50',
}

const ROLES_AVAILABLE: RoleUsuario[] = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'REVISOR', 'OPERADOR']

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Stat Cards ─────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, color }: {
    icon: React.ElementType; value: number; label: string; color: string
}) {
    return (
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-4 flex-1 min-w-[160px]">
            <div className={cn('p-2.5 rounded-lg shrink-0', color)}>
                <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{label}</p>
            </div>
        </div>
    )
}

// ─── Org View Row ───────────────────────────────────────────────────────────

function OrgUsuarioRow({ usuario, secretaria, showSecretaria }: {
    usuario: Usuario
    secretaria?: Secretaria
    showSecretaria?: boolean
}) {
    return (
        <div className={cn(
            'flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors',
            !usuario.ativo && 'opacity-50'
        )}>
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                    'text-xs font-bold',
                    usuario.ativo ? 'bg-[#1351B4] text-white' : 'bg-slate-200 text-slate-500'
                )}>
                    {getInitials(usuario.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 truncate">{usuario.name}</span>
                    {!usuario.ativo && <span className="text-[10px] text-slate-400 italic">Inativo</span>}
                </div>
                <p className="text-xs text-slate-400 truncate">
                    {usuario.email}
                    {showSecretaria && secretaria && (
                        <span className="ml-2 font-medium text-slate-500">&middot; {secretaria.sigla}</span>
                    )}
                </p>
            </div>
            <Badge variant="outline" className={cn(
                'text-[10px] px-1.5 py-0 shrink-0 font-semibold',
                ROLE_COLORS[usuario.role] ?? ''
            )}>
                {ROLE_LABELS[usuario.role] ?? usuario.role}
            </Badge>
        </div>
    )
}

// ─── Página Principal ───────────────────────────────────────────────────────

function UsuariosPage() {
    const { usuarios, loading, toggleStatus } = useUsuarios()
    const [busca, setBusca] = useState('')
    const [filtroRole, setFiltroRole] = useState<RoleUsuario | ''>('')
    const [filtroSecretaria, setFiltroSecretaria] = useState('')
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [carregandoSetores, setCarregandoSetores] = useState(false)

    // Organograma state
    const [orgSecretaria, setOrgSecretaria] = useState<string>('todas')
    const [orgSetor, setOrgSetor] = useState<string>('todos')
    const [orgBusca, setOrgBusca] = useState('')

    useEffect(() => {
        listarSecretarias().then(res => { if (res.success) setSecretarias(res.data) })
    }, [])

    useEffect(() => {
        setOrgSetor('todos')
        if (!orgSecretaria || orgSecretaria === 'todas') { setSetores([]); return }
        setCarregandoSetores(true)
        listarSetores(orgSecretaria)
            .then(res => { if (res.success) setSetores(res.data) })
            .finally(() => setCarregandoSetores(false))
    }, [orgSecretaria])

    // Filtered active users (tab Servidores) - includes active/inactive but excludes pending approval/rejected
    const ativos = useMemo(() => usuarios.filter(u => u.role !== 'PENDENTE'), [usuarios])
    
    // Filtra apenas os pendentes REAIS (não rejeitados)
    const pendentesCount = useMemo(() => usuarios.filter(u => u.role === 'PENDENTE' && u.ativo !== false).length, [usuarios])

    const filtrados = useMemo(() => {
        return ativos.filter(u => {
            if (busca) {
                const q = busca.toLowerCase()
                if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
            }
            if (filtroRole && u.role !== filtroRole) return false
            if (filtroSecretaria && u.secretariaId !== filtroSecretaria) return false
            return true
        })
    }, [ativos, busca, filtroRole, filtroSecretaria])

    // Filtered users for organograma
    const orgFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            if (u.role === 'PENDENTE') return false
            if (orgSecretaria !== 'todas' && u.secretariaId !== orgSecretaria) return false
            if (orgSetor !== 'todos' && u.setorId !== orgSetor) return false
            if (orgBusca.trim()) {
                const q = orgBusca.toLowerCase()
                if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
            }
            return true
        })
    }, [usuarios, orgSecretaria, orgSetor, orgBusca])

    // Grouped by setor for organograma
    const gruposSetor = useMemo(() => {
        if (orgSecretaria === 'todas' || orgSetor !== 'todos') return null
        const grupos: { setor: Setor | null; membros: Usuario[] }[] = []
        const semSetor = orgFiltrados.filter(u => !u.setorId)
        if (semSetor.length > 0) grupos.push({ setor: null, membros: semSetor })
        for (const setor of setores) {
            const membros = orgFiltrados.filter(u => u.setorId === setor.id)
            if (membros.length > 0) grupos.push({ setor, membros })
        }
        return grupos
    }, [orgFiltrados, setores, orgSecretaria, orgSetor])

    // Stats
    const totalAtivos = ativos.filter(u => u.ativo).length
    const totalInativos = ativos.filter(u => !u.ativo).length
    const totalSecretarias = new Set(ativos.filter(u => u.secretariaId).map(u => u.secretariaId)).size

    const temFiltro = busca || filtroRole || filtroSecretaria
    const orgSecAtual = secretarias.find(s => s.id === orgSecretaria)

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#1351B4]/10">
                        <Users className="h-5 w-5 text-[#1351B4]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Gestão de Usuários</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Controle o acesso de servidores e permissões no sistema</p>
                    </div>
                </div>
                {pendentesCount > 0 && (
                    <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2">
                        <Link to="/admin/fila-aprovacao">
                            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">{pendentesCount}</span>
                            Fila de Aprovação
                        </Link>
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 flex-wrap">
                <StatCard icon={Users} value={ativos.length} label="Total de servidores" color="bg-[#1351B4]" />
                <StatCard icon={UserCheck} value={totalAtivos} label="Ativos" color="bg-emerald-500" />
                <StatCard icon={UserX} value={totalInativos} label="Inativos" color="bg-slate-400" />
                <StatCard icon={Building2} value={totalSecretarias} label="Secretarias" color="bg-purple-500" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="servidores" className="w-full">
                <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-11 p-0 gap-0">
                    <TabsTrigger
                        value="servidores"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-[#1351B4] data-[state=active]:text-[#1351B4] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-full px-4 font-semibold text-slate-500 text-sm transition-all"
                    >
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        Servidores ({ativos.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="organograma"
                        className="data-[state=active]:border-b-2 data-[state=active]:border-[#1351B4] data-[state=active]:text-[#1351B4] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-full px-4 font-semibold text-slate-500 text-sm transition-all"
                    >
                        <Building2 className="h-3.5 w-3.5 mr-1.5" />
                        Organograma
                    </TabsTrigger>
                </TabsList>

                {/* ─── Tab: Servidores ──────────────────────────────────────────── */}
                <TabsContent value="servidores" className="mt-5 space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome ou e-mail..."
                                className="pl-9 h-9 text-sm border-slate-200"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />
                            {busca && (
                                <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <Select value={filtroRole || 'all'} onValueChange={(v) => setFiltroRole(v === 'all' ? '' : v as RoleUsuario)}>
                            <SelectTrigger className="w-[180px] h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Nível de acesso" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os níveis</SelectItem>
                                {ROLES_AVAILABLE.map(role => (
                                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filtroSecretaria || 'all'} onValueChange={(v) => setFiltroSecretaria(v === 'all' ? '' : v)}>
                            <SelectTrigger className="w-[200px] h-9 text-sm border-slate-200">
                                <SelectValue placeholder="Secretaria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as secretarias</SelectItem>
                                {secretarias.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.sigla} — {s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {temFiltro && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-3 text-slate-500 hover:text-red-600"
                                onClick={() => { setBusca(''); setFiltroRole(''); setFiltroSecretaria('') }}
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Limpar
                            </Button>
                        )}
                    </div>

                    {/* Contador */}
                    {temFiltro && (
                        <p className="text-xs text-slate-500">{filtrados.length} de {ativos.length} servidores</p>
                    )}

                    {/* Tabela */}
                    <Card className="border-slate-200 overflow-hidden">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-4"><DataTableSkeleton rows={5} columns={5} /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                                            <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide py-3">Servidor</TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide py-3">Lotação</TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide py-3">Nível de Acesso</TableHead>
                                            <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wide py-3 w-[100px]">Status</TableHead>
                                            <TableHead className="text-right font-semibold text-slate-600 text-xs uppercase tracking-wide py-3 pr-4">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtrados.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-16">
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <UserX className="h-6 w-6" />
                                                        <p className="text-sm font-medium text-slate-600">Nenhum servidor encontrado</p>
                                                        <p className="text-xs">Tente ajustar os filtros de busca.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {filtrados.map((usuario) => (
                                            <TableRow
                                                key={usuario.id}
                                                className={cn(
                                                    'hover:bg-slate-50/60 transition-colors',
                                                    !usuario.ativo && 'opacity-60 bg-slate-50/50'
                                                )}
                                            >
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarFallback className={cn(
                                                                'text-xs font-bold',
                                                                usuario.ativo ? 'bg-[#1351B4] text-white' : 'bg-slate-200 text-slate-500'
                                                            )}>
                                                                {getInitials(usuario.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">{usuario.name}</p>
                                                            <p className="text-xs text-slate-400">{usuario.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {usuario.secretaria ? (
                                                        <div>
                                                            <p className="text-sm text-slate-700 font-medium">{usuario.secretaria.nome}</p>
                                                            {usuario.setor && (
                                                                <p className="text-xs text-slate-400">{usuario.setor.nome}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Sem lotação</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant="outline" className={cn(
                                                            'text-[10px] font-semibold',
                                                            ROLE_COLORS[usuario.role] ?? ''
                                                        )}>
                                                            {ROLE_LABELS[usuario.role] ?? usuario.role}
                                                        </Badge>
                                                        {usuario.permissoesExtra.length > 0 && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 cursor-default">
                                                                            <ShieldAlert className="h-3 w-3 text-amber-500" />
                                                                            +{usuario.permissoesExtra.length} extra
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">{usuario.permissoesExtra.join(', ')}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {usuario.ativo
                                                        ? <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-200 bg-emerald-50">Ativo</Badge>
                                                        : <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200 bg-slate-50">Inativo</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right py-3 pr-4">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs font-semibold text-[#1351B4] border-blue-200 hover:bg-blue-50"
                                                        >
                                                            <Link to="/admin/usuarios/$usuarioId" params={{ usuarioId: usuario.id }}>
                                                                <Settings className="h-3.5 w-3.5 mr-1" />
                                                                Configurar
                                                            </Link>
                                                        </Button>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className={cn(
                                                                            'h-8 w-8 p-0',
                                                                            usuario.ativo
                                                                                ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                                                                                : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                                                                        )}
                                                                        onClick={() => toggleStatus(usuario.id)}
                                                                    >
                                                                        {usuario.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs">{usuario.ativo ? 'Desativar acesso' : 'Reativar acesso'}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Tab: Organograma ──────────────────────────────────────────── */}
                <TabsContent value="organograma" className="mt-5 space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <Select value={orgSecretaria} onValueChange={setOrgSecretaria}>
                            <SelectTrigger className="w-[260px] h-9 text-sm border-slate-200">
                                <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                <SelectValue placeholder="Secretaria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas as Secretarias</SelectItem>
                                {secretarias.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <span className="font-semibold">{s.sigla}</span>
                                        <span className="text-slate-500 ml-1.5">— {s.nome}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {orgSecretaria !== 'todas' && (
                            <Select value={orgSetor} onValueChange={setOrgSetor} disabled={carregandoSetores}>
                                <SelectTrigger className="w-[200px] h-9 text-sm border-slate-200">
                                    <SelectValue placeholder={carregandoSetores ? 'Carregando...' : 'Setor'} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os setores</SelectItem>
                                    {setores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar servidor..."
                                value={orgBusca}
                                onChange={e => setOrgBusca(e.target.value)}
                                className="pl-9 h-9 text-sm border-slate-200"
                            />
                            {orgBusca && (
                                <button onClick={() => setOrgBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <span className="text-xs text-slate-500 font-medium shrink-0">
                            {orgFiltrados.length} servidor{orgFiltrados.length !== 1 ? 'es' : ''}
                        </span>
                    </div>

                    {/* Resultado */}
                    <Card className="border-slate-200 overflow-hidden">
                        <CardContent className="p-0">
                            {/* Header da secretaria selecionada */}
                            {orgSecAtual && (
                                <div className="flex items-center gap-3 px-5 py-3 border-b-2 border-[#1351B4] bg-blue-50/50">
                                    <div className="w-8 h-8 bg-[#1351B4] rounded-md flex items-center justify-center shrink-0">
                                        <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{orgSecAtual.nome}</p>
                                        <p className="text-xs text-slate-500">{orgSecAtual.sigla}</p>
                                    </div>
                                </div>
                            )}

                            {orgFiltrados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                                    <UserX className="h-6 w-6" />
                                    <p className="text-sm font-medium text-slate-600">Nenhum servidor encontrado</p>
                                </div>
                            ) : gruposSetor ? (
                                <div>
                                    {gruposSetor.map(({ setor, membros }, idx) => (
                                        <div key={setor?.id ?? '__sem_setor__'}>
                                            <div className={cn(
                                                'px-5 py-2 bg-slate-50 flex items-center justify-between',
                                                idx > 0 && 'border-t border-slate-200'
                                            )}>
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                    {setor ? `${setor.nome}${setor.sigla ? ` (${setor.sigla})` : ''}` : 'Sem setor definido'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium">{membros.length}</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {membros.map(u => <OrgUsuarioRow key={u.id} usuario={u} />)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {orgFiltrados.map(u => (
                                        <OrgUsuarioRow
                                            key={u.id}
                                            usuario={u}
                                            secretaria={secretarias.find(s => s.id === u.secretariaId)}
                                            showSecretaria={orgSecretaria === 'todas'}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
