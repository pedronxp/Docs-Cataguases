import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ShieldAlert, PowerOff, Power, ChevronDown, Plus, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useUsuarios } from '@/hooks/use-usuarios'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import type { Usuario, RoleUsuario } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/usuarios')({
    component: UsuariosPage,
})

const ROLE_LABELS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'Administrador Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    GESTOR_SETOR: 'Gestor de Setor',
    OPERADOR: 'Operador',
    PENDENTE: 'Aguardando Liberação',
}

const ROLES_AVAILABLE: RoleUsuario[] = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'GESTOR_SETOR', 'OPERADOR']

const PERMISSOES_AVAILABLE = [
    { value: 'deletar:Portaria', label: 'Deletar Portarias' },
    { value: 'aprovar:Portaria', label: 'Aprovar Portarias' },
    { value: 'publicar:Portaria', label: 'Assinar e Publicar Portarias' },
    { value: 'gerenciar:Modelo', label: 'Gerenciar Modelos de Documento' },
    { value: 'visualizar:PortariaGlobal', label: 'Ver acervo de TODAS as Secretarias' },
]

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

function UsuariosPage() {
    const { usuarios, loading, toggleStatus, updateRole, updatePermissoes } = useUsuarios()
    const [busca, setBusca] = useState('')

    const ativos = usuarios.filter(u => u.role !== 'PENDENTE')
    const pendentes = usuarios.filter(u => u.role === 'PENDENTE')

    const filtradosAtivos = busca
        ? ativos.filter((u) =>
            u.name.toLowerCase().includes(busca.toLowerCase()) ||
            u.email.toLowerCase().includes(busca.toLowerCase())
        )
        : ativos

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Usuários</h2>
                    <p className="text-sm text-slate-500 font-medium">Controle o acesso de servidores e níveis de permissão no Doc's.</p>
                </div>
                {/* Removed "Convidar Servidor" button as per new structure */}
            </div>

            <Tabs defaultValue="ativos" className="w-full">
                <TabsList className="bg-slate-100 border-b border-slate-200 w-full justify-start rounded-none h-12 p-0 px-1 gap-2">
                    <TabsTrigger value="ativos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 font-bold text-slate-500 transition-all">
                        Usuários Ativos ({ativos.length})
                    </TabsTrigger>
                    <TabsTrigger value="pendentes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-4 font-bold text-slate-500 transition-all text-amber-600 data-[state=active]:text-amber-700">
                        Fila de Aprovação ({pendentes.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ativos" className="mt-6 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar usuários ativos..."
                                    className="pl-9 bg-slate-50/50"
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>
                        </div>
                        <CardContent className="p-0">
                            {loading ? (
                                <DataTableSkeleton rows={4} columns={5} />
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead>Servidor</TableHead>
                                            <TableHead>Nível de Acesso</TableHead>
                                            <TableHead className="w-[120px]">Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtradosAtivos.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-16 text-slate-400">
                                                    Nenhum usuário encontrado.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {filtradosAtivos.map((usuario: Usuario) => (
                                            <TableRow key={usuario.id} className={`hover:bg-slate-50 transition-colors ${!usuario.ativo ? 'opacity-60' : ''}`}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className={`text-xs font-bold ${usuario.ativo ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                                                {getInitials(usuario.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-800">{usuario.name}</span>
                                                            <span className="text-xs text-slate-500">{usuario.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 flex-col items-start space-y-1">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild disabled={!usuario.ativo}>
                                                                <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1 font-semibold bg-slate-100/50 text-slate-700 hover:bg-slate-200/50">
                                                                    {ROLE_LABELS[usuario.role] ?? usuario.role}
                                                                    <ChevronDown className="h-3 w-3 text-slate-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="start">
                                                                <DropdownMenuLabel className="text-xs">Alterar Permissão</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {ROLES_AVAILABLE.map(role => (
                                                                    <DropdownMenuItem
                                                                        key={role}
                                                                        className={usuario.role === role ? 'font-bold bg-slate-50' : ''}
                                                                        onClick={() => updateRole(usuario.id, role)}
                                                                    >
                                                                        {ROLE_LABELS[role]}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex flex-wrap gap-1">
                                                                {usuario.permissoesExtra.map((p) => (
                                                                    <div key={p} className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-50 p-0.5 rounded border border-slate-100">
                                                                        <ShieldAlert className="h-3 w-3" />
                                                                        {p}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild disabled={!usuario.ativo}>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 mt-0.5 shrink-0" title="Adicionar/Remover Permissões">
                                                                        <Plus className="h-4 w-4 text-slate-400" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-64">
                                                                    <DropdownMenuLabel className="text-xs">Permissões Especiais</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    {PERMISSOES_AVAILABLE.map(perm => {
                                                                        const isActive = usuario.permissoesExtra.includes(perm.value)
                                                                        return (
                                                                            <DropdownMenuItem
                                                                                key={perm.value}
                                                                                className="text-xs flex items-start gap-2 cursor-pointer"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault()
                                                                                    const current = new Set(usuario.permissoesExtra)
                                                                                    if (isActive) current.delete(perm.value)
                                                                                    else current.add(perm.value)
                                                                                    updatePermissoes(usuario.id, Array.from(current))
                                                                                }}
                                                                            >
                                                                                <div className={`mt-0.5 shrink-0 h-4 w-4 border rounded ${isActive ? 'bg-primary border-primary text-white flex items-center justify-center' : 'border-slate-300'}`}>
                                                                                    {isActive && <Check className="h-3 w-3" />}
                                                                                </div>
                                                                                <span className="leading-tight">{perm.label}</span>
                                                                            </DropdownMenuItem>
                                                                        )
                                                                    })}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {usuario.ativo
                                                        ? <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Ativo</Badge>
                                                        : <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50">Inativo</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={usuario.ativo ? 'text-slate-500 hover:text-rose-600' : 'text-slate-500 hover:text-emerald-600'}
                                                            onClick={() => toggleStatus(usuario.id)}
                                                            title={usuario.ativo ? 'Desativar' : 'Reativar'}
                                                        >
                                                            {usuario.ativo
                                                                ? <><PowerOff className="mr-1 h-4 w-4" /> Desativar</>
                                                                : <><Power className="mr-1 h-4 w-4" /> Reativar</>
                                                            }
                                                        </Button>
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

                <TabsContent value="pendentes" className="mt-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Servidor</TableHead>
                                        <TableHead>Lotação Solicitada</TableHead>
                                        <TableHead>Data do Registro</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendentes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-16 text-slate-400">
                                                Nenhuma solicitação pendente.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {pendentes.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{u.name}</span>
                                                    <span className="text-xs text-slate-400">{u.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-slate-700">Sec. Saúde</span>
                                                    <span className="text-xs text-slate-500">Departamento de Compras</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" className="text-slate-500 border-slate-200 hover:bg-slate-100 h-8 font-semibold">
                                                        Recusar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-primary hover:bg-primary/90 h-8 font-bold"
                                                        onClick={() => updateRole(u.id, 'OPERADOR')}
                                                    >
                                                        Aprovar Acesso
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
