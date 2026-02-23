import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useVariaveis } from '@/hooks/use-variaveis'
import { useState } from 'react'
import { VariableGlobalDrawer } from '@/components/admin/variable-global-drawer'
import { useToast } from '@/hooks/use-toast'
import type { VariavelSistema } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

function VariaveisGlobaisPage() {
    const { variaveis, loading, refresh, salvar, excluir } = useVariaveis()
    const { toast } = useToast()
    const [busca, setBusca] = useState('')
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [editingVar, setEditingVar] = useState<VariavelSistema | null>(null)

    const handleNew = () => {
        setEditingVar(null)
        setIsDrawerOpen(true)
    }

    const handleEdit = (v: VariavelSistema) => {
        setEditingVar(v)
        setIsDrawerOpen(true)
    }

    const handleSave = async (v: any) => {
        const res = await salvar(v)
        if (res.success) {
            toast({ title: 'Variável salva!', description: 'A tag agora está disponível para uso nos modelos.' })
            refresh()
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta variável?')) {
            const res = await excluir(id)
            if (res.success) {
                toast({ title: 'Variável excluída', variant: 'destructive' })
                refresh()
            }
        }
    }

    const filtered = variaveis.filter(v =>
        v.chave.toLowerCase().includes(busca.toLowerCase()) ||
        v.descricao.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">Variáveis Globais</h2>
                    <p className="text-sm text-slate-500 font-medium">Administre tags de substituição que podem ser usadas em qualquer modelo DOCX.</p>
                </div>
                <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto shadow-md font-bold h-11 px-6">
                    <Plus className="mr-2 h-5 w-5" />
                    Nova Variável
                </Button>
            </div>

            <Card className="shadow-md border-slate-200/60 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar variável por chave ou descrição..."
                            className="pl-10 bg-slate-50 border-slate-200 h-11"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                <TableHead className="w-[280px] px-6 font-bold text-slate-700">Chave (Tag)</TableHead>
                                <TableHead className="font-bold text-slate-700">Valor Resolvido</TableHead>
                                <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                                <TableHead className="w-[120px] font-bold text-slate-700">Tipo</TableHead>
                                <TableHead className="text-right px-6 font-bold text-slate-700">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center">
                                        <Loader2 className="animate-spin inline mr-2 text-primary" />
                                        <span className="text-slate-500 font-medium tracking-tight">Carregando tags...</span>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-slate-400 font-medium italic">
                                        Nenhuma variável localizada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(v => (
                                    <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-md ${v.resolvidaAutomaticamente ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-primary'}`}>
                                                    <Variable size={14} />
                                                </div>
                                                <span className="font-mono text-sm font-bold text-slate-900 leading-none">{"{{"}{v.chave}{"}}"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-sm font-medium ${v.resolvidaAutomaticamente ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                                                {v.valor}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-500 font-medium">{v.descricao}</span>
                                        </TableCell>
                                        <TableCell>
                                            {v.resolvidaAutomaticamente ? (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 font-bold uppercase text-[10px]">Dinâmica</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50 font-bold uppercase text-[10px]">Estática</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-400 hover:text-primary"
                                                    onClick={() => handleEdit(v)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {!v.resolvidaAutomaticamente && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                        onClick={() => handleDelete(v.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <VariableGlobalDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                variable={editingVar}
                onSave={handleSave}
            />
        </div>
    )
}
