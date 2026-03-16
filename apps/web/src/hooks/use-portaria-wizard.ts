import { useState, useEffect } from 'react'
import { listarModelos } from '@/services/modelo.service'
import { listarSecretarias, listarSetores } from '@/services/secretaria.service'
import { portariaService } from '@/services/portaria.service'
import type { ModeloDocumento, Secretaria, Setor } from '@/types/domain'

export function usePortariaWizard(initialSecretariaId?: string) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [modelos, setModelos] = useState<ModeloDocumento[]>([])
    const [secretarias, setSecretarias] = useState<Secretaria[]>([])
    const [selectedModelo, setSelectedModelo] = useState<ModeloDocumento | null>(null)
    const [selectedSecretariaId, setSelectedSecretariaId] = useState<string>(initialSecretariaId || '')
    const [selectedSetorId, setSelectedSetorId] = useState<string>('')

    const [setores, setSetores] = useState<Setor[]>([])

    const loadModelos = async () => {
        setLoading(true)
        const [modelosRes, secretariasRes] = await Promise.all([
            listarModelos(),
            listarSecretarias(),
        ])
        if (modelosRes.success) setModelos(modelosRes.data)
        if (secretariasRes.success) setSecretarias(secretariasRes.data)
        setLoading(false)
    }

    // Busca setores quando a secretaria muda
    useEffect(() => {
        if (!selectedSecretariaId) {
            setSetores([])
            setSelectedSetorId('')
            return
        }
        listarSetores(selectedSecretariaId).then(res => {
            if (res.success) setSetores(res.data)
            else setSetores([])
            setSelectedSetorId('')
        })
    }, [selectedSecretariaId])

    const nextStep = () => setStep(prev => prev + 1)
    const prevStep = () => setStep(prev => prev - 1)

    const criarRascunho = async (dados: any, secretariaIdOverride?: string, setorIdOverride?: string) => {
        if (!selectedModelo) return
        setLoading(true)

        // Monta título: "Nomeação - Pedro Paulo" (usa chaves comuns para identificar o destinatário)
        const CHAVES_PESSOA = ['NOMEADO', 'NOME', 'SERVIDOR', 'DESIGNADO', 'EXONERADO', 'CONTRATADO', 'INTERESSADO']
        const pessoa = CHAVES_PESSOA
            .map(k => dados[k] || dados[k.toLowerCase()])
            .find(v => v && String(v).trim() !== '')

        const titulo = pessoa
            ? `${selectedModelo.nome} - ${String(pessoa).trim()}`
            : `${selectedModelo.nome} - ${new Date().toLocaleDateString('pt-BR')}`

        const res = await portariaService.criarPortaria({
            titulo,
            modeloId: selectedModelo.id,
            formData: dados,
            secretariaId: secretariaIdOverride || selectedSecretariaId || undefined,
            setorId: setorIdOverride || selectedSetorId || undefined,
        })
        setLoading(false)
        return res
    }

    return {
        step,
        modelos,
        secretarias,
        setores,
        selectedModelo,
        selectedSecretariaId,
        selectedSetorId,
        loading,
        loadModelos,
        setSelectedModelo,
        setSelectedSecretariaId,
        setSelectedSetorId,
        nextStep,
        prevStep,
        criarRascunho,
    }
}
