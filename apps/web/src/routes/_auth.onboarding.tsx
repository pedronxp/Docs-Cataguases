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
      toast({ title: "Lotação definida!", description: "Sua solicitação foi enviada para análise." })
      navigate({ to: '/_auth/aguardando' as any })
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: res.error })
    }
    setLoading(false)
  }

  if (loadData) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-5 animate-in slide-in-from-bottom duration-500">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="text-white w-5 h-5" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bem-vindo(a) ao Doc's</h1>
          <p className="text-sm text-slate-500">Para começar, informe onde você atua.</p>
        </div>

        <Card className="border-slate-200 shadow-lg rounded-2xl overflow-hidden border-t-4 border-t-primary">
          <CardHeader className="bg-white px-5 pt-5 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">Definição de Lotação</CardTitle>
            <CardDescription className="text-xs">Selecione seu órgão e setor de trabalho oficial</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700 font-semibold flex items-center gap-1.5">
                  <Building2 size={12} className="text-primary" /> Secretaria / Órgão
                </Label>
                <Select onValueChange={setSelectedSec} value={selectedSec}>
                  <SelectTrigger className="h-10 border-slate-200 rounded-lg bg-slate-50/50 focus:ring-primary text-sm">
                    <SelectValue placeholder="Selecione sua secretaria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {secretarias.map(sec => (
                      <SelectItem key={sec.id} value={sec.id} className="text-sm">{sec.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700 font-semibold flex items-center gap-1.5">
                  <MapPin size={12} className="text-primary" /> Setor (Opcional)
                </Label>
                <Select onValueChange={setSelectedSetor} value={selectedSetor}>
                  <SelectTrigger className="h-10 border-slate-200 rounded-lg bg-slate-50/50 focus:ring-primary text-sm">
                    <SelectValue placeholder="Selecione seu setor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setor-dp" className="text-sm">Departamento de Pessoal</SelectItem>
                    <SelectItem value="setor-comunicacao" className="text-sm">Comunicação Social</SelectItem>
                    <SelectItem value="setor-juridico" className="text-sm">Procuradoria Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Após confirmar, sua conta será encaminhada para a <span className="font-semibold text-primary">fila de aprovação</span> do administrador.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 px-5 py-4 border-t border-slate-100">
            <Button
              disabled={!selectedSec || loading}
              onClick={handleFinalizar}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20 rounded-xl transition-all hover:scale-[1.01]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Confirmar Minha Lotação <ChevronRight className="ml-1.5 h-4 w-4" /></>
              )}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Prefeitura Municipal de Cataguases / MG
        </p>
      </div>
    </div>
  )
}
