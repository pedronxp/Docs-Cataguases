import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Building2, Plus, Trash2, ListTree, Loader2, Users, RefreshCw, Search, Pencil, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    listarSecretarias, criarSecretaria, deletarSecretaria, editarSecretaria,
    listarSetores, criarSetor, deletarSetor, editarSetor,
    type Setor,
} from '@/services/secretaria.service'
import { listarUsuariosPorSecretaria, listarUsuarios } from '@/services/usuario.service'
import type { Secretaria, Usuario } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/organograma' as any)({
    component: OrganogramaPage,
})

type SecretariaComCount = Secretaria & { _count?: { setores: number; usuarios: number } }

const COR_PRESETS = [
    { label: 'Azul GOV', value: '#1351b4' },
    { label: 'Verde', value: '#008833' },
    { label: 'Vermelho', value: '#c41c00' },
    { label: 'Amarelo', value: '#a8820a' },
    { label: 'Roxo', value: '#7b2fa3' },
    { label: 'Cinza', value: '#636363' },
]

function OrganogramaPage() {
    const { toast } = useToast()

    // secretarias
    const [secretarias, setSecretarias] = useState<SecretariaComCount[]>([])
    const [loadingSecs, setLoadingSecs] = useState(true)
    const [novaNome, setNovaNome] = useState('')
    const [novaSigla, setNovaSigla] = useState('')
    const [novaCor, setNovaCor] = useState('#1351b4')
    const [saving, setSaving] = useState(false)
    const [openNovaSec, setOpenNovaSec] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // editar secretaria
    const [editandoSec, setEditandoSec] = useState<SecretariaComCount | null>(null)
    const [editSecNome, setEditSecNome] = useState('')
    const [editSecSigla, setEditSecSigla] = useState('')
    const [editSecCor, setEditSecCor] = useState('#1351b4')
    const [salvandoEditSec, setSalvandoEditSec] = useState(false)

    // setores do drawer
    const [secSelecionada, setSecSelecionada] = useState<Secretaria | null>(null)
    const [setores, setSetores] = useState<Setor[]>([])
    const [loadingSetores, setLoadingSetores] = useState(false)
    const [novoSetorNome, setNovoSetorNome] = useState('')
    const [novoSetorSigla, setNovoSetorSigla] = useState('')

    const [usuariosSec, setUsuariosSec] = useState<Usuario[]>([])
    const [loadingUsuariosSec, setLoadingUsuariosSec] = useState(false)

    // usuarios globais para titular
    const [usuariosGerais, setUsuariosGerais] = useState<Usuario[]>([])

    // editar setor inline
    const [editandoSetor, setEditandoSetor] = useState<Setor | null>(null)
    const [editSetorNome, setEditSetorNome] = useState('')
    const [editSetorSigla, setEditSetorSigla] = useState('')
    const [salvandoEditSetor, setSalvandoEditSetor] = useState(false)

    useEffect(() => {
        carregarSecretarias()
        carregarUsuariosGerais()
    }, [])

    async function carregarUsuariosGerais() {
        const res = await listarUsuarios()
        if (res.success) setUsuariosGerais(res.data)
    }

    async function carregarSecretarias() {
        setLoadingSecs(true)
        const res = await listarSecretarias()
        if (res.success) setSecretarias(res.data as any)
        setLoadingSecs(false)
    }

    async function handleTitularChange(secId: string, userId: string) {
        const idToSave = userId === 'NONE' ? null : userId
        const res = await editarSecretaria(secId, { titularId: idToSave })
        if (res.success) {
            toast({ title: 'Titular atualizado na Estrutura', description: 'O sistema gerou a configuração de variável adequadamente.' })
            carregarSecretarias()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    async function handleCriarSecretaria() {
        if (!novaNome || !novaSigla) return toast({ title: 'Preencha nome e sigla', variant: 'destructive' })
        setSaving(true)
        const res = await criarSecretaria({ nome: novaNome, sigla: novaSigla, cor: novaCor })
        if (res.success) {
            toast({ title: 'Secretaria criada!' })
            setNovaNome(''); setNovaSigla(''); setNovaCor('#1351b4')
            setOpenNovaSec(false)
            setTimeout(() => { carregarSecretarias() }, 1500)
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSaving(false)
    }

    function abrirEditarSecretaria(sec: SecretariaComCount) {
        setEditandoSec(sec)
        setEditSecNome(sec.nome)
        setEditSecSigla(sec.sigla)
        setEditSecCor(sec.cor || '#1351b4')
    }

    async function handleEditarSecretaria() {
        if (!editandoSec || !editSecNome || !editSecSigla) return
        setSalvandoEditSec(true)
        const res = await editarSecretaria(editandoSec.id, { nome: editSecNome, sigla: editSecSigla, cor: editSecCor })
        if (res.success) {
            toast({ title: 'Secretaria atualizada!' })
            setEditandoSec(null)
            carregarSecretarias()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSalvandoEditSec(false)
    }

    async function handleDeletarSecretaria(sec: SecretariaComCount) {
        const totalUsuarios = sec._count?.usuarios ?? 0
        if (totalUsuarios > 0) {
            toast({
                title: 'Não é possível remover',
                description: `Esta secretaria possui ${totalUsuarios} servidor(es) vinculado(s). Transfira-os antes de remover.`,
                variant: 'destructive',
            })
            return
        }
        if (!confirm(`Remover "${sec.nome}"? Os setores também serão desativados.`)) return
        const res = await deletarSecretaria(sec.id)
        if (res.success) {
            toast({ title: 'Secretaria removida' })
            carregarSecretarias()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    async function abrirSetores(sec: Secretaria) {
        setSecSelecionada(sec)
        setEditandoSetor(null)
        setSetores([])
        setUsuariosSec([])

        setLoadingSetores(true)
        setLoadingUsuariosSec(true)

        listarSetores(sec.id)
            .then(res => { if (res.success) setSetores(res.data) })
            .finally(() => setLoadingSetores(false))

        listarUsuariosPorSecretaria(sec.id)
            .then(res => { if (res.success) setUsuariosSec(res.data) })
            .finally(() => setLoadingUsuariosSec(false))
    }

    function abrirEditarSetor(setor: Setor) {
        setEditandoSetor(setor)
        setEditSetorNome(setor.nome)
        setEditSetorSigla(setor.sigla)
    }

    async function handleSalvarEditSetor() {
        if (!editandoSetor || !secSelecionada || !editSetorNome || !editSetorSigla) return
        setSalvandoEditSetor(true)
        const res = await editarSetor(secSelecionada.id, editandoSetor.id, { nome: editSetorNome, sigla: editSetorSigla })
        if (res.success) {
            setSetores(prev => prev.map(s => s.id === editandoSetor.id ? res.data : s))
            setEditandoSetor(null)
            toast({ title: 'Setor atualizado!' })
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSalvandoEditSetor(false)
    }

    async function handleCriarSetor() {
        if (!novoSetorNome || !novoSetorSigla || !secSelecionada) return
        const res = await criarSetor(secSelecionada.id, { nome: novoSetorNome, sigla: novoSetorSigla })
        if (res.success) {
            setSetores(prev => [...prev, res.data])
            setNovoSetorNome(''); setNovoSetorSigla('')
            toast({ title: 'Setor criado!' })
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    async function handleDeletarSetor(setorId: string) {
        if (!secSelecionada || !confirm('Remover este setor?')) return
        const res = await deletarSetor(secSelecionada.id, setorId)
        if (res.success) {
            setSetores(prev => prev.filter(s => s.id !== setorId))
            toast({ title: 'Setor removido' })
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    const filteredSecretarias = secretarias.filter(
        sec => sec.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sec.sigla.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Secretarias e Setores</h2>
                    <p className="text-sm text-slate-500">Gerencie a estrutura organizacional oficial da Prefeitura Municipal.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={carregarSecretarias}
                        disabled={loadingSecs}
                        className={`text-slate-500 hover:text-gov-blue ${loadingSecs ? 'animate-spin' : ''}`}
                        title="Atualizar dados"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Dialog open={openNovaSec} onOpenChange={setOpenNovaSec}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">
                                <Plus className="h-4 w-4 mr-2" /> Nova Secretaria
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Secretaria</DialogTitle>
                                <DialogDescription>Preencha os dados da nova secretaria municipal.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-1.5">
                                    <Label>Nome Completo</Label>
                                    <Input
                                        placeholder="Ex: Secretaria Municipal de Saúde"
                                        value={novaNome}
                                        onChange={e => setNovaNome(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Sigla Oficial</Label>
                                    <Input
                                        placeholder="Ex: SMS"
                                        value={novaSigla}
                                        onChange={e => setNovaSigla(e.target.value.toUpperCase())}
                                        maxLength={10}
                                        className="uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Cor de Identificação</Label>
                                    <div className="flex gap-2">
                                        {COR_PRESETS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                title={c.label}
                                                onClick={() => setNovaCor(c.value)}
                                                className={`w-7 h-7 rounded-full transition-all ${novaCor === c.value ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : 'hover:scale-105'}`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpenNovaSec(false)}>Cancelar</Button>
                                <Button onClick={handleCriarSecretaria} disabled={saving} className="bg-primary text-white font-bold">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Lista de Secretarias */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                        Secretarias Municipais ({filteredSecretarias.length})
                    </CardTitle>
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por nome ou sigla..."
                            className="pl-9 h-9 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingSecs ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                    ) : secretarias.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-sm">
                            Nenhuma secretaria encontrada.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredSecretarias.map(sec => (
                                <div
                                    key={sec.id}
                                    className="flex flex-col gap-3 px-5 py-4 hover:bg-slate-50/50 transition-colors group border-l-4"
                                    style={{ borderLeftColor: sec.cor || '#1351b4' }}
                                >
                                    {/* Cabecalho da Secretaria */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            {/* Ícone */}
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sec.cor || '#1351b4'}18` }}>
                                                <Building2 className="h-4 w-4" style={{ color: sec.cor || '#1351b4' }} />
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-800">{sec.nome}</p>
                                                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 text-slate-600 bg-slate-100">
                                                        {sec.sigla}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                                                    {sec._count && (
                                                        <>
                                                            <span>{sec._count.setores} setor(es)</span>
                                                            <span>·</span>
                                                            <span className={`flex items-center gap-1 ${sec._count.usuarios > 0 ? 'text-slate-400' : 'text-slate-300'}`}>
                                                                <Users className="h-3 w-3" />
                                                                {sec._count.usuarios} servidor(es)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost" size="sm"
                                                className="h-8 text-xs text-slate-500 hover:text-primary hover:bg-primary/5"
                                                onClick={() => abrirSetores(sec)}
                                            >
                                                <ListTree className="h-3.5 w-3.5 mr-1.5" />
                                                Setores
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                                                onClick={() => abrirEditarSecretaria(sec)}
                                                title="Editar secretaria"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => handleDeletarSecretaria(sec)}
                                                title="Remover secretaria"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Área do Titular Responsável & Variável */}
                                    <div className="pl-[3.25rem] space-y-2 mt-1 -mb-1">
                                        <div className="max-w-md">
                                            <Select
                                                value={sec.titularId || 'NONE'}
                                                onValueChange={val => handleTitularChange(sec.id, val)}
                                            >
                                                <SelectTrigger className="w-full bg-white h-9 border-slate-200 shadow-sm text-sm">
                                                    <SelectValue placeholder="Selecione o Secretário Responsável" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="NONE" className="text-slate-400 italic">Nenhum responsável vinculado...</SelectItem>
                                                    {usuariosGerais.map(u => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            <span className="font-medium text-slate-800">{u.name}</span>
                                                            <span className="text-slate-400 ml-1">({u.email})</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Variável: {'{{'}SYS_SEC_{sec.sigla}_NOME{'}}'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog — Editar Secretaria */}
            <Dialog open={!!editandoSec} onOpenChange={open => !open && setEditandoSec(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Secretaria</DialogTitle>
                        <DialogDescription>Atualize os dados de <strong>{editandoSec?.nome}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Nome Completo</Label>
                            <Input
                                value={editSecNome}
                                onChange={e => setEditSecNome(e.target.value)}
                                placeholder="Nome da secretaria"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Sigla Oficial</Label>
                            <Input
                                value={editSecSigla}
                                onChange={e => setEditSecSigla(e.target.value.toUpperCase())}
                                maxLength={10}
                                className="uppercase"
                                placeholder="Sigla"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Cor de Identificação</Label>
                            <div className="flex gap-2">
                                {COR_PRESETS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.label}
                                        onClick={() => setEditSecCor(c.value)}
                                        className={`w-7 h-7 rounded-full transition-all ${editSecCor === c.value ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: c.value }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditandoSec(null)} disabled={salvandoEditSec}>Cancelar</Button>
                        <Button onClick={handleEditarSecretaria} disabled={salvandoEditSec || !editSecNome || !editSecSigla} className="bg-primary text-white font-bold">
                            {salvandoEditSec ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Drawer de Setores */}
            <Sheet open={!!secSelecionada} onOpenChange={open => !open && setSecSelecionada(null)}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader className="pb-4 border-b border-slate-100">
                        <SheetTitle className="text-lg font-bold">
                            Setores — {secSelecionada?.sigla}
                        </SheetTitle>
                        <SheetDescription className="text-sm text-slate-500">
                            {secSelecionada?.nome}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-5 space-y-5">
                        {/* Adicionar setor */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Novo Setor</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nome do setor"
                                    value={novoSetorNome}
                                    onChange={e => setNovoSetorNome(e.target.value)}
                                    className="text-sm"
                                />
                                <Input
                                    placeholder="Sigla"
                                    value={novoSetorSigla}
                                    onChange={e => setNovoSetorSigla(e.target.value.toUpperCase())}
                                    className="w-20 text-sm uppercase"
                                    maxLength={8}
                                />
                                <Button
                                    onClick={handleCriarSetor}
                                    disabled={!novoSetorNome || !novoSetorSigla}
                                    className="bg-primary text-white"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Lista setores */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                Setores Cadastrados ({setores.length})
                            </Label>
                            {loadingSetores ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                </div>
                            ) : setores.length === 0 ? (
                                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">
                                    Nenhum setor cadastrado
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                                    {setores.map(setor => (
                                        editandoSetor?.id === setor.id ? (
                                            <div key={setor.id} className="flex items-center gap-2 p-2 bg-blue-50 border border-primary/30 rounded-lg">
                                                <Input
                                                    value={editSetorNome}
                                                    onChange={e => setEditSetorNome(e.target.value)}
                                                    className="h-8 text-sm flex-1"
                                                    placeholder="Nome"
                                                />
                                                <Input
                                                    value={editSetorSigla}
                                                    onChange={e => setEditSetorSigla(e.target.value.toUpperCase())}
                                                    className="h-8 text-sm w-20 uppercase"
                                                    maxLength={8}
                                                    placeholder="Sigla"
                                                />
                                                <Button size="icon" className="h-8 w-8 bg-primary text-white shrink-0" onClick={handleSalvarEditSetor} disabled={salvandoEditSetor}>
                                                    {salvandoEditSetor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-400" onClick={() => setEditandoSetor(null)}>
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                key={setor.id}
                                                className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-primary/30 transition-colors"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{setor.nome}</p>
                                                    <p className="text-xs font-mono text-slate-400">{setor.sigla}</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-slate-300 hover:text-primary"
                                                        onClick={() => abrirEditarSetor(setor)}
                                                        title="Editar setor"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-7 w-7 text-slate-300 hover:text-red-500"
                                                        onClick={() => handleDeletarSetor(setor.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Servidores da Secretaria */}
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-slate-400" />
                                Servidores ({loadingUsuariosSec ? '...' : usuariosSec.length})
                            </Label>
                            {loadingUsuariosSec ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                </div>
                            ) : usuariosSec.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    Nenhum servidor vinculado
                                </div>
                            ) : (
                                <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
                                    {usuariosSec.map(u => (
                                        <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                                {u.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                                                {u.setor && (
                                                    <p className="text-xs text-slate-400 truncate">{u.setor.nome}</p>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-slate-500 font-mono">
                                                {u.role}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
