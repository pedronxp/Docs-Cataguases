import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
    component: AuthLayout,
})

function AuthLayout() {
    return (
        <div className="flex h-screen bg-slate-50 items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center mb-8 gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg tracking-tighter">DC</span>
                    </div>
                    <span className="font-bold text-slate-800 text-2xl tracking-tight">Doc's Cataguases</span>
                </div>
                <Outlet />
            </div>
        </div>
    )
}
