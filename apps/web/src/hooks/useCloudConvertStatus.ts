import { useState, useEffect } from 'react'
import api from '@/lib/api'

export interface CloudConvertKeyStatus {
    id: string
    name: string
    key?: string
    isActive: boolean
    status: 'active' | 'exhausted' | 'warning' | 'error'
    credits: number | string
    used: number | string
    username?: string
    error?: string
}

export function useCloudConvertStatus() {
    const [keys, setKeys] = useState<CloudConvertKeyStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStatus = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await api.get('/api/cloudconvert/status')
            const json = res.data
            if (json.success) {
                setKeys(json.data)
            } else {
                setError(json.error)
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Network error')
        } finally {
            setLoading(false)
        }
    }

    const setActiveKey = async (id: string) => {
        try {
            const res = await api.post('/api/cloudconvert/keys', { action: 'set_active', keyId: id })
            const json = res.data
            if (json.success) await fetchStatus()
            return json
        } catch (err: any) {
            return { success: false, error: err.response?.data?.error || err.message }
        }
    }

    const addKey = async (newKey: string) => {
        try {
            const res = await api.post('/api/cloudconvert/keys', { action: 'add_key', newKey })
            const json = res.data
            if (json.success) await fetchStatus()
            return json
        } catch (err: any) {
            return { success: false, error: err.response?.data?.error || err.message }
        }
    }

    const deleteKey = async (id: string) => {
        try {
            const res = await api.post('/api/cloudconvert/keys', { action: 'delete_key', keyId: id })
            const json = res.data
            if (json.success) await fetchStatus()
            return json
        } catch (err: any) {
            return { success: false, error: err.response?.data?.error || err.message }
        }
    }

    useEffect(() => {
        fetchStatus()
        // Auto refresh a cada 30 segundos
        const interval = setInterval(() => {
            fetchStatus()
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    return {
        keys,
        loading,
        error,
        fetchStatus,
        setActiveKey,
        addKey,
        deleteKey
    }
}
