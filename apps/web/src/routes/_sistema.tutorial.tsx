import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthStore } from '@/store/auth.store'
import { useState } from 'react'
import {
    FileText, Users, BookOpen, ShieldCheck, ArrowRight, ArrowDown,
    ClipboardList, PenTool, Building2, Eye, BarChart2,
    CheckCircle2, AlertCircle, Clock, Stamp, Newspaper,
    ChevronDown, RotateCcw, UserPlus, FolderOpen,
    Bot, Brain, MessageSquare, Zap, Settings, Shield,
    Globe, Sparkles, Lock, Unlock, Database
} from 'lucide-react'

export const Route = createFileRoute('/_sistema/tutorial')({
    component: TutorialPage,
})

// ══════════════════════════════════════════════════════════════════════════════
// ROLE VISIBILITY CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const ALL_ROLES = ['OPERADOR', 'REVISOR', 'SECRETARIO', 'PREFEITO', 'ADMIN_GERAL'] as const


const ROLE_LABELS: Record<string, string> = {
    OPERADOR: 'Operador', REVISOR: 'Revisor', SECRETARIO: 'Secretário',
    PREFEITO: 'Prefeito', ADMIN_GERAL: 'Admin Geral',
}

const ROLE_BADGES: Record<string, { cor: string; desc: string }> = {
    OPERADOR:    { cor: 'bg-[#f8f9fa] border-[#999999] text-[#333333]', desc: 'Cria rascunhos e submete portarias. Corrige documentos rejeitados.' },
    REVISOR:     { cor: 'bg-[#e6f4eb] border-[#0c7b41] text-[#0c7b41]', desc: 'Pega portarias da fila, aprova, rejeita ou transfere.' },
    SECRETARIO:  { cor: 'bg-[#e8f0fb] border-[#1351b4] text-[#1351b4]', desc: 'Aprova ou rejeita portarias da sua secretaria.' },
    PREFEITO:    { cor: 'bg-[#fffbea] border-[#d4a017] text-[#7d5c00]', desc: 'Assina portarias e autoriza publicação.' },
    ADMIN_GERAL: { cor: 'bg-[#f9f0ff] border-[#9b59b6] text-[#9b59b6]', desc: 'Acesso total: usuários, modelos, variáveis, LLM e configuração.' },
}

/** Returns true if this section should be visible for the given role */
function isVisible(userRole: string, sectionRoles: string[]): boolean {
    if (userRole === 'ADMIN_GERAL') return true
    return sectionRoles.includes(userRole)
}

// ══════════════════════════════════════════════════════════════════════════════
// FLOWCHART COMPONENTS (compact)
// ══════════════════════════════════════════════════════════════════════════════

type NodeType = 'start' | 'end' | 'process' | 'decision' | 'error'
interface FlowNode { id: string; label: string; sublabel?: string; role?: string; type: NodeType; color: string; bg: string; border: string }

function FNode({ node, highlighted, onClick }: { node: FlowNode; highlighted: boolean; onClick: () => void }) {
    const { type, label, sublabel, role, color, bg, border } = node
    const isDec = type === 'decision'; const isEnd = type === 'end'; const isErr = type === 'error'; const isTerm = type === 'start' || isEnd
    return (
        <div className={`relative cursor-pointer transition-all duration-200 ${highlighted ? 'scale-105' : 'hover:scale-[1.02]'}`} onClick={onClick}>
            {role && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white border border-[#e6e6e6] text-[#555555] whitespace-nowrap shadow-sm">{role}</span>
                </div>
            )}
            {isDec ? (
                <div className="flex flex-col items-center">
                    <div className={`w-[120px] h-[120px] flex items-center justify-center border-2 ${highlighted ? 'shadow-lg' : ''}`}
                        style={{ backgroundColor: bg, borderColor: border, transform: 'rotate(45deg)', borderRadius: '4px' }}>
                        <div className="text-center" style={{ transform: 'rotate(-45deg)' }}>
                            <p className="text-xs font-bold" style={{ color }}>{label}</p>
                            {sublabel && <p className="text-[8px] mt-0.5 text-[#555555] max-w-[85px] leading-tight">{sublabel}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`px-4 py-2.5 border-2 text-center min-w-[140px] max-w-[180px] ${isTerm ? 'rounded-full' : isErr ? 'rounded border-dashed' : 'rounded'} ${highlighted ? 'shadow-lg' : ''}`}
                    style={{ backgroundColor: bg, borderColor: border }}>
                    <p className="text-xs font-bold" style={{ color: isEnd ? '#fff' : color }}>{label}</p>
                    {sublabel && <p className={`text-[9px] mt-0.5 leading-tight ${isEnd ? 'text-white/70' : 'text-[#555555]'}`}>{sublabel}</p>}
                </div>
            )}
        </div>
    )
}

