import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { variavelService } from '@/services/variavel.service'
import type { VariavelSistema } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

function VariaveisGlobaisPage() {
    const { toast } = useToast()
    const [variaveis, setVariaveis] = useState<VariavelSistema[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadVariaveis()
    }, [])

    async function loadVariaveis() {
        setLoading(true)
        const res = await variavelService.listarVariaveis()
        if (res.success) {
            setVariaveis(res.data)
        } else {
            toast({ title: 'Erro ao carregar variáveis', description: res.error, variant: 'destructive' })
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Variáveis Globais</h2>
                    <p className="text-sm text-slate-500">Administre tags de substituição que podem ser usadas em qualquer modelo DOCX.</p>
                </div>
                <Button className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Variável
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white rounded-t-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar variável por chave ou descrição..."
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[200px]">Chave (Tag)</TableHead>
                                <TableHead>Valor Resolvido</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="w-[120px]">Tipo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando variáveis...</TableCell>
                                </TableRow>
                            ) : variaveis.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma variável cadastrada.</TableCell>
                                </TableRow>
                            ) : (
                                variaveis.map(v => (
                                    <TableRow key={v.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Variable className={v.resolvidaAutomaticamente ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-[#1351B4]"} />
                                                <span className="font-mono text-sm font-semibold text-slate-800">{`{{${v.chave}}}`}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={v.resolvidaAutomaticamente ? "text-sm font-mono text-slate-500 italic" : "text-sm text-slate-800 font-medium"}>
                                                {v.resolvidaAutomaticamente ? 'Autogerado via Sistema' : v.valor}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-slate-600">{v.descricao}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={v.resolvidaAutomaticamente ? "outline" : "secondary"} className={v.resolvidaAutomaticamente ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "bg-blue-50 text-[#1351B4]"}>
                                                {v.resolvidaAutomaticamente ? 'Dinamica' : 'Estática'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Editar">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {!v.resolvidaAutomaticamente && (
                                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-600" title="Remover">
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
        </div>
    )
}
