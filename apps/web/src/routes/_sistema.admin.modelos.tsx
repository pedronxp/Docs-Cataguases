import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileText, Settings, Copy, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useModelos } from '@/hooks/use-modelos'
import { useState } from 'react'
import { ModeloEditorDrawer } from '@/components/admin/modelo-editor-drawer'
import { modeloService } from '@/services/modelo.service'
import type { ModeloDocumento } from '@/types/domain'
import { DataTableSkeleton } from '@/components/shared/DataTableSkeleton'

export const Route = createFileRoute('/_sistema/admin/modelos')({
    component: ModelosDocumentoPage,
})

function ModelosDocumentoPage() {
    const { toast } = useToast()
    const { modelos, loading, refresh } = useModelos()
    const [busca, setBusca] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [selectedModelo, setSelectedModelo] = useState<ModeloDocumento | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const handleOpenEditor = (modelo: ModeloDocumento | null = null) => {
        setSelectedModelo(modelo)
        setIsDrawerOpen(true)
    }

    const handleSave = async (dados: Omit<ModeloDocumento, 'id'>) => {
        if (selectedModelo) {
            const res = await modeloService.atualizarModelo(selectedModelo.id, dados)
            if (res.success) {
                toast({ title: 'Modelo atualizado', description: 'As alterações foram salvas com sucesso.' })
                refresh()
            }
        } else {
            const res = await modeloService.criarModelo(dados)
            if (res.success) {
                toast({ title: 'Modelo criado', description: 'O novo modelo já está disponível para uso.' })
                refresh()
            }
        }
    }

    const handleDuplicar = async (modelo: ModeloDocumento) => {
        const { id, ...resto } = modelo
        const res = await modeloService.criarModelo({
            ...resto,
            nome: `${resto.nome} (Cópia)`,
        })
        if (res.success) {
            toast({ title: 'Modelo duplicado', description: 'Uma cópia do modelo foi criada.' })
            refresh()
        }
    }

    const handleExcluir = async (id: string) => {
        setIsDeleting(id)
        const res = await modeloService.excluirModelo(id)
        if (res.success) {
            toast({ title: 'Modelo excluído', description: 'O modelo foi removido do sistema.' })
            refresh()
        }
        setIsDeleting(null)
    }

    const modelosFiltrados = modelos.filter(m =>
        m.nome.toLowerCase().includes(busca.toLowerCase()) ||
        m.descricao.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Modelos de Documento</h2>
                    <p className="text-sm text-slate-500">Gerencie os templates DOCX base para a geração de portarias e documentos.</p>
                </div>
                <Button onClick={() => handleOpenEditor()} className="bg-primary hover:bg-primary/90 text-white font-bold w-full sm:w-auto shadow-md shadow-primary/10 h-11 px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Modelo
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelos por nome ou descrição..."
                            className="pl-10 bg-white border-slate-200"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                <CardContent className="p-0 bg-white min-h-[400px]">
                    {loading ? (
                        <DataTableSkeleton rows={5} columns={5} />
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-[300px] font-bold text-slate-700">Nome do Modelo</TableHead>
                                    <TableHead className="font-bold text-slate-700">Secretaria</TableHead>
                                    <TableHead className="font-bold text-slate-700">Variáveis</TableHead>
                                    <TableHead className="w-[120px] font-bold text-slate-700">Status</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modelosFiltrados.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <FileText size={48} className="opacity-10" />
                                                <p className="font-medium text-sm">Nenhum modelo localizado</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modelosFiltrados.map((m) => (
                                        <TableRow key={m.id} className="hover:bg-slate-50/80 transition-colors">
                                            <TableCell>
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 p-2 bg-primary/10 text-primary rounded-lg">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 leading-none">{m.nome}</span>
                                                        <span className="text-xs text-slate-500 line-clamp-1 mt-1.5 font-medium">{m.descricao}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-bold text-[10px] uppercase tracking-wider">
                                                    {m.secretariaId || 'Global'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-black">
                                                        {m.variaveis.length} Variáveis
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {m.ativo ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold hover:bg-emerald-100 py-0.5">Ativo</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-400 border-slate-200 bg-slate-50 font-bold py-0.5">Inativo</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button onClick={() => handleDuplicar(m)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary transition-colors" title="Duplicar">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button onClick={() => handleOpenEditor(m)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary transition-colors" title="Configurar">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleExcluir(m.id)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Excluir"
                                                        disabled={isDeleting === m.id}
                                                    >
                                                        {isDeleting === m.id ? <Loader2 className="h-4 w-4 animate-spin text-slate-300" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ModeloEditorDrawer
                modelo={selectedModelo}
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onSave={handleSave}
            />
        </div>
    )
}
