import { useState, useEffect, useCallback } from 'react'
import type { Usuario, RoleUsuario } from '@/types/domain'
import { listarUsuarios, toggleAtivo, atualizarUsuario } from '@/services/usuario.service'

export function useUsuarios() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        const result = await listarUsuarios()
        if (result.success) setUsuarios(result.data)
        else setError(result.error)
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const toggleStatus = useCallback(async (id: string) => {
        const result = await toggleAtivo(id)
        if (result.success) {
            setUsuarios((prev) =>
                prev.map((u) => u.id === id ? result.data : u)
            )
        }
        return result
    }, [])

    const updateRole = useCallback(async (id: string, role: RoleUsuario) => {
        const result = await atualizarUsuario(id, { role })
        if (result.success) {
            setUsuarios((prev) =>
                prev.map((u) => u.id === id ? result.data : u)
            )
        }
        return result
    }, [])

    const updatePermissoes = useCallback(async (id: string, permissoesExtra: string[]) => {
        const result = await atualizarUsuario(id, { permissoesExtra })
        if (result.success) {
            setUsuarios((prev) =>
                prev.map((u) => u.id === id ? result.data : u)
            )
        }
        return result
    }, [])

    return { usuarios, loading, error, refetch: fetch, toggleStatus, updateRole, updatePermissoes }
}
