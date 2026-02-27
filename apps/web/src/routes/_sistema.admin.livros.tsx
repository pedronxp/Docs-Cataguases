import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, Book, Edit, History, RefreshCcw,
    CheckCircle2, FileText, User as UserIcon, Calendar, Network, ShieldCheck
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import { useState, useEffect } from 'react'
import { livroService } from '@/services/livro.service'
import type { LivrosNumeracao, LivroLog } from '@/types/domain'

export const Route = createFileRoute('/_sistema/admin/livros')({
    component: LivrosNumeracaoPage,
})

function LivrosNumeracaoPage() {
    const { toast } = useToast()
    const [livros, setLivros] = useState<LivrosNumeracao[]>([])
    const [loading, setLoading] = useState(true)
    const [editLivro, setEditLivro] = useState<LivrosNumeracao | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [viewLogs, setViewLogs] = useState<LivrosNumeracao | null>(null)

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

    const handleUpdate = async (payload: any) => {
        const res = await livroService.atualizarLivro(payload)
        if (res.success) {
            toast({ title: '✅ Sucesso', description: 'Livro atualizado com sucesso.' })
            setIsEditOpen(false)
            loadLivros()
        } else {
            toast({ title: 'Erro', description: res.error, variant: 'destructive' })
        }
    }

    const handleReset = (livro: LivrosNumeracao) => {
        if (confirm(`Deseja realmente resetar o contador do livro "${livro.nome}" para o número inicial (${livro.numero_inicial})?`)) {
            handleUpdate({ id: livro.id, proximo_numero: livro.numero_inicial })
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">📊 LIVROS NUMERAÇÃO CATAGUASES</h2>
                    <p className="text-sm font-medium text-slate-500">Gestão centralizada e auditada de numeração oficial de documentos.</p>
                </div>
                <Button className="bg-[#1351B4] hover:bg-[#0f4496] text-white font-bold h-11 px-6 shadow-lg shadow-blue-500/20">
                    <Plus className="mr-2 h-5 w-5" /> Novo Livro
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2].map(i => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-xl" />)}
                </div>
            ) : livros.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <Book size={48} className="mb-4 opacity-20" />
                        <p className="font-semibold text-lg">Nenhum livro cadastrado</p>
                        <p className="text-sm">Clique em "Novo Livro" para começar.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {livros.map(livro => (
                        <Card key={livro.id} className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white group">
                            <div className="bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-widest uppercase">Livro Ativo: {livro.nome}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">
                                                PRÓXIMA: {livro.formato_base.replace('{N}', String(livro.proximo_numero).padStart(4, '0'))}
                                            </Badge>
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{livro.ativo ? 'EM OPERAÇÃO' : 'INATIVO'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => { setEditLivro(livro); setIsEditOpen(true); }}
                                        variant="outline"
                                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white font-bold h-10 px-4"
                                    >
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Button>
                                    <Button
                                        onClick={() => setViewLogs(livro)}
                                        variant="outline"
                                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white font-bold h-10 px-4"
                                    >
                                        <History className="mr-2 h-4 w-4" /> Logs Completos
                                    </Button>
                                    <Button
                                        onClick={() => handleReset(livro)}
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-10 px-4"
                                    >
                                        <RefreshCcw className="mr-2 h-4 w-4" /> Reset Contador
                                    </Button>
                                </div>
                            </div>

                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                    <div className="p-6 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formato Base</Label>
                                        <div className="font-mono text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                            {livro.formato_base}
                                        </div>
                                        <p className="text-[10px] text-slate-400 italic">Ex: {livro.formato_base.replace('{N}', '0001')}</p>
                                    </div>
                                    <div className="p-6 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inicia Em</Label>
                                        <div className="text-2xl font-black text-slate-800">{livro.numero_inicial}</div>
                                        <p className="text-[10px] text-slate-400">Configuração inicial</p>
                                    </div>
                                    <div className="p-6 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Próximo Número</Label>
                                        <div className="text-2xl font-black text-blue-600">{livro.proximo_numero}</div>
                                        <p className="text-[10px] text-blue-400 font-bold underline">Será usado no próximo doc</p>
                                    </div>
                                    <div className="p-6 space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Alocado</Label>
                                        <div className="text-2xl font-black text-slate-800">{(livro.proximo_numero - livro.numero_inicial).toLocaleString('pt-BR')}</div>
                                        <p className="text-[10px] text-slate-400">Documentos numerados</p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                                        <CheckCircle2 size={14} className="text-emerald-500" /> ÚLTIMOS LOGS DE AUDITORIA
                                    </h4>
                                    <div className="space-y-2">
                                        {livro.logs.length === 0 ? (
                                            <p className="text-sm text-slate-400 italic">Nenhuma numeração realizada ainda.</p>
                                        ) : (
                                            livro.logs.slice(-3).reverse().map((log, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="font-mono text-xs font-black px-2 py-1 bg-slate-100 text-slate-600 rounded">
                                                            #{log.numero}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <FileText size={12} className="text-slate-400" />
                                                                <span className="text-xs font-bold text-slate-700">Portaria #{log.portaria_id.slice(-6).toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                    <UserIcon size={10} /> {log.aprovador.slice(0, 8)}...
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                    <Calendar size={10} /> {new Date(log.data).toLocaleString('pt-BR')}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                    <Network size={10} /> IP: {log.ip}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100">
                                                        PROCESSADO
                                                    </Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Dialog de Edição */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white">
                    <DialogHeader>
                        <DialogTitle className="font-black flex items-center gap-2">
                            <Edit className="text-primary h-5 w-5" /> EDITAR LIVRO
                        </DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Ajuste as configurações globais de numeração.
                        </DialogDescription>
                    </DialogHeader>
                    {editLivro && (
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="nome" className="font-bold text-xs uppercase tracking-wider text-slate-500">Nome do Livro</Label>
                                <Input
                                    id="nome"
                                    value={editLivro.nome}
                                    onChange={e => setEditLivro({ ...editLivro, nome: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="formato" className="font-bold text-xs uppercase tracking-wider text-slate-500">Formato Base (use (N))</Label>
                                <Input
                                    id="formato"
                                    value={editLivro.formato_base}
                                    onChange={e => setEditLivro({ ...editLivro, formato_base: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="proximo" className="font-bold text-xs uppercase tracking-wider text-slate-500">Próximo Número (Manual)</Label>
                                <Input
                                    id="proximo"
                                    type="number"
                                    value={editLivro.proximo_numero}
                                    onChange={e => setEditLivro({ ...editLivro, proximo_numero: Number(e.target.value) })}
                                />
                                <p className="text-[10px] text-amber-600 font-bold">⚠️ Atenção: Mudar este valor manualmente pode causar duplicidade!</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} className="font-bold">Cancelar</Button>
                        <Button
                            onClick={() => handleUpdate(editLivro)}
                            className="bg-primary hover:bg-primary/90 text-white font-bold px-8 shadow-lg shadow-primary/20"
                        >
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog de Logs Completos */}
            <Dialog open={!!viewLogs} onOpenChange={() => setViewLogs(null)}>
                <DialogContent className="sm:max-w-[700px] bg-white max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-black flex items-center gap-2 uppercase tracking-tight">
                            <History className="text-slate-900 h-5 w-5" /> HISTÓRICO COMPLETO DE NUMERAÇÃO
                        </DialogTitle>
                        <DialogDescription className="font-medium">
                            {viewLogs?.nome} | Total de {viewLogs?.logs.length} registros auditados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar py-4 space-y-3">
                        {viewLogs?.logs.map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-blue-600">#{log.numero}</span>
                                        <Badge variant="outline" className="bg-white font-bold border-slate-300">DOC ID: {log.portaria_id.slice(-10)}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                            <UserIcon size={10} className="text-slate-400" /> Aprovador: {log.aprovador}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                            <Calendar size={10} className="text-slate-400" /> {new Date(log.data).toLocaleString('pt-BR')}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                            <Network size={10} className="text-slate-400" /> Origem: {log.ip}
                                        </div>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 font-black text-[10px] uppercase">
                                    Ver Documento
                                </Button>
                            </div>
                        )).reverse()}
                    </div>
                    <DialogFooter className="bg-slate-50 p-4 rounded-b-lg border-t border-slate-100 mt-2">
                        <Button variant="outline" onClick={() => setViewLogs(null)} className="font-bold w-full sm:w-auto h-11 border-slate-300">
                            Fechar Histórico
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
