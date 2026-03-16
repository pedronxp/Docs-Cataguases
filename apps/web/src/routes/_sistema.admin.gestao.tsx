import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, Building2, UserCircle2, CalendarDays, Plus, Trash2, ListTree, RefreshCw, AlertTriangle, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { listarGestoes, salvarGestao, type DadosGestao } from '@/services/gestao.service'
import { listarSecretarias, criarSecretaria, editarSecretaria, deletarSecretaria, listarSetores, criarSetor, deletarSetor, type Setor } from '@/services/secretaria.service'
import { listarUsuarios } from '@/services/usuario.service'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import type { Secretaria, Usuario } from '@/types/domain'

const CORES_SECRETARIA = [
    { label: 'Azul Gov', value: '#1351b4' },
    { label: 'Verde', value: '#168821' },
    { label: 'Vermelho', value: '#e52207' },
    { label: 'Laranja', value: '#e25800' },
    { label: 'Roxo', value: '#7c3aed' },
    { label: 'Cinza', value: '#64748b' },
]

function getStatusGestao(g: DadosGestao): 'ativa' | 'futura' | 'encerrada' | 'indefinida' {
    if (!g.dataInicio || !g.dataFim) return 'indefinida'
    const hoje = new Date()
    const inicio = new Date(g.dataInicio)
    const fim = new Date(g.dataFim)
    if (hoje < inicio) return 'futura'
    if (hoje > fim) return 'encerrada'
    return 'ativa'
}

function BadgeGestao({ g }: { g: DadosGestao }) {
    const status = getStatusGestao(g)
    if (status === 'ativa') return <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">Ativa</Badge>
    if (status === 'futura') return <Badge className="bg-blue-100 text-blue-700 border-none text-[10px] font-bold">Futura</Badge>
    if (status === 'encerrada') return <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] font-bold">Encerrada</Badge>
    return null
}