function FArrow({ label, style = 'normal' }: { label?: string; style?: 'normal' | 'reject' | 'error' | 'loop' }) {
    const c = style === 'reject' || style === 'error' ? '#e52207' : style === 'loop' ? '#a06b00' : '#cccccc'
    const lc = style === 'reject' || style === 'error' ? 'text-[#e52207] bg-[#ffefec] border-[#e52207]'
        : style === 'loop' ? 'text-[#a06b00] bg-[#fef6e0] border-[#a06b00]' : 'text-[#555555] bg-white border-[#e6e6e6]'
    return (
        <div className="flex flex-col items-center py-0.5">
            <div className="w-0.5 h-3" style={{ backgroundColor: c }} />
            {label && <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded my-0.5 ${lc}`}>{label}</span>}
            <ArrowDown className="h-3 w-3" style={{ color: c }} />
        </div>
    )
}

function LoopBack({ label, style = 'loop' }: { label: string; style?: 'loop' | 'reject' }) {
    const c = style === 'reject' ? '#e52207' : '#a06b00'
    const bg = style === 'reject' ? 'bg-[#ffefec] border-[#e52207] text-[#e52207]' : 'bg-[#fef6e0] border-[#a06b00] text-[#a06b00]'
    return (
        <div className="flex flex-col items-center py-1">
            <RotateCcw className="h-3.5 w-3.5" style={{ color: c }} />
            <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded mt-0.5 ${bg}`}>{label}</span>
        </div>
    )
}

