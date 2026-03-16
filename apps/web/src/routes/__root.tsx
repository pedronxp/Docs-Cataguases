import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from '@/components/ui/toaster'
import { NotFound } from '@/components/shared/NotFound'
import { RouterErrorComponent } from '@/components/shared/ErrorPage'
import { CookieBanner } from '@/components/shared/CookieBanner'
import type { useAuthStore } from '@/store/auth.store'

interface MyRouterContext {
    auth: ReturnType<typeof useAuthStore.getState>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    errorComponent: RouterErrorComponent,
    notFoundComponent: NotFound,
    beforeLoad: ({ context, location }) => {
        console.log('__root beforeLoad:', location.pathname, 'Auth:', context.auth.isAuthenticated)
        // Se não estiver autenticado e não estiver na rota de login ou registro, redireciona
        if (!context.auth.isAuthenticated &&
            !location.pathname.startsWith('/login') &&
            !location.pathname.startsWith('/registro') &&
            !location.pathname.startsWith('/validar') &&
            !location.pathname.startsWith('/sobre')) {
            throw redirect({
                to: '/login',
            })
        }

        // Se estiver autenticado
        if (context.auth.isAuthenticated) {
            const user = context.auth.usuario!

            // "Regra de Ouro" do Onboarding
            if (user.role === 'PENDENTE') {
                if (!user.secretariaId) {
                    if (!location.pathname.startsWith('/onboarding')) {
                        throw redirect({ to: '/onboarding' })
                    }
                } else {
                    if (!location.pathname.startsWith('/aguardando')) {
                        throw redirect({ to: '/aguardando' })
                    }
                }
            }

            // Impede acesso às telas de auth se já estiver logado
            if (location.pathname.startsWith('/login') || location.pathname.startsWith('/registro')) {
                throw redirect({
                    to: user.role === 'PENDENTE'
                        ? (user.secretariaId ? '/aguardando' : '/onboarding')
                        : '/dashboard',
                })
            }
        }
    },
    component: () => {
        return (
            <>
                <Outlet />
                <Toaster />
                <CookieBanner />
                {/* Devtools só no ambiente de desenvolvimento */}
                {import.meta.env.DEV && <TanStackRouterDevtools />}
            </>
        )
    },
})