function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
    const steps = [
        { num: 1, label: 'Período' },
        { num: 2, label: 'Gabinete' },
        { num: 3, label: 'Secretarias' },
    ]
    return (
        <div className="flex items-start justify-center gap-0 mb-2">
            {steps.map((s, idx) => {
                const isActive = currentStep === s.num
                const isComplete = currentStep > s.num
                const isFuture = currentStep < s.num
                const circleClass = isComplete
                    ? 'bg-emerald-500 text-white'
                    : isActive
                        ? 'bg-primary text-white'
                        : 'bg-slate-200 text-slate-500'
                return (
                    <div key={s.num} className="flex items-start">
                        <div className="flex flex-col items-center w-24">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${circleClass}`}>
                                {isComplete ? <Check className="h-4 w-4" /> : s.num}
                            </div>
                            <span className={`text-xs mt-1.5 font-semibold text-center ${isActive ? 'text-primary' : isFuture ? 'text-slate-400' : 'text-emerald-600'}`}>{s.label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mt-4 mx-1 transition-colors ${currentStep > s.num ? 'bg-emerald-400' : 'bg-slate-200'}`} style={{ width: '2rem' }} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export const Route = createFileRoute('/_sistema/admin/gestao')({
    component: GestaoPage,
})

function GestaoPage() {
    const { toast } = useToast()
    const [step, setStep] = useState<0 | 1 | 2 | 3>(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [gestoes, setGestoes] = useState<DadosGestao[]>([])
    const [activeGestaoId, setActiveGestaoId] = useState<string>('')

    // Modal nova secretaria
    const [isNovaSecOpen, setIsNovaSecOpen] = useState(false)
    const [novaSecNome, setNovaSecNome] = useState('')
    const [novaSecSigla, setNovaSecSigla] = useState('')
    const [novaSecCor, setNovaSecCor] = useState(CORES_SECRETARIA[0].value)
    // Exclusão secretaria
    const [deletarSecId, setDeletarSecId] = useState<string | null>(null)

    // Modal nova gestao
    const [isNovaGestaoOpen, setIsNovaGestaoOpen] = useState(false)
    const [novaGestaoNome, setNovaGestaoNome] = useState('')

    // Setores
    const [selectedSecForSectors, setSelectedSecForSectors] = useState<Secretaria | null>(null)
    const [setores, setSetores] = useState<Setor[]>([])
    const [novoSetorNome, setNovoSetorNome] = useState('')
    const [novoSetorSigla, setNovoSetorSigla] = useState('')
    const [loadingSetores, setLoadingSetores] = useState(false)
    // NOVO: exclusão setor via Dialog (sem confirm() nativo)
    const [deletarSetorId, setDeletarSetorId] = useState<string | null>(null)

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

    const handleSecretarioChange = async (secId: string, value: string) => {
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
        // Auto-save: sincroniza variável {{SYS_SEC_[SIGLA]_NOME}} no banco
        try {
            await editarSecretaria(secId, { titularId: value === 'none' ? null : value })
            toast({ title: 'Secretário atualizado com sucesso' })
        } catch {
            toast({ title: 'Erro ao atualizar secretário', variant: 'destructive' })
        }
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
            setStep(0) // Volta para o overview
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
        const result = await criarSecretaria({ nome: novaSecNome, sigla: novaSecSigla, cor: novaSecCor })
        if (result.success) {
            toast({ title: 'Órgão adicionado' })
            setNovaSecNome('')
            setNovaSecSigla('')
            setNovaSecCor(CORES_SECRETARIA[0].value)
            setIsNovaSecOpen(false)
            setTimeout(() => { loadData() }, 1000)
        }
        setSaving(false)
    }

    const handleDeletarSecretaria = async () => {
        if (!deletarSecId) return
        const result = await deletarSecretaria(deletarSecId)
        if (result.success) {
            toast({ title: 'Órgão removido com sucesso' })
            setDeletarSecId(null)
            setTimeout(() => { loadData() }, 1000)
        } else {
            toast({ title: 'Erro ao excluir', description: result.error, variant: 'destructive' })
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
        setStep(1)
    }

    const handleOpenSectors = async (sec: Secretaria) => {
        setSelectedSecForSectors(sec)
        setLoadingSetores(true)
        const res = await listarSetores(sec.id)
        if (res.success) setSetores(res.data)
        setLoadingSetores(false)
    }

    const handleAddSetor = async () => {
        if (!novoSetorNome || !novoSetorSigla || !selectedSecForSectors) return
        const result = await criarSetor(selectedSecForSectors.id, { nome: novoSetorNome, sigla: novoSetorSigla })
        if (result.success) {
            setSetores(prev => [...prev, result.data])
            setNovoSetorNome('')
            setNovoSetorSigla('')
            toast({ title: 'Setor criado com sucesso' })
        } else {
            toast({ title: 'Erro ao criar setor', description: result.error, variant: 'destructive' })
        }
    }

    const handleDeletarSetor = async (setorId: string) => {
        setDeletarSetorId(setorId)
    }

    const handleConfirmarDeletarSetor = async () => {
        if (!deletarSetorId || !selectedSecForSectors) return
        const result = await deletarSetor(selectedSecForSectors.id, deletarSetorId)
        if (result.success) {
            setSetores(prev => prev.filter(s => s.id !== deletarSetorId))
            toast({ title: 'Setor removido' })
        } else {
            toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        }
        setDeletarSetorId(null)
    }

    if (loading && gestoes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in duration-500">
                <RefreshCw className="h-8 w-8 text-gov-blue animate-spin" />
                <p className="text-sm text-slate-500 font-medium italic">Sincronizando dados institucionais...</p>
            </div>
        )
    }

    // ── JSX steps (added in parts 2 and 3) ──────────────────────────────────
    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                        {step === 0 ? 'Mandatos Institucionais' : 'Gestão Institucional'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {step === 0 ? 'Visualize e mandatos da instituição.' : 'Configure os dados do mandato em 3 etapas.'}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadData}
                    disabled={loading}
                    className={`text-slate-500 hover:text-gov-blue ${loading ? 'animate-spin' : ''}`}
                    title="Atualizar dados"
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            {step > 0 && <StepIndicator currentStep={step as 1 | 2 | 3} />}

            {step === 0 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex mb-4">
                        <Dialog open={isNovaGestaoOpen} onOpenChange={setIsNovaGestaoOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white font-bold ml-auto shadow-sm">
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

                    {gestoes.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                            Nenhuma Gestão Cadastrada
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {gestoes.map(g => (
                                <Card key={g.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    {g.nomeGestao}
                                                    <BadgeGestao g={g} />
                                                </CardTitle>
                                                <CardDescription className="pt-1">
                                                    {g.dataInicio ? new Date(g.dataInicio+'T12:00:00Z').toLocaleDateString('pt-BR') : 'N/I'} a {g.dataFim ? new Date(g.dataFim+'T12:00:00Z').toLocaleDateString('pt-BR') : 'N/I'}
                                                </CardDescription>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => { setActiveGestaoId(g.id); setStep(1); }} className="text-primary border-primary/20 hover:bg-primary/5">
                                                Editar
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700">Prefeito(a):</span>
                                            <span>{g.prefeito || 'Não informado'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700">Vice-Prefeito(a):</span>
                                            <span>{g.vicePrefeito || 'Não informado'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700">Chefe de Gabinete:</span>
                                            <span>{g.chefeGabinete || 'Não informado'}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                                            <span className="font-medium text-slate-700">Pastas/Órgãos:</span>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono">
                                                {Object.keys(g.secretarios || {}).length > 0 ? Object.keys(g.secretarios || {}).length : secretarias.length}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 1: Período ─────────────────────────────────────────── */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                        <div className="flex-1 max-w-xs space-y-1">
                            <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mandato (Gestão)</Label>
                            <Select value={activeGestaoId} onValueChange={setActiveGestaoId}>
                                <SelectTrigger className="w-full bg-slate-50/50">
                                    <SelectValue placeholder="Selecione a Gestão" />
                                </SelectTrigger>
                                <SelectContent>
                                    {gestoes.map(g => (
                                        <SelectItem key={g.id} value={g.id}>
                                            <span className="flex items-center gap-2">
                                                {g.nomeGestao}
                                                <BadgeGestao g={g} />
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!activeGestao ? (
                        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                            Nenhuma Gestão Selecionada
                        </div>
                    ) : (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                                        <CalendarDays className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Período da Gestão</CardTitle>
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
                    )}
                </div>
            )}

            {/* ── Step 2: Gabinete ─────────────────────────────────────────── */}
            {step === 2 && (
                <div className="animate-in fade-in duration-300">
                    {!activeGestao ? (
                        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                            Selecione uma gestão no Passo 1 antes de continuar.
                        </div>
                    ) : (
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-md text-primary">
                                        <UserCircle2 className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg">Gabinete Executivo</CardTitle>
                                </div>
                                <CardDescription className="pt-1">
                                    Variável: <span className="text-xs font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{"{{SYS_PREFEITO_NOME}}"}</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6 max-w-lg">
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
                    )}
                </div>
            )}

            {/* ── Step 3: Secretarias ──────────────────────────────────────── */}
            {step === 3 && (
                <div className="animate-in fade-in duration-300">
                    {!activeGestao ? (
                        <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                            Selecione uma gestão no Passo 1 antes de continuar.
                        </div>
                    ) : (
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
                                                <DialogDescription>Esta pasta ficará disponível internamente no sistema.</DialogDescription>
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
                                                <div className="space-y-2">
                                                    <Label>Cor Identificadora</Label>
                                                    <div className="flex gap-2 flex-wrap pt-1">
                                                        {CORES_SECRETARIA.map(cor => (
                                                            <button
                                                                key={cor.value}
                                                                type="button"
                                                                title={cor.label}
                                                                onClick={() => setNovaSecCor(cor.value)}
                                                                className={`w-7 h-7 rounded-full transition-all duration-150 ${novaSecCor === cor.value ? 'ring-2 ring-offset-2 ring-slate-700 scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                                                style={{ backgroundColor: cor.value }}
                                                            />
                                                        ))}
                                                    </div>
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
                                                            onClick={() => setDeletarSecId(sec.id)}
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
                                                                {u.name} <span className="text-slate-400 text-xs">— {u.email}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[11px] text-emerald-600/80 font-mono mt-1 font-medium bg-emerald-50/50 w-fit px-1.5 py-0.5 rounded border border-emerald-100/50">
                                                    Variável: {"{{SYS_SEC_"}{sec.sigla.toUpperCase()}{"_NOME}}"}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Navigation */}
            {step > 0 && (
                <div className="flex justify-between pt-2">
                    {step > 1
                        ? <Button variant="outline" onClick={() => setStep(s => (s - 1) as 0 | 1 | 2 | 3)} className="gap-1"><ChevronLeft className="h-4 w-4" />Anterior</Button>
                        : <Button variant="outline" onClick={() => setStep(0)} className="gap-1"><ChevronLeft className="h-4 w-4" />Voltar aos Mandatos</Button>
                    }
                    {step < 3
                        ? <Button onClick={() => setStep(s => (s + 1) as 0 | 1 | 2 | 3)} className="bg-primary text-white font-bold gap-1">Próximo<ChevronRight className="h-4 w-4" /></Button>
                        : <Button onClick={handleSave} disabled={saving || !activeGestao} className="bg-primary text-white font-bold gap-1">
                            {saving ? 'Salvando...' : <><Save className="h-4 w-4" />Salvar Alterações</>}
                        </Button>
                    }
                </div>
            )}

            {/* ── Dialogs e Sheet sempre renderizados ────────────────────────── */}
            {/* Dialog: confirmar exclusão de secretaria */}
            <Dialog open={!!deletarSecId} onOpenChange={(open) => !open && setDeletarSecId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação removerá o órgão permanentemente do sistema. Portarias vinculadas podem ser afetadas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletarSecId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDeletarSecretaria} className="font-bold">
                            <Trash2 className="h-4 w-4 mr-2" />Excluir Órgão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog: confirmar exclusão de setor */}
            <Dialog open={!!deletarSetorId} onOpenChange={(open) => !open && setDeletarSetorId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Remover Setor
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja remover este setor? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletarSetorId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleConfirmarDeletarSetor} className="font-bold">
                            <Trash2 className="h-4 w-4 mr-2" />Remover Setor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sheet: gerenciar setores */}
            <Sheet open={!!selectedSecForSectors} onOpenChange={(open) => !open && setSelectedSecForSectors(null)}>
                <SheetContent className="sm:max-w-md border-l border-slate-200">
                    <SheetHeader className="pb-6 border-b border-slate-100">
                        <SheetTitle className="text-xl font-bold text-slate-800">Setores — {selectedSecForSectors?.nome}</SheetTitle>
                        <SheetDescription>
                            Organize os departamentos internos desta secretaria para o encaminhamento de documentos.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Adicionar Novo Setor</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Nome (Ex: Depto. de Compras)"
                                    value={novoSetorNome}
                                    onChange={e => setNovoSetorNome(e.target.value)}
                                    className="bg-slate-50 border-slate-200"
                                />
                                <Input
                                    placeholder="Sigla"
                                    value={novoSetorSigla}
                                    onChange={e => setNovoSetorSigla(e.target.value)}
                                    className="bg-slate-50 border-slate-200 w-24"
                                />
                                <Button onClick={handleAddSetor} disabled={!novoSetorNome || !novoSetorSigla} className="bg-primary hover:bg-primary/90 text-white shadow-sm font-bold">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-700">Setores Existentes ({setores.length})</Label>
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {setores.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-lg text-slate-400">
                                        {loadingSetores ? 'Carregando...' : 'Nenhum setor cadastrado.'}
                                    </div>
                                ) : (
                                    setores.map(setor => (
                                        <div key={setor.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md shadow-sm group hover:border-[#1351B4]/30 transition-colors">
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">{setor.nome}</span>
                                                <span className="ml-2 text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{setor.sigla}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => handleDeletarSetor(setor.id)}>
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
