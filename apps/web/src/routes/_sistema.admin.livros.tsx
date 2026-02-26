import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Book, Edit, History } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

import { useState, useEffect } from 'react'
import { livroService } from '@/services/livro.service'
import type { LivroNumeracao } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/livros')({
    component: LivrosNumeracaoPage,
})

function LivrosNumeracaoPage() {
    const { toast } = useToast()
    const [livros, setLivros] = useState<LivroNumeracao[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLivros()
    }, [])

    async function loadLivros() {
        setLoading(true)
        const res = await livroService.listarLivros()
        if (res.success) {
            setLivros(res.data)
        } else {
            toast({ title: 'Erro ao carregar livros', description: res.error, variant: 'destructive' })
        }
        setLoading(false)
    }

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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Carregando livros...</TableCell>
                                </TableRow>
                            ) : livros.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum livro cadastrado.</TableCell>
                                </TableRow>
                            ) : (
                                livros.map(livro => (
                                    <TableRow key={livro.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 p-1.5 bg-blue-50 text-[#1351B4] rounded-md border border-blue-100">
                                                    <Book className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">Livro de {livro.secretariaId}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5">{livro.setorId ? `Setor: ${livro.setorId}` : 'Geral (Órgão)'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-200 font-semibold">
                                                {livro.ano}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                {livro.formato}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-lg font-bold text-[#1351B4]">
                                                {livro.proximoNumero}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button onClick={() => handleAcao('Histórico')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Histórico">
                                                    <History className="h-4 w-4" />
                                                </Button>
                                                <Button onClick={() => handleAcao('Editar')} variant="ghost" size="icon" className="text-slate-500 hover:text-[#1351B4]" title="Editar">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
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
