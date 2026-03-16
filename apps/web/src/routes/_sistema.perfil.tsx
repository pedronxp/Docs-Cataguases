import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { useState } from 'react'
import {
    Eye, EyeOff, ShieldAlert, KeyRound, Loader2,
    LogOut, User, Mail, Shield, Building2, FileText,
    ChevronRight, Lock, Edit2, Check, X, BarChart2, ScrollText,
} from 'lucide-react'

export const Route = createFileRoute('/_sistema/perfil')({
    component: PerfilPage,
})

const ROLE_CONFIG: Record<string, { label: string; cor: string; desc: string }> = {
    ADMIN_GERAL:  { label: 'Admin Geral',   cor: 'bg-rose-100 text-rose-700 border-rose-200',       desc: 'Acesso total ao sistema' },
    PREFEITO:     { label: 'Prefeito',      cor: 'bg-primary/10 text-primary border-primary/20',    desc: 'Assina e publica portarias' },
    SECRETARIO:   { label: 'Secretário',    cor: 'bg-violet-100 text-violet-700 border-violet-200', desc: 'Aprova e rejeita portarias da secretaria' },
    REVISOR:      { label: 'Revisor',       cor: 'bg-amber-100 text-amber-700 border-amber-200',    desc: 'Revisa documentos antes da publicação' },
    OPERADOR:     { label: 'Operador',      cor: 'bg-slate-100 text-slate-700 border-slate-200',    desc: 'Cria e submete portarias' },
}
function getRoleConfig(role: string) {
    return ROLE_CONFIG[role] ?? { label: role, cor: 'bg-slate-100 text-slate-600 border-slate-200', desc: '' }
}

