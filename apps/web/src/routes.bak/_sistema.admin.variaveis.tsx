import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

function VariaveisGlobaisPage() {
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
                            {/* Mock Variavel Dinamica */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Variable className="h-4 w-4 text-emerald-600" />
                                        <span className="font-mono text-sm font-semibold text-slate-800">{"{{NUMERO_PORTARIA}}"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-mono text-slate-500 italic">Autogerado via Livro</span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-slate-600">Retorna o número oficial da portaria no padrão XXX/ANO.</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Dinâmica</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="text-slate-400" disabled title="Sistema">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>

                            {/* Mock Variavel Estática */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Variable className="h-4 w-4 text-[#1351B4]" />
                                        <span className="font-mono text-sm font-semibold text-slate-800">{"{{NOME_PREFEITO}}"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-slate-800 font-medium">José da Silva Pereira</span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-slate-600">Nome completo do atual gestor do executivo.</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-blue-50 text-[#1351B4]">Estática</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Editar">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-600" title="Remover">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
