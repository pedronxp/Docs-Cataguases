import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ScrollText, Variable, FileText, FileCheck, FileX, FilePen, UserCog, Download, PenLine, Trash2, Bot, ShieldCheck, RefreshCw, Loader2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import api from '@/lib/api'
import type { FeedAtividade } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/logs')({
    component: LogsAuditoriaPage,
})

const TIPO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; govColor: string }> = {
    // Portarias
    PORTARIA_CRIADA:           { label: 'Portaria Criada',        icon: FileText,    color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    PORTARIA_SUBMETIDA:        { label: 'Portaria Submetida',     icon: FilePen,     color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]', govColor: 'bg-[#f3f0ff] text-[#6730a3]' },
    PORTARIA_APROVADA:         { label: 'Portaria Aprovada',      icon: FileCheck,   color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    PORTARIA_REJEITADA:        { label: 'Portaria Rejeitada',     icon: FileX,       color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]', govColor: 'bg-[#ffefec] text-[#e52207]' },
    PORTARIA_PUBLICADA:        { label: 'Portaria Publicada',     icon: FileCheck,   color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    PORTARIA_FALHA:            { label: 'Falha de Processamento', icon: FileX,       color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]', govColor: 'bg-[#ffefec] text-[#e52207]' },
    PORTARIA_RETRY:            { label: 'Reprocessamento',        icon: RefreshCw,   color: 'bg-[#fff5eb] text-[#c55a00] border-[#c55a00]', govColor: 'bg-[#fff5eb] text-[#c55a00]' },
    // Revisão
    REVISAO_ATRIBUIDA:         { label: 'Revisão Atribuída',      icon: UserCog,     color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    DOCUMENTO_DEVOLVIDO_AUTOR: { label: 'Devolvido ao Autor',     icon: FileX,       color: 'bg-[#fef6e0] text-[#a06b00] border-[#a06b00]', govColor: 'bg-[#fef6e0] text-[#a06b00]' },
    MUDANCA_STATUS_SOLICITAR_REVISAO: { label: 'Revisão Solicitada',  icon: UserCog,   color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    MUDANCA_STATUS_ASSUMIR_REVISAO:   { label: 'Revisão Assumida',    icon: UserCog,   color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    MUDANCA_STATUS_APROVAR_REVISAO:   { label: 'Revisão Aprovada',    icon: FileCheck,  color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    MUDANCA_STATUS_REJEITAR_REVISAO:  { label: 'Revisão Rejeitada',   icon: FileX,      color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]', govColor: 'bg-[#ffefec] text-[#e52207]' },
    MUDANCA_STATUS_TRANSFERIR_REVISAO:{ label: 'Revisão Transferida', icon: UserCog,    color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]', govColor: 'bg-[#f3f0ff] text-[#6730a3]' },
    // Assinaturas
    ASSINATURA_DIGITAL:        { label: 'Assinatura Digital',     icon: ShieldCheck, color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    ASSINATURA_MANUAL:         { label: 'Assinatura Manual',      icon: PenLine,     color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    ASSINATURA_DISPENSADA:     { label: 'Assinatura Dispensada',  icon: ShieldCheck, color: 'bg-[#f8f9fa] text-[#555555] border-[#cccccc]', govColor: 'bg-[#f8f9fa] text-[#555555]' },
    ASSINATURA_LOTE:           { label: 'Assinatura em Lote',     icon: ShieldCheck, color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    // Exclusão
    EXCLUSAO:                  { label: 'Exclusão',               icon: Trash2,      color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]', govColor: 'bg-[#ffefec] text-[#e52207]' },
    EXCLUSAO_LOTE:             { label: 'Exclusão em Lote',       icon: Trash2,      color: 'bg-[#ffefec] text-[#e52207] border-[#e52207]', govColor: 'bg-[#ffefec] text-[#e52207]' },
    // Modelos e variáveis
    MODELO_CRIADO:             { label: 'Modelo Criado',          icon: FileText,    color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]', govColor: 'bg-[#f3f0ff] text-[#6730a3]' },
    MODELO_ATUALIZADO:         { label: 'Modelo Atualizado',      icon: FilePen,     color: 'bg-[#fef6e0] text-[#a06b00] border-[#a06b00]', govColor: 'bg-[#fef6e0] text-[#a06b00]' },
    VARIAVEL_CRIADA:           { label: 'Variável Criada',        icon: Variable,    color: 'bg-[#e6f4eb] text-[#008833] border-[#008833]', govColor: 'bg-[#e6f4eb] text-[#008833]' },
    VARIAVEL_EDITADA:          { label: 'Variável Editada',       icon: Variable,    color: 'bg-[#edf5ff] text-[#1351b4] border-[#1351b4]', govColor: 'bg-[#edf5ff] text-[#1351b4]' },
    VARIAVEL_EXCLUIDA:         { label: 'Variável Excluída',      icon: Variable,    color: 'bg-[#fff5eb] text-[#c55a00] border-[#c55a00]', govColor: 'bg-[#fff5eb] text-[#c55a00]' },
    // Assistente IA
    ACAO_ASSISTENTE_IA:        { label: 'Ação do Assistente IA',  icon: Bot,         color: 'bg-[#f3f0ff] text-[#6730a3] border-[#6730a3]', govColor: 'bg-[#f3f0ff] text-[#6730a3]' },
}

const GRUPOS_FILTRO = [
    { label: 'Portarias', tipos: ['PORTARIA_CRIADA', 'PORTARIA_SUBMETIDA', 'PORTARIA_APROVADA', 'PORTARIA_REJEITADA', 'PORTARIA_PUBLICADA', 'PORTARIA_FALHA', 'PORTARIA_RETRY'] },
    { label: 'Revisão', tipos: ['REVISAO_ATRIBUIDA', 'DOCUMENTO_DEVOLVIDO_AUTOR', 'MUDANCA_STATUS_SOLICITAR_REVISAO', 'MUDANCA_STATUS_ASSUMIR_REVISAO', 'MUDANCA_STATUS_APROVAR_REVISAO', 'MUDANCA_STATUS_REJEITAR_REVISAO', 'MUDANCA_STATUS_TRANSFERIR_REVISAO'] },
    { label: 'Assinaturas', tipos: ['ASSINATURA_DIGITAL', 'ASSINATURA_MANUAL', 'ASSINATURA_DISPENSADA', 'ASSINATURA_LOTE'] },
    { label: 'Exclusão', tipos: ['EXCLUSAO', 'EXCLUSAO_LOTE'] },
    { label: 'Modelos & Variáveis', tipos: ['MODELO_CRIADO', 'MODELO_ATUALIZADO', 'VARIAVEL_CRIADA', 'VARIAVEL_EDITADA', 'VARIAVEL_EXCLUIDA'] },
    { label: 'Assistente IA', tipos: ['ACAO_ASSISTENTE_IA'] },
]

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function EventoBadge({ tipo }: { tipo: string }) {
    const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, icon: UserCog, color: 'bg-[#f8f9fa] text-[#555555] border-[#cccccc]' }
    const Icon = cfg.icon
    return (
        <Badge variant="outline" className={`gap-1.5 text-xs font-bold px-2 py-0.5 rounded ${cfg.color}`}>
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

    // Stats counters
    const stats = useMemo(() => {
        const portarias = eventos.filter(e => e.tipoEvento.startsWith('PORTARIA_')).length
        const assinaturas = eventos.filter(e => e.tipoEvento.startsWith('ASSINATURA_')).length
        const exclusoes = eventos.filter(e => e.tipoEvento.startsWith('EXCLUSAO')).length
        return { total: eventos.length, portarias, assinaturas, exclusoes }
    }, [eventos])

    const exportarCSV = () => {
        const linhas = [
            ['Data', 'Tipo', 'Mensagem', 'Autor'].join(';'),
            ...eventos.map(e => [
                formatDate(e.createdAt),
                e.tipoEvento,
                `"${e.mensagem.replace(/"/g, '""')}"`,
                e.autor?.name ?? e.autorId,
            ].join(';'))
        ]
        const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `logs-auditoria-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 bg-[#f8f9fa] min-h-[calc(100vh-4rem)] p-6 -m-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Logs de Auditoria</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        Histórico completo de ações realizadas no sistema.
                    </p>
                </div>
                <Button variant="outline" onClick={exportarCSV} disabled={loading || eventos.length === 0}
                    className="border-[#cccccc] text-[#555555] hover:bg-[#f0f4f8] rounded font-bold shadow-none w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#edf5ff] flex items-center justify-center shrink-0">
                        <ScrollText className="h-6 w-6 text-[#1351b4]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{stats.total}</p>
                        <p className="text-sm text-[#555555] font-medium">Total de Eventos</p>
                    </div>
                </div>
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#edf5ff] flex items-center justify-center shrink-0">
                        <FileText className="h-6 w-6 text-[#1351b4]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{stats.portarias}</p>
                        <p className="text-sm text-[#555555] font-medium">Portarias</p>
                    </div>
                </div>
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#e6f4eb] flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-6 w-6 text-[#008833]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{stats.assinaturas}</p>
                        <p className="text-sm text-[#555555] font-medium">Assinaturas</p>
                    </div>
                </div>
                <div className="bg-white border border-[#e6e6e6] rounded p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-[#ffefec] flex items-center justify-center shrink-0">
                        <Trash2 className="h-6 w-6 text-[#e52207]" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-[#333333]">{stats.exclusoes}</p>
                        <p className="text-sm text-[#555555] font-medium">Exclusões</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                <div className="p-5 flex flex-col sm:flex-row gap-4 bg-[#f8f9fa] border-b border-[#e6e6e6]">
                    <div className="flex-1">
                        <Label className="font-bold text-[#333333] text-xs mb-1.5 block">Tipo de Ação</Label>
                        <Select value={tipoEvento} onValueChange={setTipoEvento}>
                            <SelectTrigger className="bg-white border-[#cccccc] h-11 rounded focus-visible:ring-[#1351b4]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os tipos</SelectItem>
                                {GRUPOS_FILTRO.map(grupo => (
                                    <div key={grupo.label}>
                                        <div className="px-2 py-1.5 text-[10px] font-bold text-[#555555] uppercase tracking-wider mt-1 select-none">
                                            {grupo.label}
                                        </div>
                                        {grupo.tipos.map(tipo => (
                                            <SelectItem key={tipo} value={tipo} className="pl-4">
                                                {TIPO_CONFIG[tipo]?.label ?? tipo}
                                            </SelectItem>
                                        ))}
                                    </div>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-48">
                        <Label className="font-bold text-[#333333] text-xs mb-1.5 block">Período</Label>
                        <Select value={dias} onValueChange={setDias}>
                            <SelectTrigger className="bg-white border-[#cccccc] h-11 rounded focus-visible:ring-[#1351b4]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Últimos 7 dias</SelectItem>
                                <SelectItem value="30">Últimos 30 dias</SelectItem>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                                <SelectItem value="365">Último ano</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button variant="outline" onClick={loadEventos} disabled={loading}
                            className="border-[#cccccc] text-[#555555] hover:bg-[#f0f4f8] rounded font-bold h-11 px-4">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Lista de eventos */}
            <Card className="shadow-none border border-[#e6e6e6] bg-white rounded-none">
                <CardContent className="p-0 divide-y divide-[#e6e6e6]">
                    {loading ? (
                        <div className="py-16 text-center text-[#555555] font-medium text-lg">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-[#1351b4]" />
                                Carregando logs...
                            </div>
                        </div>
                    ) : eventos.length === 0 ? (
                        <div className="py-16 text-center text-[#555555]">
                            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Nenhum evento encontrado para os filtros selecionados.</p>
                            <p className="text-xs mt-1 text-[#555555]">Tente alterar o tipo de ação ou o período.</p>
                        </div>
                    ) : (
                        eventos.map(ev => {
                            const cfg = TIPO_CONFIG[ev.tipoEvento]
                            const Icon = cfg?.icon ?? UserCog
                            const iconStyle = cfg?.govColor ?? 'bg-[#f8f9fa] text-[#555555]'
                            return (
                                <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#f0f4f8] transition-colors">
                                    <div className="mt-0.5 shrink-0">
                                        <div className={`w-9 h-9 rounded flex items-center justify-center ${iconStyle}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <EventoBadge tipo={ev.tipoEvento} />
                                            <span className="text-xs text-[#555555] font-medium">{formatDate(ev.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-[#333333] font-medium">{ev.mensagem}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                                            {ev.autor && (
                                                <p className="text-xs text-[#555555]">
                                                    por <span className="font-bold text-[#333333]">{ev.autor.name}</span>
                                                </p>
                                            )}
                                            {ev.portaria && (
                                                <p className="text-xs text-[#555555]">
                                                    Portaria: <span className="font-bold text-[#333333]">{ev.portaria.numeroOficial ?? ev.portaria.titulo}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-[#555555] text-right font-medium">
                Mostrando até 200 registros mais recentes · ordenados do mais novo ao mais antigo.
            </p>
        </div>
    )
}
