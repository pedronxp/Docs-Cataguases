import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  CloudLightning, Key, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, Plus, Trash2, Download
} from 'lucide-react'
import { useCloudConvertStatus } from '@/hooks/useCloudConvertStatus'

export const Route = createFileRoute('/_sistema/admin/cloudconvert')({
  component: CloudConvertMonitor,
})

function CloudConvertMonitor() {
  const { keys, loading, error, fetchStatus, setActiveKey, addKey, deleteKey } = useCloudConvertStatus()
  const { toast } = useToast()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newKeyInput, setNewKeyInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddKey = async () => {
    if (!newKeyInput.trim()) return
    setIsSubmitting(true)
    const res = await addKey(newKeyInput.trim())
    setIsSubmitting(false)
    if (res.success) {
      toast({ title: 'Chave Adicionada', description: res.message })
      setAddModalOpen(false)
      setNewKeyInput('')
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' })
    }
  }

  const handleSetActive = async (id: string) => {
    const res = await setActiveKey(id)
    if (res.success) toast({ title: 'Chave Rotacionada', description: res.message })
    else toast({ title: 'Erro', description: res.error, variant: 'destructive' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar essa chave do sistema?')) return
    const res = await deleteKey(id)
    if (res.success) toast({ title: 'Excluída', description: res.message })
    else toast({ title: 'Erro', description: res.error, variant: 'destructive' })
  }

  const handleExportEnv = () => {
    let content = `# Backup CloudConvert Keys\n`
    keys.forEach(k => {
      content += `${k.id}=${k.key || '[OBFUSCATED]'}\n`
    })
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloudconvert-keys-backup.env`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exportado', description: 'Download iniciado.' })
  }

  const totalCredits = keys.reduce((acc, k) => acc + (k.credits || 0), 0)
  const activeKey = keys.find(k => k.isActive)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CloudLightning className="text-sky-500 h-8 w-8" />
            Monitor CloudConvert
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Auto-refresh dinâmico a cada 30 segundos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStatus} variant="outline" disabled={loading} className="font-semibold text-slate-600">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Button onClick={handleExportEnv} variant="secondary" className="font-semibold" disabled={keys.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar .env
          </Button>
          <Button onClick={() => setAddModalOpen(true)} className="bg-sky-600 hover:bg-sky-700 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Key
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-md flex items-center gap-3">
          <XCircle size={20} /> <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-black uppercase tracking-wider">Chave Ativa Atual</CardTitle>
          </CardHeader>
          <CardContent>
            {activeKey ? (
              <div>
                <p className="text-3xl font-black text-slate-900">{activeKey.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={activeKey.status} />
                  <span className="text-xs font-semibold text-slate-500">{activeKey.username || 'Carregando...'}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 font-medium">Nenhuma chave ativa definida.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-sky-50 border-sky-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-sky-700 font-black uppercase tracking-wider">Créditos Totais Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-sky-900">{totalCredits.toLocaleString('pt-BR')} minutos</p>
            <p className="text-xs text-sky-600 mt-2 font-medium">Soma de todas as chaves do banco/env.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px] font-bold text-slate-600">ID</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="font-bold text-slate-600">Créditos Restantes</TableHead>
                <TableHead className="font-bold text-slate-600">Min Usados</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map(k => (
                <TableRow key={k.id} className={k.isActive ? 'bg-sky-50/50' : ''}>
                  <TableCell className="font-mono text-sm text-slate-700 font-bold">
                    {k.name}
                    {k.isActive && <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-black uppercase">Ativa</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={k.status} />
                    {k.error && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase leading-tight mt-1">{k.error}</p>}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700 text-base">
                    {typeof k.credits === 'number' ? k.credits.toLocaleString('pt-BR') : k.credits}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{k.used}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={k.isActive}
                      onClick={() => handleSetActive(k.id)}
                      className="font-bold text-xs"
                    >
                      <Key className="mr-1.5 h-3 w-3" /> Tornar Ativa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                      onClick={() => handleDelete(k.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && !loading && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">Nenhuma chave encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Múltiplas Chaves JWT</DialogTitle>
            <DialogDescription>
              Insira uma nova API Key do CloudConvert. Ela será incluída no arquivo .env para rotação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Bearer Token (JWT)</Label>
            <Input
              placeholder="eyJ0eXAiOiJKV1QiLC..."
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              className="font-mono text-xs h-12"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleAddKey} disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-700">Salvar Chave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold"><CheckCircle2 size={12} className="mr-1" /> Ativo</Badge>
  if (status === 'warning') return <Badge className="bg-amber-100 text-amber-700 border-none font-bold"><AlertTriangle size={12} className="mr-1" /> Ação Requerida</Badge>
  if (status === 'exhausted') return <Badge className="bg-rose-100 text-rose-700 border-none font-bold"><XCircle size={12} className="mr-1" /> Créditos Esgotados</Badge>
  return <Badge variant="outline" className="text-rose-500 border-rose-200 font-bold bg-rose-50"><AlertTriangle size={12} className="mr-1" /> Erro/Inválida</Badge>
}
