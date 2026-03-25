/**
 * WorkflowService — Engine de Workflow Customizável para tramitação de documentos.
 *
 * Permite configurar etapas personalizadas por tipo de documento ou secretaria.
 * Cada workflow define: estados, transições permitidas, roles autorizados e ações automáticas.
 *
 * Workflow padrão:
 *   RASCUNHO → EM_REVISAO_ABERTA → EM_REVISAO_ATRIBUIDA → AGUARDANDO_ASSINATURA → PRONTO_PUBLICACAO → PUBLICADA
 *
 * Workflows customizados podem pular etapas (ex: Memorandos não precisam de assinatura).
 */

import prisma from '@/lib/prisma'
import { ok, err, Result } from '@/lib/result'
import { CacheService, CACHE_TTL } from './cache.service'

// ── Tipos ───────────────────────────────────────────────────────────────────

export interface WorkflowEstado {
    id: string
    nome: string
    label: string
    cor: string
    icone: string
    ordem: number
    tipo: 'INICIO' | 'INTERMEDIARIO' | 'FIM' | 'ERRO'
}

export interface WorkflowTransicao {
    de: string           // estado origem
    para: string         // estado destino
    acao: string         // ex: 'submeter', 'aprovar', 'assinar', 'publicar', 'rejeitar'
    label: string        // ex: 'Submeter para Revisão'
    rolesPermitidos: string[]  // roles que podem executar
    requerObservacao: boolean  // se precisa de justificativa
    acaoAutomatica?: string    // hook a executar (ex: 'notificar_revisores', 'gerar_pdf')
}

export interface WorkflowConfig {
    id: string
    nome: string
    descricao: string
    tipoDocumento: string  // PORTARIA, MEMORANDO, OFICIO, LEI
    secretariaId?: string  // null = global (todas), string = específico da secretaria
    ativo: boolean
    estados: WorkflowEstado[]
    transicoes: WorkflowTransicao[]
    criadoEm: string
    atualizadoEm: string
}

// ── Workflow Padrão (hardcoded como fallback) ───────────────────────────────

const ESTADOS_PADRAO: WorkflowEstado[] = [
    { id: 'RASCUNHO', nome: 'RASCUNHO', label: 'Rascunho', cor: '#94a3b8', icone: 'FileEdit', ordem: 0, tipo: 'INICIO' },
    { id: 'EM_REVISAO_ABERTA', nome: 'EM_REVISAO_ABERTA', label: 'Aguardando Revisor', cor: '#60a5fa', icone: 'Eye', ordem: 1, tipo: 'INTERMEDIARIO' },
    { id: 'EM_REVISAO_ATRIBUIDA', nome: 'EM_REVISAO_ATRIBUIDA', label: 'Em Revisão', cor: '#3b82f6', icone: 'UserCheck', ordem: 2, tipo: 'INTERMEDIARIO' },
    { id: 'CORRECAO_NECESSARIA', nome: 'CORRECAO_NECESSARIA', label: 'Correção Necessária', cor: '#f59e0b', icone: 'AlertTriangle', ordem: 3, tipo: 'INTERMEDIARIO' },
    { id: 'AGUARDANDO_ASSINATURA', nome: 'AGUARDANDO_ASSINATURA', label: 'Aguardando Assinatura', cor: '#8b5cf6', icone: 'PenTool', ordem: 4, tipo: 'INTERMEDIARIO' },
    { id: 'PRONTO_PUBLICACAO', nome: 'PRONTO_PUBLICACAO', label: 'Pronto para Publicação', cor: '#06b6d4', icone: 'CheckCircle', ordem: 5, tipo: 'INTERMEDIARIO' },
    { id: 'PUBLICADA', nome: 'PUBLICADA', label: 'Publicada', cor: '#10b981', icone: 'Globe', ordem: 6, tipo: 'FIM' },
    { id: 'FALHA_PROCESSAMENTO', nome: 'FALHA_PROCESSAMENTO', label: 'Falha no Processamento', cor: '#f87171', icone: 'XCircle', ordem: 99, tipo: 'ERRO' },
]

