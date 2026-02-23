import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Book, Edit, History, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export const Route = createFileRoute('/_sistema/admin/livros')({
    component: LivrosNumeracaoPage,
})

function LivrosNumeracaoPage() {
    const { toast } = useToast()

    const handleAcao = (acao: string) => {
        toast({
            title: "Em Desenvolvimento",
            description: `A ação '${acao}' será totalmente implementada na próxima fase.`,
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Livros de Numeração</h2>
                    <p className="text-sm text-slate-500">Controle a geração contínua e isolada de números oficiais por Secretaria e Ano.</p>
                </div>
                <Button onClick={() => handleAcao('Novo Livro')} className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Livro
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white rounded-t-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar livro por secretaria..."
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                    <Button onClick={() => handleAcao('Filtros')} variant="outline" className="border-slate-300 text-slate-700">
                        <Settings2 className="mr-2 h-4 w-4" /> Filtros
                    </Button>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[300px]">Identificação do Livro</TableHead>
                                <TableHead>Ano Referência</TableHead>
                                <TableHead>Formato</TableHead>
                                <TableHead className="w-[150px]">Próximo Nº</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {/* Mock Livro 1 */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-blue-50 text-[#1351B4] rounded-md border border-blue-100">
                                            <Book className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-800">Livro Geral Administrativo</span>
                                            <span className="text-xs text-slate-500 mt-0.5">Prefeitura Municipal (Todos)</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 font-semibold">
                                        2026
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        {"{{numero}}/{{ano}}"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-lg font-bold text-[#1351B4]">
                                        1.043
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button onClick={() => handleAcao('Histórico de Emissões')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Histórico de Emissões">
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={() => handleAcao('Editar Máscara')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Editar Máscara">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>

                            {/* Mock Livro 2 */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-slate-50 text-slate-600 rounded-md border border-slate-200">
                                            <Book className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">Livro Setorial Pessoal</span>
                                            <span className="text-xs text-slate-500 mt-0.5">Secretaria de Educação</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 font-semibold">
                                        2026
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        SMA/{"{{numero}}-{{ano}}"}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-lg font-bold text-slate-800">
                                        014
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button onClick={() => handleAcao('Histórico de Emissões')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Histórico de Emissões">
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={() => handleAcao('Editar Máscara')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Editar Máscara">
                                            <Edit className="h-4 w-4" />
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