function UserAvatar({ name }: { name?: string | null }) {
    const initials = name
        ? name.split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
        : 'U'
    const cores = ['from-blue-500 to-primary','from-violet-500 to-purple-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600']
    const cor = cores[(initials.charCodeAt(0) || 0) % cores.length]
    return (
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cor} flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-primary/20`}>
            {initials}
        </div>
    )
}

function EditarNome({ nome, onSave }: { nome: string; onSave: (novo: string) => void }) {
    const [editing, setEditing] = useState(false)
    const [valor, setValor] = useState(nome)
    const [salvando, setSalvando] = useState(false)
    const { toast } = useToast()
    async function salvar() {
        if (!valor.trim() || valor.trim() === nome) { setEditing(false); return }
        setSalvando(true)
        try {
            const res = await api.patch('/api/auth/me', { name: valor.trim() })
            if (!res.data.success) throw new Error(res.data.error)
            onSave(valor.trim())
            toast({ title: 'Nome atualizado!' })
            setEditing(false)
        } catch (e: any) {
            toast({ title: 'Erro ao salvar', description: e?.response?.data?.error || e.message, variant: 'destructive' })
        } finally { setSalvando(false) }
    }
    if (editing) {
        return (
            <div className="flex items-center gap-2">
                <Input value={valor} onChange={e => setValor(e.target.value)} className="h-8 text-sm font-semibold max-w-[220px]"
                    autoFocus onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditing(false) }} />
                <Button size="sm" className="h-7 w-7 p-0" onClick={salvar} disabled={salvando}>
                    {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400" onClick={() => { setEditing(false); setValor(nome) }}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
        )
    }
    return (
        <div className="flex items-center gap-2 group">
            <span className="text-xl font-black text-slate-900">{nome}</span>
            <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <Edit2 className="h-3.5 w-3.5" />
            </button>
        </div>
    )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    )
}

function QuickPerfilLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
    return (
        <Link to={to as any} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all group">
            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-slate-500 group-hover:text-primary transition-all shrink-0">{icon}</div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-primary transition-colors flex-1">{label}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-all shrink-0" />
        </Link>
    )
}

function PerfilPage() {
    const { usuario, updateUsuario, clearAuth } = useAuthStore()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [showPin, setShowPin] = useState(false)
    const [showNovoPins, setShowNovoPins] = useState(false)
    const [novoPinA, setNovoPinA] = useState('')
    const [novoPinB, setNovoPinB] = useState('')
    const [salvandoPin, setSalvandoPin] = useState(false)
    const [showSenha, setShowSenha] = useState(false)
    const [senhaAtual, setSenhaAtual] = useState('')
    const [novaSenha, setNovaSenha] = useState('')
    const [confirmSenha, setConfirmSenha] = useState('')
    const [salvandoSenha, setSalvandoSenha] = useState(false)

    if (!usuario) return null
    const pinAtual = (usuario as any).pinSeguranca as string | undefined
    const roleConfig = getRoleConfig(usuario.role)
    const isAdmin = usuario.role === 'ADMIN_GERAL'

    async function handleSalvarPin() {
        if (!novoPinA || novoPinA.length < 4) { toast({ title: 'PIN muito curto', description: 'Mínimo 4 dígitos.', variant: 'destructive' }); return }
        if (novoPinA !== novoPinB) { toast({ title: 'PINs não conferem', variant: 'destructive' }); return }
        setSalvandoPin(true)
        try {
            const res = await api.patch('/api/auth/me/pin', { pin: novoPinA })
            if (!res.data.success) throw new Error(res.data.error)
            updateUsuario({ ...(usuario as any), pinSeguranca: novoPinA })
            toast({ title: 'PIN atualizado com sucesso!' })
            setNovoPinA(''); setNovoPinB(''); setShowNovoPins(false)
        } catch (e: any) {
            toast({ title: 'Erro ao salvar PIN', description: e?.response?.data?.error || e.message, variant: 'destructive' })
        } finally { setSalvandoPin(false) }
    }

    async function handleAlterarSenha() {
        if (!senhaAtual || !novaSenha) { toast({ title: 'Preencha todos os campos.', variant: 'destructive' }); return }
        if (novaSenha !== confirmSenha) { toast({ title: 'As senhas não conferem.', variant: 'destructive' }); return }
        if (novaSenha.length < 6) { toast({ title: 'Mínimo 6 caracteres.', variant: 'destructive' }); return }
        setSalvandoSenha(true)
        try {
            const res = await api.patch('/api/auth/me/senha', { senhaAtual, novaSenha })
            if (!res.data?.success) throw new Error(res.data?.error || 'Erro')
            toast({ title: 'Senha alterada com sucesso!' })
            setSenhaAtual(''); setNovaSenha(''); setConfirmSenha(''); setShowSenha(false)
        } catch (e: any) {
            toast({ title: 'Erro ao alterar senha', description: e?.response?.data?.error || e.message, variant: 'destructive' })
        } finally { setSalvandoSenha(false) }
    }

    function handleLogout() { clearAuth(); navigate({ to: '/login' }) }

    return (
        <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500">

            {/* Cabeçalho do perfil */}
            <Card className="border-slate-200 overflow-hidden">
                {/* Banner decorativo */}
                <div className="h-28 bg-gradient-to-r from-primary/90 via-primary to-[#0D3F8F] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    {/* Botão sair fica no banner, canto direito */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 right-3 h-8 text-xs font-bold text-white/80 hover:text-white hover:bg-white/20 border border-white/30"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sair
                    </Button>
                </div>

                {/* Avatar sobrepõe o banner */}
                <CardContent className="pt-0 pb-5 px-6">
                    {/* Linha do avatar: -mt-10 apenas no avatar, restante fica abaixo */}
                    <div className="-mt-10 mb-3">
                        <div className="ring-4 ring-white rounded-2xl shadow-xl inline-block">
                            <UserAvatar name={usuario.name} />
                        </div>
                    </div>
                    {/* Nome e badges — sempre na área branca */}
                    <EditarNome
                        nome={usuario.name || 'Servidor'}
                        onSave={novo => updateUsuario({ ...(usuario as any), name: novo })}
                    />
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] font-black ${roleConfig.cor}`}>
                            <Shield className="h-2.5 w-2.5 mr-1" />{roleConfig.label}
                        </Badge>
                        {(usuario as any).secretaria && (
                            <Badge variant="outline" className="text-[10px] font-semibold text-slate-500 border-slate-200">
                                <Building2 className="h-2.5 w-2.5 mr-1" />{(usuario as any).secretaria?.nome}
                            </Badge>
                        )}
                    </div>
                    {roleConfig.desc && <p className="text-[11px] text-slate-400 font-medium mt-1">{roleConfig.desc}</p>}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Dados da conta */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Dados da Conta</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Nome completo" value={usuario.name || '—'} />
                        <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={usuario.email || '—'} />
                        <InfoRow icon={<Shield className="h-3.5 w-3.5" />} label="Perfil de acesso" value={roleConfig.label} />
                        {(usuario as any).username && <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Usuário" value={(usuario as any).username} />}
                    </CardContent>
                </Card>

                {/* Acesso rápido */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Acesso Rápido</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2">
                        <QuickPerfilLink to="/dashboard" label="Painel Principal" icon={<FileText className="h-3.5 w-3.5" />} />
                        <QuickPerfilLink to="/administrativo/portarias" label="Minhas Portarias" icon={<FileText className="h-3.5 w-3.5" />} />
                        <QuickPerfilLink to="/acervo" label="Portal de Publicações" icon={<Building2 className="h-3.5 w-3.5" />} />
                        {isAdmin && <QuickPerfilLink to="/admin/logs" label="Logs de Auditoria" icon={<ScrollText className="h-3.5 w-3.5" />} />}
                        {isAdmin && <QuickPerfilLink to="/admin/analytics" label="Painel Analytics" icon={<BarChart2 className="h-3.5 w-3.5" />} />}
                    </CardContent>
                </Card>
            </div>

            {/* Segurança */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-50">
                    <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Segurança</CardTitle>
                    <CardDescription className="text-xs">Gerencie suas credenciais de acesso.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                    {/* Alterar senha */}
                    <div>
                        <button type="button" onClick={() => setShowSenha(!showSenha)}
                            className="flex items-center justify-between w-full text-left group">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                                    <Lock className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">Alterar Senha</p>
                                    <p className="text-[10px] text-slate-400">Mude sua senha de acesso ao sistema</p>
                                </div>
                            </div>
                            <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${showSenha ? 'rotate-90' : ''}`} />
                        </button>
                        {showSenha && (
                            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in slide-in-from-top-2">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Senha atual</Label>
                                    <Input type="password" placeholder="••••••••" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Nova senha</Label>
                                    <Input type="password" placeholder="Mín. 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Confirmar nova senha</Label>
                                    <Input type="password" placeholder="Repita a nova senha" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} className="h-9 text-sm" />
                                </div>
                                <Button onClick={handleAlterarSenha} disabled={salvandoSenha} className="w-full h-9 font-bold bg-primary hover:bg-primary/90 text-white">
                                    {salvandoSenha && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Salvar senha
                                </Button>
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <>
                            <Separator />
                            <div>
                                <button type="button" onClick={() => setShowNovoPins(!showNovoPins)}
                                    className="flex items-center justify-between w-full text-left group">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
                                            <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                PIN de Segurança
                                                <Badge className="text-[9px] h-4 bg-rose-100 text-rose-700 border-rose-200 font-black">Admin</Badge>
                                            </p>
                                            <p className="text-[10px] text-slate-400">Confirma ações destrutivas e de alto impacto</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-base tracking-[0.3em] font-black text-slate-700">
                                                {showPin ? (pinAtual || 'N/A') : '••••••'}
                                            </span>
                                            <button type="button" onClick={e => { e.stopPropagation(); setShowPin(!showPin) }}
                                                className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                                {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${showNovoPins ? 'rotate-90' : ''}`} />
                                    </div>
                                </button>
                                {showNovoPins && (
                                    <div className="mt-3 p-4 bg-rose-50 rounded-xl border border-rose-100 space-y-3 animate-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-rose-800">Novo PIN <span className="text-rose-500">*</span></Label>
                                            <Input type="text" placeholder="Mínimo 4 dígitos" value={novoPinA}
                                                onChange={e => setNovoPinA(e.target.value.replace(/\D/g, ''))}
                                                className="font-mono tracking-widest h-9 bg-white" maxLength={10} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-rose-800">Confirmar PIN <span className="text-rose-500">*</span></Label>
                                            <Input type="password" placeholder="Repita o PIN" value={novoPinB}
                                                onChange={e => setNovoPinB(e.target.value.replace(/\D/g, ''))}
                                                className="font-mono tracking-widest h-9 bg-white" maxLength={10} />
                                        </div>
                                        <p className="text-[10px] text-rose-600 font-medium">
                                            ⚠ Este PIN autoriza exclusão de portarias e reset de numeração.
                                        </p>
                                        <Button onClick={handleSalvarPin} disabled={salvandoPin || !novoPinA || !novoPinB}
                                            className="w-full h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold">
                                            {salvandoPin ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                                            {pinAtual ? 'Alterar PIN' : 'Cadastrar PIN'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end pb-4">
                <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair da conta
                </Button>
            </div>
        </div>
    )
}
