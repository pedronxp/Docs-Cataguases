import { useState } from 'react'
import { listarModelos } from '@/services/modelo.service'
import { portariaService } from '@/services/portaria.service'
import type { ModeloDocumento } from '@/types/domain'

export function usePortariaWizard() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [modelos, setModelos] = useState<ModeloDocumento[]>([])
    const [selectedModelo, setSelectedModelo] = useState<ModeloDocumento | null>(null)

    const loadModelos = async () => {
        setLoading(true)
        const res = await listarModelos()
        if (res.success) setModelos(res.data)
        setLoading(false)
    }

    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    const criarRascunho = async (dados: any) => {
        if (!selectedModelo) return
        setLoading(true)
        const res = await portariaService.criarPortaria({
            titulo: `${selectedModelo.nome} - ${new Date().toLocaleDateString()}`,
            modeloId: selectedModelo.id,
            dadosFormulario: dados
        })
        setLoading(false)
        return res
    }

    return {
        step,
        modelos,
        selectedModelo,
        loading,
        loadModelos,
        setSelectedModelo,
        nextStep,
        prevStep,
        criarRascunho
    }
}
