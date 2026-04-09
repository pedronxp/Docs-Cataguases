import { useState, useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import api from '@/lib/api'

interface PageContext {
    systemContext: string | null
    portariaId: string | null
    isLoading: boolean
}

export function usePageContext(): PageContext {
    const location = useLocation()
    const [systemContext, setSystemContext] = useState<string | null>(null)
    const [portariaId, setPortariaId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // Detectar rota de portaria: /portarias/:id ou /portarias/revisao/:id
        const portariaMatch = location.pathname.match(/\/portarias\/(?:revisao\/)?([a-z0-9]+)/)

        if (!portariaMatch) {
            setSystemContext(null)
            setPortariaId(null)
            return
        }

        const id = portariaMatch[1]
        setPortariaId(id)
        setIsLoading(true)

        api.get(`/api/portarias/${id}`)
            .then((res) => {
                const p = res.data?.data
                if (!p) return

                const ctx = [
                    `[CONTEXTO DA PÁGINA ATUAL]`,
                    `O usuário está visualizando a portaria: "${p.titulo}"`,
                    `ID: ${p.id}`,
                    p.numeroOficial ? `Número oficial: ${p.numeroOficial}` : 'Número oficial: ainda não publicada',
                    `Status: ${p.status}`,
                    p.modelo?.tipoDocumento ? `Tipo: ${p.modelo.tipoDocumento}` : '',
                    p.secretaria?.nome ? `Secretaria: ${p.secretaria.nome}` : '',
                    ``,
                    `Se o usuário perguntar sobre "esta portaria", "este documento" ou "este arquivo", refira-se aos dados acima.`,
                ].filter(Boolean).join('\n')

                setSystemContext(ctx)
            })
            .catch(() => {
                // Sem contexto se a portaria não for acessível — não bloqueia o chat
                setSystemContext(null)
            })
            .finally(() => setIsLoading(false))
    }, [location.pathname])

    return { systemContext, portariaId, isLoading }
}
