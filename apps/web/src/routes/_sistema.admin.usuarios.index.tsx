import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, ShieldAlert, PowerOff, Power, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useUsuarios } from '@/hooks/use-usuarios'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useEffect } from 'react'
import type { Usuario, RoleUsuario, Secretaria } from '@/types/domain'
import { atualizarUsuario } from '@/services/usuario.service'
import { listarSetores, type Setor } from '@/services/secretaria.service'
import api from '@/lib/api'

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

const ROLES_AVAILABLE: RoleUsuario[] = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'REVISOR', 'OPERADOR']

function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

const ROLES_APROVACAO: { value: RoleUsuario; label: string; requerSecretaria: boolean }[] = [
    { value: 'OPERADOR', label: 'Operador', requerSecretaria: true },
    { value: 'REVISOR', label: 'Revisor', requerSecretaria: true },
    { value: 'SECRETARIO', label: 'Secretário', requerSecretaria: true },
    { value: 'PREFEITO', label: 'Prefeito', requerSecretaria: false },
    { value: 'ADMIN_GERAL', label: 'Administrador Geral', requerSecretaria: false },
]

function UsuariosPage() {
    const { toast } = useToast()
    const { usuarios, loading, toggleStatus, refetch } = useUsuarios()
    const [busca, setBusca] = useState('')
    const [filtroRole, setFiltroRole] = useState<RoleUsuario | ''>('')
    const [filtroSecretaria, setFiltroSecretaria] = useState('')

    // Modal de aprovação de PENDENTE
    const [modalAprovar, setModalAprovar] = useState<Usuario | null>(null)
    const [roleSelecionada, setRoleSelecionada] = useState<RoleUsuario>('OPERADOR')
    const [secretariaSelecionada, setSecretariaSelecionada] = useState('')
    const [aprovando, setAprovando] = useState(false)
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setorSelecionado, setSetorSelecionado] = useState('')
    const [setores, setSetores] = useState<Setor[]>([])
    const [carregandoSetores, setCarregandoSetores] = useState(false)

    useEffect(() => {
        api.get('/api/admin/config/secretarias')
            .then((res) => setSecretarias(res.data.data || res.data || []))
            .catch(() => { })
    }, [])

    useEffect(() => {
        if (!secretariaSelecionada) {
            setSetores([])
            setSetorSelecionado('')
            return
        }
        setCarregandoSetores(true)
        listarSetores(secretariaSelecionada)
            .then((res) => { if (res.success) setSetores(res.data) })
            .catch(() => setSetores([]))
            .finally(() => setCarregandoSetores(false))
    }, [secretariaSelecionada])

    const requerSecretaria = ROLES_APROVACAO.find(r => r.value === roleSelecionada)?.requerSecretaria ?? true

    const abrirModalAprovar = (u: Usuario) => {
        setModalAprovar(u)
        setRoleSelecionada('OPERADOR')
        setSecretariaSelecionada('')
        setSetorSelecionado('')
        setSetores([])
    }

    const confirmarAprovacao = async () => {
        if (!modalAprovar) return
        if (requerSecretaria && !secretariaSelecionada) {
            toast({ title: 'Atenção', description: 'Selecione a secretaria do usuário.', variant: 'destructive' })
            return
        }
        setAprovando(true)
        const res = await atualizarUsuario(modalAprovar.id, {
            role: roleSelecionada,
            secretariaId: requerSecretaria ? secretariaSelecionada : null,
            setorId: requerSecretaria && setorSelecionado ? setorSelecionado : null,
            ativo: true,
        })
        if (res.success) {
            toast({ title: 'Acesso liberado!', description: `${modalAprovar.name} agora é ${ROLES_APROVACAO.find(r => r.value === roleSelecionada)?.label}.` })
            setModalAprovar(null)
            refetch()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setAprovando(false)
    }

    const ativos = usuarios.filter(u => u.role !== 'PENDENTE')
    const pendentes = usuarios.filter(u => u.role === 'PENDENTE')

    const filtradosAtivos = ativos.filter((u) => {
        if (busca && !u.name.toLowerCase().includes(busca.toLowerCase()) && !u.email.toLowerCase().includes(busca.toLowerCase())) return false
        if (filtroRole && u.role !== filtroRole) return false
        if (filtroSecretaria && u.secretariaId !== filtroSecretaria) return false
        return true
    })

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Gestão de Usuários</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">Controle o acesso de servidores e níveis de permissão no Doc's.</p>
                </div>
            </div>

            <Tabs defaultValue="ativos" className="w-full">
                <TabsList className="bg-transparent border-b-2 border-[#e6e6e6] w-full justify-start rounded-none h-14 p-0 gap-6">
                    <TabsTrigger value="ativos" className="data-[state=active]:border-b-4 data-[state=active]:border-[#1351b4] data-[state=active]:text-[#1351b4] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-full px-2 font-bold text-[#555555] text-base transition-all">
                        Usuários Ativos ({ativos.length})
                    </TabsTrigger>
                    <TabsTrigger value="pendentes" className="data-[state=active]:border-b-4 data-[state=active]:border-[#1351b4] data-[state=active]:text-[#1351b4] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none h-full px-2 font-bold text-[#555555] text-base transition-all">
                        Fila de Aprovação ({pendentes.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ativos" className="mt-8 space-y-6">
                    <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                        <div className="p-5 border-b border-[#e6e6e6] flex flex-col sm:flex-row gap-3 bg-[#f8f9fa] flex-wrap">
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-[#555555]" />
                                <Input
                                    placeholder="Buscar por nome ou e-mail..."
                                    className="pl-10 bg-white border-[#cccccc] h-11 focus-visible:ring-[#1351b4] focus-visible:border-[#1351b4] rounded text-base"
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>
                            <Select value={filtroRole || "all"} onValueChange={(v) => setFiltroRole(v === "all" ? '' : v as RoleUsuario | '')}>
                                <SelectTrigger className="w-[180px] h-11 bg-white border-[#cccccc] rounded text-sm">
                                    <SelectValue placeholder="Filtrar por nível" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os níveis</SelectItem>
                                    {ROLES_AVAILABLE.map(role => (
                                        <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={filtroSecretaria || "all"} onValueChange={(v) => setFiltroSecretaria(v === "all" ? '' : v)}>
                                <SelectTrigger className="w-[200px] h-11 bg-white border-[#cccccc] rounded text-sm">
                                    <SelectValue placeholder="Filtrar por secretaria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as secretarias</SelectItem>
                                    {secretarias.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.sigla}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {(filtroRole || filtroSecretaria || busca) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-11 px-3 text-[#555555] hover:text-[#e52207] hover:bg-[#ffefec]"
                                    onClick={() => { setBusca(''); setFiltroRole(''); setFiltroSecretaria('') }}
                                    title="Limpar filtros"
                                >
                                    <X className="h-4 w-4 mr-1" /> Limpar
                                </Button>
                            )}
                        </div>
                        <CardContent className="p-0">
                            {loading ? (
                                <DataTableSkeleton rows={4} columns={5} />
                            ) : (
                                <Table>
                                    <TableHeader className="bg-[#f8f9fa] border-b-2 border-[#1351b4]">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-[#333333] font-bold py-4">Servidor</TableHead>
                                            <TableHead className="text-[#333333] font-bold py-4">Lotação</TableHead>
                                            <TableHead className="text-[#333333] font-bold py-4">Nível de Acesso</TableHead>
                                            <TableHead className="w-[120px] text-[#333333] font-bold py-4">Status</TableHead>
                                            <TableHead className="text-right text-[#333333] font-bold py-4">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtradosAtivos.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-16 text-[#555555] font-medium text-lg">
                                                    Nenhum usuário encontrado na busca.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {filtradosAtivos.map((usuario: Usuario) => (
                                            <TableRow key={usuario.id} className={`hover:bg-[#f0f4f8] transition-colors border-b border-[#e6e6e6] ${!usuario.ativo ? 'opacity-60 bg-[#f8f9fa]' : ''}`}>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                                            <AvatarFallback className={`text-sm font-bold ${usuario.ativo ? 'bg-[#1351b4] text-white' : 'bg-[#cccccc] text-[#555555]'}`}>
                                                                {getInitials(usuario.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[#333333] text-base">{usuario.name}</span>
                                                            <span className="text-sm text-[#555555]">{usuario.email}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        {usuario.secretaria ? (
                                                            <>
                                                                <span className="text-sm font-medium text-[#333333]">{usuario.secretaria.nome}</span>
                                                                {usuario.setor && (
                                                                    <span className="text-xs text-[#555555]">{usuario.setor.nome}</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-sm text-[#999999] italic">Não vinculado</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <span className="text-sm font-semibold text-[#1351b4]">
                                                            {ROLE_LABELS[usuario.role] ?? usuario.role}
                                                        </span>
                                                        {usuario.permissoesExtra.length > 0 && (
                                                            <span className="flex items-center gap-1 text-xs text-[#555555]">
                                                                <ShieldAlert className="h-3.5 w-3.5 text-[#e52207]" />
                                                                {usuario.permissoesExtra.length} permissão(ões) extra
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {usuario.ativo
                                                        ? <Badge variant="outline" className="text-[#008833] border-[#008833] bg-[#e6f4eb] font-bold px-3 py-1 rounded">Ativo</Badge>
                                                        : <Badge variant="outline" className="text-[#555555] border-[#555555] bg-[#f8f9fa] font-bold px-3 py-1 rounded">Inativo</Badge>
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            to="/admin/usuarios/$usuarioId"
                                                            params={{ usuarioId: usuario.id }}
                                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1351b4] hover:underline px-2 py-1"
                                                        >
                                                            Configurar
                                                        </Link>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={usuario.ativo ? 'text-[#e52207] hover:bg-[#ffefec] hover:text-[#c41c00] font-bold' : 'text-[#008833] hover:bg-[#e6f4eb] hover:text-[#006622] font-bold'}
                                                            onClick={() => toggleStatus(usuario.id)}
                                                            title={usuario.ativo ? 'Desativar Acesso' : 'Reativar Acesso'}
                                                        >
                                                            {usuario.ativo
                                                                ? <><PowerOff className="mr-2 h-4 w-4" /> Desativar</>
                                                                : <><Power className="mr-2 h-4 w-4" /> Reativar</>
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

                <TabsContent value="pendentes" className="mt-8">
                    <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-[#f8f9fa] border-b-2 border-[#1351b4]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[#333333] font-bold py-4">Servidor</TableHead>
                                        <TableHead className="text-[#333333] font-bold py-4">Lotação Solicitada</TableHead>
                                        <TableHead className="text-[#333333] font-bold py-4">Data do Registro</TableHead>
                                        <TableHead className="text-right text-[#333333] font-bold py-4">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendentes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-16 text-[#555555] font-medium text-lg">
                                                Nenhuma solicitação pendente.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {pendentes.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-[#f0f4f8] transition-colors border-b border-[#e6e6e6]">
                                            <TableCell className="py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#333333] text-base">{u.name}</span>
                                                    <span className="text-sm text-[#555555]">{u.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className="text-sm text-[#555555] italic">
                                                    {u.secretaria?.nome || 'Não informado'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-[#333333] text-sm font-medium py-4">
                                                {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <Button
                                                    size="sm"
                                                    className="bg-[#1351b4] hover:bg-[#0c326f] text-white h-10 px-4 font-bold shadow-none rounded"
                                                    onClick={() => abrirModalAprovar(u)}
                                                >
                                                    Liberar Acesso
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal — Liberar Acesso */}
            <Dialog open={!!modalAprovar} onOpenChange={(open) => !open && setModalAprovar(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black text-[#333333] text-lg">Liberar Acesso</DialogTitle>
                        <DialogDescription className="text-[#555555]">
                            Defina o nível de acesso de <strong>{modalAprovar?.name}</strong> no sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="font-bold text-[#333333]">Nível de acesso <span className="text-[#e52207]">*</span></Label>
                            <Select value={roleSelecionada} onValueChange={(v) => { setRoleSelecionada(v as RoleUsuario); setSecretariaSelecionada(''); setSetorSelecionado(''); setSetores([]) }}>
                                <SelectTrigger className="border-[#cccccc] rounded h-11">
                                    <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLES_APROVACAO.map((r) => (
                                        <SelectItem key={r.value} value={r.value} className="font-medium">
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {requerSecretaria && (
                            <div className="space-y-1.5">
                                <Label className="font-bold text-[#333333]">Secretaria <span className="text-[#e52207]">*</span></Label>
                                <Select value={secretariaSelecionada} onValueChange={setSecretariaSelecionada}>
                                    <SelectTrigger className="border-[#cccccc] rounded h-11">
                                        <SelectValue placeholder="Selecionar secretaria..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {secretarias.length === 0
                                            ? <SelectItem value="__none__" disabled>Carregando...</SelectItem>
                                            : secretarias.map((s) => (
                                                <SelectItem key={s.id} value={s.id} className="font-medium">
                                                    {s.nome} ({s.sigla})
                                                </SelectItem>
                                            ))
                                        }
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-[#555555]">Obrigatório para Operador, Revisor e Secretário.</p>
                            </div>
                        )}

                        {requerSecretaria && secretariaSelecionada && (
                            <div className="space-y-1.5">
                                <Label className="font-bold text-[#333333]">
                                    Setor <span className="text-[#555555] font-normal text-sm">(opcional)</span>
                                </Label>
                                <Select value={setorSelecionado} onValueChange={setSetorSelecionado} disabled={carregandoSetores}>
                                    <SelectTrigger className="border-[#cccccc] rounded h-11">
                                        <SelectValue placeholder={carregandoSetores ? 'Carregando setores...' : 'Selecionar setor...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {setores.length === 0 && !carregandoSetores && (
                                            <SelectItem value="__none__" disabled>Nenhum setor cadastrado</SelectItem>
                                        )}
                                        {setores.map((s) => (
                                            <SelectItem key={s.id} value={s.id} className="font-medium">
                                                {s.nome} ({s.sigla})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setModalAprovar(null)} disabled={aprovando} className="rounded border-[#cccccc]">
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmarAprovacao}
                            disabled={aprovando || (requerSecretaria && !secretariaSelecionada)}
                            className="bg-[#1351b4] hover:bg-[#0c326f] text-white font-bold rounded"
                        >
                            {aprovando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Liberar Acesso'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
