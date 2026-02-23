import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SignatureModalProps {
    ids: string[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    onConfirm: (password: string) => Promise<void>
}

export function SignatureModal({ ids, open, onOpenChange, onSuccess, onConfirm }: SignatureModalProps) {
    const { toast } = useToast()
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        if (!password) {
            toast({
                title: 'Erro na assinatura',
                description: 'Por favor, informe sua senha de assinatura digital.',
                variant: 'destructive'
            })
            return
        }

        setIsLoading(true)
        try {
            await onConfirm(password)
            toast({
                title: 'Documentos assinados em lote!',
                description: `${ids.length} portaria(s) foram publicadas com sucesso.`
            })
            onSuccess()
            onOpenChange(false)
            setPassword('')
        } catch (error) {
            toast({
                title: 'Erro ao assinar',
                description: 'Senha incorreta ou erro no processamento digital.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <ShieldCheck className="h-5 w-5" />
                        <DialogTitle>Assinatura Digital em Lote</DialogTitle>
                    </div>
                    <DialogDescription>
                        Você está prestes a assinar e publicar <strong>{ids.length} documento(s)</strong> simultaneamente. Esta ação é irreversível.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="password">Senha de Assinatura Digital</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha de segurança..."
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                        <p className="text-[10px] text-slate-500 italic">
                            Dica: Use a senha "123456" para o ambiente de testes.
                        </p>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            'Confirmar e Assinar'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
