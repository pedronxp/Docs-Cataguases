import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck, Globe, Building2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { Usuario, RoleUsuario, Secretaria } from '@/types/domain'
import { buscarUsuario, atualizarUsuario, toggleAtivo } from '@/services/usuario.service'
import { listarSecretarias, listarSetores, type Setor } from '@/services/secretaria.service'

export const Route = createFileRoute('/_sistema/admin/usuarios/$usuarioId')({
    component: UsuarioDetalhePage,
})

// ── Catálogo de permissões ────────────────────────────────────────────────────

type EscopoPermissao = 'global' | 'secretaria' | 'sempre-global'

interface CatalogoPermissao {
    value: string          // acao:Subject (sem o escopo)
    label: string
    descricao: string
    escopo: EscopoPermissao
    categoria: string
    aviso?: string
}

const CATALOGO: CatalogoPermissao[] = [
    // Portarias
    {
        value: 'aprovar:Portaria', label: 'Aprovar Portarias',
        descricao: 'Permite aprovar portarias que estão em revisão, avançando para a próxima etapa do fluxo.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'rejeitar:Portaria', label: 'Rejeitar Portarias',
        descricao: 'Devolve portarias ao operador com um comentário de correção obrigatório.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'publicar:Portaria', label: 'Publicar Portarias',
        descricao: 'Publica portarias no diário oficial após a assinatura ter sido realizada.',
        escopo: 'global', categoria: 'Portarias',
    },
    {
        value: 'deletar:Portaria', label: 'Excluir Portarias',
        descricao: 'Remove portarias permanentemente do sistema. Esta ação não pode ser desfeita.',
        escopo: 'sempre-global', categoria: 'Portarias',
        aviso: 'Ação irreversível',
    },
    {
        value: 'assinar:Portaria', label: 'Assinar Portarias',
        descricao: 'Coloca assinatura digital em portarias. Normalmente reservado ao Prefeito.',
        escopo: 'sempre-global', categoria: 'Portarias',
    },
    // Revisão
    {
        value: 'claim:Revisao', label: 'Pegar Portarias para Revisão',
        descricao: 'Permite assumir portarias da fila de revisão para analisar e aprovar ou rejeitar.',
        escopo: 'sempre-global', categoria: 'Revisão',
    },
    {
        value: 'transferir:Revisao', label: 'Transferir Revisão',
        descricao: 'Passa uma revisão em andamento para outro revisor disponível, com justificativa.',
        escopo: 'sempre-global', categoria: 'Revisão',
    },
    // Dados
    {
        value: 'ler:Analytics', label: 'Ver Painel de Analytics',
        descricao: 'Acessa gráficos e estatísticas de uso do sistema: portarias criadas, aprovadas, por secretaria, etc.',
        escopo: 'sempre-global', categoria: 'Dados e Relatórios',
    },
    // Dados
    {
        value: 'visualizar:PortariaGlobal', label: 'Ver Acervo de Todas as Secretarias',
        descricao: 'Permite visualizar portarias de todas as secretarias no acervo documental, não apenas da secretaria do usuário.',
        escopo: 'sempre-global', categoria: 'Dados e Relatórios',
    },
    // Admin
    {
        value: 'gerenciar:Modelo', label: 'Gerenciar Modelos de Documento',
        descricao: 'Cria, edita e exclui modelos de portaria usados por todas as secretarias do sistema.',
        escopo: 'sempre-global', categoria: 'Administração',
    },
]

const CATEGORIAS = [...new Set(CATALOGO.map(p => p.categoria))]

const ROLE_LABELS: Record<RoleUsuario, string> = {
    ADMIN_GERAL: 'Administrador Geral',
    PREFEITO: 'Prefeito',
    SECRETARIO: 'Secretário',
    REVISOR: 'Revisor',
    OPERADOR: 'Operador',
    PENDENTE: 'Aguardando Liberação',
}

const ROLES_AVAILABLE: RoleUsuario[] = ['ADMIN_GERAL', 'PREFEITO', 'SECRETARIO', 'REVISOR', 'OPERADOR']
const ROLES_REQUEREM_SECRETARIA: RoleUsuario[] = ['REVISOR', 'OPERADOR', 'SECRETARIO']

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Helpers permissão ─────────────────────────────────────────────────────────

