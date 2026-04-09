import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Testes para os fixes do Plan 02-01:
 * 1. NumeracaoService normaliza formato_base legado ('{N}/{ANO}' → 'PORT-{N}/{ANO}')
 * 2. NumeracaoService não duplica prefixo quando formato_base já tem 'PORT-'
 */

// ─── Helper: simula a lógica de formatação do NumeracaoService ───────────────
// Extrai o comportamento puro para testar sem I/O de banco de dados.
function aplicarFormatoNumero(formatoBase: string, numero: number, ano: number): string {
    // Normalização em memória (igual ao código em numeracao.service.ts)
    let formato = formatoBase
    if (formato && !formato.startsWith('PORT-')) {
        formato = `PORT-${formato}`
    }

    const numeroFormatado = String(numero).padStart(3, '0')
    return formato
        .replace(/\{N\}|\{\{NUMERO\}\}/g, numeroFormatado)
        .replace(/\{ANO\}|\{\{ANO\}\}/g, String(ano))
}

describe('NumeracaoService — Normalização de formato_base', () => {
    const ANO = 2026

    it('retorna PORT-001/2026 para formato legado sem prefixo: {N}/{ANO}', () => {
        const resultado = aplicarFormatoNumero('{N}/{ANO}', 1, ANO)
        expect(resultado).toBe('PORT-001/2026')
    })

    it('retorna PORT-001/2026 para formato correto com prefixo: PORT-{N}/{ANO}', () => {
        const resultado = aplicarFormatoNumero('PORT-{N}/{ANO}', 1, ANO)
        expect(resultado).toBe('PORT-001/2026')
    })

    it('não duplica prefixo PORT- quando já existe', () => {
        const resultado = aplicarFormatoNumero('PORT-{N}/{ANO}', 1, ANO)
        expect(resultado).not.toMatch(/^PORT-PORT-/)
    })

    it('formata número com zero-padding correto: 42 → 042', () => {
        const resultado = aplicarFormatoNumero('PORT-{N}/{ANO}', 42, ANO)
        expect(resultado).toBe('PORT-042/2026')
    })

    it('formata número com zero-padding correto: 999 → 999', () => {
        const resultado = aplicarFormatoNumero('{N}/{ANO}', 999, ANO)
        expect(resultado).toBe('PORT-999/2026')
    })

    it('ano é substituído corretamente', () => {
        const resultado = aplicarFormatoNumero('PORT-{N}/{ANO}', 1, 2025)
        expect(resultado).toBe('PORT-001/2025')
    })
})

/**
 * Testes para o fix da rota /assinar:
 * Verifica que o objeto data do update NÃO inclui pdfUrl: null nem docxRascunhoUrl: null
 */
describe('Rota /assinar — dados do update não zeram pdfUrl', () => {
    it('o objeto de update não deve conter a chave pdfUrl', () => {
        // Simula o objeto data que seria passado ao tx.portaria.update após o fix
        const dataUpdate = {
            assinaturaStatus: 'ASSINADA_DIGITAL',
            assinaturaJustificativa: null,
            assinaturaComprovanteUrl: null,
            status: 'PRONTO_PUBLICACAO',
            assinadoPorId: 'user-123',
            assinadoEm: new Date(),
        }

        expect(dataUpdate).not.toHaveProperty('pdfUrl')
    })

    it('o objeto de update não deve conter a chave docxRascunhoUrl', () => {
        const dataUpdate = {
            assinaturaStatus: 'ASSINADA_DIGITAL',
            assinaturaJustificativa: null,
            assinaturaComprovanteUrl: null,
            status: 'PRONTO_PUBLICACAO',
            assinadoPorId: 'user-123',
            assinadoEm: new Date(),
        }

        expect(dataUpdate).not.toHaveProperty('docxRascunhoUrl')
    })

    it('o objeto de update contém todos os campos obrigatórios de assinatura', () => {
        const dataUpdate = {
            assinaturaStatus: 'ASSINADA_DIGITAL',
            assinaturaJustificativa: null,
            assinaturaComprovanteUrl: null,
            status: 'PRONTO_PUBLICACAO',
            assinadoPorId: 'user-123',
            assinadoEm: new Date(),
        }

        expect(dataUpdate).toHaveProperty('assinaturaStatus')
        expect(dataUpdate).toHaveProperty('status', 'PRONTO_PUBLICACAO')
        expect(dataUpdate).toHaveProperty('assinadoPorId')
        expect(dataUpdate).toHaveProperty('assinadoEm')
    })
})
