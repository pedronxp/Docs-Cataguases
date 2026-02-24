import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

export class NumeracaoService {
    /**
     * Aloca o próximo número oficial para um documento de forma atômica.
     * Se já houver um número alocado (caso de reprocessamento), retorna o existente.
     */
    static async alocarNumero(
        secretariaId: string,
        setorId: string | null = null
    ): Promise<Result<string>> {
        const anoCorrente = new Date().getFullYear()

        try {
            return await prisma.$transaction(async (tx) => {
                // 1. SELECT FOR UPDATE - Trava a linha para evitar duplicidade concorrente
                const livros = await tx.$queryRaw<any[]>`
                    SELECT id, "proximoNumero", formato
                    FROM "LivroNumeracao"
                    WHERE "secretariaId" = ${secretariaId}
                      AND "setorId" IS NOT DISTINCT FROM ${setorId}
                      AND ano = ${anoCorrente}
                    FOR UPDATE
                `

                let livro = livros[0]

                // 2. Se não existir, cria o livro inicial para o ano
                if (!livro) {
                    livro = await tx.livroNumeracao.create({
                        data: {
                            secretariaId,
                            setorId,
                            ano: anoCorrente,
                            proximoNumero: 1,
                            formato: 'XXX/YYYY', // Padrão
                        },
                    })
                }

                // 3. Incrementa o número atomicamente
                const numeroAlocado = livro.proximoNumero
                await tx.$executeRaw`
                    UPDATE "LivroNumeracao"
                    SET "proximoNumero" = "proximoNumero" + 1
                    WHERE id = ${livro.id}
                `

                // 4. Formata o número (ex: 001/2026/SEMAD)
                const numeroFormatado = this.formatar(
                    numeroAlocado,
                    anoCorrente,
                    livro.formato
                )

                return ok(numeroFormatado)
            })
        } catch (error) {
            console.error('Erro ao alocar número oficial:', error)
            return err('Falha técnica ao gerar numeração oficial. Tente novamente.')
        }
    }

    /**
     * Formata o número seguindo a máscara definida no Livro.
     */
    private static formatar(numero: number, ano: number, formato: string): string {
        const padNumero = String(numero).padStart(3, '0')
        const padAno = String(ano)

        return formato
            .replace('{N}', padNumero)
            .replace('{ANO}', padAno)
    }
}
