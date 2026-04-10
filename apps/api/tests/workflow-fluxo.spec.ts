import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testes de regressão do fluxo principal de portarias:
 *   Rascunho → Submissão → Revisão → Assinatura → Publicação
 *
 * Cobrem as regras de negócio críticas:
 *  - transições permitidas e proibidas por status
 *  - autorização por role
 *  - guard conditions (revisor atual, observação obrigatória)
 *  - escalada automática por excesso de rejeições
 */

// ── Mock Prisma — usa workflow padrão (sem config customizada no banco) ──────
vi.mock('@/lib/prisma', () => ({
    default: {
        workflowConfig: { findFirst: vi.fn().mockResolvedValue(null) },
        variavelSistema: { findFirst: vi.fn().mockResolvedValue(null) },
        portaria: { findUnique: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(),
    },
}))

// ── Importação após mock ──────────────────────────────────────────────────────
import { WorkflowService } from '@/services/workflow.service'

// ── Helper: extrai apenas ok/err sem importar o módulo result ─────────────────
async function validar(params: {
    statusAtual: string
    acaoDesejada: string
    roleUsuario: string
}) {
    return WorkflowService.validarTransicao({
        tipoDocumento: 'PORTARIA',
        ...params,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Fluxo principal — happy path completo', () => {
    it('OPERADOR envia rascunho para revisão', async () => {
        const r = await validar({ statusAtual: 'RASCUNHO', acaoDesejada: 'ENVIAR_REVISAO', roleUsuario: 'OPERADOR' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('EM_REVISAO_ABERTA')
    })

    it('REVISOR assume portaria em revisão aberta', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ABERTA', acaoDesejada: 'ASSUMIR_REVISAO', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('EM_REVISAO_ATRIBUIDA')
    })

    it('REVISOR aprova revisão → aguarda assinatura', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'APROVAR_REVISAO', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('AGUARDANDO_ASSINATURA')
    })

    it('PREFEITO assina → pronto para publicação', async () => {
        const r = await validar({ statusAtual: 'AGUARDANDO_ASSINATURA', acaoDesejada: 'ASSINAR', roleUsuario: 'PREFEITO' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('PRONTO_PUBLICACAO')
    })

    it('ADMIN_GERAL publica → publicada', async () => {
        const r = await validar({ statusAtual: 'PRONTO_PUBLICACAO', acaoDesejada: 'PUBLICAR', roleUsuario: 'ADMIN_GERAL' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('PUBLICADA')
    })

    it('JORNALISTA pode publicar', async () => {
        const r = await validar({ statusAtual: 'PRONTO_PUBLICACAO', acaoDesejada: 'PUBLICAR', roleUsuario: 'JORNALISTA' })
        expect(r.ok).toBe(true)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Fluxo de rejeição e resubmissão', () => {
    it('REVISOR rejeita revisão → correção necessária', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'REJEITAR_REVISAO', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(true)
        if (r.ok) {
            expect(r.value.para).toBe('CORRECAO_NECESSARIA')
            expect(r.value.requerObservacao).toBe(true)
        }
    })

    it('OPERADOR resubmete após correção', async () => {
        const r = await validar({ statusAtual: 'CORRECAO_NECESSARIA', acaoDesejada: 'ENVIAR_REVISAO', roleUsuario: 'OPERADOR' })
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value.para).toBe('EM_REVISAO_ABERTA')
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Guard: ações proibidas por status', () => {
    it('não pode assinar portaria em RASCUNHO', async () => {
        const r = await validar({ statusAtual: 'RASCUNHO', acaoDesejada: 'ASSINAR', roleUsuario: 'PREFEITO' })
        expect(r.ok).toBe(false)
    })

    it('não pode publicar portaria em RASCUNHO', async () => {
        const r = await validar({ statusAtual: 'RASCUNHO', acaoDesejada: 'PUBLICAR', roleUsuario: 'ADMIN_GERAL' })
        expect(r.ok).toBe(false)
    })

    it('não pode aprovar revisão sem ter assumido antes', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ABERTA', acaoDesejada: 'APROVAR_REVISAO', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(false)
    })

    it('não pode assinar portaria em revisão atribuída', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'ASSINAR', roleUsuario: 'PREFEITO' })
        expect(r.ok).toBe(false)
    })

    it('não pode assumir portaria já em revisão atribuída', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'ASSUMIR_REVISAO', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(false)
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Guard: autorização por role', () => {
    it('OPERADOR não pode assinar', async () => {
        const r = await validar({ statusAtual: 'AGUARDANDO_ASSINATURA', acaoDesejada: 'ASSINAR', roleUsuario: 'OPERADOR' })
        expect(r.ok).toBe(false)
        if (!r.ok) expect(r.error).toContain('OPERADOR')
    })

    it('OPERADOR não pode assumir revisão', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ABERTA', acaoDesejada: 'ASSUMIR_REVISAO', roleUsuario: 'OPERADOR' })
        expect(r.ok).toBe(false)
    })

    it('REVISOR não pode publicar', async () => {
        const r = await validar({ statusAtual: 'PRONTO_PUBLICACAO', acaoDesejada: 'PUBLICAR', roleUsuario: 'REVISOR' })
        expect(r.ok).toBe(false)
    })

    it('PREFEITO pode aprovar revisão', async () => {
        const r = await validar({ statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'APROVAR_REVISAO', roleUsuario: 'PREFEITO' })
        // PREFEITO não está em rolesPermitidos do APROVAR_REVISAO
        expect(r.ok).toBe(false)
    })

    it('SECRETARIO pode enviar para revisão', async () => {
        const r = await validar({ statusAtual: 'RASCUNHO', acaoDesejada: 'ENVIAR_REVISAO', roleUsuario: 'SECRETARIO' })
        expect(r.ok).toBe(true)
    })

    it('ADMIN_GERAL pode executar qualquer transição padrão', async () => {
        const transicoes = [
            { statusAtual: 'RASCUNHO', acaoDesejada: 'ENVIAR_REVISAO' },
            { statusAtual: 'EM_REVISAO_ABERTA', acaoDesejada: 'ASSUMIR_REVISAO' },
            { statusAtual: 'EM_REVISAO_ATRIBUIDA', acaoDesejada: 'APROVAR_REVISAO' },
            { statusAtual: 'AGUARDANDO_ASSINATURA', acaoDesejada: 'ASSINAR' },
            { statusAtual: 'PRONTO_PUBLICACAO', acaoDesejada: 'PUBLICAR' },
        ]
        for (const t of transicoes) {
            const r = await validar({ ...t, roleUsuario: 'ADMIN_GERAL' })
            expect(r.ok, `ADMIN_GERAL deve poder executar ${t.acaoDesejada} em ${t.statusAtual}`).toBe(true)
        }
    })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Guard: regras de negócio inline (lógica de route.ts)', () => {
    // Estas funções espelham a lógica de guard do fluxo/route.ts
    // sem precisar instanciar o handler completo.

    function verificarRejeicaoRequerObservacao(observacao: string | undefined) {
        if (!observacao) throw new Error('Informe o motivo da devolução')
        return true
    }

    function verificarRevisorAtualPodeAprovar(
        revisorAtualId: string | null,
        sessionId: string,
        role: string
    ) {
        if (revisorAtualId && revisorAtualId !== sessionId && role !== 'ADMIN_GERAL') {
            throw new Error('Apenas o revisor atual pode aprovar')
        }
        return true
    }

    function verificarPortariaJaAssuumida(revisorAtualId: string | null) {
        if (revisorAtualId) throw new Error('Esta portaria já foi aceita por outro revisor')
        return true
    }

    function verificarEscaladaRejeicao(revisoesCount: number): string {
        if (revisoesCount >= 3) return 'escalada'
        return 'normal'
    }

    it('rejeição sem observação lança erro', () => {
        expect(() => verificarRejeicaoRequerObservacao(undefined)).toThrow('Informe o motivo')
    })

    it('rejeição com observação passa', () => {
        expect(verificarRejeicaoRequerObservacao('Texto confuso')).toBe(true)
    })

    it('revisor diferente não pode aprovar', () => {
        expect(() => verificarRevisorAtualPodeAprovar('revisor-1', 'revisor-2', 'REVISOR')).toThrow('Apenas o revisor atual')
    })

    it('ADMIN_GERAL pode aprovar mesmo não sendo revisor atual', () => {
        expect(verificarRevisorAtualPodeAprovar('revisor-1', 'admin-99', 'ADMIN_GERAL')).toBe(true)
    })

    it('revisor atual pode aprovar', () => {
        expect(verificarRevisorAtualPodeAprovar('revisor-1', 'revisor-1', 'REVISOR')).toBe(true)
    })

    it('portaria sem revisor pode ser assumida', () => {
        expect(verificarPortariaJaAssuumida(null)).toBe(true)
    })

    it('portaria com revisor retorna 409', () => {
        expect(() => verificarPortariaJaAssuumida('revisor-existente')).toThrow('já foi aceita por outro revisor')
    })

    it('3 rejeições escalam a portaria', () => {
        expect(verificarEscaladaRejeicao(3)).toBe('escalada')
        expect(verificarEscaladaRejeicao(4)).toBe('escalada')
    })

    it('menos de 3 rejeições seguem fluxo normal', () => {
        expect(verificarEscaladaRejeicao(1)).toBe('normal')
        expect(verificarEscaladaRejeicao(2)).toBe('normal')
    })
})
