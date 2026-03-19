import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { usePortariaWizard } from '@/hooks/use-portaria-wizard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    ChevronLeft, ChevronRight, Check, FileText,
    Search, BookOpen, PenTool, ClipboardList, AlertCircle, Loader2, Building2, Pencil
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { IMaskInput } from 'react-imask'
import type { ModeloVariavel } from '@/types/domain'
import { useAuthStore } from '@/store/auth.store'
import { listarSecretarias, type Secretaria } from '@/services/secretaria.service'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_sistema/administrativo/portarias/novo')({
    component: PortariaWizardPage,
})

function PortariaWizardPage() {
    const { toast } = useToast()
    const navigate = useNavigate()
    const { usuario } = useAuthStore()

    const {
        step, modelos, secretarias, setores, selectedModelo, selectedSecretariaId, selectedSetorId,
        loading, loadModelos, setSelectedModelo, setSelectedSecretariaId, setSelectedSetorId,
        nextStep, prevStep, criarRascunho
    } = usePortariaWizard(usuario?.secretariaId || undefined)

    const [busca, setBusca] = useState('')
    const [secretariasLista, setSecretariasLista] = useState<Secretaria[]>([])
    const [formValues, setFormValues] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    const [touched, setTouched] = useState(false)

    useEffect(() => {
        loadModelos()
        listarSecretarias().then(r => { if (r.success) setSecretariasLista(r.data) })
    }, [])

    // Reset form when modelo changes
    useEffect(() => {
        if (selectedModelo) {
            const initialValues: Record<string, string> = {}
            selectedModelo.variaveis.forEach(v => {
                initialValues[v.chave] = v.valorPadrao ?? ''
            })
            setFormValues(initialValues)
            setTouched(false)
        }
    }, [selectedModelo?.id])

    const handleFieldChange = useCallback((chave: string, value: string) => {
        setFormValues(prev => ({ ...prev, [chave]: value }))
    }, [])

    const handleNextStep = () => {
        setTouched(true)
        nextStep()
    }

    const handlePrevStep = () => {
        prevStep()
    }

    const isStep2Valid = () => {
        if (!selectedModelo) return false
        return selectedModelo.variaveis
            .filter(v => {
                // Exclude assinatura
                if (v.tipo === 'assinatura') return false
                // Exclude if conditional not met
                if (v.regraCondicional) {
                    const dependeValor = formValues[v.regraCondicional.dependeDe]
                    if (dependeValor !== v.regraCondicional.valor) return false
                }
                return v.obrigatorio
            })
            .every(v => formValues[v.chave]?.trim() !== '')
    }

    const formatarDataPorExtenso = (dataIso: string) => {
        if (!dataIso) return ''
        const partes = dataIso.split('-')
        if (partes.length !== 3) return dataIso
        const data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))

        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`
    }

    const handleFinalizar = async () => {
        if (!selectedModelo) return
        setSubmitting(true)

        // Formatar datas por extenso antes de enviar
        const payload: Record<string, string> = {}
        for (const [key, value] of Object.entries(formValues)) {
            const varMeta = selectedModelo.variaveis.find(v => v.chave === key)
            if (varMeta?.tipo === 'data_extenso' && value) {
                payload[key] = formatarDataPorExtenso(value)
            } else {
                payload[key] = value
            }
        }

        const res = await criarRascunho(payload, isAdmin ? selectedSecretariaId : undefined, selectedSetorId)
        setSubmitting(false)
        if (res?.success) {
            toast({
                title: '✅ Rascunho criado com sucesso!',
                description: 'Edite os campos diretamente no sistema e submeta para revisão quando estiver pronto.',
            })
            navigate({ to: '/administrativo/portarias/$id', params: { id: res.data.id } })
        } else {
            const msgErro = res?.error || 'Erro desconhecido. Tente novamente.'
            toast({ title: 'Erro ao gerar rascunho', description: msgErro, variant: 'destructive' })
        }
    }

    // ADMIN_GERAL não tem secretariaId — vê todos os modelos
    const isAdmin = usuario?.role === 'ADMIN_GERAL'

    const modelosFiltrados = modelos.filter(m => {
        const matchBusca = m.nome.toLowerCase().includes(busca.toLowerCase()) ||
            m.descricao?.toLowerCase().includes(busca.toLowerCase())
        // Admin vê tudo; outros só veem modelos globais (null) ou da própria secretaria
        const matchSecretaria = isAdmin
            ? (selectedSecretariaId ? m.secretariaId === null || m.secretariaId === selectedSecretariaId : true)
            : (m.secretariaId === null || m.secretariaId === usuario?.secretariaId)
        return matchBusca && matchSecretaria
    })

    const step2FieldsInfo = selectedModelo ? getStep2FieldsInfo(selectedModelo.variaveis, formValues) : { totalRequired: 0, totalFilled: 0 }

    return (
        <div className="max-w-4xl mx-auto w-full space-y-8 animate-in slide-in-from-bottom duration-500">
            {/* Stepper Header */}
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-1">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nova Portaria</h2>
                    <p className="text-slate-500 text-sm font-medium">Siga os passos para gerar o documento oficial</p>
                </div>

                <div className="flex items-center w-full max-w-lg relative">
                    {/* line */}
                    <div className="absolute top-5.5 left-0 w-full h-0.5 bg-slate-200 z-0" />
                    <div
                        className="absolute top-5.5 left-0 h-0.5 z-0 bg-primary transition-all duration-500"
                        style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                    />
                    <StepIndicator num={1} active={step >= 1} current={step === 1} label="Modelo" icon={BookOpen} />
                    <div className="flex-1" />
                    <StepIndicator num={2} active={step >= 2} current={step === 2} label="Dados" icon={PenTool} />
                    <div className="flex-1" />
                    <StepIndicator num={3} active={step >= 3} current={step === 3} label="Conferência" icon={ClipboardList} />
                </div>
            </div>

            {/* STEP 1 — Seleção de Modelo */}
            {step === 1 && (
                <div key={`step-${step}`} className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                    {isAdmin && secretarias.length > 0 && (
                        <div className="max-w-md mx-auto space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5" />
                                Secretaria <span className="text-red-500">*</span>
                            </Label>
                            <Select value={selectedSecretariaId} onValueChange={setSelectedSecretariaId}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm">
                                    <SelectValue placeholder="Selecione a secretaria..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {secretarias.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: s.cor }}
                                                />
                                                {s.nome} <span className="text-slate-400 text-xs">({s.sigla})</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Seletor de setor (aparece se a secretaria tiver setores e foi selecionada) */}
                    {setores.length > 0 && (
                        <div className="max-w-md mx-auto space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                Setor
                            </Label>
                            <Select value={selectedSetorId} onValueChange={setSelectedSetorId}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm">
                                    <SelectValue placeholder="Selecione o setor de origem..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {setores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelo de documento..."
                            className="pl-10 h-11 bg-white border-slate-200 shadow-sm"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    {!loading && modelosFiltrados.length > 0 && (
                        <div className="text-center text-xs text-slate-500 font-medium">
                            {modelosFiltrados.length} modelo{modelosFiltrados.length !== 1 ? 's' : ''} disponível{modelosFiltrados.length !== 1 ? 's' : ''}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)
                        ) : modelosFiltrados.length === 0 ? (
                            <div className="col-span-2 text-center py-16">
                                <FileText size={48} className="mx-auto mb-3 opacity-20 text-slate-400" />
                                <p className="font-bold text-slate-600 text-sm">Nenhum modelo disponível para esta secretaria</p>
                                <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou selecione outra secretaria</p>
                            </div>
                        ) : (
                            modelosFiltrados.map((modelo) => {
                                const isSelected = selectedModelo?.id === modelo.id
                                const totalCampos = modelo.variaveis.length
                                const totalObrigatorios = modelo.variaveis.filter(v => v.obrigatorio).length
                                return (
                                    <Card
                                        key={modelo.id}
                                        className={`cursor-pointer transition-all group min-h-[150px] flex flex-col border-l-4 ${isSelected
                                            ? 'border-l-primary border-primary ring-2 ring-primary/15 shadow-md bg-primary/5'
                                            : 'border-l-transparent border-slate-200 hover:border-slate-300'
                                            }`}
                                        onClick={() => setSelectedModelo(modelo)}
                                    >
                                        <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${isSelected
                                                    ? 'bg-primary text-white'
                                                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                    }`}>
                                                    <FileText size={20} />
                                                </div>
                                                {isSelected && (
                                                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-sm shrink-0 animate-in scale-in-50 duration-200">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight">{modelo.nome}</h4>
                                                <p className="text-xs text-slate-500 mt-1.5 leading-snug line-clamp-3">{modelo.descricao || 'Sem descrição'}</p>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px] font-medium">
                                                    {totalCampos} campo{totalCampos !== 1 ? 's' : ''}
                                                </Badge>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px] font-medium">
                                                    {totalObrigatorios} obrigatório{totalObrigatorios !== 1 ? 's' : ''}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            disabled={!selectedModelo || (isAdmin && !selectedSecretariaId)}
                            onClick={handleNextStep}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20"
                        >
                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 2 — Formulário Dinâmico */}
            {step === 2 && selectedModelo && (
                <div key={`step-${step}`} className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary text-white rounded-lg shadow shadow-primary/20">
                                    <PenTool size={20} />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg font-bold text-slate-900">{selectedModelo.nome}</CardTitle>
                                    <CardDescription className="font-medium text-slate-500 text-sm">Preencha os dados do documento</CardDescription>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-600">{step2FieldsInfo.totalFilled} de {step2FieldsInfo.totalRequired} campos obrigatórios preenchidos</span>
                                    <span className="font-medium text-slate-500">{step2FieldsInfo.totalRequired > 0 ? Math.round((step2FieldsInfo.totalFilled / step2FieldsInfo.totalRequired) * 100) : 100}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${step2FieldsInfo.totalRequired > 0 ? (step2FieldsInfo.totalFilled / step2FieldsInfo.totalRequired) * 100 : 100}%` }}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <RenderDynamicFields
                                    variaveis={selectedModelo.variaveis}
                                    formValues={formValues}
                                    touched={touched}
                                    onChange={handleFieldChange}
                                    secretarias={secretariasLista}
                                />
                            </div>
                        </CardContent>
                        <div className="px-6 pb-6 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                            <Button
                                variant="outline"
                                onClick={handlePrevStep}
                                className="h-11 px-6 border-slate-300 text-slate-600 font-semibold hover:text-slate-700"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button
                                disabled={!isStep2Valid()}
                                onClick={handleNextStep}
                                className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20 flex-1 sm:flex-none"
                            >
                                Próximo <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* STEP 3 — Conferência */}
            {step === 3 && selectedModelo && (
                <div key={`step-${step}`} className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                    {/* Header card with document info */}
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-slate-100 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary text-white rounded-lg shadow shadow-primary/20">
                                    <FileText size={24} />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-xl font-black text-slate-900">{selectedModelo.nome}</CardTitle>
                                    <div className="flex gap-2 mt-2">
                                        {selectedSecretariaId && secretarias.find(s => s.id === selectedSecretariaId) && (
                                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs font-medium">
                                                {secretarias.find(s => s.id === selectedSecretariaId)?.nome}
                                            </Badge>
                                        )}
                                        {selectedSetorId && setores.find(s => s.id === selectedSetorId) && (
                                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-xs font-medium">
                                                {setores.find(s => s.id === selectedSetorId)?.nome}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Fields grouped by grupo */}
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            <RenderReviewFields
                                variaveis={selectedModelo.variaveis}
                                formValues={formValues}
                                onEditClick={handlePrevStep}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 font-medium leading-snug">
                            Confira os dados antes de gerar o rascunho. Você poderá continuar editando o documento no sistema após a criação.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handlePrevStep}
                            className="h-11 px-6 border-slate-300 text-slate-600 font-semibold hover:text-slate-700"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <Button
                            onClick={handleFinalizar}
                            disabled={submitting}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20 flex-1 sm:flex-none"
                        >
                            {submitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                            ) : (
                                <><FileText className="mr-2 h-4 w-4" /> Gerar Rascunho do Documento</>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Helper: get step2 field counts ---
function getStep2FieldsInfo(variaveis: ModeloVariavel[], formValues: Record<string, string>): { totalRequired: number; totalFilled: number } {
    const requiredFields = variaveis.filter(v => v.obrigatorio && v.tipo !== 'assinatura')
    const totalRequired = requiredFields.length
    const totalFilled = requiredFields.filter(v => (formValues[v.chave] ?? '').trim() !== '').length
    return { totalRequired, totalFilled }
}

// --- Render dynamic fields grouped by grupo ---
interface RenderDynamicFieldsProps {
    variaveis: ModeloVariavel[]
    formValues: Record<string, string>
    touched: boolean
    onChange: (chave: string, value: string) => void
    secretarias?: Secretaria[]
}

function RenderDynamicFields({ variaveis, formValues, touched, onChange, secretarias = [] }: RenderDynamicFieldsProps) {
    // Sort by ordem, filter out assinatura
    const sorted = [...variaveis]
        .sort((a, b) => a.ordem - b.ordem)
        .filter(v => v.tipo !== 'assinatura')

    // Group by grupo: null first, then by grupo value
    const grouped = new Map<string | null, ModeloVariavel[]>()
    const nullGroup: ModeloVariavel[] = []
    sorted.forEach(v => {
        if (v.grupo === null || v.grupo === undefined) {
            nullGroup.push(v)
        } else {
            if (!grouped.has(v.grupo)) grouped.set(v.grupo, [])
            grouped.get(v.grupo)!.push(v)
        }
    })

    return (
        <>
            {/* Fields without grupo */}
            {nullGroup.map(variavel => {
                // Check regraCondicional
                if (variavel.regraCondicional) {
                    const depValue = formValues[variavel.regraCondicional.dependeDe]
                    if (depValue !== variavel.regraCondicional.valor) return null
                }
                return (
                    <div
                        key={variavel.chave}
                        className={variavel.tipo === 'textarea' ? 'md:col-span-2' : ''}
                    >
                        <DynamicField
                            variavel={variavel}
                            value={formValues[variavel.chave] ?? ''}
                            onChange={(val) => onChange(variavel.chave, val)}
                            touched={touched}
                            secretarias={secretarias}
                        />
                    </div>
                )
            })}

            {/* Grouped fields */}
            {Array.from(grouped.entries()).map(([grupoName, fields]) => (
                <div key={grupoName} className="md:col-span-2">
                    {/* Grupo section header */}
                    <div className="flex items-center gap-3 mb-4 mt-2">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {grupoName}
                        </span>
                        <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    {/* Fields in this grupo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {fields.map(variavel => {
                            // Check regraCondicional
                            if (variavel.regraCondicional) {
                                const depValue = formValues[variavel.regraCondicional.dependeDe]
                                if (depValue !== variavel.regraCondicional.valor) return null
                            }
                            return (
                                <div
                                    key={variavel.chave}
                                    className={variavel.tipo === 'textarea' ? 'md:col-span-2' : ''}
                                >
                                    <DynamicField
                                        variavel={variavel}
                                        value={formValues[variavel.chave] ?? ''}
                                        onChange={(val) => onChange(variavel.chave, val)}
                                        touched={touched}
                                        secretarias={secretarias}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </>
    )
}

// --- Render review fields grouped by grupo ---
interface RenderReviewFieldsProps {
    variaveis: ModeloVariavel[]
    formValues: Record<string, string>
    onEditClick: () => void
}

function RenderReviewFields({ variaveis, formValues, onEditClick }: RenderReviewFieldsProps) {
    // Sort by ordem, filter out assinatura
    const sorted = [...variaveis]
        .sort((a, b) => a.ordem - b.ordem)
        .filter(v => v.tipo !== 'assinatura')

    // Group by grupo
    const grouped = new Map<string | null, ModeloVariavel[]>()
    const nullGroup: ModeloVariavel[] = []
    sorted.forEach(v => {
        if (v.grupo === null || v.grupo === undefined) {
            nullGroup.push(v)
        } else {
            if (!grouped.has(v.grupo)) grouped.set(v.grupo, [])
            grouped.get(v.grupo)!.push(v)
        }
    })

    return (
        <>
            {/* Fields without grupo */}
            {nullGroup.map(variavel => (
                <ReviewFieldRow
                    key={variavel.chave}
                    variavel={variavel}
                    value={formValues[variavel.chave]}
                    onEditClick={onEditClick}
                />
            ))}

            {/* Grouped fields */}
            {Array.from(grouped.entries()).map(([grupoName, fields]) => (
                <div key={grupoName}>
                    {/* Section divider */}
                    <div className="md:col-span-2 border-t border-slate-200 py-3 px-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {grupoName}
                        </span>
                    </div>
                    {fields.map(variavel => (
                        <ReviewFieldRow
                            key={variavel.chave}
                            variavel={variavel}
                            value={formValues[variavel.chave]}
                            onEditClick={onEditClick}
                        />
                    ))}
                </div>
            ))}
        </>
    )
}

// --- Review field row ---
interface ReviewFieldRowProps {
    variavel: ModeloVariavel
    value?: string
    onEditClick: () => void
}

function ReviewFieldRow({ variavel, value, onEditClick }: ReviewFieldRowProps) {
    const isFilled = !!value?.trim()
    const isRequiredEmpty = variavel.obrigatorio && !isFilled

    let dotColor = 'bg-emerald-500'
    if (isRequiredEmpty) {
        dotColor = 'bg-red-400'
    } else if (!isFilled && !variavel.obrigatorio) {
        dotColor = 'bg-amber-400'
    }

    return (
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-200 hover:bg-slate-50/50 group transition-colors">
            <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0 mt-1.5`} />
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-700">{variavel.label}</div>
                <div className={`text-sm leading-snug break-words ${isFilled ? 'text-slate-800 font-medium' : 'text-slate-400 italic'}`}>
                    {isFilled ? value : '—'}
                </div>
            </div>
            <button
                onClick={onEditClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-slate-200 rounded"
                title="Editar"
            >
                <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-primary" />
            </button>
        </div>
    )
}