function parsePermissao(raw: string): { base: string; escopo: 'secretaria' | 'global' } {
    const parts = raw.split(':')
    if (parts.length === 3 && parts[2] === 'secretaria') {
        return { base: `${parts[0]}:${parts[1]}`, escopo: 'secretaria' }
    }
    return { base: raw, escopo: 'global' }
}

function buildPermissaoString(base: string, escopo: 'secretaria' | 'global'): string {
    return escopo === 'secretaria' ? `${base}:secretaria` : base
}

// ── Componente ────────────────────────────────────────────────────────────────

function UsuarioDetalhePage() {
    const { usuarioId } = Route.useParams()
    const navigate = useNavigate()
    const { toast } = useToast()

    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [carregando, setCarregando] = useState(true)
    const [salvando, setSalvando] = useState(false)
    const [openSections, setOpenSections] = useState<Set<string>>(new Set())

    // Estado editável
    const [role, setRole] = useState<RoleUsuario>('OPERADOR')
    const [secretariaId, setSecretariaId] = useState<string | null>(null)
    const [setorId, setSetorId] = useState<string | null>(null)
    // mapa: base → escopo escolhido pelo admin
    const [permissoes, setPermissoes] = useState<Record<string, 'global' | 'secretaria'>>({})

    // Dados auxiliares
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [setores, setSetores] = useState<Setor[]>([])

    // Carrega usuário + secretarias na montagem
    useEffect(() => {
        Promise.all([buscarUsuario(usuarioId), listarSecretarias()]).then(([uRes, sRes]) => {
            if (!uRes.success) { toast({ title: 'Erro', description: uRes.error, variant: 'destructive' }); return }
            if (!sRes.success) { toast({ title: 'Erro', description: sRes.error, variant: 'destructive' }); return }

            const u = uRes.data
            setUsuario(u)
            setRole(u.role)
            setSecretariaId(u.secretariaId)
            setSetorId(u.setorId)
            setSecretarias(sRes.data)

            // Popula mapa de permissões a partir do array do usuário
            const mapa: Record<string, 'global' | 'secretaria'> = {}
            for (const raw of u.permissoesExtra) {
                const { base, escopo } = parsePermissao(raw)
                mapa[base] = escopo
            }
            setPermissoes(mapa)

            setCarregando(false)
        })
    }, [usuarioId])

    // Recarrega setores quando secretaria muda
    useEffect(() => {
        if (!secretariaId) { setSetores([]); return }
        listarSetores(secretariaId).then(res => {
            if (res.success) setSetores(res.data)
        })
    }, [secretariaId])

    function toggleSection(categoria: string) {
        setOpenSections(prev => {
            const next = new Set(prev)
            if (next.has(categoria)) { next.delete(categoria) } else { next.add(categoria) }
            return next
        })
    }

    function togglePermissao(base: string) {
        setPermissoes(prev => {
            const next = { ...prev }
            if (next[base] !== undefined) {
                delete next[base]
            } else {
                next[base] = 'global'
            }
            return next
        })
    }

    function setEscopo(base: string, escopo: 'global' | 'secretaria') {
        setPermissoes(prev => ({ ...prev, [base]: escopo }))
    }

    async function handleSalvar() {
        if (ROLES_REQUEREM_SECRETARIA.includes(role) && !secretariaId) {
            toast({ title: 'Campo obrigatório', description: 'Secretaria é obrigatória para este nível de acesso.', variant: 'destructive' })
            return
        }

        setSalvando(true)
        const permissoesExtra = Object.entries(permissoes).map(([base, esc]) => buildPermissaoString(base, esc))

        const res = await atualizarUsuario(usuarioId, { role, secretariaId, setorId, permissoesExtra })
        setSalvando(false)

        if (!res.success) {
            toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
            return
        }
        toast({ title: 'Salvo com sucesso', description: 'Permissões atualizadas.' })
        navigate({ to: '/admin/usuarios' })
    }

    async function handleToggleAtivo() {
        if (!usuario) return
        const res = await toggleAtivo(usuarioId)
        if (!res.success) {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
            return
        }
        setUsuario(prev => prev ? { ...prev, ativo: res.data.ativo } : prev)
        toast({ title: res.data.ativo ? 'Conta reativada' : 'Conta desativada', description: res.data.name })
    }

    if (carregando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#1351b4]" />
            </div>
        )
    }

    if (!usuario) return null

    const requerSecretaria = ROLES_REQUEREM_SECRETARIA.includes(role)

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

            {/* Voltar */}
            <button
                onClick={() => navigate({ to: '/admin/usuarios' })}
                className="flex items-center gap-2 text-sm text-[#1351b4] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Usuários
            </button>

            {/* Header do usuário */}
            <div className="bg-white border border-[#cccccc] rounded-none p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 bg-[#1351b4] text-white text-lg">
                        <AvatarFallback className="bg-[#1351b4] text-white text-lg font-bold">
                            {getInitials(usuario.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-xl font-bold text-[#071D41]">{usuario.name}</h1>
                        <p className="text-sm text-[#555555]">{usuario.email}</p>
                        <p className="text-xs text-[#888888] mt-0.5">
                            Desde {new Date(usuario.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>
                <Badge className={usuario.ativo
                    ? 'border border-[#168821] text-[#168821] bg-[#e3f5e1] rounded-none font-semibold'
                    : 'border border-[#888888] text-[#888888] bg-[#f0f0f0] rounded-none font-semibold'
                }>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
            </div>

            {/* Dados de acesso */}
            <div className="bg-white border border-[#cccccc] rounded-none p-6 space-y-4">
                <h2 className="text-xs font-bold text-[#555555] uppercase tracking-wider">Dados de Acesso</h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Role */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#333333]">Nível de Acesso</label>
                        <Select value={role} onValueChange={v => { setRole(v as RoleUsuario); if (!ROLES_REQUEREM_SECRETARIA.includes(v as RoleUsuario)) { setSecretariaId(null); setSetorId(null) } }}>
                            <SelectTrigger className="rounded-none border-[#cccccc] text-sm h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {ROLES_AVAILABLE.map(r => (
                                    <SelectItem key={r} value={r} className="text-sm">{ROLE_LABELS[r]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Secretaria */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#333333]">
                            Secretaria {requerSecretaria && <span className="text-[#e52207]">*</span>}
                        </label>
                        <Select
                            value={secretariaId ?? '__nenhuma__'}
                            onValueChange={v => { setSecretariaId(v === '__nenhuma__' ? null : v); setSetorId(null) }}
                        >
                            <SelectTrigger className="rounded-none border-[#cccccc] text-sm h-9">
                                <SelectValue placeholder="Nenhuma" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                {!requerSecretaria && <SelectItem value="__nenhuma__" className="text-sm text-[#888888]">Nenhuma</SelectItem>}
                                {secretarias.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.sigla} — {s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Setor */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#333333]">Setor</label>
                        <Select
                            value={setorId ?? '__nenhum__'}
                            onValueChange={v => setSetorId(v === '__nenhum__' ? null : v)}
                            disabled={!secretariaId}
                        >
                            <SelectTrigger className="rounded-none border-[#cccccc] text-sm h-9">
                                <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="__nenhum__" className="text-sm text-[#888888]">Nenhum</SelectItem>
                                {setores.map(s => (
                                    <SelectItem key={s.id} value={s.id} className="text-sm">{s.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Permissões especiais — accordion por categoria */}
            <div className="bg-white border border-[#cccccc] rounded-none">
                <div className="px-6 pt-5 pb-3">
                    <h2 className="text-xs font-bold text-[#555555] uppercase tracking-wider">Permissões Especiais</h2>
                    <p className="text-xs text-[#888888] mt-1">Capacidades extras além do que o nível de acesso já garante automaticamente.</p>
                </div>

                {CATEGORIAS.map((categoria, idx) => {
                    const isOpen = openSections.has(categoria)
                    const permsDaCategoria = CATALOGO.filter(p => p.categoria === categoria)
                    const ativasNaCategoria = permsDaCategoria.filter(p => permissoes[p.value] !== undefined).length

                    return (
                        <div key={categoria} className={idx > 0 ? 'border-t border-[#e6e6e6]' : ''}>
                            {/* Header clicável da categoria */}
                            <button
                                onClick={() => toggleSection(categoria)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#f8f9fa] transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-[#333333]">{categoria}</span>
                                    {ativasNaCategoria > 0 && (
                                        <span className="text-xs bg-[#1351b4] text-white px-2 py-0.5 rounded-full font-medium">
                                            {ativasNaCategoria}
                                        </span>
                                    )}
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 text-[#555555] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {/* Conteúdo expansível */}
                            <div
                                className="overflow-hidden transition-all duration-200 ease-in-out"
                                style={{ maxHeight: isOpen ? `${permsDaCategoria.length * 200}px` : '0px' }}
                            >
                                <div className="px-6 pb-4 space-y-3">
                                    {permsDaCategoria.map(perm => {
                                        const ativo = permissoes[perm.value] !== undefined
                                        const escopoAtual = permissoes[perm.value] ?? 'global'

                                        return (
                                            <div
                                                key={perm.value}
                                                className={`border p-4 transition-colors ${ativo ? 'border-[#1351b4] bg-[#f0f4ff]' : 'border-[#e6e6e6] bg-white'}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <button
                                                        onClick={() => togglePermissao(perm.value)}
                                                        className={`mt-0.5 flex-shrink-0 w-4 h-4 border-2 rounded-sm flex items-center justify-center transition-colors ${
                                                            ativo ? 'border-[#1351b4] bg-[#1351b4]' : 'border-[#888888] bg-white'
                                                        }`}
                                                    >
                                                        {ativo && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                                                    </button>

                                                    <div className="flex-1 space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-sm font-semibold text-[#071D41]">{perm.label}</span>
                                                            {perm.aviso && (
                                                                <span className="text-xs text-[#e52207] font-medium flex items-center gap-1">
                                                                    <ShieldAlert className="h-3 w-3" /> {perm.aviso}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-[#555555]">{perm.descricao}</p>

                                                        {perm.escopo === 'sempre-global' ? (
                                                            <p className="text-xs text-[#888888] flex items-center gap-1">
                                                                <Globe className="h-3 w-3" />
                                                                Global — vale para todo o sistema
                                                            </p>
                                                        ) : ativo ? (
                                                            <div className="flex items-center gap-2 pt-0.5">
                                                                <span className="text-xs text-[#555555] font-medium">Escopo:</span>
                                                                <button
                                                                    onClick={() => setEscopo(perm.value, 'secretaria')}
                                                                    className={`flex items-center gap-1 text-xs px-2 py-0.5 border transition-colors ${
                                                                        escopoAtual === 'secretaria'
                                                                            ? 'border-[#1351b4] bg-[#1351b4] text-white'
                                                                            : 'border-[#cccccc] text-[#555555] hover:border-[#1351b4]'
                                                                    }`}
                                                                >
                                                                    <Building2 className="h-3 w-3" /> Só desta secretaria
                                                                </button>
                                                                <button
                                                                    onClick={() => setEscopo(perm.value, 'global')}
                                                                    className={`flex items-center gap-1 text-xs px-2 py-0.5 border transition-colors ${
                                                                        escopoAtual === 'global'
                                                                            ? 'border-[#1351b4] bg-[#1351b4] text-white'
                                                                            : 'border-[#cccccc] text-[#555555] hover:border-[#1351b4]'
                                                                    }`}
                                                                >
                                                                    <Globe className="h-3 w-3" /> Global
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-[#aaaaaa] italic">Ative para escolher o escopo.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Rodapé de ações */}
            <div className="flex items-center justify-between pt-2 pb-8">
                <Button
                    variant="ghost"
                    onClick={handleToggleAtivo}
                    className={`text-sm rounded-none ${usuario.ativo ? 'text-[#e52207] hover:bg-red-50' : 'text-[#168821] hover:bg-green-50'}`}
                >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {usuario.ativo ? 'Desativar conta' : 'Reativar conta'}
                </Button>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate({ to: '/admin/usuarios' })}
                        className="rounded-none border-[#cccccc] text-[#333333] text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSalvar}
                        disabled={salvando}
                        className="rounded-none bg-[#1351b4] hover:bg-[#0c3e8a] text-white text-sm px-6"
                    >
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar alterações
                    </Button>
                </div>
            </div>
        </div>
    )
}
