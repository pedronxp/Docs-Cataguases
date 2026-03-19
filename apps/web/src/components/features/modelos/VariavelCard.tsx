import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'

export type VariavelExtraida = {
  tag: string
  label: string
  tipo: 'texto' | 'numero' | 'data' | 'moeda' | 'cpf' | 'select' | 'assinatura' | 'data_extenso'
  obrigatorio: boolean
  opcoes: string[]
  ordem: number
  valorPadrao?: string
  grupo?: string
  regraCondicional?: { dependeDe: string; valor: string } | null
}

export type VariavelCardProps = {
  id: string
  v: VariavelExtraida
  idx: number
  tagHovered: string | null
  setTagHovered: (tag: string | null) => void
  atualizarVariavel: (index: number, campo: keyof VariavelExtraida, valor: any) => void
  removerVariavel: (index: number) => void
  gruposExistentes: string[]
  todasAsTags: { tag: string; label: string }[]
}

export function VariavelCard({ id, v, idx, tagHovered, setTagHovered, atualizarVariavel, removerVariavel, gruposExistentes, todasAsTags }: VariavelCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [isOpen, setIsOpen] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 p-4 border rounded-lg bg-white shadow-sm transition-all duration-150
        ${isDragging ? 'shadow-lg ring-2 ring-[#1351B4] opacity-80 z-10' : ''}
        ${!isDragging && tagHovered === v.tag ? 'border-[#1351B4] ring-2 ring-blue-200 bg-blue-50/40' : ''}
        ${!isDragging && tagHovered !== v.tag ? 'border-slate-200' : ''}
      `}
      onMouseEnter={() => setTagHovered(v.tag)}
      onMouseLeave={() => setTagHovered(null)}
    >
      {/* Linha 1: overflow-x-auto garantindo leitura horizontal em telas pequenas */}
      <div className="overflow-x-auto w-full custom-scrollbar pb-2">
        <div className="flex items-center gap-4 min-w-[650px] w-full pr-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 shrink-0 touch-none py-2"
            title="Arrastar para reordenar"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} />
          </button>

          <div className="w-48 shrink-0">
            <Label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide">TAG NO TEXTO</Label>
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 focus-within:ring-1 focus-within:ring-[#1351B4]">
              <span className="text-slate-400 font-mono text-xs">{'{{'}</span>
              <input
                type="text"
                value={v.tag}
                onChange={e => atualizarVariavel(idx, 'tag', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                className="font-mono text-sm bg-transparent border-0 focus:outline-none p-0 h-9 w-full min-w-0 font-bold text-blue-800"
              />
              <span className="text-slate-400 font-mono text-xs">{'}}'}</span>
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <Label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide">LABEL DO CAMPO</Label>
            <Input value={v.label} onChange={e => atualizarVariavel(idx, 'label', e.target.value)} className="bg-slate-50 border-slate-200 h-9" />
          </div>

          <div className="w-40 shrink-0">
            <Label className="text-[10px] font-bold text-slate-400 mb-1.5 block uppercase tracking-wide">TIPO DE DADO</Label>
            <Select value={v.tipo} onValueChange={(val) => atualizarVariavel(idx, 'tipo', val as any)}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-9 w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="texto">Texto Curto</SelectItem>
                <SelectItem value="numero">Número</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="cpf">Mascara CPF</SelectItem>
                <SelectItem value="moeda">Moeda Monetária (R$)</SelectItem>
                <SelectItem value="select">Lista Redirecionada</SelectItem>
                <SelectItem value="assinatura">Assinatura Digital</SelectItem>
                <SelectItem value="data_extenso">Data por Extenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto border-l border-slate-200 pl-4">
            <div className="flex flex-col items-center justify-center">
              <Label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">OBRIG.</Label>
              <Switch checked={v.obrigatorio} onCheckedChange={(val) => atualizarVariavel(idx, 'obrigatorio', val)} />
            </div>
            <div className="border-l border-slate-200 pl-3 h-full flex items-center gap-1 justify-center xl:pt-2 ml-2">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-[#1351B4] hover:bg-blue-50 h-8 w-8 shrink-0" title="Configurações Avançadas">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removerVariavel(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 shrink-0" title="Remover Variável">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="space-y-3 pt-3 mt-1 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
          {/* Opções da lista para tipo select */}
          {v.tipo === 'select' && (
            <div className="flex flex-col gap-1.5 pb-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opções da Lista <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder={"Cargo Comissionado\nCargo Efetivo\nCargo em Confiança"}
                value={(v.opcoes || []).join('\n')}
                onChange={e => atualizarVariavel(idx, 'opcoes', e.target.value.split('\n').filter(o => o.trim() !== ''))}
                className="h-24 text-xs font-mono bg-slate-50 border-slate-200 placeholder:text-slate-300 resize-none"
              />
              <p className="text-[10px] text-slate-400">Cada linha se torna uma opção no formulário de preenchimento da portaria.</p>
              {(v.opcoes || []).length === 0 && (
                <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">⚠ Adicione ao menos uma opção para este campo funcionar.</p>
              )}
            </div>
          )}

          {/* B1 + B3: Linha 2 — Valor padrão e Grupo */}
          <div className="flex flex-col sm:flex-row gap-4">
            {v.tipo !== 'assinatura' && v.tipo !== 'select' && (
              <div className="flex flex-col gap-1.5 flex-1">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Valor padrão</Label>
                <Input
                  placeholder="Deixe vazio para não pré-preencher"
                  value={v.valorPadrao || ''}
                  onChange={e => atualizarVariavel(idx, 'valorPadrao', e.target.value)}
                  className="h-8 text-xs bg-slate-50 border-slate-200 placeholder:text-slate-300"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5 flex-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Grupo Organizador</Label>
              <input
                list={`grupos-${id}`}
                placeholder="Ex: Identificação, Valores..."
                value={v.grupo || ''}
                onChange={e => atualizarVariavel(idx, 'grupo', e.target.value)}
                className="w-full h-8 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#1351B4]"
              />
              <datalist id={`grupos-${id}`}>
                {gruposExistentes.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
          </div>

          {/* B2: Linha 3 — Regra condicional */}
          {todasAsTags.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Lógica Condicional</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 font-medium">Exibir esta variável somente se a tag</span>
                <select
                  value={v.regraCondicional?.dependeDe || ''}
                  onChange={e => {
                    const dep = e.target.value
                    if (!dep) {
                      atualizarVariavel(idx, 'regraCondicional', null)
                    } else {
                      atualizarVariavel(idx, 'regraCondicional', { dependeDe: dep, valor: v.regraCondicional?.valor || '' })
                    }
                  }}
                  className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-[#1351B4] text-slate-700 font-medium"
                >
                  <option value="">— nenhuma condição —</option>
                  {todasAsTags.map(o => (
                    <option key={o.tag} value={o.tag}>{o.label} ({`{{${o.tag}}}`})</option>
                  ))}
                </select>
                {v.regraCondicional?.dependeDe && (
                  <>
                    <span className="text-xs text-slate-500 font-medium">for idêntica a</span>
                    <input
                      type="text"
                      placeholder="valor esperado"
                      value={v.regraCondicional.valor}
                      onChange={e => atualizarVariavel(idx, 'regraCondicional', { ...v.regraCondicional!, valor: e.target.value })}
                      className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-md px-3 focus:outline-none focus:ring-1 focus:ring-[#1351B4] placeholder:text-slate-300"
                    />
                  </>
                )}
                {v.regraCondicional?.dependeDe && (
                  <Badge variant="outline" className="text-[10px] ml-2 bg-amber-50 border-amber-300 text-amber-700 font-bold uppercase tracking-wider">
                    Condição Ativa
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
