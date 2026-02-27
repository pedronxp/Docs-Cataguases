import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Variable, Edit, Trash2, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { variavelService } from '@/services/variavel.service'
import type { VariavelSistema } from '@/types/domain'
import { useToast } from '@/hooks/use-toast'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_sistema/admin/variaveis')({
    component: VariaveisGlobaisPage,
})

const DEFAULT_FORM = { id: '', chave: '', valor: '', descricao: '', resolvidaAutomaticamente: false, tipo: 'texto' }

function VariaveisGlobaisPage() {
    const { toast } = useToast()
    const [variaveis, setVariaveis] = useState<VariavelSistema[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState(DEFAULT_FORM)

    const openCreateModal = () => {
        setFormData(DEFAULT_FORM)
        setIsModalOpen(true)
    }

    const openEditModal = (v: VariavelSistema) => {
        setFormData({
            id: v.id,
            chave: v.chave,
            valor: v.valor,
            descricao: v.descricao || '',
            resolvidaAutomaticamente: !!v.resolvidaAutomaticamente,
            tipo: 'texto' // default since it's not in db right now for global
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!formData.chave || !formData.valor) {
            toast({ title: 'Aviso', description: 'Preencha a chave e o valor da variável.', variant: 'destructive' })
            return
        }

        // Format key
        const formattedKey = formData.chave.toUpperCase().replace(/[^A-Z0-9_]/g, '')
        const finalKey = formattedKey.startsWith('SYS_') ? formattedKey : `SYS_${formattedKey}`

        setSaving(true)
        const res = await variavelService.salvarVariavel({
            ...formData,
            chave: finalKey
        })

        if (res.success) {
            toast({ title: 'Sucesso', description: 'Variável salva.', className: 'bg-green-600 text-white' })
            setIsModalOpen(false)
            loadVariaveis()
        } else {
            toast({ title: 'Erro ao salvar', description: res.error, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDelete = async (id: string, chave: string) => {
        if (!confirm(`Tem certeza que deseja excluir a variável {{${chave}}}? Isso pode quebrar documentos que dependem dela.`)) return;

        const res = await variavelService.excluirVariavel(id)
        if (res.success) {
            toast({ title: 'Variável excluída' })
            loadVariaveis()
        } else {
            toast({ title: 'Erro ao excluir', description: res.error, variant: 'destructive' })
        }
    }

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
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" asChild className="w-full sm:w-auto shadow-sm text-slate-600">
                        <Link to="/admin/variaveis-dicas">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Dicas de Uso
                        </Link>
                    </Button>
                    <Button onClick={openCreateModal} className="bg-[#1351B4] hover:bg-[#0f4496] text-white w-full sm:w-auto shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Variável
                    </Button>
                </div>
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
                                                <Button variant="ghost" size="icon" onClick={() => openEditModal(v)} className="text-slate-500 hover:text-[#1351B4]" title="Editar">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                {!v.resolvidaAutomaticamente && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id, v.chave)} className="text-slate-500 hover:text-rose-600" title="Remover">
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Editar Variável Global' : 'Nova Variável Global'}</DialogTitle>
                        <DialogDescription>
                            Esta variável poderá ser usada em qualquer modelo inserindo a chave entre chaves duplas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="chave">Chave (Tag) <span className="text-red-500">*</span></Label>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 focus-within:ring-1 focus-within:ring-[#1351B4] focus-within:border-[#1351B4]">
                                <span className="text-slate-400 font-mono text-sm">{'{'}{'{'}</span>
                                <input
                                    id="chave"
                                    value={formData.chave}
                                    disabled={!!formData.id}
                                    onChange={(e) => setFormData({ ...formData, chave: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                                    className="font-mono text-sm bg-transparent border-0 focus:outline-none p-0 h-10 w-full disabled:opacity-50"
                                    placeholder="NOME_PREFEITURA"
                                />
                                <span className="text-slate-400 font-mono text-sm">{'}'}{'}'}</span>
                            </div>
                            {!formData.id && (
                                <p className="text-xs text-slate-500">Apenas letras maiúsculas, números e underline.</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="valor">Valor Resolvido <span className="text-red-500">*</span></Label>
                            <Input
                                id="valor"
                                value={formData.valor}
                                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                placeholder="Ex: Prefeitura Municipal de Cataguases"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tipo">Tipo de Entrada Visual (Para edição no Passo 3)</Label>
                            <Select value={formData.tipo} onValueChange={(val) => setFormData({ ...formData, tipo: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="texto">Texto Curto</SelectItem>
                                    <SelectItem value="numero">Número</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="cpf">Mascara CPF</SelectItem>
                                    <SelectItem value="moeda">Moeda Monetária</SelectItem>
                                    <SelectItem value="assinatura">Assinatura Digital</SelectItem>
                                    <SelectItem value="select">Lista Redirecionada</SelectItem>
                                    <SelectItem value="data_extenso">Data por Extenso</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-500">Caso o usuário precise alterar este valor global localmente no documento.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="descricao">Descrição (Opcional)</Label>
                            <Textarea
                                id="descricao"
                                value={formData.descricao}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Breve explicação sobre onde essa variável é usada..."
                                className="resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-[#1351B4] hover:bg-[#0f4496] text-white">
                            {saving ? 'Salvando...' : 'Salvar Variável'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
