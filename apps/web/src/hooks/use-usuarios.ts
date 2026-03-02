import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Usuario, RoleUsuario } from '@/types/domain'
import { listarUsuarios, toggleAtivo, atualizarUsuario } from '@/services/usuario.service'
import { useToast } from '@/hooks/use-toast'

export function useUsuarios() {
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const {
        data: usuarios = [],
        isLoading: loading,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: ['admin-usuarios'],
        queryFn: async () => {
            const result = await listarUsuarios()
            if (!result.success) throw new Error(result.error)
            return result.data
        }
    })

    const error = queryError instanceof Error ? queryError.message : null

    const toggleStatusMutation = useMutation({
        mutationFn: async (id: string) => {
            const result = await toggleAtivo(id)
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['admin-usuarios'], (oldData: Usuario[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(u => u.id === updatedUser.id ? updatedUser : u)
            })
        }
    })

    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string, role: RoleUsuario }) => {
            const result = await atualizarUsuario(id, { role })
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['admin-usuarios'], (oldData: Usuario[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(u => u.id === updatedUser.id ? updatedUser : u)
            })
        }
    })

    const updatePermissoesMutation = useMutation({
        mutationFn: async ({ id, permissoesExtra }: { id: string, permissoesExtra: string[] }) => {
            const result = await atualizarUsuario(id, { permissoesExtra })
            if (!result.success) throw new Error(result.error)
            return result.data
        },
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(['admin-usuarios'], (oldData: Usuario[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(u => u.id === updatedUser.id ? updatedUser : u)
            })
        }
    })

    const toggleStatus = async (id: string) => {
        try {
            await toggleStatusMutation.mutateAsync(id)
        } catch (e) {
            console.error(e)
            toast({ title: 'Erro', description: 'Não foi possível alterar o status do usuário.', variant: 'destructive' })
        }
    }

    const updateRole = async (id: string, role: RoleUsuario) => {
        try {
            await updateRoleMutation.mutateAsync({ id, role })
        } catch (e) {
            console.error(e)
            toast({ title: 'Erro', description: 'Não foi possível alterar o nível de acesso.', variant: 'destructive' })
        }
    }

    const updatePermissoes = async (id: string, permissoesExtra: string[]) => {
        try {
            await updatePermissoesMutation.mutateAsync({ id, permissoesExtra })
        } catch (e) {
            console.error(e)
            toast({ title: 'Erro', description: 'Não foi possível atualizar as permissões.', variant: 'destructive' })
        }
    }

    return {
        usuarios,
        loading,
        error,
        refetch,
        toggleStatus,
        updateRole,
        updatePermissoes
    }
}