function FlowLegend() {
    return (
        <div className="mt-4 pt-3 border-t border-[#e6e6e6] flex flex-wrap gap-3 justify-center">
            <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded-full border-2 border-[#cccccc] bg-[#f8f9fa]" /><span className="text-[9px] text-[#555555]">Início/Fim</span></div>
            <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 rounded border-2 border-[#1351b4] bg-[#edf5ff]" /><span className="text-[9px] text-[#555555]">Etapa</span></div>
            <div className="flex items-center gap-1"><div className="w-3.5 h-3.5 border-2 border-[#1351b4] bg-[#edf5ff]" style={{ transform: 'rotate(45deg) scale(0.7)' }} /><span className="text-[9px] text-[#555555]">Decisão</span></div>
            <div className="flex items-center gap-1"><RotateCcw className="h-3 w-3 text-[#a06b00]" /><span className="text-[9px] text-[#555555]">Loop</span></div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// FLOWCHARTS
// ══════════════════════════════════════════════════════════════════════════════

// --- 1. Portaria ---
function PortariaFlow() {
    const [hl, setHl] = useState<string | null>(null)
    const N: FlowNode[] = [
        { id: 's', label: 'Início', sublabel: 'Operador cria portaria', type: 'start', color: '#555', bg: '#f8f9fa', border: '#ccc' },
        { id: 'r', label: 'Rascunho', sublabel: 'Preenche formulário', role: 'Operador', type: 'process', color: '#555', bg: '#f8f9fa', border: '#555' },
        { id: 'ds', label: 'Submeter?', sublabel: 'Pronto?', role: 'Operador', type: 'decision', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'ra', label: 'Revisão Aberta', sublabel: 'Na fila', role: 'Sistema', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'rt', label: 'Revisão Atribuída', sublabel: 'Revisor assumiu', role: 'Revisor', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'dr', label: 'Aprovar?', sublabel: 'Correto?', role: 'Revisor', type: 'decision', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'c', label: 'Correção', sublabel: 'Volta c/ comentário', role: 'Operador', type: 'process', color: '#e52207', bg: '#ffefec', border: '#e52207' },
        { id: 'ag', label: 'Ag. Assinatura', sublabel: 'Aguarda Prefeito', role: 'Prefeito', type: 'process', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
        { id: 'dp', label: 'Assinar?', sublabel: 'Autoriza?', role: 'Prefeito', type: 'decision', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
        { id: 'pr', label: 'Pronto p/ Publicação', sublabel: 'Assinada', role: 'Admin', type: 'process', color: '#008833', bg: '#e6f4eb', border: '#008833' },
        { id: 'pub', label: 'Publicada', sublabel: 'Ato oficial', type: 'end', color: '#fff', bg: '#071D41', border: '#071D41' },
        { id: 'err', label: 'Falha / Erro', sublabel: 'Erro de geração', role: 'Sistema', type: 'error', color: '#e52207', bg: '#ffefec', border: '#e52207' },
    ]
    const n = (id: string) => N.find(x => x.id === id)!
    const t = (id: string) => setHl(hl === id ? null : id)
    return (
        <div className="bg-white border border-[#e6e6e6] p-6 overflow-x-auto">
            <div className="min-w-[340px] flex flex-col items-center">
                <FNode node={n('s')} highlighted={hl === 's'} onClick={() => t('s')} />
                <FArrow label="Nova Portaria" />
                <FNode node={n('r')} highlighted={hl === 'r'} onClick={() => t('r')} />
                <FArrow />
                <FNode node={n('ds')} highlighted={hl === 'ds'} onClick={() => t('ds')} />
                <div className="flex items-start gap-6 mt-1">
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Não — editar" /><p className="text-[8px] text-[#a06b00]">↩ Rascunho</p></div>
                    <div className="flex flex-col items-center">
                        <FArrow label="Sim" />
                        <FNode node={n('ra')} highlighted={hl === 'ra'} onClick={() => t('ra')} />
                        <FArrow label="Assume" />
                        <FNode node={n('rt')} highlighted={hl === 'rt'} onClick={() => t('rt')} />
                        <FArrow />
                        <FNode node={n('dr')} highlighted={hl === 'dr'} onClick={() => t('dr')} />
                        <div className="flex items-start gap-6 mt-1">
                            <div className="flex flex-col items-center pt-2">
                                <LoopBack label="Rejeitar ✗" style="reject" />
                                <FNode node={n('c')} highlighted={hl === 'c'} onClick={() => t('c')} />
                                <LoopBack label="Corrige" />
                                <p className="text-[8px] text-[#a06b00]">↩ Rascunho</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <FArrow label="Aprovar ✓" />
                                <FNode node={n('ag')} highlighted={hl === 'ag'} onClick={() => t('ag')} />
                                <FArrow />
                                <FNode node={n('dp')} highlighted={hl === 'dp'} onClick={() => t('dp')} />
                                <div className="flex items-start gap-6 mt-1">
                                    <div className="flex flex-col items-center pt-2"><LoopBack label="Devolver ✗" style="reject" /><p className="text-[8px] text-[#e52207]">↩ Correção</p></div>
                                    <div className="flex flex-col items-center">
                                        <FArrow label="Assinar ✓" />
                                        <FNode node={n('pr')} highlighted={hl === 'pr'} onClick={() => t('pr')} />
                                        <FArrow label="Publica" />
                                        <FNode node={n('pub')} highlighted={hl === 'pub'} onClick={() => t('pub')} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center pt-6">
                        <FNode node={n('err')} highlighted={hl === 'err'} onClick={() => t('err')} />
                        <LoopBack label="Reprocessar" style="reject" />
                    </div>
                </div>
            </div>
            <FlowLegend />
        </div>
    )
}

// --- 2. User Registration ---
function UserFlow() {
    const [hl, setHl] = useState<string | null>(null)
    const N: FlowNode[] = [
        { id: 's', label: 'Início', sublabel: 'Acessa o sistema', type: 'start', color: '#555', bg: '#f8f9fa', border: '#ccc' },
        { id: 'reg', label: 'Cadastro', sublabel: 'Dados + e-mail', role: 'Servidor', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'ob', label: 'Onboarding', sublabel: 'Secretaria + Setor', role: 'Servidor', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'pend', label: 'Ag. Aprovação', sublabel: 'Conta pendente', role: 'Sistema', type: 'process', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
        { id: 'dec', label: 'Aprovar?', sublabel: 'Admin analisa', role: 'Admin', type: 'decision', color: '#6730a3', bg: '#f3f0ff', border: '#6730a3' },
        { id: 'rej', label: 'Rejeitado', type: 'error', color: '#e52207', bg: '#ffefec', border: '#e52207' },
        { id: 'cfg', label: 'Configura Role', sublabel: 'Define perfil', role: 'Admin', type: 'process', color: '#6730a3', bg: '#f3f0ff', border: '#6730a3' },
        { id: 'ok', label: 'Conta Ativa', sublabel: 'Acesso liberado', type: 'end', color: '#fff', bg: '#008833', border: '#008833' },
    ]
    const n = (id: string) => N.find(x => x.id === id)!
    const t = (id: string) => setHl(hl === id ? null : id)
    return (
        <div className="bg-white border border-[#e6e6e6] p-6 overflow-x-auto">
            <div className="min-w-[300px] flex flex-col items-center">
                <FNode node={n('s')} highlighted={hl === 's'} onClick={() => t('s')} />
                <FArrow label="/registro" />
                <FNode node={n('reg')} highlighted={hl === 'reg'} onClick={() => t('reg')} />
                <FArrow />
                <FNode node={n('ob')} highlighted={hl === 'ob'} onClick={() => t('ob')} />
                <FArrow />
                <FNode node={n('pend')} highlighted={hl === 'pend'} onClick={() => t('pend')} />
                <FArrow label="Admin vê na fila" />
                <FNode node={n('dec')} highlighted={hl === 'dec'} onClick={() => t('dec')} />
                <div className="flex items-start gap-8 mt-1">
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Rejeitar" style="reject" /><FNode node={n('rej')} highlighted={hl === 'rej'} onClick={() => t('rej')} /></div>
                    <div className="flex flex-col items-center">
                        <FArrow label="Aprovar ✓" />
                        <FNode node={n('cfg')} highlighted={hl === 'cfg'} onClick={() => t('cfg')} />
                        <FArrow />
                        <FNode node={n('ok')} highlighted={hl === 'ok'} onClick={() => t('ok')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- 3. Review ---
function ReviewFlow() {
    const [hl, setHl] = useState<string | null>(null)
    const N: FlowNode[] = [
        { id: 's', label: 'Portaria Submetida', type: 'start', color: '#555', bg: '#f8f9fa', border: '#ccc' },
        { id: 'fila', label: 'Fila de Revisão', role: 'Sistema', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'cl', label: 'Revisor Assume', role: 'Revisor', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'an', label: 'Análise', sublabel: 'Lê documento', role: 'Revisor', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'dec', label: 'Decisão?', sublabel: '3 opções', role: 'Revisor', type: 'decision', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'apr', label: 'Aprovado', type: 'end', color: '#fff', bg: '#008833', border: '#008833' },
        { id: 'rej', label: 'Rejeitado', sublabel: 'Com comentário', type: 'process', color: '#e52207', bg: '#ffefec', border: '#e52207' },
        { id: 'trans', label: 'Transferido', sublabel: 'Outro revisor', type: 'process', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
    ]
    const n = (id: string) => N.find(x => x.id === id)!
    const t = (id: string) => setHl(hl === id ? null : id)
    return (
        <div className="bg-white border border-[#e6e6e6] p-6 overflow-x-auto">
            <div className="min-w-[320px] flex flex-col items-center">
                <FNode node={n('s')} highlighted={hl === 's'} onClick={() => t('s')} />
                <FArrow label="Entra na fila" />
                <FNode node={n('fila')} highlighted={hl === 'fila'} onClick={() => t('fila')} />
                <FArrow label="Clica 'Pegar'" />
                <FNode node={n('cl')} highlighted={hl === 'cl'} onClick={() => t('cl')} />
                <FArrow />
                <FNode node={n('an')} highlighted={hl === 'an'} onClick={() => t('an')} />
                <FArrow />
                <FNode node={n('dec')} highlighted={hl === 'dec'} onClick={() => t('dec')} />
                <div className="flex items-start gap-4 mt-1">
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Rejeitar" style="reject" /><FNode node={n('rej')} highlighted={hl === 'rej'} onClick={() => t('rej')} /><p className="text-[8px] text-[#e52207] mt-1">↩ Operador</p></div>
                    <div className="flex flex-col items-center"><FArrow label="Aprovar ✓" /><FNode node={n('apr')} highlighted={hl === 'apr'} onClick={() => t('apr')} /></div>
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Transferir" /><FNode node={n('trans')} highlighted={hl === 'trans'} onClick={() => t('trans')} /><p className="text-[8px] text-[#a06b00] mt-1">↩ Fila</p></div>
                </div>
            </div>
        </div>
    )
}

// --- 4. Model Management ---
function ModelFlow() {
    const [hl, setHl] = useState<string | null>(null)
    const N: FlowNode[] = [
        { id: 's', label: 'Início', type: 'start', color: '#555', bg: '#f8f9fa', border: '#ccc' },
        { id: 'cr', label: 'Criar Modelo', sublabel: 'Nome, tipo', role: 'Admin', type: 'process', color: '#6730a3', bg: '#f3f0ff', border: '#6730a3' },
        { id: 'up', label: 'Upload .DOCX', sublabel: 'Template com {{vars}}', role: 'Admin', type: 'process', color: '#6730a3', bg: '#f3f0ff', border: '#6730a3' },
        { id: 'var', label: 'Config. Variáveis', sublabel: 'Tipo, label', role: 'Admin', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'test', label: 'Testar?', sublabel: 'Preview OK?', role: 'Admin', type: 'decision', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'fix', label: 'Ajustar', role: 'Admin', type: 'process', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
        { id: 'end', label: 'Modelo Ativo', sublabel: 'Disponível', type: 'end', color: '#fff', bg: '#008833', border: '#008833' },
    ]
    const n = (id: string) => N.find(x => x.id === id)!
    const t = (id: string) => setHl(hl === id ? null : id)
    return (
        <div className="bg-white border border-[#e6e6e6] p-6 overflow-x-auto">
            <div className="min-w-[280px] flex flex-col items-center">
                <FNode node={n('s')} highlighted={hl === 's'} onClick={() => t('s')} />
                <FArrow label="+ Novo Modelo" />
                <FNode node={n('cr')} highlighted={hl === 'cr'} onClick={() => t('cr')} />
                <FArrow />
                <FNode node={n('up')} highlighted={hl === 'up'} onClick={() => t('up')} />
                <FArrow label="Extrai variáveis" />
                <FNode node={n('var')} highlighted={hl === 'var'} onClick={() => t('var')} />
                <FArrow />
                <FNode node={n('test')} highlighted={hl === 'test'} onClick={() => t('test')} />
                <div className="flex items-start gap-8 mt-1">
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Não" /><FNode node={n('fix')} highlighted={hl === 'fix'} onClick={() => t('fix')} /><p className="text-[8px] text-[#a06b00] mt-1">↩ Upload</p></div>
                    <div className="flex flex-col items-center"><FArrow label="Sim ✓" /><FNode node={n('end')} highlighted={hl === 'end'} onClick={() => t('end')} /></div>
                </div>
            </div>
        </div>
    )
}

// --- 5. Publication ---
function PublicationFlow() {
    const [hl, setHl] = useState<string | null>(null)
    const N: FlowNode[] = [
        { id: 's', label: 'Portaria Assinada', type: 'start', color: '#555', bg: '#f8f9fa', border: '#ccc' },
        { id: 'ac', label: 'Acervo Interno', role: 'Sistema', type: 'process', color: '#1351b4', bg: '#edf5ff', border: '#1351b4' },
        { id: 'dec', label: 'Publicar?', role: 'Admin', type: 'decision', color: '#008833', bg: '#e6f4eb', border: '#008833' },
        { id: 'w', label: 'Aguarda', type: 'process', color: '#a06b00', bg: '#fef6e0', border: '#a06b00' },
        { id: 'do', label: 'Publica no D.O.', role: 'Admin', type: 'process', color: '#008833', bg: '#e6f4eb', border: '#008833' },
        { id: 'pdf', label: 'PDF Gerado', role: 'Sistema', type: 'process', color: '#008833', bg: '#e6f4eb', border: '#008833' },
        { id: 'end', label: 'Publicada', sublabel: 'Ato oficial', type: 'end', color: '#fff', bg: '#071D41', border: '#071D41' },
    ]
    const n = (id: string) => N.find(x => x.id === id)!
    const t = (id: string) => setHl(hl === id ? null : id)
    return (
        <div className="bg-white border border-[#e6e6e6] p-6 overflow-x-auto">
            <div className="min-w-[280px] flex flex-col items-center">
                <FNode node={n('s')} highlighted={hl === 's'} onClick={() => t('s')} />
                <FArrow />
                <FNode node={n('ac')} highlighted={hl === 'ac'} onClick={() => t('ac')} />
                <FArrow />
                <FNode node={n('dec')} highlighted={hl === 'dec'} onClick={() => t('dec')} />
                <div className="flex items-start gap-8 mt-1">
                    <div className="flex flex-col items-center pt-2"><LoopBack label="Não — aguardar" /><FNode node={n('w')} highlighted={hl === 'w'} onClick={() => t('w')} /></div>
                    <div className="flex flex-col items-center">
                        <FArrow label="Sim ✓" />
                        <FNode node={n('do')} highlighted={hl === 'do'} onClick={() => t('do')} />
                        <FArrow label="Gera PDF" />
                        <FNode node={n('pdf')} highlighted={hl === 'pdf'} onClick={() => t('pdf')} />
                        <FArrow />
                        <FNode node={n('end')} highlighted={hl === 'end'} onClick={() => t('end')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION CONFIGS
// ══════════════════════════════════════════════════════════════════════════════

interface FlowSection {
    id: string; title: string; subtitle: string; icon: React.ElementType; accent: string
    component: React.FC; visibleTo: string[]
}

const FLOW_SECTIONS: FlowSection[] = [
    { id: 'portaria', title: 'Ciclo de Vida da Portaria', subtitle: 'Do rascunho à publicação com todas as decisões', icon: FileText, accent: '#1351b4', component: PortariaFlow, visibleTo: ALL_ROLES as unknown as string[] },
    { id: 'usuario', title: 'Cadastro e Onboarding', subtitle: 'Registro de servidor até liberação de acesso', icon: UserPlus, accent: '#6730a3', component: UserFlow, visibleTo: ['ADMIN_GERAL'] },
    { id: 'revisao', title: 'Fluxo de Revisão', subtitle: 'Aprovar, rejeitar ou transferir', icon: ShieldCheck, accent: '#008833', component: ReviewFlow, visibleTo: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'] },
    { id: 'modelo', title: 'Gerenciamento de Modelos', subtitle: 'Criar template DOCX com variáveis', icon: FolderOpen, accent: '#c55a00', component: ModelFlow, visibleTo: ['ADMIN_GERAL'] },
    { id: 'publicacao', title: 'Publicação no Diário Oficial', subtitle: 'Da assinatura ao PDF oficial', icon: Newspaper, accent: '#071D41', component: PublicationFlow, visibleTo: ['PREFEITO', 'ADMIN_GERAL'] },
]

// ══════════════════════════════════════════════════════════════════════════════
// FEATURES PER ROLE
// ══════════════════════════════════════════════════════════════════════════════

interface Feature { icon: React.ElementType; title: string; desc: string; link?: string; linkLabel?: string }

const FEATURES_POR_ROLE: Record<string, Feature[]> = {
    OPERADOR: [
        { icon: FileText, title: 'Criar Portarias', desc: 'Escolha um modelo, preencha campos e submeta para revisão. O número oficial é gerado automaticamente.', link: '/administrativo/portarias', linkLabel: 'Portarias' },
        { icon: PenTool, title: 'Editar Rascunhos', desc: 'Rascunhos podem ser editados à vontade. Após submeter, a edição trava até eventual rejeição.' },
        { icon: AlertCircle, title: 'Corrigir Rejeições', desc: 'Se rejeitada, a portaria volta com comentário do revisor. Corrija e resubmeta.' },
        { icon: Eye, title: 'Acompanhar Status', desc: 'Veja o status atual de cada portaria na listagem principal.' },
        { icon: Bot, title: 'Assistente IA (Chat)', desc: 'Converse com o assistente flutuante para tirar dúvidas sobre preenchimento, variáveis, e processos.' },
    ],
    REVISOR: [
        { icon: ClipboardList, title: 'Fila de Revisão', desc: 'Veja portarias aguardando na fila. Clique "Pegar para Revisão" para assumir.', link: '/revisao/fila', linkLabel: 'Ver fila' },
        { icon: ShieldCheck, title: 'Aprovar / Rejeitar / Transferir', desc: 'Três decisões possíveis: Aprovar (avança), Rejeitar com comentário (volta ao autor), Transferir para outro revisor.', link: '/revisao/minhas', linkLabel: 'Minhas revisões' },
        { icon: Eye, title: 'Minhas Revisões', desc: 'Acompanhe as portarias que você assumiu e ainda não finalizou.' },
        { icon: Bot, title: 'Assistente IA (Chat)', desc: 'Pergunte à IA sobre critérios de revisão, regras de formatação e procedimentos.' },
    ],
    SECRETARIO: [
        { icon: FileText, title: 'Portarias da Secretaria', desc: 'Visualize todos os documentos da sua secretaria, filtre por status.', link: '/administrativo/portarias', linkLabel: 'Portarias' },
        { icon: ShieldCheck, title: 'Aprovar / Rejeitar', desc: 'Portarias revisadas ficam disponíveis. Aprove para enviar ao Prefeito ou rejeite.' },
        { icon: BarChart2, title: 'Métricas', desc: 'Acompanhe estatísticas de produtividade da sua secretaria.' },
        { icon: Bot, title: 'Assistente IA (Chat)', desc: 'Consulte o assistente sobre status de documentos e fluxos.' },
    ],
    PREFEITO: [
        { icon: Clock, title: 'Aguardando Assinatura', desc: 'Portarias aprovadas que passaram por toda revisão e aguardam sua assinatura.', link: '/acompanhamento', linkLabel: 'Acompanhamento' },
        { icon: Stamp, title: 'Assinar Portarias', desc: 'Assine digitalmente. Após assinar, a portaria fica "Pronta para Publicação".' },
        { icon: Newspaper, title: 'Diário Oficial', desc: 'Acompanhe publicações no D.O. e acesse PDFs oficiais.', link: '/diario-oficial', linkLabel: 'Diário Oficial' },
        { icon: BarChart2, title: 'Analytics Global', desc: 'Painel com métricas de todas as secretarias.', link: '/admin/analytics', linkLabel: 'Analytics' },
        { icon: Bot, title: 'Assistente IA (Chat)', desc: 'Consulte o assistente sobre resumo de portarias pendentes.' },
    ],
    ADMIN_GERAL: [
        { icon: Users, title: 'Gestão de Usuários', desc: 'Aprovar cadastros, definir roles, desativar contas e configurar permissões extras.', link: '/admin/usuarios', linkLabel: 'Usuários' },
        { icon: BookOpen, title: 'Modelos de Documento', desc: 'Criar e editar templates DOCX com variáveis automáticas ({{NOME}}, {{CARGO}}).', link: '/admin/modelos', linkLabel: 'Modelos' },
        { icon: Globe, title: 'Variáveis Globais', desc: 'Gerenciar variáveis de sistema ({{PREFEITO_NOME}}, {{SYS_...}}) usadas em todos os modelos.', link: '/admin/variaveis', linkLabel: 'Variáveis' },
        { icon: Building2, title: 'Gestão Institucional', desc: 'Definir mandatos, associar secretários titulares, organograma.', link: '/admin/gestao', linkLabel: 'Gestão' },
        { icon: Brain, title: 'Treinamento da IA', desc: 'Criar e gerenciar prompts de treinamento injetados em todas as conversas. Categorias: Sistema, Portaria, Revisão, Chat, Modelo, Custom.', link: '/admin/ia', linkLabel: 'Treinamento IA' },
        { icon: Database, title: 'Painel LLM', desc: 'Configurar provedores de IA (Cerebras, Mistral), gerenciar API keys, monitorar requisições e testar no playground.', link: '/admin/llm', linkLabel: 'Painel LLM' },
        { icon: BarChart2, title: 'Analytics', desc: 'Métricas de uso, produtividade por secretaria, e performance do sistema.', link: '/admin/analytics', linkLabel: 'Analytics' },
        { icon: Shield, title: 'Logs de Auditoria', desc: 'Histórico completo de todas as ações: portarias, revisões, assinaturas, exclusões.', link: '/admin/logs', linkLabel: 'Logs' },
        { icon: Settings, title: 'Livros de Numeração', desc: 'Configurar livros de numeração para diferentes tipos de documento.', link: '/admin/livros', linkLabel: 'Livros' },
        { icon: Bot, title: 'Assistente IA (Chat)', desc: 'Acesso total ao assistente com capacidade de executar ações administrativas.' },
    ],
}

// ══════════════════════════════════════════════════════════════════════════════
// LLM & CHATBOT INFO
// ══════════════════════════════════════════════════════════════════════════════

interface IACapability { icon: React.ElementType; title: string; desc: string; visibleTo: string[] }

const IA_CAPABILITIES: IACapability[] = [
    { icon: MessageSquare, title: 'Chat Conversacional', desc: 'Converse naturalmente com o assistente no chat flutuante. Ele entende o contexto do sistema e responde em português.', visibleTo: [...ALL_ROLES] },
    { icon: FileText, title: 'Ajuda com Portarias', desc: 'Pergunte como preencher campos, quais variáveis usar, e o assistente sugere baseado nos modelos e regras do sistema.', visibleTo: ['OPERADOR', 'REVISOR', 'SECRETARIO', 'ADMIN_GERAL'] },
    { icon: ShieldCheck, title: 'Apoio na Revisão', desc: 'O assistente pode ajudar revisores a verificar formatação, identificar erros comuns e sugerir melhorias no texto.', visibleTo: ['REVISOR', 'ADMIN_GERAL'] },
    { icon: Zap, title: 'Ações Automatizadas', desc: 'O assistente pode criar, editar e excluir portarias e variáveis quando solicitado via chat (com ferramentas integradas ao backend).', visibleTo: ['OPERADOR', 'REVISOR', 'SECRETARIO', 'PREFEITO', 'ADMIN_GERAL'] },
    { icon: Sparkles, title: 'Geração de Texto', desc: 'Peça à IA para sugerir textos para portarias, justificativas, ou qualquer conteúdo necessário nos documentos.', visibleTo: ['OPERADOR', 'REVISOR', 'ADMIN_GERAL'] },
    { icon: Brain, title: 'Treinamento Personalizado', desc: 'Admin pode injetar prompts customizados que alteram o comportamento da IA em todas as conversas. 6 categorias de prompt disponíveis.', visibleTo: ['ADMIN_GERAL'] },
    { icon: Database, title: 'Múltiplos Provedores LLM', desc: 'O sistema suporta Cerebras e Mistral como provedores. Admin gerencia API keys, monitora requisições e testa no playground.', visibleTo: ['ADMIN_GERAL'] },
    { icon: Lock, title: 'Pool de Chaves API', desc: 'Sistema de pool com múltiplas API keys por provedor para garantir disponibilidade e balancear carga automaticamente.', visibleTo: ['ADMIN_GERAL'] },
]

// ══════════════════════════════════════════════════════════════════════════════
// TIPS PER ROLE
// ══════════════════════════════════════════════════════════════════════════════

const DICAS: Record<string, string[]> = {
    OPERADOR: ['O número é gerado automaticamente ao submeter.', 'Rascunhos podem ser editados à vontade.', 'Leia o comentário do Revisor antes de corrigir.', 'Use o assistente IA para tirar dúvidas.'],
    REVISOR: ['Só pega portaria se ninguém assumiu.', 'Rejeição exige comentário obrigatório.', 'Transferência exige justificativa.', 'Peça ajuda ao assistente IA na análise.'],
    SECRETARIO: ['Portarias da sua secretaria ficam sempre visíveis.', 'A aprovação avança direto para assinatura.'],
    PREFEITO: ['Apenas você pode fazer a assinatura oficial.', 'Acesso de leitura a todas as secretarias.'],
    ADMIN_GERAL: ['Defina a secretaria ao liberar servidor.', 'Prompts de IA valem para todas as conversas.', 'Variáveis globais valem para todos os modelos.', 'Monitore a saúde dos provedores LLM regularmente.'],
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

function TutorialPage() {
    const usuario = useAuthStore(s => s.usuario)
    const role = (usuario?.role ?? 'OPERADOR') as string
    const isAdmin = role === 'ADMIN_GERAL'
    const features = FEATURES_POR_ROLE[role] ?? FEATURES_POR_ROLE['OPERADOR']
    const dicas = DICAS[role] ?? DICAS['OPERADOR']
    const roleBadge = ROLE_BADGES[role]
    const [openFlow, setOpenFlow] = useState<string | null>('portaria')

    // Filter sections by role
    const visibleFlows = FLOW_SECTIONS.filter(s => isVisible(role, s.visibleTo))
    const visibleIA = IA_CAPABILITIES.filter(c => isVisible(role, c.visibleTo))

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-16">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="border-l-4 border-[#1351b4] pl-4">
                    <h2 className="text-3xl font-bold tracking-tight text-[#333333]">Guia do Sistema</h2>
                    <p className="text-base text-[#555555] font-medium mt-1">
                        {isAdmin
                            ? 'Visão completa de todos os fluxos e funcionalidades do Doc\'s Cataguases.'
                            : `Tutorial personalizado para o seu papel como ${ROLE_LABELS[role]}.`
                        }
                    </p>
                </div>
                {roleBadge && (
                    <div className="flex items-center gap-2 shrink-0 bg-white border border-[#e6e6e6] px-4 py-2">
                        <BookOpen className="h-4 w-4 text-[#1351b4]" />
                        <span className={`text-xs font-bold px-2 py-0.5 border ${roleBadge.cor}`}>{ROLE_LABELS[role]}</span>
                        {isAdmin && <span className="text-[9px] text-[#555555] font-medium">(visão completa)</span>}
                    </div>
                )}
            </div>

            {/* ── Funcionalidades do seu papel ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#1351b4]" />
                    <h2 className="text-base font-bold text-[#071D41]">
                        {isAdmin ? 'Todas as Funcionalidades' : `O que você pode fazer — ${ROLE_LABELS[role]}`}
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {features.map((feat, i) => {
                        const Icon = feat.icon
                        return (
                            <div key={i} className="bg-white border border-[#e6e6e6] p-4 flex gap-3 hover:bg-[#f0f4f8] transition-colors">
                                <div className="w-9 h-9 rounded flex items-center justify-center bg-[#edf5ff] shrink-0">
                                    <Icon className="h-4 w-4 text-[#1351b4]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-[#333333]">{feat.title}</p>
                                    <p className="text-xs text-[#555555] leading-relaxed mt-0.5">{feat.desc}</p>
                                    {feat.link && feat.linkLabel && (
                                        <Link to={feat.link as any} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1351b4] hover:underline mt-1">
                                            {feat.linkLabel} <ArrowRight className="h-2.5 w-2.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── IA & Chatbot ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#6730a3]" />
                    <h2 className="text-base font-bold text-[#071D41]">
                        <Bot className="h-4 w-4 inline mr-1 text-[#6730a3]" />
                        Inteligência Artificial & Assistente
                    </h2>
                </div>
                <p className="text-sm text-[#555555] ml-3">
                    O sistema possui um assistente de IA integrado que utiliza modelos de linguagem (LLMs) para ajudar em diversas tarefas.
                    {isAdmin && ' Como Admin Geral, você tem acesso total à configuração e treinamento da IA.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleIA.map((cap, i) => {
                        const Icon = cap.icon
                        return (
                            <div key={i} className="bg-white border border-[#e6e6e6] p-4 flex gap-3">
                                <div className="w-9 h-9 rounded flex items-center justify-center bg-[#f3f0ff] shrink-0">
                                    <Icon className="h-4 w-4 text-[#6730a3]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#333333]">{cap.title}</p>
                                    <p className="text-xs text-[#555555] leading-relaxed mt-0.5">{cap.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* LLM Info box (Admin only) */}
                {isAdmin && (
                    <div className="bg-[#f3f0ff] border border-[#6730a3] p-4 flex items-start gap-3">
                        <Brain className="h-5 w-5 text-[#6730a3] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-[#6730a3]">Provedores LLM Configuráveis</p>
                            <p className="text-xs text-[#555555] leading-relaxed mt-1">
                                O sistema suporta <strong>Cerebras</strong> e <strong>Mistral</strong> como provedores de IA.
                                Em <strong>/admin/llm</strong> você pode: adicionar API keys, monitorar o uso, verificar saúde do pool e testar modelos no playground.
                                Em <strong>/admin/ia</strong> você pode: criar prompts de treinamento com 6 categorias (Sistema, Portaria, Revisão, Chat Geral, Modelo, Custom) que são injetados automaticamente nas conversas.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Fluxogramas ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#008833]" />
                    <h2 className="text-base font-bold text-[#071D41]">Fluxogramas do Sistema</h2>
                </div>
                <p className="text-sm text-[#555555] ml-3">
                    {isAdmin ? 'Todos os fluxos do sistema.' : 'Fluxos relevantes para o seu papel.'} Clique para expandir. Clique nos nós para destacar.
                </p>

                <div className="space-y-2">
                    {visibleFlows.map(section => {
                        const isOpen = openFlow === section.id
                        const Icon = section.icon
                        return (
                            <div key={section.id} className="border border-[#e6e6e6] bg-white overflow-hidden">
                                <button
                                    onClick={() => setOpenFlow(isOpen ? null : section.id)}
                                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#f0f4f8] transition-colors"
                                >
                                    <div className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: section.accent + '15' }}>
                                        <Icon className="h-5 w-5" style={{ color: section.accent }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-[#333333]">{section.title}</p>
                                        <p className="text-xs text-[#555555] truncate">{section.subtitle}</p>
                                    </div>
                                    <ChevronDown className={`h-5 w-5 text-[#555555] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && (
                                    <div className="border-t border-[#e6e6e6] animate-in slide-in-from-top-2 duration-200">
                                        <section.component />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── Dicas ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#d4a017]" />
                    <h2 className="text-base font-bold text-[#071D41]">Dicas para o dia a dia</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dicas.map((dica, i) => (
                        <div key={i} className="bg-[#fffbea] border border-[#f0d060] p-4 flex items-start gap-3">
                            <CheckCircle2 className="h-4 w-4 text-[#7d5c00] mt-0.5 shrink-0" />
                            <p className="text-sm text-[#555533] leading-relaxed">{dica}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Níveis de acesso (Admin vê todos) ── */}
            {isAdmin && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#555555]" />
                        <h2 className="text-base font-bold text-[#071D41]">Todos os Níveis de Acesso</h2>
                    </div>
                    <div className="border border-[#e6e6e6] bg-white divide-y divide-[#f0f0f0]">
                        {Object.entries(ROLE_BADGES).map(([key, r]) => (
                            <div key={key} className="flex items-start gap-4 p-4">
                                <span className={`text-xs font-bold px-2 py-0.5 border shrink-0 whitespace-nowrap ${r.cor}`}>{ROLE_LABELS[key]}</span>
                                <div className="flex-1">
                                    <p className="text-sm text-[#555555] leading-relaxed">{r.desc}</p>
                                    <p className="text-[10px] text-[#888888] mt-1">
                                        {(FEATURES_POR_ROLE[key] ?? []).length} funcionalidades · {IA_CAPABILITIES.filter(c => c.visibleTo.includes(key)).length} recursos IA
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <p className="text-xs text-center text-[#aaaaaa]">Dúvidas? Fale com o Administrador do sistema ou use o assistente de IA.</p>
        </div>
    )
}