// --- Componente de Campo Dinâmico ---
interface DynamicFieldProps {
    variavel: ModeloVariavel
    value: string
    onChange: (val: string) => void
    touched?: boolean
    secretarias?: Secretaria[]
}

function DynamicField({ variavel, value, onChange, touched = false, secretarias = [] }: DynamicFieldProps) {
    // Campo Secretaria: usa Select especial carregado do sistema
    const isSecretariaField = variavel.chave.toUpperCase() === 'SECRETARIA' && secretarias.length > 0
    if (isSecretariaField) {
        return (
            <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">
                    {variavel.label}
                    {variavel.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className={`h-10 border-slate-200 text-sm text-slate-800 bg-white ${touched && variavel.obrigatorio && !value ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Selecione a secretaria..." />
                    </SelectTrigger>
                    <SelectContent>
                        {secretarias.map(s => (
                            <SelectItem key={s.id} value={s.nome}>
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.cor }} />
                                    {s.nome} <span className="text-slate-400 text-xs">({s.sigla})</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {touched && variavel.obrigatorio && !value && (
                    <p className="text-xs text-red-500 font-medium">Este campo é obrigatório</p>
                )}
            </div>
        )
    }
    const isRequired = variavel.obrigatorio && !value?.trim()
    const shouldShowError = touched && isRequired && variavel.tipo !== 'assinatura'

    const baseInputClass = `h-10 border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 w-full rounded-md px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors ${
        shouldShowError ? 'border-red-400 focus:border-red-500' : ''
    }`

    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">
                {variavel.label}
                {variavel.obrigatorio && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {variavel.tipo === 'textarea' && (
                <Textarea
                    placeholder={variavel.descricao || `Digite ${variavel.label.toLowerCase()}...`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required={variavel.obrigatorio}
                    rows={3}
                    className={`border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-sm text-slate-800 placeholder:text-slate-400 ${
                        shouldShowError ? 'border-red-400 focus:border-red-500' : ''
                    }`}
                />
            )}

            {variavel.tipo === 'select' && (
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className={`h-10 border-slate-200 text-sm text-slate-800 bg-white ${
                        shouldShowError ? 'border-red-400 focus:border-red-500' : ''
                    }`}>
                        <SelectValue placeholder={`Selecione ${variavel.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                        {variavel.opcoes.map(op => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {variavel.tipo === 'cpf' && (
                <IMaskInput
                    mask="000.000.000-00"
                    value={value}
                    onAccept={(val: string) => onChange(val)}
                    placeholder="000.000.000-00"
                    className={`${baseInputClass} border`}
                />
            )}

            {variavel.tipo === 'moeda' && (
                <IMaskInput
                    mask={Number}
                    scale={2}
                    thousandsSeparator="."
                    radix=","
                    mapToRadix={['.']}
                    normalizeZeros
                    padFractionalZeros
                    value={value}
                    onAccept={(_val: unknown, maskRef: { typedValue: number }) => {
                        onChange(maskRef.typedValue.toFixed(2))
                    }}
                    placeholder="0,00"
                    className={`${baseInputClass} border`}
                    unmask={false}
                />
            )}

            {variavel.tipo === 'assinatura' && (
                <Input
                    type="text"
                    value="Preenchido automaticamente na assinatura"
                    disabled
                    className="h-10 border-slate-200 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                />
            )}

            {(variavel.tipo === 'texto' || variavel.tipo === 'numero' || variavel.tipo === 'data' || variavel.tipo === 'data_extenso') && (
                <Input
                    type={variavel.tipo === 'numero' ? 'number' : (variavel.tipo === 'data' || variavel.tipo === 'data_extenso') ? 'date' : 'text'}
                    placeholder={variavel.descricao || `Digite ${variavel.label.toLowerCase()}...`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required={variavel.obrigatorio}
                    className={`${baseInputClass} border`}
                />
            )}

            {variavel.descricao && variavel.tipo !== 'textarea' && (
                <p className="text-[11px] text-slate-400 leading-tight font-medium">{variavel.descricao}</p>
            )}

            {shouldShowError && (
                <p className="text-xs text-red-500 font-medium">Este campo é obrigatório</p>
            )}
        </div>
    )
}

// --- Stepper Indicator ---
interface StepIndicatorProps {
    num: number
    active: boolean
    current: boolean
    label: string
    icon: React.ElementType
}

function StepIndicator({ num, active, current, label, icon: Icon }: StepIndicatorProps) {
    return (
        <div className={`flex flex-col items-center gap-2 z-10 transition-colors ${active ? 'text-primary' : 'text-slate-300'}`}>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all ${active
                ? current
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20 scale-110'
                    : 'bg-primary text-white'
                : 'bg-white border-2 border-slate-200 text-slate-300'
                }`}>
                {active && !current ? <Check size={18} strokeWidth={3} /> : <Icon size={20} />}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-widest text-center ${current ? 'opacity-100 text-primary' : active ? 'opacity-70' : 'opacity-40'}`}>
                {num}. {label}
            </span>
        </div>
    )
}
