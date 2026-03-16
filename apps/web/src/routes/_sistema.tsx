import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { PageLayout } from '@/components/shared/PageLayout'
import { AbilityContext, buildAbility, type AppAbility } from '@/lib/ability'
import { useAuthStore } from '@/store/auth.store'
import { useMemo } from 'react'
import { createMongoAbility } from '@casl/ability'
import { FloatingChat } from '@/components/chat/FloatingChat'
import { RouterErrorComponent } from '@/components/shared/ErrorPage'

export const Route = createFileRoute('/_sistema')({
    component: SistemaLayout,
    errorComponent: RouterErrorComponent,
})

const ROUTE_TITLES: Record<string, string> = {
    '/dashboard': 'Visão Geral',
    '/administrativo/portarias': 'Gestão de Portarias',
    '/admin/usuarios': 'Controle de Acessos',
    '/admin/usuarios-orgao': 'Usuários por Órgão',
    '/admin/modelos': 'Modelos de Documento',
    '/admin/variaveis': 'Variáveis Globais',
    '/admin/livros': 'Livros de Numeração',
    '/revisao/fila': 'Fila de Revisão',
    '/revisao/minhas': 'Minhas Revisões',
}

// Ability vazia tipada para o estado transitório antes do login ser reconhecido
const EMPTY_ABILITY = createMongoAbility([]) as unknown as AppAbility

function SistemaLayout() {
    const router = useRouterState()
    const { usuario } = useAuthStore()

    const ability = useMemo(
        () => usuario ? buildAbility(usuario) : EMPTY_ABILITY,
        [usuario]
    )

    const title = ROUTE_TITLES[router.location.pathname] || "Doc's Cataguases"

    return (
        <AbilityContext.Provider value={ability}>
            <PageLayout title={title}>
                <Outlet />
            </PageLayout>
            <FloatingChat />
        </AbilityContext.Provider>
    )
}
