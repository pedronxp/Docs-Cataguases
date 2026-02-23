import { useState, useEffect } from 'react'
import type { LogAuditoria } from '@/types/domain'
import { auditoriaService } from '@/services/auditoria.service'

export function useAuditoria() {
    const [logs, setLogs] = useState<LogAuditoria[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchLogs = async () => {
        setLoading(true)
        const result = await auditoriaService.listarLogs()
        if (result.success) setLogs(result.data)
        else setError(result.error)
        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    return { logs, loading, error, refresh: fetchLogs }
}
