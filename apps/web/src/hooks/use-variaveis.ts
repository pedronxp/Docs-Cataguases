import { useState, useEffect } from 'react'
import type { VariavelSistema } from '@/types/domain'
import { variavelService } from '@/services/variavel.service'

export function useVariaveis() {
    const [variaveis, setVariaveis] = useState<VariavelSistema[]>([])
    const [loading, setLoading] = useState(true)

    const fetchVariaveis = async () => {
        setLoading(true)
        const result = await variavelService.listarVariaveis()
        if (result.success) setVariaveis(result.data)
        setLoading(false)
    }

    useEffect(() => {
        fetchVariaveis()
    }, [])

    return {
        variaveis,
        loading,
        refresh: fetchVariaveis,
        salvar: variavelService.salvarVariavel,
        excluir: variavelService.excluirVariavel
    }
}
