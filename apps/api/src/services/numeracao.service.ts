import prisma from '@/lib/prisma'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export class NumeracaoService {

    /**
     * Aloca o próximo número oficial de forma atômica utilizando "SELECT FOR UPDATE" do Postgres.
     */
    static async alocarNumero(portariaId: string, tipoDocumento: string, autorId: string, ip: string): Promise<Result<string>> {
        try {
            // Tenta criar o livro caso não exista ANTES de abrir a transação pesada (evita timeout de lock/create concorrente)
            try {
                const existe = await prisma.livrosNumeracao.findUnique({ where: { tipoDocumento: tipoDocumento as any }})
                if (!existe) {
                    await prisma.livrosNumeracao.create({
                        data: {
                            nome: `Livro Principal - ${tipoDocumento}`,
                            tipoDocumento: tipoDocumento as any,
                            formato_base: 'PORT-{N}/{ANO}',
                            proximo_numero: 1,
                            ativo: true
                        }
                    })
                }
            } catch (ignore) {
                // Se der erro de UniqueConstraint na criação concorrida, apenas ignora
            }

            return await prisma.$transaction(async (tx) => {
                const livros = await tx.$queryRaw<any[]>`
                    SELECT id, nome, "formato_base", "proximo_numero", logs
                    FROM "LivrosNumeracao"
                    WHERE ativo = true
                    AND "tipoDocumento" = ${tipoDocumento}::"TipoDocumento"
                    LIMIT 1
                    FOR UPDATE
                `

                if (!livros || livros.length === 0) {
                    throw new Error('Não foi possível encontrar ou travar o livro de numeração.')
                }

                let livro = livros[0]
                const numeroAlocado = livro.proximo_numero
                const anoAtual = new Date().getFullYear()

                const logEntry = {
                    portariaId,
                    numero: numeroAlocado,
                    autor: autorId,
                    data: new Date().toISOString(),
                    ip
                }

                const parseLogs = (l: any) => {
                    if (!l) return []
                    if (typeof l === 'string') {
                        try { return JSON.parse(l) } catch { return [] }
                    }
                    if (Array.isArray(l)) return l
                    return []
                }
                const historico = parseLogs(livro.logs)
                const novoLogs = [...historico, logEntry]

                // Atualiza proximo_numero no banco
                await tx.$executeRaw`
                    UPDATE "LivrosNumeracao"
                    SET "proximo_numero" = ${numeroAlocado + 1},
                        logs = ${JSON.stringify(novoLogs)}::jsonb,
                        "atualizado_em" = NOW()
                    WHERE id = ${livro.id}
                `

                // Exemplo: 001/2024
                const numeroFormatado = String(numeroAlocado).padStart(3, '0') // 3 dígitos
                const numeroOficialFinal = livro.formato_base
                    .replace(/\{N\}|\{\{NUMERO\}\}/g, numeroFormatado)
                    .replace(/\{ANO\}|\{\{ANO\}\}/g, String(anoAtual))

                return { ok: true, value: numeroOficialFinal }
            }, { timeout: 15000, maxWait: 10000 })
        } catch (error: any) {
            console.error('Erro de concorrência em Numeração:', error)
            return { ok: false, error: 'Erro de concorrência ou timeout ao gerar banco. Tente novamente.' }
        }
    }
}
