import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, MapPin, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { completarOnboarding } from '@/services/auth.service'
import { listarSecretarias } from '@/services/secretaria.service'
import { useToast } from '@/hooks/use-toast'
import type { Secretaria } from '@/types/domain'

export const Route = createFileRoute('/_auth/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const updateUsuario = useAuthStore(s => s.updateUsuario)
  const [loading, setLoading] = useState(false)
  const [loadData, setLoadData] = useState(true)
  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [selectedSec, setSelectedSec] = useState<string>('')
  const [selectedSetor, setSelectedSetor] = useState<string>('')

  useEffect(() => {
    async function load() {
      const res = await listarSecretarias()
      if (res.success) setSecretarias(res.data)
      setLoadData(false)
    }
    load()
  }, [])

  const handleFinalizar = async () => {
    if (!selectedSec) return
    setLoading(true)
    const res = await completarOnboarding(selectedSec, selectedSetor)
    if (res.success) {
      updateUsuario(res.data)
      toast({
        title: "Lotação definida!",
        description: "Sua solicitação foi enviada para análise.",
      })
      navigate({ to: '/_auth/aguardando' as any })
    } else {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: res.error,
      })
    }
    setLoading(false)
  }

  if (loadData) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-8 animate-in slide-in-from-bottom duration-500">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20">
              <Building2 className="text-white w-7 h-7" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bem-vindo(a) ao Doc's</h1>
          <p className="text-slate-500 font-medium">Para começar, precisamos saber onde você atua.</p>
        </div>

        <Card className="border-slate-200 shadow-2xl rounded-3xl overflow-hidden border-t-8 border-t-primary">
          <CardHeader className="bg-white p-8">
            <CardTitle className="text-xl font-bold text-slate-900">Definição de Lotação</CardTitle>
            <CardDescription className="font-medium">Selecione seu órgão e setor de trabalho oficial</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold flex items-center gap-2">
                  <Building2 size={14} className="text-primary" /> Secretaria / Órgão
                </Label>
                <Select onValueChange={setSelectedSec} value={selectedSec}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl bg-slate-50/50 focus:ring-primary font-medium">
                    <SelectValue placeholder="Selecione sua secretaria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {secretarias.map(sec => (
                      <SelectItem key={sec.id} value={sec.id} className="font-medium">{sec.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-bold flex items-center gap-2">
                  <MapPin size={14} className="text-primary" /> Setor (Opcional)
                </Label>
                <Select onValueChange={setSelectedSetor} value={selectedSetor}>
                  <SelectTrigger className="h-12 border-slate-200 rounded-xl bg-slate-50/50 focus:ring-primary font-medium">
                    <SelectValue placeholder="Selecione seu setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setor-dp" className="font-medium">Departamento de Pessoal</SelectItem>
                    <SelectItem value="setor-comunicacao" className="font-medium">Comunicação Social</SelectItem>
                    <SelectItem value="setor-juridico" className="font-medium">Procuradoria Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-4">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Após confirmar, sua conta será encaminhada para a <span className="font-bold text-primary">fila de aprovação</span> do administrador. Você receberá um alerta quando puder emitir documentos.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-8 border-t border-slate-100">
            <Button
              disabled={!selectedSec || loading}
              onClick={handleFinalizar}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-md shadow-xl shadow-primary/20 rounded-2xl transition-all hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Confirmar Minha Lotação <ChevronRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400 font-medium">
          Prefeitura Municipal de Cataguases / MG
        </p>
      </div>
    </div>
  )
}
