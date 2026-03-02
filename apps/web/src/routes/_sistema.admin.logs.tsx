import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ScrollText, Variable, FileText, FileCheck, FileX, FilePen, UserCog, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import type { FeedAtividade } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/logs')({
    component: LogsAuditoriaPage,
})

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    PORTARIA_CRIADA:    { label: 'Portaria Criada',    icon: FileText,  color: 'bg-blue-50 text-blue-700 border-blue-200' },
    PORTARIA_SUBMETIDA: { label: 'Portaria Submetida', icon: FilePen,   color: 'bg-violet-50 text-violet-700 border-violet-200' },
    PORTARIA_APROVADA:  { label: 'Portaria Aprovada',  icon: FileCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PORTARIA_REJEITADA: { label: 'Portaria Rejeitada', icon: FileX,     color: 'bg-rose-50 text-rose-700 border-rose-200' },
    PORTARIA_PUBLICADA: { label: 'Portaria Publicada', icon: FileCheck, color: 'bg-green-50 text-green-700 border-green-200' },
    PORTARIA_FALHA:     { label: 'Falha',              icon: FileX,     color: 'bg-red-50 text-red-700 border-red-200' },
    MODELO_CRIADO:      { label: 'Modelo Criado',      icon: FileText,  color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    MODELO_ATUALIZADO:  { label: 'Modelo Atualizado',  icon: FilePen,   color: 'bg-amber-50 text-amber-700 border-amber-200' },
    VARIAVEL_CRIADA:    { label: 'Variável Criada',    icon: Variable,  color: 'bg-teal-50 text-teal-700 border-teal-200' },
    VARIAVEL_EDITADA:   { label: 'Variável Editada',   icon: Variable,  color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    VARIAVEL_EXCLUIDA:  { label: 'Variável Excluída',  icon: Variable,  color: 'bg-orange-50 text-orange-700 border-orange-200' },
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function EventoBadge({ tipo }: { tipo: string }) {
    const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, icon: UserCog, color: 'bg-slate-50 text-slate-700 border-slate-200' }
    const Icon = cfg.icon
    return (
        <Badge variant="outline" className={`gap-1 text-xs font-normal ${cfg.color}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </Badge>
    )
}

function LogsAuditoriaPage() {
    const { toast } = useToast()
    const [eventos, setEventos] = useState<FeedAtividade[]>([])
    const [loading, setLoading] = useState(true)
    const [tipoEvento, setTipoEvento] = useState('todos')
    const [dias, setDias] = useState('30')

    const loadEventos = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (tipoEvento !== 'todos') params.set('tipoEvento', tipoEvento)
            params.set('dias', dias)
            const res = await api.get(`/api/admin/feed?${params.toString()}`)
            setEventos(res.data.data ?? [])
        } catch (e: any) {
            toast({ title: 'Erro ao carregar logs', description: e.response?.data?.error, variant: 'destructive' })
        }
        setLoading(false)
    }, [tipoEvento, dias])

    useEffect(() => { loadEventos() }, [loadEventos])

    const exportarCSV = () => {
        const linhas = [
            ['Data', 'Tipo', 'Mensagem', 'Autor'].join(';'),
            ...eventos.map(e => [
                formatDate(e.createdAt),
                e.tipoEvento,
                `"${e.mensagem}"`,
                e.autor?.name ?? e.autorId,
            ].join(';'))
        ]
        const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs-auditoria-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <ScrollText className="h-6 w-6 text-[#1351B4]" />
                        Logs de Auditoria
                    </h2>
                    <p className="text-sm text-slate-500">Histórico completo de ações realizadas no sistema.</p>
                </div>
                <Button variant="outline" onClick={exportarCSV} className="shadow-sm text-slate-600 w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Filtros */}
            <Card className="shadow-sm border-slate-200">
                <div className="p-4 flex flex-col sm:flex-row gap-3 bg-white rounded-lg">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo de Ação</label>
                        <Select value={tipoEvento} onValueChange={setTipoEvento}>
                            <SelectTrigger className="bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os tipos</SelectItem>
                                <SelectItem value="PORTARIA_CRIADA">Portaria Criada</SelectItem>
                                <SelectItem value="PORTARIA_SUBMETIDA">Portaria Submetida</SelectItem>
                                <SelectItem value="PORTARIA_APROVADA">Portaria Aprovada</SelectItem>
                                <SelectItem value="PORTARIA_REJEITADA">Portaria Rejeitada</SelectItem>
                                <SelectItem value="PORTARIA_PUBLICADA">Portaria Publicada</SelectItem>
                                <SelectItem value="MODELO_CRIADO">Modelo Criado</SelectItem>
                                <SelectItem value="MODELO_ATUALIZADO">Modelo Atualizado</SelectItem>
                                <SelectItem value="VARIAVEL_CRIADA">Variável Criada</SelectItem>
                                <SelectItem value="VARIAVEL_EDITADA">Variável Editada</SelectItem>
                                <SelectItem value="VARIAVEL_EXCLUIDA">Variável Excluída</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-44">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Período</label>
                        <Select value={dias} onValueChange={setDias}>
                            <SelectTrigger className="bg-slate-50">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Últimos 7 dias</SelectItem>
                                <SelectItem value="30">Últimos 30 dias</SelectItem>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Lista de eventos */}
            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-0 divide-y divide-slate-100">
                    {loading ? (
                        <div className="py-12 text-center text-slate-500">Carregando logs...</div>
                    ) : eventos.length === 0 ? (
                        <div className="py-12 text-center text-slate-500">Nenhum evento encontrado para os filtros selecionados.</div>
                    ) : (
                        eventos.map(ev => (
                            <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                                <div className="mt-0.5 shrink-0">
                                    {(() => {
                                        const cfg = TIPO_CONFIG[ev.tipoEvento]
                                        const Icon = cfg?.icon ?? UserCog
                                        return <div className={`p-2 rounded-md ${cfg?.color ?? 'bg-slate-100 text-slate-600'} border`}><Icon className="h-4 w-4" /></div>
                                    })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                        <EventoBadge tipo={ev.tipoEvento} />
                                        <span className="text-xs text-slate-400">{formatDate(ev.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-800">{ev.mensagem}</p>
                                    {ev.autor && (
                                        <p className="text-xs text-slate-500 mt-0.5">por <span className="font-medium text-slate-700">{ev.autor.name}</span></p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-slate-400 text-right">Mostrando até 200 registros mais recentes.</p>
        </div>
    )
}