const TRANSICOES_PADRAO: WorkflowTransicao[] = [
    {
        de: 'RASCUNHO', para: 'EM_REVISAO_ABERTA', acao: 'submeter',
        label: 'Submeter para Revisão', rolesPermitidos: ['OPERADOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'notificar_revisores'
    },
    {
        de: 'EM_REVISAO_ABERTA', para: 'EM_REVISAO_ATRIBUIDA', acao: 'atribuir',
        label: 'Assumir Revisão', rolesPermitidos: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false
    },
    {
        de: 'EM_REVISAO_ATRIBUIDA', para: 'AGUARDANDO_ASSINATURA', acao: 'aprovar_revisao',
        label: 'Aprovar Revisão', rolesPermitidos: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'gerar_pdf'
    },
    {
        de: 'EM_REVISAO_ATRIBUIDA', para: 'CORRECAO_NECESSARIA', acao: 'solicitar_correcao',
        label: 'Solicitar Correção', rolesPermitidos: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: true
    },
    {
        de: 'CORRECAO_NECESSARIA', para: 'EM_REVISAO_ABERTA', acao: 'resubmeter',
        label: 'Resubmeter', rolesPermitidos: ['OPERADOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false
    },
    {
        de: 'AGUARDANDO_ASSINATURA', para: 'PRONTO_PUBLICACAO', acao: 'assinar',
        label: 'Assinar Documento', rolesPermitidos: ['PREFEITO', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'registrar_assinatura'
    },
    {
        de: 'PRONTO_PUBLICACAO', para: 'PUBLICADA', acao: 'publicar',
        label: 'Publicar no Diário Oficial', rolesPermitidos: ['ADMIN_GERAL', 'PREFEITO'],
        requerObservacao: false, acaoAutomatica: 'numerar_e_publicar'
    },
    {
        de: 'AGUARDANDO_ASSINATURA', para: 'RASCUNHO', acao: 'rejeitar',
        label: 'Rejeitar', rolesPermitidos: ['PREFEITO', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: true
    },
    {
        de: 'FALHA_PROCESSAMENTO', para: 'PROCESSANDO', acao: 'retry',
        label: 'Tentar Novamente', rolesPermitidos: ['ADMIN_GERAL'],
        requerObservacao: false
    },
]

const WORKFLOW_PADRAO: Omit<WorkflowConfig, 'id' | 'criadoEm' | 'atualizadoEm'> = {
    nome: 'Workflow Padrão - Portarias',
    descricao: 'Fluxo padrão de tramitação: Rascunho → Revisão → Assinatura → Publicação',
    tipoDocumento: 'PORTARIA',
    ativo: true,
    estados: ESTADOS_PADRAO,
    transicoes: TRANSICOES_PADRAO,
}

// ── Presets ─────────────────────────────────────────────────────────────────

const ESTADOS_SIMPLES: WorkflowEstado[] = [
    { id: 'RASCUNHO', nome: 'RASCUNHO', label: 'Rascunho', cor: '#94a3b8', icone: 'FileEdit', ordem: 0, tipo: 'INICIO' },
    { id: 'PRONTO_PUBLICACAO', nome: 'PRONTO_PUBLICACAO', label: 'Pronto para Publicação', cor: '#06b6d4', icone: 'CheckCircle', ordem: 1, tipo: 'INTERMEDIARIO' },
    { id: 'PUBLICADA', nome: 'PUBLICADA', label: 'Publicada', cor: '#10b981', icone: 'Globe', ordem: 2, tipo: 'FIM' },
]

const TRANSICOES_SIMPLES: WorkflowTransicao[] = [
    {
        de: 'RASCUNHO', para: 'PRONTO_PUBLICACAO', acao: 'submeter',
        label: 'Submeter para Publicação', rolesPermitidos: ['OPERADOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false,
    },
    {
        de: 'PRONTO_PUBLICACAO', para: 'PUBLICADA', acao: 'publicar',
        label: 'Publicar', rolesPermitidos: ['SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'numerar_e_publicar',
    },
    {
        de: 'PRONTO_PUBLICACAO', para: 'RASCUNHO', acao: 'rejeitar',
        label: 'Rejeitar', rolesPermitidos: ['SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: true,
    },
]

const ESTADOS_RIGOROSO: WorkflowEstado[] = [
    { id: 'RASCUNHO', nome: 'RASCUNHO', label: 'Rascunho', cor: '#94a3b8', icone: 'FileEdit', ordem: 0, tipo: 'INICIO' },
    { id: 'EM_REVISAO_ABERTA', nome: 'EM_REVISAO_ABERTA', label: 'Aguardando Revisor', cor: '#60a5fa', icone: 'Eye', ordem: 1, tipo: 'INTERMEDIARIO' },
    { id: 'EM_REVISAO_ATRIBUIDA', nome: 'EM_REVISAO_ATRIBUIDA', label: 'Em Revisão Técnica', cor: '#3b82f6', icone: 'UserCheck', ordem: 2, tipo: 'INTERMEDIARIO' },
    { id: 'CORRECAO_NECESSARIA', nome: 'CORRECAO_NECESSARIA', label: 'Correção Necessária', cor: '#f59e0b', icone: 'AlertTriangle', ordem: 3, tipo: 'INTERMEDIARIO' },
    { id: 'REVISAO_CHEFIA', nome: 'REVISAO_CHEFIA', label: 'Revisão da Chefia', cor: '#a78bfa', icone: 'Shield', ordem: 4, tipo: 'INTERMEDIARIO' },
    { id: 'AGUARDANDO_ASSINATURA', nome: 'AGUARDANDO_ASSINATURA', label: 'Aguardando Assinatura', cor: '#8b5cf6', icone: 'PenTool', ordem: 5, tipo: 'INTERMEDIARIO' },
    { id: 'PRONTO_PUBLICACAO', nome: 'PRONTO_PUBLICACAO', label: 'Pronto para Publicação', cor: '#06b6d4', icone: 'CheckCircle', ordem: 6, tipo: 'INTERMEDIARIO' },
    { id: 'PUBLICADA', nome: 'PUBLICADA', label: 'Publicada', cor: '#10b981', icone: 'Globe', ordem: 7, tipo: 'FIM' },
    { id: 'FALHA_PROCESSAMENTO', nome: 'FALHA_PROCESSAMENTO', label: 'Falha no Processamento', cor: '#f87171', icone: 'XCircle', ordem: 99, tipo: 'ERRO' },
]

const TRANSICOES_RIGOROSO: WorkflowTransicao[] = [
    {
        de: 'RASCUNHO', para: 'EM_REVISAO_ABERTA', acao: 'submeter',
        label: 'Submeter para Revisão Técnica', rolesPermitidos: ['OPERADOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'notificar_revisores',
    },
    {
        de: 'EM_REVISAO_ABERTA', para: 'EM_REVISAO_ATRIBUIDA', acao: 'atribuir',
        label: 'Assumir Revisão Técnica', rolesPermitidos: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false,
    },
    {
        de: 'EM_REVISAO_ATRIBUIDA', para: 'CORRECAO_NECESSARIA', acao: 'solicitar_correcao',
        label: 'Solicitar Correção', rolesPermitidos: ['REVISOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: true,
    },
    {
        de: 'CORRECAO_NECESSARIA', para: 'EM_REVISAO_ABERTA', acao: 'resubmeter',
        label: 'Resubmeter após Correção', rolesPermitidos: ['OPERADOR', 'SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false,
    },
    {
        de: 'EM_REVISAO_ATRIBUIDA', para: 'REVISAO_CHEFIA', acao: 'aprovar_tecnico',
        label: 'Aprovar (Técnico) → Chefia', rolesPermitidos: ['REVISOR', 'ADMIN_GERAL'],
        requerObservacao: false,
    },
    {
        de: 'REVISAO_CHEFIA', para: 'AGUARDANDO_ASSINATURA', acao: 'aprovar_chefia',
        label: 'Aprovar (Chefia) → Assinatura', rolesPermitidos: ['SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'gerar_pdf',
    },
    {
        de: 'REVISAO_CHEFIA', para: 'CORRECAO_NECESSARIA', acao: 'rejeitar_chefia',
        label: 'Devolver para Correção', rolesPermitidos: ['SECRETARIO', 'ADMIN_GERAL'],
        requerObservacao: true,
    },
    {
        de: 'AGUARDANDO_ASSINATURA', para: 'PRONTO_PUBLICACAO', acao: 'assinar',
        label: 'Assinar Documento', rolesPermitidos: ['PREFEITO', 'ADMIN_GERAL'],
        requerObservacao: false, acaoAutomatica: 'registrar_assinatura',
    },
    {
        de: 'AGUARDANDO_ASSINATURA', para: 'RASCUNHO', acao: 'rejeitar',
        label: 'Rejeitar (Retornar ao Início)', rolesPermitidos: ['PREFEITO', 'ADMIN_GERAL'],
        requerObservacao: true,
    },
    {
        de: 'PRONTO_PUBLICACAO', para: 'PUBLICADA', acao: 'publicar',
        label: 'Publicar no Diário Oficial', rolesPermitidos: ['ADMIN_GERAL', 'PREFEITO'],
        requerObservacao: false, acaoAutomatica: 'numerar_e_publicar',
    },
]

export interface WorkflowPreset {
    id: 'SIMPLES' | 'PADRAO' | 'RIGOROSO'
    nome: string
    descricao: string
    casoDeUso: string
    cor: string
    tiposRecomendados: string[]
    config: Omit<WorkflowConfig, 'id' | 'criadoEm' | 'atualizadoEm'>
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
    {
        id: 'SIMPLES',
        nome: 'Simples',
        descricao: 'Fluxo direto sem revisão nem assinatura. Ideal para documentos internos de baixa complexidade.',
        casoDeUso: 'Memorandos, Ofícios internos, Comunicados',
        cor: '#10b981',
        tiposRecomendados: ['MEMORANDO', 'OFICIO'],
        config: {
            nome: 'Workflow Simples',
            descricao: 'Rascunho → Pronto para Publicação → Publicada',
            tipoDocumento: 'MEMORANDO',
            ativo: true,
            estados: ESTADOS_SIMPLES,
            transicoes: TRANSICOES_SIMPLES,
        },
    },
    {
        id: 'PADRAO',
        nome: 'Padrão',
        descricao: 'Fluxo com revisão técnica e assinatura. Equilíbrio entre controle e agilidade.',
        casoDeUso: 'Portarias, Resoluções, Atos Administrativos',
        cor: '#3b82f6',
        tiposRecomendados: ['PORTARIA', 'RESOLUCAO'],
        config: {
            ...WORKFLOW_PADRAO,
        },
    },
    {
        id: 'RIGOROSO',
        nome: 'Rigoroso',
        descricao: 'Fluxo com revisão dupla (técnica + chefia) e assinatura obrigatória do Prefeito.',
        casoDeUso: 'Leis, Decretos, Atos de maior impacto jurídico',
        cor: '#8b5cf6',
        tiposRecomendados: ['LEI', 'DECRETO'],
        config: {
            nome: 'Workflow Rigoroso',
            descricao: 'Rascunho → Revisão Técnica → Revisão Chefia → Assinatura → Publicação',
            tipoDocumento: 'LEI',
            ativo: true,
            estados: ESTADOS_RIGOROSO,
            transicoes: TRANSICOES_RIGOROSO,
        },
    },
]

// ── Service ─────────────────────────────────────────────────────────────────

export class WorkflowService {
    /**
     * Obtém o workflow aplicável para um documento.
     * Prioridade: 1) Workflow customizado da secretaria, 2) Workflow global do tipo, 3) Workflow padrão hardcoded.
     */
    static async obterWorkflow(tipoDocumento: string, secretariaId?: string): Promise<WorkflowConfig> {
        const cacheKey = CacheService.key('workflow', tipoDocumento, secretariaId)

        return CacheService.getOrSet(cacheKey, async () => {
            // 1. Buscar workflow específico da secretaria
            if (secretariaId) {
                const custom = await prisma.variavelSistema.findFirst({
                    where: {
                        chave: `WORKFLOW_${tipoDocumento}_${secretariaId}`,
                    }
                })
                if (custom) {
                    try {
                        return JSON.parse(custom.valor) as WorkflowConfig
                    } catch {}
                }
            }

            // 2. Buscar workflow global do tipo de documento
            const global = await prisma.variavelSistema.findFirst({
                where: {
                    chave: `WORKFLOW_${tipoDocumento}_GLOBAL`,
                }
            })
            if (global) {
                try {
                    return JSON.parse(global.valor) as WorkflowConfig
                } catch {}
            }

            // 3. Fallback: workflow padrão hardcoded
            return {
                ...WORKFLOW_PADRAO,
                id: 'padrao',
                tipoDocumento,
                criadoEm: new Date().toISOString(),
                atualizadoEm: new Date().toISOString(),
            } as WorkflowConfig
        }, CACHE_TTL.MODELOS)
    }

    /**
     * Verifica se uma transição é permitida dado o estado atual e o role do usuário.
     */
    static async validarTransicao(params: {
        tipoDocumento: string
        secretariaId?: string
        statusAtual: string
        acaoDesejada: string
        roleUsuario: string
    }): Promise<Result<WorkflowTransicao>> {
        const workflow = await this.obterWorkflow(params.tipoDocumento, params.secretariaId)

        const transicao = workflow.transicoes.find(
            t => t.de === params.statusAtual && t.acao === params.acaoDesejada
        )

        if (!transicao) {
            return err(
                `Ação "${params.acaoDesejada}" não é permitida no estado "${params.statusAtual}". ` +
                `Transições possíveis: ${workflow.transicoes
                    .filter(t => t.de === params.statusAtual)
                    .map(t => t.acao)
                    .join(', ') || 'nenhuma'}`
            )
        }

        if (!transicao.rolesPermitidos.includes(params.roleUsuario)) {
            return err(
                `Seu perfil (${params.roleUsuario}) não tem permissão para "${transicao.label}". ` +
                `Perfis autorizados: ${transicao.rolesPermitidos.join(', ')}`
            )
        }

        return ok(transicao)
    }

    /**
     * Executa a transição de estado de um documento seguindo o workflow.
     */
    static async executarTransicao(params: {
        portariaId: string
        acaoDesejada: string
        usuarioId: string
        roleUsuario: string
        observacao?: string
    }): Promise<Result<{ novoStatus: string; transicao: WorkflowTransicao }>> {
        try {
            const portaria = await prisma.portaria.findUnique({
                where: { id: params.portariaId },
                include: { modelo: true }
            })
            if (!portaria) return err('Portaria não encontrada.')

            // Validar transição
            const validacao = await this.validarTransicao({
                tipoDocumento: portaria.modelo?.tipoDocumento || 'PORTARIA',
                secretariaId: portaria.secretariaId,
                statusAtual: portaria.status,
                acaoDesejada: params.acaoDesejada,
                roleUsuario: params.roleUsuario,
            })

            if (!validacao.ok) return err(validacao.error)
            const transicao = validacao.value

            // Verificar se precisa de observação
            if (transicao.requerObservacao && !params.observacao) {
                return err(`A ação "${transicao.label}" requer uma justificativa/observação.`)
            }

            // Executar transição no banco
            const atualizada = await prisma.$transaction(async (tx: any) => {
                const p = await tx.portaria.update({
                    where: { id: params.portariaId },
                    data: { status: transicao.para }
                })

                // Registrar evento no feed
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: `WORKFLOW_${transicao.acao.toUpperCase()}`,
                        mensagem: `${transicao.label}${params.observacao ? `: ${params.observacao}` : ''}`,
                        portariaId: params.portariaId,
                        autorId: params.usuarioId,
                        secretariaId: portaria.secretariaId,
                        setorId: portaria.setorId,
                        metadata: {
                            acao: transicao.acao,
                            de: transicao.de,
                            para: transicao.para,
                            observacao: params.observacao,
                            acaoAutomatica: transicao.acaoAutomatica,
                        }
                    }
                })

                return p
            })

            // Invalidar caches relacionados
            await CacheService.invalidateByPattern('sidebar-counts:*')
            await CacheService.invalidateByPattern('analytics:*')

            return ok({
                novoStatus: transicao.para,
                transicao,
            })
        } catch (error: any) {
            console.error('[WorkflowService] Erro ao executar transição:', error)
            return err('Erro interno ao executar transição de workflow.')
        }
    }

    /**
     * Lista todas as ações disponíveis para uma portaria dado o role do usuário.
     */
    static async listarAcoesDisponiveis(params: {
        portariaId: string
        roleUsuario: string
    }): Promise<Result<WorkflowTransicao[]>> {
        try {
            const portaria = await prisma.portaria.findUnique({
                where: { id: params.portariaId },
                include: { modelo: true }
            })
            if (!portaria) return err('Portaria não encontrada.')

            const workflow = await this.obterWorkflow(
                portaria.modelo?.tipoDocumento || 'PORTARIA',
                portaria.secretariaId
            )

            const acoes = workflow.transicoes.filter(
                t => t.de === portaria.status && t.rolesPermitidos.includes(params.roleUsuario)
            )

            return ok(acoes)
        } catch (error: any) {
            return err('Erro ao listar ações disponíveis.')
        }
    }

    /**
     * Salva um workflow customizado para uma secretaria ou global.
     */
    static async salvarWorkflow(config: Partial<WorkflowConfig> & {
        tipoDocumento: string
        secretariaId?: string
    }): Promise<Result<WorkflowConfig>> {
        try {
            const chave = config.secretariaId
                ? `WORKFLOW_${config.tipoDocumento}_${config.secretariaId}`
                : `WORKFLOW_${config.tipoDocumento}_GLOBAL`

            const workflowCompleto: WorkflowConfig = {
                id: config.id || chave,
                nome: config.nome || `Workflow ${config.tipoDocumento}`,
                descricao: config.descricao || '',
                tipoDocumento: config.tipoDocumento,
                secretariaId: config.secretariaId,
                ativo: config.ativo ?? true,
                estados: config.estados || ESTADOS_PADRAO,
                transicoes: config.transicoes || TRANSICOES_PADRAO,
                criadoEm: config.criadoEm || new Date().toISOString(),
                atualizadoEm: new Date().toISOString(),
            }

            await prisma.variavelSistema.upsert({
                where: { chave },
                update: {
                    valor: JSON.stringify(workflowCompleto),
                    descricao: `Workflow: ${workflowCompleto.nome}`,
                },
                create: {
                    chave,
                    valor: JSON.stringify(workflowCompleto),
                    descricao: `Workflow: ${workflowCompleto.nome}`,
                    resolvidaAutomaticamente: false,
                }
            })

            // Invalidar cache
            await CacheService.invalidateByPattern('workflow:*')

            return ok(workflowCompleto)
        } catch (error: any) {
            console.error('[WorkflowService] Erro ao salvar workflow:', error)
            return err('Erro ao salvar configuração de workflow.')
        }
    }

    /**
     * Retorna o workflow padrão (para exibição/edição no admin).
     */
    static getWorkflowPadrao(): Omit<WorkflowConfig, 'id' | 'criadoEm' | 'atualizadoEm'> {
        return WORKFLOW_PADRAO
    }

    /**
     * Retorna os presets disponíveis (SIMPLES, PADRÃO, RIGOROSO).
     * Presets são configurações pré-definidas para acelerar a configuração de workflows.
     */
    static listarPresets(): WorkflowPreset[] {
        return WORKFLOW_PRESETS
    }

    /**
     * Aplica um preset como workflow global para um tipo de documento.
     * Sobrescreve qualquer workflow GLOBAL previamente configurado para aquele tipo.
     */
    static async aplicarPreset(params: {
        presetId: 'SIMPLES' | 'PADRAO' | 'RIGOROSO'
        tipoDocumento: string
        secretariaId?: string
    }): Promise<Result<WorkflowConfig>> {
        const preset = WORKFLOW_PRESETS.find(p => p.id === params.presetId)
        if (!preset) return err(`Preset "${params.presetId}" não encontrado.`)

        return this.salvarWorkflow({
            ...preset.config,
            tipoDocumento: params.tipoDocumento,
            secretariaId: params.secretariaId,
            nome: `${preset.nome} — ${params.tipoDocumento}${params.secretariaId ? ' (Secretaria)' : ' (Global)'}`,
        })
    }

    /**
     * Lista todos os workflows customizados salvos.
     */
    static async listarWorkflows(): Promise<Result<WorkflowConfig[]>> {
        try {
            const variaveis = await prisma.variavelSistema.findMany({
                where: {
                    chave: { startsWith: 'WORKFLOW_' }
                }
            })

            const workflows = variaveis
                .map(v => {
                    try { return JSON.parse(v.valor) as WorkflowConfig } catch { return null }
                })
                .filter(Boolean) as WorkflowConfig[]

            return ok(workflows)
        } catch (error: any) {
            return err('Erro ao listar workflows.')
        }
    }

    /**
     * Obtém o mapa visual do workflow (estados + conexões) para renderizar no frontend.
     */
    static async obterMapaVisual(tipoDocumento: string, secretariaId?: string): Promise<Result<{
        estados: WorkflowEstado[]
        transicoes: { de: string; para: string; label: string; cor: string }[]
        statusAtual?: string
    }>> {
        const workflow = await this.obterWorkflow(tipoDocumento, secretariaId)

        const mapa = {
            estados: workflow.estados.sort((a, b) => a.ordem - b.ordem),
            transicoes: workflow.transicoes.map(t => ({
                de: t.de,
                para: t.para,
                label: t.label,
                cor: workflow.estados.find(e => e.id === t.para)?.cor || '#94a3b8',
            }))
        }

        return ok(mapa)
    }
}
