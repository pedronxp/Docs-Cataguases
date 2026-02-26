import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Search, Building2, UserCheck, UserX, ShieldCheck, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { listarSecretarias, listarSetores, type Setor } from '@/services/secretaria.service'
import api from '@/lib/api'
import type { Secretaria, Usuario } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/usuarios-orgao' as any)({
    component: UsuariosOrgaoPage,
})

const ROLE_LABELS: Record<string, string> = {
    ADMIN_GERAL: 'Admin Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    OPERADOR: 'Operador',
    PENDENTE: 'Pendente',
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN_GERAL: 'bg-purple-100 text-purple-700 border-purple-200',
    PREFEITO: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    SECRETARIO: 'bg-blue-100 text-blue-700 border-blue-200',
    OPERADOR: 'bg-slate-100 text-slate-600 border-slate-200',
    PENDENTE: 'bg-orange-100 text-orange-600 border-orange-200',
}

function UsuariosOrgaoPage() {
    const { toast } = useToast()
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(false)

    const [filtroSecretaria, setFiltroSecretaria] = useState<string>('todas')
    const [filtroSetor, setFiltroSetor] = useState<string>('todos')
    const [busca, setBusca] = useState('')

    useEffect(() => {
        listarSecretarias().then(res => { if (res.success) setSecretarias(res.data) })
    }, [])

    useEffect(() => {
        if (filtroSecretaria && filtroSecretaria !== 'todas') {
            setFiltroSetor('todos')
            listarSetores(filtroSecretaria).then(res => {
                if (res.success) setSetores(res.data)
            })
        } else {
            setSetores([])
            setFiltroSetor('todos')
        }
    }, [filtroSecretaria])

    useEffect(() => {
        const timer = setTimeout(() => buscarUsuarios(), 400)
        return () => clearTimeout(timer)
    }, [filtroSecretaria, filtroSetor, busca])

    async function buscarUsuarios() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (busca) params.set('busca', busca)

            const res = await api.get(`/api/admin/users?${params}`)
            if (res.data.success) {
                let lista: Usuario[] = res.data.data
                if (filtroSecretaria && filtroSecretaria !== 'todas') {
                    lista = lista.filter(u => u.secretariaId === filtroSecretaria)
                }
                if (filtroSetor && filtroSetor !== 'todos') {
                    lista = lista.filter(u => u.setorId === filtroSetor)
                }
                setUsuarios(lista)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    async function toggleAtivo(u: Usuario) {
        try {
            await api.patch(`/api/admin/users/${u.id}`, { ativo: !u.ativo })
            setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x))
            toast({ title: u.ativo ? 'Usuário desativado' : 'Usuário ativado' })
        } catch {
            toast({ title: 'Erro ao alterar status', variant: 'destructive' })
        }
    }

    async function aprovarUsuario(u: Usuario) {
        try {
            await api.patch(`/api/admin/users/${u.id}`, { role: 'OPERADOR' })
            setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: 'OPERADOR' } : x))
            toast({ title: `${u.name} aprovado como Operador` })
        } catch {
            toast({ title: 'Erro ao aprovar usuário', variant: 'destructive' })
        }
    }

    const secNome = (id: string) => secretarias.find(s => s.id === id)?.nome ?? '—'
    const setorNome = (id: string) => setores.find(s => s.id === id)?.nome ?? '—'

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Usuários por Órgão</h2>
                <p className="text-sm text-slate-500">Visualize e gerencie servidores filtrando por secretaria e setor.</p>
            </div>

            {/* Filtros */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Search className="h-4 w-4 text-slate-400 shrink-0" />
                            <Input
                                placeholder="Buscar por nome ou e-mail..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm"
                            />
                        </div>

                        <Select value={filtroSecretaria} onValueChange={setFiltroSecretaria}>
                            <SelectTrigger className="w-[220px] text-sm">
                                <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                                <SelectValue placeholder="Secretaria..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas as Secretarias</SelectItem>
                                {secretarias.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {setores.length > 0 && (
                            <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                                <SelectTrigger className="w-[200px] text-sm">
                                    <SelectValue placeholder="Todos os Setores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Setores</SelectItem>
                                    {setores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <span className="text-xs text-slate-400 ml-auto">
                            {loading ? '...' : `${usuarios.length} servidor(es)`}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Lista */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-500" />
                        <CardTitle className="text-base">Servidores</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                        {filtroSecretaria !== 'todas' ? `Filtrando por: ${secNome(filtroSecretaria)}` : 'Todos os órgãos'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        </div>
                    ) : usuarios.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-sm">
                            Nenhum servidor encontrado com os filtros aplicados.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {usuarios.map(u => (
                                <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                                    {/* Avatar */}
                                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{u.name}</p>
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 shrink-0 ${ROLE_COLORS[u.role] ?? ''}`}
                                            >
                                                {ROLE_LABELS[u.role] ?? u.role}
                                            </Badge>
                                            {!u.ativo && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-500 border-red-200">
                                                    Inativo
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                        {u.secretariaId && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {secNome(u.secretariaId)}
                                                {u.setorId && ` › ${setorNome(u.setorId)}`}
                                            </p>
                                        )}
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {u.role === 'PENDENTE' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={() => aprovarUsuario(u)}
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                                Aprovar
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className={`h-8 text-xs ${u.ativo ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                                            onClick={() => toggleAtivo(u)}
                                        >
                                            {u.ativo ? <UserX className="h-3.5 w-3.5 mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                                            {u.ativo ? 'Desativar' : 'Ativar'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
