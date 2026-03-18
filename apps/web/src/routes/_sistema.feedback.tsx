import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { MessageSquarePlus, Send, AlertCircle, Lightbulb, HelpCircle, Loader2, Bot } from 'lucide-react'

export const Route = createFileRoute('/_sistema/feedback')({
    component: FeedbackPage,
})

function FeedbackPage() {
    const { toast } = useToast()
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({
        tipo: 'SUGESTAO',
        titulo: '',
        descricao: '',
        prioridade: 'MEDIA'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.titulo.trim() || !form.descricao.trim()) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Por favor, preencha o título e a descrição.',
                variant: 'destructive',
            })
            return
        }

        setSubmitting(true)
        try {
            const finalTipo = form.tipo === 'CHATDOCS' ? 'SUGESTAO' : form.tipo
            const finalTitulo = form.tipo === 'CHATDOCS' ? `[ChatDoc's] ${form.titulo}` : form.titulo

            const res = await api.post('/api/feedback', { ...form, tipo: finalTipo, titulo: finalTitulo })
            const data = res.data

            if (!data.success) {
                throw new Error(data.error || 'Erro ao enviar feedback')
            }

            toast({
                title: 'Feedback enviado!',
                description: 'Muito obrigado por ajudar a melhorar o sistema.',
            })

            setForm({
                tipo: 'SUGESTAO',
                titulo: '',
                descricao: '',
                prioridade: 'MEDIA'
            })
        } catch (error: any) {
            toast({
                title: 'Erro no envio',
                description: error.message || 'Houve um problema ao enviar seu relato.',
                variant: 'destructive',
            })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-2 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <MessageSquarePlus className="h-6 w-6 text-primary" />
                    Enviar Feedback
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Encontrou um erro, tem uma ideia brilhante ou ficou com dúvida? Conte para nós. Seu relato vai direto para a equipe de desenvolvimento.
                </p>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
                <Card className="border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                        <CardTitle className="text-lg text-slate-800">Detalhes do Relato</CardTitle>
                        <CardDescription>
                            Preencha as informações abaixo com o máximo de detalhes que puder.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tipo" className="text-xs font-bold uppercase text-slate-500">Tipo de Relato</Label>
                                <Select value={form.tipo} onValueChange={(val) => setForm({ ...form, tipo: val })}>
                                    <SelectTrigger id="tipo" className="bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BUG">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-rose-500" />
                                                <span>Reportar um Erro (Bug)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="SUGESTAO">
                                            <div className="flex items-center gap-2">
                                                <Lightbulb className="h-4 w-4 text-amber-500" />
                                                <span>Sugestão de Melhoria</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="DUVIDA">
                                            <div className="flex items-center gap-2">
                                                <HelpCircle className="h-4 w-4 text-blue-500" />
                                                <span>Dúvida ou Pergunta</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="CHATDOCS">
                                            <div className="flex items-center gap-2">
                                                <Bot className="h-4 w-4 text-primary" />
                                                <span>ChatDoc's (IA)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prioridade" className="text-xs font-bold uppercase text-slate-500">Prioridade</Label>
                                <Select value={form.prioridade} onValueChange={(val) => setForm({ ...form, prioridade: val })}>
                                    <SelectTrigger id="prioridade" className="bg-white">
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="BAIXA">Baixa</SelectItem>
                                        <SelectItem value="MEDIA">Média</SelectItem>
                                        <SelectItem value="ALTA">Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="titulo" className="text-xs font-bold uppercase text-slate-500">Título / Assunto</Label>
                            <Input
                                id="titulo"
                                placeholder="Dê um nome curto para o problema ou ideia"
                                value={form.titulo}
                                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                maxLength={100}
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="descricao" className="text-xs font-bold uppercase text-slate-500">Descrição Detalhada</Label>
                            <Textarea
                                id="descricao"
                                placeholder="Descreva o que aconteceu, o que você esperava que acontecesse, e passos para reproduzir (se for um erro)..."
                                className="min-h-[150px] bg-white resize-y"
                                value={form.descricao}
                                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end gap-3 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setForm({ tipo: 'SUGESTAO', titulo: '', descricao: '', prioridade: 'MEDIA' })
                            }}
                            disabled={submitting}
                        >
                            Limpar
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enviar Feedback
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}
