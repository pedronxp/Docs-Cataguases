import { useState, useEffect } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Braces, Save, Loader2 } from 'lucide-react'
import type { VariavelSistema } from '@/types/domain'

interface VariableGlobalDrawerProps {
    variable: VariavelSistema | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (variable: Omit<VariavelSistema, 'id'> & { id?: string }) => Promise<void>
}

export function VariableGlobalDrawer({ variable, open, onOpenChange, onSave }: VariableGlobalDrawerProps) {
    const [formData, setFormData] = useState<Omit<VariavelSistema, 'id'> & { id?: string }>({
        chave: '',
        valor: '',
        descricao: '',
        resolvidaAutomaticamente: false,
    })
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (variable) {
            setFormData({
                id: variable.id,
                chave: variable.chave,
                valor: variable.valor,
                descricao: variable.descricao,
                resolvidaAutomaticamente: variable.resolvidaAutomaticamente,
            })
        } else {
            setFormData({
                chave: '',
                valor: '',
                descricao: '',
                resolvidaAutomaticamente: false,
            })
        }
    }, [variable, open])

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            await onSave(formData)
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md flex flex-col p-0">
                <div className="flex-1 px-6 pt-6 overflow-y-auto">
                    <SheetHeader className="mb-6">
                        <div className="flex items-center gap-2 text-primary">
                            <Braces className="h-6 w-6" />
                            <SheetTitle className="text-2xl font-black italic">
                                {variable ? 'Editar Variável' : 'Nova Variável Global'}
                            </SheetTitle>
                        </div>
                        <SheetDescription>
                            Configure variáveis que poderão ser utilizadas em qualquer template do sistema.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-6">
                        <div className="grid gap-4 p-4 border rounded-xl bg-slate-50/50">
                            <div className="grid gap-2">
                                <Label htmlFor="chave" className="font-bold">Chave (Tag)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{"{{"}</span>
                                    <Input
                                        id="chave"
                                        value={formData.chave}
                                        onChange={e => setFormData(prev => ({ ...prev, chave: e.target.value.toUpperCase().replace(/\s/g, '_') }))}
                                        placeholder="EX_NOME_USER"
                                        className="pl-8 uppercase font-mono bg-white"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{"}}"}</span>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="valor" className="font-bold">Valor Resolvido</Label>
                                <Input
                                    id="valor"
                                    value={formData.valor}
                                    onChange={e => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                                    placeholder="Ex: João da Silva ou Dinâmico"
                                    className="bg-white"
                                    disabled={formData.resolvidaAutomaticamente}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="descricao" className="font-bold">Descrição</Label>
                                <Input
                                    id="descricao"
                                    value={formData.descricao}
                                    onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Para que serve esta tag?"
                                    className="bg-white"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                <div className="space-y-0.5">
                                    <Label className="font-bold text-sm">Resolução Automática</Label>
                                    <p className="text-[10px] text-slate-400">O valor será injetado dinamicamente pelo motor.</p>
                                </div>
                                <Switch
                                    checked={formData.resolvidaAutomaticamente}
                                    onCheckedChange={val => setFormData(prev => ({ ...prev, resolvidaAutomaticamente: val, valor: val ? 'Autogerado via Motor' : '' }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <SheetFooter className="p-6 border-t bg-slate-50 flex gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-bold">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90 font-bold">
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {variable ? 'Salvar Alterações' : 'Criar Variável'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
