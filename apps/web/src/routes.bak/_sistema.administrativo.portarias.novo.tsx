import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { usePortariaWizard } from '@/hooks/use-portaria-wizard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    ChevronLeft, ChevronRight, Check, FileText,
    Search, Info, BookOpen, PenTool, Save
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

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
    const [busca, setBusca] = useState('')

    useEffect(() => {
        loadModelos()
    }, [])

    const handleFinalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget as HTMLFormElement)
        const dados = Object.fromEntries(formData.entries())

        const res = await criarRascunho(dados)
        if (res?.success) {
            toast({
                title: "Rascunho criado!",
                description: "A portaria foi gerada e enviada para revisão.",
            })
            navigate({ to: '/_sistema/administrativo/portarias' })
        }
    }

    const modelosFiltrados = modelos.filter(m =>
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.descricao?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
            {/* Header com Progresso */}
            <div className="flex flex-col items-center gap-6">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Criar Nova Portaria</h2>
                    <p className="text-slate-500 font-medium">Siga os passos para gerar o documento oficial</p>
                </div>

                <div className="flex items-center w-full max-w-md relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                    <StepIndicator active={step >= 1} current={step === 1} label="Modelo" icon={BookOpen} />
                    <div className="flex-1" />
                    <StepIndicator active={step >= 2} current={step === 2} label="Dados" icon={PenTool} />
                </div>
            </div>

            {step === 1 ? (
                <div className="space-y-6">
                    <div className="relative max-w-md mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelo de documento..."
                            className="pl-10 h-12 bg-white border-slate-200 shadow-sm rounded-xl"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loading ? (
                            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)
                        ) : (
                            modelosFiltrados.map((modelo) => (
                                <Card
                                    key={modelo.id}
                                    className={`cursor-pointer transition-all border-2 group hover:shadow-lg ${selectedModelo?.id === modelo.id
                                            ? 'border-primary ring-4 ring-primary/10 shadow-md'
                                            : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                    onClick={() => setSelectedModelo(modelo)}
                                >
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className={`p-3 rounded-lg ${selectedModelo?.id === modelo.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                                <FileText size={24} />
                                            </div>
                                            {selectedModelo?.id === modelo.id && (
                                                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white">
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{modelo.nome}</h4>
                                            <p className="text-sm text-slate-500 mt-1 leading-snug font-medium line-clamp-2">{modelo.descricao || 'Sem descrição disponível.'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            disabled={!selectedModelo}
                            onClick={nextStep}
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 shadow-lg shadow-primary/20 rounded-xl"
                        >
                            Continuar <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <Card className="border-slate-200 shadow-xl rounded-2xl overflow-hidden overflow-visible relative">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20">
                                <PenTool size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 line-clamp-1">{selectedModelo?.nome}</CardTitle>
                                <CardDescription className="font-medium">Preencha os campos abaixo para gerar o rascunho</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <form onSubmit={handleFinalizar}>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Mapear variáveis do modelo em campos reais futuramente */}
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold">Assunto Principal</Label>
                                    <Input name="assunto" placeholder="Ex: Nomeação de Servidor" required className="h-11 border-slate-300 focus:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-bold">Secretaria Requisitante</Label>
                                    <Input name="secretaria" defaultValue="RH - Secretaria de Administração" readOnly className="h-11 bg-slate-50 border-slate-200 text-slate-500 italic" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-slate-700 font-bold">Informações Adicionais / Justificativa</Label>
                                    <Input name="justificativa" placeholder="Descreva brevemente o motivo desta portaria..." className="h-11 border-slate-300" />
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700 font-medium leading-tight">
                                    Ao finalizar, um rascunho de documento será gerado com os dados acima. Você poderá editar o texto completo e fazer upload do arquivo final na próxima etapa.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-8 flex justify-between">
                            <Button variant="outline" onClick={prevStep} type="button" className="h-12 px-6 border-slate-300 text-slate-600 font-bold hover:bg-white rounded-xl">
                                <ChevronLeft className="mr-2 h-4 w-4" /> Escolher outro modelo
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-8 shadow-lg shadow-primary/20 rounded-xl">
                                <Save className="mr-2 h-4 w-4" /> Gerar Rascunho e Finalizar
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    )
}

function StepIndicator({ active, current, label, icon: Icon }: any) {
    return (
        <div className={`flex flex-col items-center gap-2 z-10 ${active ? 'text-primary' : 'text-slate-300'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${active
                    ? current ? 'bg-primary text-white shadow-xl shadow-primary/30 ring-4 ring-primary/20 scale-110' : 'bg-primary text-white'
                    : 'bg-white border-2 border-slate-200 text-slate-300'
                }`}>
                <Icon size={20} />
            </div>
            <span className={`text-xs font-black uppercase tracking-widest ${current ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        </div>
    )
}
