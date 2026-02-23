import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, Building2, UserCircle2, CalendarDays, Plus, Trash2, ListTree, Edit2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { listarGestoes, salvarGestao, type DadosGestao } from '@/services/gestao.service'
import { listarSecretarias, criarSecretaria, deletarSecretaria } from '@/services/secretaria.service'
import { listarUsuarios } from '@/services/usuario.service'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { Secretaria, Usuario, Setor } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/gestao')({
    component: GestaoPage,
})

function GestaoPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [gestoes, setGestoes] = useState<DadosGestao[]>([])
    const [activeGestaoId, setActiveGestaoId] = useState<string>('')

    // modal de nova secretaria
    const [isNovaSecOpen, setIsNovaSecOpen] = useState(false)
    const [novaSecNome, setNovaSecNome] = useState('')
    const [novaSecSigla, setNovaSecSigla] = useState('')

    // modal de nova gestao
    const [isNovaGestaoOpen, setIsNovaGestaoOpen] = useState(false)
    const [novaGestaoNome, setNovaGestaoNome] = useState('')

    // gestão de setores
    const [selectedSecForSectors, setSelectedSecForSectors] = useState<Secretaria | null>(null)
    const [setores, setSetores] = useState<Setor[]>([])
    const [novoSetorNome, setNovoSetorNome] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [resGestao, resSecretarias, resUsuarios] = await Promise.all([
            listarGestoes(),
            listarSecretarias(),
            listarUsuarios()
        ])

        if (resSecretarias.success) setSecretarias(resSecretarias.data)
        if (resUsuarios.success) setUsuarios(resUsuarios.data.filter(u => u.ativo))
        if (resGestao.success && resGestao.data.length > 0) {
            setGestoes(resGestao.data)
            if (!activeGestaoId) setActiveGestaoId(resGestao.data[0].id)
        }
        setLoading(false)
    }

    const activeGestao = gestoes.find(g => g.id === activeGestaoId)

    const handleFieldChange = (field: keyof DadosGestao, value: any) => {
        if (!activeGestao) return
        setGestoes(prev => prev.map(g =>
            g.id === activeGestaoId ? { ...g, [field]: value } : g
        ))
    }

    const handleSecretarioChange = (secId: string, value: string) => {
        if (!activeGestao) return
        setGestoes(prev => prev.map(g => {
            if (g.id !== activeGestaoId) return g
            return {
                ...g,
                secretarios: {
                    ...g.secretarios,
                    [secId]: value
                }
            }
        }))
    }

    const handleSave = async () => {
        if (!activeGestao) return
        setSaving(true)
        const result = await salvarGestao(activeGestao)
        if (result.success) {
            toast({
                title: 'Dados salvos com sucesso',
                description: `As informações da gestão ${activeGestao.nomeGestao} foram atualizadas.`,
            })
        } else {
            toast({
                title: 'Erro ao salvar',
                description: result.error,
                variant: 'destructive'
            })
        }
        setSaving(false)
    }

    const handleCriarSecretaria = async () => {
        if (!novaSecNome || !novaSecSigla) return toast({ title: "Preencha todos os campos", variant: 'destructive' })
        setSaving(true)
        const result = await criarSecretaria({ nome: novaSecNome, sigla: novaSecSigla, cor: 'slate' })
        if (result.success) {
            toast({ title: 'Órgão adicionado' })
            setNovaSecNome('')
            setNovaSecSigla('')
            setIsNovaSecOpen(false)
            loadData()
        }
        setSaving(false)
    }

    const handleDeletarSecretaria = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta pasta?')) {
            const result = await deletarSecretaria(id)
            if (result.success) {
                toast({ title: 'Órgão removido com sucesso' })
                loadData()
            }
        }
    }

    const handleNovaGestao = () => {
        if (!novaGestaoNome) return toast({ title: "Preencha o nome da Gestão", variant: 'destructive' })
        const newGestao: DadosGestao = {
            id: 'gestao-' + Date.now(),
            nomeGestao: novaGestaoNome,
            dataInicio: '',
            dataFim: '',
            prefeito: '',
            vicePrefeito: '',
            chefeGabinete: '',
            secretarios: {}
        }
        setGestoes([newGestao, ...gestoes])
        setActiveGestaoId(newGestao.id)
        setIsNovaGestaoOpen(false)
        setNovaGestaoNome('')
    }

    const handleOpenSectors = (sec: Secretaria) => {
        setSelectedSecForSectors(sec)
        // Mock de busca de setores
        setSetores([
            { id: `s1-${sec.id}`, nome: 'Departamento de Compras', secretariaId: sec.id },
            { id: `s2-${sec.id}`, nome: 'Recursos Humanos Interno', secretariaId: sec.id },
            { id: `s3-${sec.id}`, nome: 'Gabinete do Secretário', secretariaId: sec.id },
        ])
    }

    const handleAddSetor = () => {
        if (!novoSetorNome || !selectedSecForSectors) return
        const novo: Setor = {
            id: `s-new-${Date.now()}`,
            nome: novoSetorNome,
            secretariaId: selectedSecForSectors.id
        }
        setSetores([...setores, novo])
        setNovoSetorNome('')
        toast({ title: 'Setor adicionado' })
    }

    if (loading && gestoes.length === 0) {
        return <div className="p-6 text-sm text-slate-500 animate-pulse">Carregando dados da gestão...</div>
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Gestão Institucional</h2>
                    <p className="text-sm text-slate-500">Configure os nomes das autoridades organizados por mandato.</p>
                </div>
                <Button onClick={handleSave} disabled={saving || !activeGestao} className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold">
                    {saving ? 'Salvando...' : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </div>

            {/* Selector de Gestões */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                <div className="flex-1 max-w-xs space-y-1">
                    <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mandato (Gestão)</Label>
                    <Select value={activeGestaoId} onValueChange={setActiveGestaoId}>
                        <SelectTrigger className="w-full bg-slate-50/50">
                            <SelectValue placeholder="Selecione a Gestão" />
                        </SelectTrigger>
                        <SelectContent>
                            {gestoes.map(g => (
                                <SelectItem key={g.id} value={g.id}>{g.nomeGestao}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Dialog open={isNovaGestaoOpen} onOpenChange={setIsNovaGestaoOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="mt-5 text-slate-600">
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Gestão
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Criar Novo Mandato</DialogTitle>
                            <DialogDescription>Digite o nome de identificação para a nova gestão (Ex: 2029-2032).</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome/Período</Label>
                                <Input value={novaGestaoNome} onChange={e => setNovaGestaoNome(e.target.value)} placeholder="Ex: 2029-2032" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNovaGestaoOpen(false)}>Cancelar</Button>
                            <Button onClick={handleNovaGestao} className="bg-primary text-white font-bold">Criar Gestão</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {!activeGestao ? (
                <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                    Nenhuma Gestão Selecionada
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    <div className="space-y-6">
                        {/* Período da Gestão */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                                        <CalendarDays className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Período Selecionado</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="nomeGestao" className="text-slate-700 font-semibold">Nome da Gestão</Label>
                                    <Input id="nomeGestao" value={activeGestao.nomeGestao} onChange={(e) => handleFieldChange('nomeGestao', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dataInicio">Data de Início</Label>
                                        <Input id="dataInicio" type="date" value={activeGestao.dataInicio} onChange={(e) => handleFieldChange('dataInicio', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="dataFim">Data de Término</Label>
                                        <Input id="dataFim" type="date" value={activeGestao.dataFim} onChange={(e) => handleFieldChange('dataFim', e.target.value)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Gabinete Executivo */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-md text-primary">
                                        <UserCircle2 className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Gabinete Executivo</CardTitle>
                                </div>
                                <CardDescription className="pt-1">
                                    Variáveis: <span className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{"{{SYS_PREFEITO_NOME}}"}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="prefeito" className="text-slate-700 font-semibold">Prefeito(a) Municipal</Label>
                                    <Input id="prefeito" value={activeGestao.prefeito} onChange={(e) => handleFieldChange('prefeito', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vice" className="text-slate-700 font-semibold">Vice-Prefeito(a)</Label>
                                    <Input id="vice" value={activeGestao.vicePrefeito} onChange={(e) => handleFieldChange('vicePrefeito', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="chefe" className="text-slate-700 font-semibold">Chefe de Gabinete</Label>
                                    <Input id="chefe" value={activeGestao.chefeGabinete} onChange={(e) => handleFieldChange('chefeGabinete', e.target.value)} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Secretariado e Órgãos */}
                    <Card className="border-slate-200 shadow-sm flex flex-col">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Órgãos do Município</CardTitle>
                                </div>
                                <Dialog open={isNovaSecOpen} onOpenChange={setIsNovaSecOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-8 gap-1 text-slate-600">
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Órgão</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Adicionar Novo Órgão/Secretaria</DialogTitle>
                                            <DialogDescription>Esta pasta ficará disponível interamente no sistema.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label>Nome Completo (Ex: Secretaria de Saúde)</Label>
                                                <Input value={novaSecNome} onChange={e => setNovaSecNome(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sigla Oficial (Ex: SMS)</Label>
                                                <Input value={novaSecSigla} onChange={e => setNovaSecSigla(e.target.value)} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsNovaSecOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleCriarSecretaria} disabled={saving} className="bg-primary hover:bg-primary/90 text-white font-bold">Criar Pasta</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                            <div className="p-4 space-y-4 overflow-y-auto max-h-[500px] custom-scrollbar">
                                {secretarias.length === 0 ? (
                                    <p className="text-sm text-slate-500 p-4 text-center">Nenhuma secretaria cadastrada.</p>
                                ) : (
                                    secretarias.map(sec => (
                                        <div key={sec.id} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 relative group">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor={`sec_${sec.id}`} className="text-slate-700 font-semibold flex items-center gap-2">
                                                    <span>{sec.nome}</span>
                                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">{sec.sigla}</span>
                                                </Label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-[#1351B4]"
                                                        onClick={() => handleOpenSectors(sec)}
                                                        title="Gerenciar Setores"
                                                    >
                                                        <ListTree className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleDeletarSecretaria(sec.id)}
                                                        title="Excluir Pasta"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Select
                                                value={activeGestao.secretarios[sec.id] || ''}
                                                onValueChange={(val) => handleSecretarioChange(sec.id, val)}
                                            >
                                                <SelectTrigger className="w-full bg-slate-50/50">
                                                    <SelectValue placeholder="Selecione o Secretário Responsável" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none" className="text-slate-400">Nenhum / Vago</SelectItem>
                                                    {usuarios.map(u => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            {u.name} <span className="text-slate-400 text-xs">- {u.email}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-emerald-600/80 font-mono mt-1 font-medium bg-emerald-50/50 w-fit px-1.5 py-0.5 rounded border border-emerald-100/50">Variável: {"{{SYS_SEC_"}{sec.sigla.toUpperCase()}{"_NOME}}"}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Drawer de Setores */}
            <Sheet open={!!selectedSecForSectors} onOpenChange={(open) => !open && setSelectedSecForSectors(null)}>
                <SheetContent className="sm:max-w-md border-l border-slate-200">
                    <SheetHeader className="pb-6 border-b border-slate-100">
                        <SheetTitle className="text-xl font-bold text-slate-800">Setores - {selectedSecForSectors?.nome}</SheetTitle>
                        <SheetDescription>
                            Organize os departamentos internos desta secretaria para o encaminhamento de documentos.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Adicionar Novo Setor</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Ex: Departamento de Compras"
                                    value={novoSetorNome}
                                    onChange={e => setNovoSetorNome(e.target.value)}
                                    className="bg-slate-50 border-slate-200"
                                />
                                <Button onClick={handleAddSetor} className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Setores Existentes ({setores.length})</Label>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {setores.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-lg text-slate-400">
                                        Nenhum setor cadastrado.
                                    </div>
                                ) : (
                                    setores.map(setor => (
                                        <div key={setor.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md shadow-sm group hover:border-[#1351B4]/30 transition-colors">
                                            <span className="text-sm font-medium text-slate-700">{setor.nome}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600">
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
