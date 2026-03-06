import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Loader2, FileText, FileJson, FileSpreadsheet, BarChart2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

type Formato = 'csv' | 'json' | 'pdf' | 'pdf-analitico'
type Periodo = 'hoje' | 'semana' | 'mes-atual' | 'ano-atual'

const periodos: { value: Periodo; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: 'semana', label: 'Últimos 7 dias' },
    { value: 'mes-atual', label: 'Mês atual' },
    { value: 'ano-atual', label: 'Ano atual' },
]

const formatos: {
    value: Formato
    label: string
    icon: React.ElementType
    description: string
    ext: string
}[] = [
        { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Planilha Excel', ext: 'csv' },
        { value: 'pdf', label: 'PDF Simples', icon: FileText, description: 'Lista formatada', ext: 'pdf' },
        { value: 'pdf-analitico', label: 'PDF Analítico', icon: BarChart2, description: 'Com gráficos e métricas', ext: 'pdf' },
        { value: 'json', label: 'JSON', icon: FileJson, description: 'Dados estruturados', ext: 'json' },
    ]

export function ExportButton() {
    const { toast } = useToast()
    const [exporting, setExporting] = useState<string | null>(null)

    const handleExport = async (formato: Formato, periodo: Periodo) => {
        const key = `${formato}-${periodo}`
        setExporting(key)

        try {
            const params = new URLSearchParams({ formato, periodo })
            const res = await api.get(`/api/jornal/export?${params}`, { responseType: 'blob' })

            const formatoInfo = formatos.find(f => f.value === formato)
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.download = `relatorio-jornal-${periodo}-${new Date().toISOString().split('T')[0]}.${formatoInfo?.ext ?? formato}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            toast({
                title: 'Relatório exportado',
                description: `${formatoInfo?.label} gerado com sucesso.`,
            })
        } catch (error: any) {
            toast({
                title: 'Erro ao exportar',
                description: 'Não foi possível gerar o relatório. Tente novamente.',
                variant: 'destructive',
            })
            console.error('Erro ao exportar:', error)
        } finally {
            setExporting(null)
        }
    }

    const isExporting = !!exporting

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-slate-600" disabled={isExporting}>
                    {isExporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Download className="h-3.5 w-3.5" />
                    )}
                    {isExporting ? 'Exportando...' : 'Exportar'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                {formatos.map((fmt) => (
                    <DropdownMenuGroup key={fmt.value}>
                        <DropdownMenuLabel className="text-xs text-slate-400 font-normal uppercase tracking-wide px-2 py-1">
                            <fmt.icon className="h-3.5 w-3.5 inline mr-1.5" />
                            {fmt.label} — {fmt.description}
                        </DropdownMenuLabel>
                        {periodos.map((per) => {
                            const key = `${fmt.value}-${per.value}`
                            const loading = exporting === key
                            return (
                                <DropdownMenuItem
                                    key={key}
                                    onClick={() => handleExport(fmt.value, per.value)}
                                    disabled={isExporting}
                                    className="pl-5 text-sm"
                                >
                                    {loading && <Loader2 className="h-3 w-3 animate-spin mr-2 shrink-0" />}
                                    {per.label}
                                </DropdownMenuItem>
                            )
                        })}
                        <DropdownMenuSeparator />
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
