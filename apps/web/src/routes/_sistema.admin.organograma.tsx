import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Building2, Plus, Trash2, ListTree, Loader2, Users, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
    listarSecretarias, criarSecretaria, deletarSecretaria,
    listarSetores, criarSetor, deletarSetor,
    type Setor,
} from '@/services/secretaria.service'
import type { Secretaria } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/organograma' as any)({
    component: OrganogramaPage,
})

function OrganogramaPage() {
    const { toast } = useToast()

    // secretarias
    const [secretarias, setSecretarias] = useState<(Secretaria & { _count?: { setores: number; users: number } })[]>([])
    const [loadingSecs, setLoadingSecs] = useState(true)
    const [novaNome, setNovaNome] = useState('')
    const [novaSigla, setNovaSigla] = useState('')
    const [saving, setSaving] = useState(false)
    const [openNovaSec, setOpenNovaSec] = useState(false)

    // setores do drawer
    const [secSelecionada, setSecSelecionada] = useState<Secretaria | null>(null)
    const [setores, setSetores] = useState<Setor[]>([])
    const [loadingSetores, setLoadingSetores] = useState(false)
    const [novoSetorNome, setNovoSetorNome] = useState('')
    const [novoSetorSigla, setNovoSetorSigla] = useState('')

    useEffect(() => { carregarSecretarias() }, [])

    async function carregarSecretarias() {
        setLoadingSecs(true)
        const res = await listarSecretarias()
        if (res.success) setSecretarias(res.data as any)
        setLoadingSecs(false)
    }

    async function handleCriarSecretaria() {
        if (!novaNome || !novaSigla) return toast({ title: 'Preencha nome e sigla', variant: 'destructive' })
        setSaving(true)
        const res = await criarSecretaria({ nome: novaNome, sigla: novaSigla, cor: 'slate' })
        if (res.success) {
            toast({ title: 'Secretaria criada!' })
            setNovaNome(''); setNovaSigla('')
            setOpenNovaSec(false)
            // Pequeno delay para garantir consistência no banco antes de recarregar
            setTimeout(() => {
                carregarSecretarias()
            }, 1500)
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
        setSaving(false)
    }

    async function handleDeletarSecretaria(id: string) {
        if (!confirm('Remover esta secretaria? Os servidores vinculados perderão a lotação.')) return
        const res = await deletarSecretaria(id)
        if (res.success) {
            toast({ title: 'Secretaria removida' })
            carregarSecretarias()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    async function abrirSetores(sec: Secretaria) {
        setSecSelecionada(sec)
        setLoadingSetores(true)
        const res = await listarSetores(sec.id)
        if (res.success) setSetores(res.data)
        setLoadingSetores(false)
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

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Órgãos e Setores</h2>
                    <p className="text-sm text-slate-500">Gerencie a estrutura organizacional da prefeitura.</p>
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
                                <DialogTitle>Adicionar Secretaria / Órgão</DialogTitle>
                                <DialogDescription>Preencha os dados do novo órgão municipal.</DialogDescription>
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
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 px-5">
                    <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                        Secretarias / Órgãos ({secretarias.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingSecs ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        </div>
                    ) : secretarias.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-sm">
                            Nenhuma secretaria cadastrada. Clique em "Nova Secretaria" para começar.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {secretarias.map(sec => (
                                <div key={sec.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                                    {/* Ícone */}
                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Building2 className="h-4 w-4 text-primary" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800">{sec.nome}</p>
                                            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 text-slate-500">
                                                {sec.sigla}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {(sec as any)._count && (
                                                <>
                                                    <span className="text-xs text-slate-400">
                                                        {(sec as any)._count.setores} setor(es)
                                                    </span>
                                                    <span className="text-xs text-slate-300">·</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {(sec as any)._count.usuarios} servidor(es)
                                                    </span>
                                                </>
                                            )}
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
                                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleDeletarSecretaria(sec.id)}
                                            title="Remover secretaria"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                        <div
                                            key={setor.id}
                                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-primary/30 transition-colors"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{setor.nome}</p>
                                                <p className="text-xs font-mono text-slate-400">{setor.sigla}</p>
                                            </div>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeletarSetor(setor.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
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
