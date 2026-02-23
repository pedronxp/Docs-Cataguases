import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

interface PageLayoutProps {
    title: string
    actions?: React.ReactNode
    children: React.ReactNode
}

export function PageLayout({ title, actions, children }: PageLayoutProps) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <AppHeader title={title} actions={actions} />
                <main className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50 relative z-0">
                    <div className="mx-auto max-w-[1400px] h-full space-y-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
