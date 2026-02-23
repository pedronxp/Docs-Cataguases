import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, FileText, Download } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Portaria } from '@/types/domain'

interface Props {
    portarias: Portaria[]
    mostrarSecretaria: boolean
}

export function AcervoTable({ portarias, mostrarSecretaria }: Props) {
    if (portarias.length === 0) {
        return (
            <div className="border border-slate-200 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
                <FileText className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">Nenhum documento encontrado</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Não encontramos portarias publicadas com estes filtros. Tente alterar os termos de busca ou mudar a secretaria selecionada.
                </p>
            </div>
        )
    }

    return (
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px]">Documento</TableHead>
                        <TableHead>Publicação</TableHead>
                        {mostrarSecretaria && <TableHead>Origem</TableHead>}
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {portarias.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                            <TableCell>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 text-[#1351B4] rounded-md border border-blue-100/50 mt-0.5 shadow-sm">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-slate-800 text-sm">
                                            {item.numeroOficial ? `Portaria Nº ${item.numeroOficial}` : item.titulo}
                                        </span>
                                        <span className="text-xs text-slate-500 truncate max-w-[240px]" title={item.titulo}>{item.titulo}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                    <span className="text-sm text-slate-700 font-medium">
                                        {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '-'}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Publicada
                                    </Badge>
                                </div>
                            </TableCell>
                            {mostrarSecretaria && (
                                <TableCell className="text-sm text-slate-600">
                                    {item.secretaria?.sigla || 'PM'}
                                </TableCell>
                            )}
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-[#1351B4] hover:bg-blue-50" title="Baixar PDF">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 text-xs font-semibold text-[#1351B4] border-blue-200 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-800" asChild>
                                        <Link to="/administrativo/portarias/$id" params={{ id: item.id }}>
                                            <Eye className="h-3.5 w-3.5 mr-1.5" /> Detalhes
                                        </Link>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
