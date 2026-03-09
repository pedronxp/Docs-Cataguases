import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { Search, Building2, Users, UserX, ChevronDown, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { listarSecretarias, listarSetores, type Setor } from '@/services/secretaria.service'
import api from '@/lib/api'
import type { Secretaria, Usuario, RoleUsuario } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/usuarios-orgao' as any)({
    component: OrganogramaPessoalPage,
})

const ROLE_LABELS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'Admin Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    REVISOR: 'Revisor',
    OPERADOR: 'Operador',
    PENDENTE: 'Pendente',
}

const ROLE_COLORS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'border-[#9b59b6] text-[#9b59b6] bg-[#f9f0ff]',
    PREFEITO:    'border-[#d4a017] text-[#7d5c00] bg-[#fffbea]',
    SECRETARIO:  'border-[#1351b4] text-[#1351b4] bg-[#e8f0fb]',
    REVISOR:     'border-[#0c7b41] text-[#0c7b41] bg-[#e6f4eb]',
    OPERADOR:    'border-[#555555] text-[#555555] bg-[#f8f9fa]',
    PENDENTE:    'border-[#e57700] text-[#e57700] bg-[#fff5e6]',
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function OrganogramaPessoalPage() {
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setores, setSetores] = useState<Setor[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [carregando, setCarregando] = useState(true)
    const [carregandoSetores, setCarregandoSetores] = useState(false)

    const [secSelecionada, setSecSelecionada] = useState<string>('todas')
    const [setorSelecionado, setSetorSelecionado] = useState<string>('todos')
    const [busca, setBusca] = useState('')
    const [dropdownAberto, setDropdownAberto] = useState(false)

    useEffect(() => {
        async function carregar() {
            setCarregando(true)
            const [secRes, usersRes] = await Promise.all([
                listarSecretarias(),
                api.get('/api/admin/users').catch(() => ({ data: { success: false } })),
            ])
            if (secRes.success) setSecretarias(secRes.data)
            if (usersRes.data?.success) setUsuarios(usersRes.data.data as Usuario[])
            setCarregando(false)
        }
        carregar()
    }, [])

    // Carrega setores quando secretaria muda
    useEffect(() => {
        setSetorSelecionado('todos')
        if (!secSelecionada || secSelecionada === 'todas') {
            setSetores([])
            return
        }
        setCarregandoSetores(true)
        listarSetores(secSelecionada)
            .then(res => { if (res.success) setSetores(res.data) })
            .finally(() => setCarregandoSetores(false))
    }, [secSelecionada])

    // Usuários filtrados
    const usuariosFiltrados = useMemo(() => {
        return usuarios.filter(u => {
            if (secSelecionada !== 'todas' && u.secretariaId !== secSelecionada) return false
            if (setorSelecionado !== 'todos' && u.setorId !== setorSelecionado) return false
            if (busca.trim()) {
                const q = busca.toLowerCase()
                if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
            }
            return true
        })
    }, [usuarios, secSelecionada, setorSelecionado, busca])

    // Agrupa por setor (só quando secretaria selecionada)
    const gruposSetor = useMemo(() => {
        if (secSelecionada === 'todas' || setorSelecionado !== 'todos') return null

        const grupos: { setor: Setor | null; membros: Usuario[] }[] = []
        const semSetor = usuariosFiltrados.filter(u => !u.setorId)
        if (semSetor.length > 0) grupos.push({ setor: null, membros: semSetor })

        for (const setor of setores) {
            const membros = usuariosFiltrados.filter(u => u.setorId === setor.id)
            if (membros.length > 0) grupos.push({ setor, membros })
        }
        return grupos
    }, [usuariosFiltrados, setores, secSelecionada, setorSelecionado])

    const secAtual = secretarias.find(s => s.id === secSelecionada)
    const totalAtivos = usuarios.filter(u => u.ativo && u.role !== 'PENDENTE').length

    function limparFiltros() {
        setSecSelecionada('todas')
        setSetorSelecionado('todos')
        setBusca('')
    }

    const temFiltro = secSelecionada !== 'todas' || setorSelecionado !== 'todos' || busca.trim() !== ''

    if (carregando) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Lotação por Secretaria</h2>
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="bg-white border border-[#e6e6e6] h-14 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">

            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Lotação por Secretaria</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        Visualize a distribuição de servidores por secretaria e setor.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-[#e6e6e6] px-4 py-2 shrink-0">
                    <Users className="h-4 w-4 text-[#1351b4]" />
                    <span className="text-sm font-bold text-[#1351b4]">{totalAtivos}</span>
                    <span className="text-sm text-[#555555]">servidores ativos</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white border border-[#e6e6e6] p-4 flex flex-wrap gap-3 items-center">

                {/* Dropdown secretaria customizado */}
                <div className="relative min-w-[260px]">
                    <button
                        onClick={() => setDropdownAberto(v => !v)}
                        className="w-full flex items-center justify-between gap-2 border border-[#cccccc] bg-white px-3 h-10 text-sm hover:border-[#1351b4] transition-colors"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-4 w-4 text-[#555555] shrink-0" />
                            <span className="truncate font-medium text-[#333333]">
                                {secAtual ? `${secAtual.sigla} — ${secAtual.nome}` : 'Todas as Secretarias'}
                            </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-[#555555] transition-transform shrink-0 ${dropdownAberto ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownAberto && (
                        <>
                            {/* Overlay para fechar */}
                            <div className="fixed inset-0 z-10" onClick={() => setDropdownAberto(false)} />
                            <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[#cccccc] border-t-0 shadow-lg max-h-64 overflow-y-auto">
                                <button
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f0f4ff] transition-colors ${secSelecionada === 'todas' ? 'font-bold text-[#1351b4] bg-[#f0f4ff]' : 'text-[#333333]'}`}
                                    onClick={() => { setSecSelecionada('todas'); setDropdownAberto(false) }}
                                >
                                    Todas as Secretarias
                                </button>
                                {secretarias.map(s => (
                                    <button
                                        key={s.id}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f0f4ff] transition-colors border-t border-[#f0f0f0] ${secSelecionada === s.id ? 'font-bold text-[#1351b4] bg-[#f0f4ff]' : 'text-[#333333]'}`}
                                        onClick={() => { setSecSelecionada(s.id); setDropdownAberto(false) }}
                                    >
                                        <span className="font-bold">{s.sigla}</span>
                                        <span className="text-[#555555] ml-1.5">— {s.nome}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Setor (só aparece quando secretaria selecionada) */}
                {secSelecionada !== 'todas' && (
                    <select
                        value={setorSelecionado}
                        onChange={e => setSetorSelecionado(e.target.value)}
                        disabled={carregandoSetores}
                        className="border border-[#cccccc] bg-white px-3 h-10 text-sm text-[#333333] min-w-[180px] focus:outline-none focus:border-[#1351b4]"
                    >
                        <option value="todos">Todos os setores</option>
                        {setores.map(s => (
                            <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                    </select>
                )}

                {/* Busca */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-[#555555]" />
                    <Input
                        placeholder="Buscar por nome ou e-mail..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="pl-9 bg-white border-[#cccccc] h-10 focus-visible:ring-[#1351b4] focus-visible:border-[#1351b4] rounded-none text-sm"
                    />
                    {busca && (
                        <button onClick={() => setBusca('')} className="absolute right-3 top-3 text-[#888888] hover:text-[#333333]">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Limpar filtros */}
                {temFiltro && (
                    <button
                        onClick={limparFiltros}
                        className="flex items-center gap-1.5 text-sm text-[#555555] hover:text-[#e52207] px-3 h-10 border border-[#cccccc] hover:border-[#e52207] transition-colors bg-white"
                    >
                        <X className="h-3.5 w-3.5" /> Limpar
                    </button>
                )}

                <span className="text-xs text-[#555555] ml-auto font-medium">
                    {usuariosFiltrados.length} servidor{usuariosFiltrados.length !== 1 ? 'es' : ''}
                </span>
            </div>

            {/* Resultado */}
            <div className="bg-white border border-[#e6e6e6]">

                {/* Cabeçalho do resultado */}
                {secAtual && (
                    <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-[#1351b4] bg-[#f0f4ff]">
                        <div className="w-9 h-9 bg-[#1351b4] flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#071D41]">{secAtual.nome}</p>
                            <p className="text-xs text-[#555555]">{secAtual.sigla}</p>
                        </div>
                        <span className="ml-auto text-xs font-bold text-[#1351b4] border border-[#1351b4] bg-white px-2 py-1">
                            {usuariosFiltrados.length} servidor{usuariosFiltrados.length !== 1 ? 'es' : ''}
                        </span>
                    </div>
                )}

                {usuariosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#aaaaaa] gap-3">
                        <UserX className="h-8 w-8" />
                        <p className="text-sm font-medium">Nenhum servidor encontrado</p>
                        {temFiltro && (
                            <button onClick={limparFiltros} className="text-xs text-[#1351b4] hover:underline">
                                Limpar filtros
                            </button>
                        )}
                    </div>
                ) : gruposSetor ? (
                    // Agrupado por setor (quando secretaria selecionada e sem filtro de setor)
                    <div>
                        {gruposSetor.map(({ setor, membros }, idx) => (
                            <div key={setor?.id ?? '__sem_setor__'}>
                                {/* Sub-cabeçalho do setor */}
                                <div className={`px-5 py-2 bg-[#f8f9fa] flex items-center justify-between ${idx > 0 ? 'border-t border-[#e6e6e6]' : ''}`}>
                                    <span className="text-[11px] font-bold text-[#555555] uppercase tracking-wider">
                                        {setor ? `${setor.nome}${setor.sigla ? ` (${setor.sigla})` : ''}` : 'Sem setor definido'}
                                    </span>
                                    <span className="text-[11px] text-[#888888]">{membros.length}</span>
                                </div>
                                <div className="divide-y divide-[#f0f0f0]">
                                    {membros.map(u => <UsuarioRow key={u.id} usuario={u} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Lista plana (todas as secretarias ou setor específico selecionado)
                    <div className="divide-y divide-[#f0f0f0]">
                        {usuariosFiltrados.map(u => (
                            <UsuarioRow
                                key={u.id}
                                usuario={u}
                                secretaria={secretarias.find(s => s.id === u.secretariaId)}
                                showSecretaria={secSelecionada === 'todas'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function UsuarioRow({ usuario, secretaria, showSecretaria }: {
    usuario: Usuario
    secretaria?: Secretaria
    showSecretaria?: boolean
}) {
    return (
        <div className={`flex items-center gap-3 px-5 py-3 hover:bg-[#f8f9fa] transition-colors ${!usuario.ativo ? 'opacity-50' : ''}`}>
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={`text-xs font-bold ${usuario.ativo ? 'bg-[#1351b4] text-white' : 'bg-[#cccccc] text-[#555555]'}`}>
                    {getInitials(usuario.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#333333] truncate">{usuario.name}</span>
                    {!usuario.ativo && <span className="text-[10px] text-[#888888]">Inativo</span>}
                </div>
                <p className="text-xs text-[#888888] truncate">
                    {usuario.email}
                    {showSecretaria && secretaria && (
                        <span className="ml-2 font-medium text-[#555555]">· {secretaria.sigla}</span>
                    )}
                </p>
            </div>
            <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 shrink-0 font-semibold ${ROLE_COLORS[usuario.role] ?? ''}`}
            >
                {ROLE_LABELS[usuario.role] ?? usuario.role}
            </Badge>
        </div>
    )
}
