import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, FileText, Settings, Copy, Power } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_sistema/admin/modelos')({
    component: ModelosDocumentoPage,
})

function ModelosDocumentoPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Modelos de Documento</h2>
                    <p className="text-sm text-slate-500">Gerencie os templates DOCX base para a geração de portarias e documentos.</p>
                </div>
                <Button className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Modelo
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white rounded-t-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar modelos por nome ou descrição..."
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[300px]">Nome do Modelo</TableHead>
                                <TableHead>Secretaria</TableHead>
                                <TableHead>Variáveis Mapeadas</TableHead>
                                <TableHead className="w-[120px]">Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white">
                            {/* Mock Modelo 1 */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-blue-50 text-[#1351B4] rounded-md">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-800">Portaria de Nomeação (Padrão)</span>
                                            <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">Template oficial para nomeação de comissões e cargos.</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-normal">
                                        Todas (Global)
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-50 text-[#1351B4]">4 Variáveis</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">Ativo</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Duplicar">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Configurar">
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>

                            {/* Mock Modelo 2 */}
                            <TableRow className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1.5 bg-slate-100 text-slate-500 rounded-md">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">Portaria de Férias (Específica)</span>
                                            <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">Concessão de férias regulamentares ao servidor.</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-slate-600 bg-slate-50 border-slate-200 font-normal">
                                        Sec. de Administração
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-blue-50 text-[#1351B4]">2 Variáveis</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="text-slate-500 border-slate-300 bg-slate-50">Inativo</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-emerald-600" title="Ativar">
                                            <Power className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Configurar">
                                            <Settings className="h-4 w-4" />
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
