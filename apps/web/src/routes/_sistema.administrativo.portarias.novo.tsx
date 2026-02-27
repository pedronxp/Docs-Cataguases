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
    Search, BookOpen, PenTool, ClipboardList, AlertCircle, Loader2
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { IMaskInput } from 'react-imask'
import type { ModeloVariavel } from '@/types/domain'
import { useAuthStore } from '@/store/auth.store'

export const Route = createFileRoute('/_sistema/administrativo/portarias/novo')({
    component: PortariaWizardPage,
})

function PortariaWizardPage() {
    const {
        step, modelos, selectedModelo, loading,
        loadModelos, setSelectedModelo, nextStep, prevStep, criarRascunho
    } = usePortariaWizard()

    const { toast } = useToast()
    const navigate = useNavigate()
    const { usuario } = useAuthStore()
    const [busca, setBusca] = useState('')
    const [formValues, setFormValues] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadModelos()
    }, [])

    // Reset form when modelo changes
    useEffect(() => {
        if (selectedModelo) {
            const initialValues: Record<string, string> = {}
            selectedModelo.variaveis.forEach(v => { initialValues[v.chave] = '' })
            setFormValues(initialValues)
        }
    }, [selectedModelo?.id])

    const handleFieldChange = useCallback((chave: string, value: string) => {
        setFormValues(prev => ({ ...prev, [chave]: value }))
    }, [])

    const isStep2Valid = () => {
        if (!selectedModelo) return false
        return selectedModelo.variaveis
            .filter(v => v.obrigatorio)
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

        const res = await criarRascunho(payload)
        setSubmitting(false)
        if (res?.success) {
            toast({
                title: '✅ Rascunho gerado com sucesso!',
                description: 'A portaria foi criada e enviada para revisão.',
            })
            navigate({ to: '/administrativo/portarias' })
        } else {
            toast({ title: 'Erro ao gerar rascunho', description: 'Tente novamente.', variant: 'destructive' })
        }
    }

    const modelosFiltrados = modelos.filter(m => {
        const matchBusca = m.nome.toLowerCase().includes(busca.toLowerCase()) ||
            m.descricao?.toLowerCase().includes(busca.toLowerCase())
        const matchSecretaria = m.secretariaId === null || m.secretariaId === usuario?.secretariaId
        return matchBusca && matchSecretaria
    })

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
            {/* Stepper Header */}
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nova Portaria</h2>
                    <p className="text-slate-500 text-sm font-medium">Siga os passos para gerar o documento oficial</p>
                </div>

                <div className="flex items-center w-full max-w-lg relative">
                    {/* line */}
                    <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-200 z-0" />
                    <div
                        className="absolute top-5 left-0 h-0.5 z-0 bg-primary transition-all duration-500"
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
                <div className="space-y-6">
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelo de documento..."
                            className="pl-10 h-11 bg-white border-slate-200 shadow-sm"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)
                        ) : modelosFiltrados.length === 0 ? (
                            <div className="col-span-2 text-center py-16 text-slate-400">
                                <FileText size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="font-medium">Nenhum modelo disponível</p>
                            </div>
                        ) : (
                            modelosFiltrados.map((modelo) => (
                                <Card
                                    key={modelo.id}
                                    className={`cursor-pointer transition-all border-2 group hover:shadow-md ${selectedModelo?.id === modelo.id
                                        ? 'border-primary ring-4 ring-primary/10 shadow-md bg-primary/5'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    onClick={() => setSelectedModelo(modelo)}
                                >
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className={`p-2.5 rounded-lg ${selectedModelo?.id === modelo.id
                                                ? 'bg-primary text-white'
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                }`}>
                                                <FileText size={20} />
                                            </div>
                                            {selectedModelo?.id === modelo.id && (
                                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-sm">
                                                    <Check size={13} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight">{modelo.nome}</h4>
                                            <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{modelo.descricao || 'Sem descrição.'}</p>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {modelo.variaveis.length} campo{modelo.variaveis.length !== 1 ? 's' : ''} a preencher
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            disabled={!selectedModelo}
                            onClick={nextStep}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20"
                        >
                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 2 — Formulário Dinâmico */}
            {step === 2 && selectedModelo && (
                <Card className="border-slate-200 shadow-lg overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary text-white rounded-lg shadow shadow-primary/20">
                                <PenTool size={20} />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-900">{selectedModelo.nome}</CardTitle>
                                <CardDescription className="font-medium text-slate-500 text-sm">Preencha os dados do documento</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {[...selectedModelo.variaveis]
                                .sort((a, b) => a.ordem - b.ordem)
                                .map(variavel => (
                                    <div
                                        key={variavel.chave}
                                        className={variavel.tipo === 'textarea' ? 'md:col-span-2' : ''}
                                    >
                                        <DynamicField
                                            variavel={variavel}
                                            value={formValues[variavel.chave] ?? ''}
                                            onChange={(val) => handleFieldChange(variavel.chave, val)}
                                        />
                                    </div>
                                ))
                            }
                        </div>
                    </CardContent>
                    <div className="px-6 pb-6 flex justify-between border-t border-slate-100 pt-5">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            className="h-11 px-6 border-slate-300 text-slate-600 font-semibold"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
                        </Button>
                        <Button
                            disabled={!isStep2Valid()}
                            onClick={nextStep}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20"
                        >
                            Próximo <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {/* STEP 3 — Conferência */}
            {step === 3 && selectedModelo && (
                <div className="space-y-4">
                    <Card className="border-slate-200 shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary text-white rounded-lg shadow shadow-primary/20">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900">Conferência dos Dados</CardTitle>
                                    <CardDescription className="font-medium text-slate-500 text-sm">Modelo: {selectedModelo.nome}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="rounded-lg bg-slate-50 border border-slate-200 divide-y divide-slate-200">
                                {[...selectedModelo.variaveis]
                                    .sort((a, b) => a.ordem - b.ordem)
                                    .map(variavel => (
                                        <div key={variavel.chave} className="flex items-start px-4 py-3 gap-4">
                                            <span className="text-sm font-semibold text-slate-600 w-48 shrink-0">{variavel.label}</span>
                                            <span className={`text-sm font-medium flex-1 ${formValues[variavel.chave] ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                                {formValues[variavel.chave] || '—'}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 font-medium leading-snug">
                            Confira os dados com atenção. Após gerar o rascunho, esses valores serão injetados no documento oficial. Você ainda poderá editar o documento Word antes de submeter.
                        </p>
                    </div>

                    <div className="flex justify-between pt-2">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            className="h-11 px-6 border-slate-300 text-slate-600 font-semibold"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" /> Corrigir Dados
                        </Button>
                        <Button
                            onClick={handleFinalizar}
                            disabled={submitting}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-8 shadow-md shadow-primary/20"
                        >
                            {submitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                            ) : (
                                <><Check className="mr-2 h-4 w-4" /> Gerar Rascunho do Documento</>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

// --- Componente de Campo Dinâmico ---
interface DynamicFieldProps {
    variavel: ModeloVariavel
    value: string
    onChange: (val: string) => void
}

function DynamicField({ variavel, value, onChange }: DynamicFieldProps) {
    const baseInputClass = "h-10 border-slate-200 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 w-full rounded-md px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors"

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
                    className="border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none text-sm text-slate-800 placeholder:text-slate-400"
                />
            )}

            {variavel.tipo === 'select' && (
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className="h-10 border-slate-200 text-sm text-slate-800 bg-white">
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
                    className={`${baseInputClass} border border-slate-200`}
                />
            )}

            {variavel.tipo === 'moeda' && (
                <IMaskInput
                    mask={Number}
                    scale={2}
                    signed={false}
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
                    className={`${baseInputClass} border border-slate-200`}
                    unmask={false}
                />
            )}

            {(variavel.tipo === 'texto' || variavel.tipo === 'numero' || variavel.tipo === 'data' || variavel.tipo === 'data_extenso') && (
                <Input
                    type={variavel.tipo === 'numero' ? 'number' : (variavel.tipo === 'data' || variavel.tipo === 'data_extenso') ? 'date' : 'text'}
                    placeholder={variavel.descricao || `Digite ${variavel.label.toLowerCase()}...`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    required={variavel.obrigatorio}
                    className="h-10 border-slate-200 text-sm text-slate-800 placeholder:text-slate-400"
                />
            )}

            {variavel.descricao && variavel.tipo !== 'textarea' && (
                <p className="text-[11px] text-slate-400 leading-tight font-medium">{variavel.descricao}</p>
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${active
                ? current
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20 scale-110'
                    : 'bg-primary text-white'
                : 'bg-white border-2 border-slate-200 text-slate-300'
                }`}>
                {active && !current ? <Check size={16} strokeWidth={3} /> : <Icon size={18} />}
            </div>
            <span className={`text-[11px] font-black uppercase tracking-widest ${current ? 'opacity-100 text-primary' : active ? 'opacity-70' : 'opacity-40'}`}>
                {num}. {label}
            </span>
        </div>
    )
}
