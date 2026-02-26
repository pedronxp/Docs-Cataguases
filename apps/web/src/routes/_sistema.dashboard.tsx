import { createFileRoute, Link } from '@tanstack/react-router'
import { useDashboard } from '@/hooks/use-dashboard'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'
import { Can } from '@casl/react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Clock, CheckCircle2, PenTool, LayoutDashboard, PlusCircle, Activity } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from "@/components/ui/scroll-area"

export const Route = createFileRoute('/_sistema/dashboard')({
    component: DashboardPage,
})

function DashboardPage() {
    const { stats, feed, loading } = useDashboard()
    const ability = useAbility(AbilityContext)

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <DataTableSkeleton rows={4} />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Visão Geral</h2>
                    <p className="text-sm text-slate-500 font-medium">Acompanhe as estatísticas e as últimas atividades de portarias.</p>
                </div>
                <Can I="criar" a="Portaria" ability={ability}>
                    <Button asChild className="bg-gov-blue hover:bg-gov-blue/90 h-11 px-6 shadow-md shadow-gov-blue/10">
                        <Link to="/administrativo/portarias/novo">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nova Portaria
                        </Link>
                    </Button>
                </Can>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Rascunhos
                        </CardTitle>
                        <PenTool className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.rascunhos}</div>
                        <p className="text-xs text-slate-500">
                            Aguardando envio para revisão
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Aguardando Revisão
                        </CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.aguardandoRevisao}</div>
                        <p className="text-xs text-slate-500">
                            Análise pendente do gestor
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-800">
                            Publicadas no Mês
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{stats.publicadasMes}</div>
                        <p className="text-xs text-green-600/80">
                            Documentos oficiais no acervo
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-gov-blue/20 bg-gov-blue/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gov-blue">
                            Assinaturas Pendentes
                        </CardTitle>
                        <FileText className="h-4 w-4 text-gov-blue" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gov-blue">{stats.assinaturasPendentes}</div>
                        <p className="text-xs text-gov-blue/70">
                            Aguardando assinatura oficial
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
                {/* Feed de Atividades */}
                <Card className="col-span-4 lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-slate-500" />
                            Feed de Atividades
                        </CardTitle>
                        <CardDescription>
                            Ações recentes em portarias do seu setor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {feed.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        <p className="text-sm text-slate-500 mb-2">Nenhuma atividade recente registrada no feed.</p>
                                    </div>
                                ) : (
                                    feed.map((atividade) => (
                                        <div key={atividade.id} className="flex items-start gap-4">
                                            <Avatar className="h-9 w-9 border border-slate-200">
                                                <AvatarFallback className="bg-gov-blue/10 text-gov-blue font-medium">
                                                    {atividade.autor?.name ? atividade.autor.name.charAt(0).toUpperCase() : 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <p className="text-sm leading-none">
                                                    <span className="font-medium">{atividade.autor?.name || 'Sistema'}</span>{' '}
                                                    <span className="text-slate-600">{atividade.mensagem}</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {atividade.createdAt
                                                        ? formatDistanceToNow(new Date(atividade.createdAt), { addSuffix: true, locale: ptBR })
                                                        : 'Data indisponível'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Acesso Rápido */}
                <Card className="col-span-3 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Acesso Rápido</CardTitle>
                        <CardDescription>
                            Comece por aqui ou retome um trabalho.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <Can I="ler" a="Portaria" ability={ability}>
                            <Link to="/administrativo/portarias" className="group flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-gov-blue/50 hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none text-slate-900 group-hover:text-gov-blue">Consultar Portarias</p>
                                        <p className="text-sm text-slate-500">Veja a lista de portarias ativas ou rascunhos.</p>
                                    </div>
                                    <FileText className="h-5 w-5 text-slate-400 group-hover:text-gov-blue" />
                                </div>
                            </Link>
                        </Can>

                        <Can I="ler" a="Modelo" ability={ability}>
                            <Link to="/admin/modelos" className="group flex flex-col justify-center rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-gov-blue/50 hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none text-slate-900 group-hover:text-gov-blue">Modelos de Documento</p>
                                        <p className="text-sm text-slate-500">Verifique os modelos usados nas portarias.</p>
                                    </div>
                                    <LayoutDashboard className="h-5 w-5 text-slate-400 group-hover:text-gov-blue" />
                                </div>
                            </Link>
                        </Can>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
