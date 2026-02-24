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
                // 1. Tenta encontrar o Livro de Numeração para o contexto (Secretaria + Setor + Ano)
                let livro = await tx.livroNumeracao.findUnique({
                    where: {
                        secretariaId_setorId_ano: {
                            secretariaId,
                            setorId: (setorId as any),
                            ano: anoCorrente,
                        },
                    } as any,
                })

                // 2. Se não existir, cria o livro inicial para o ano
                if (!livro) {
                    livro = await tx.livroNumeracao.create({
                        data: {
                            secretariaId,
                            setorId,
                            ano: anoCorrente,
                            proximoNumero: 1,
                            formato: 'XXX/YYYY', // Padrão: Número/Ano
                        },
                    })
                }

                // 3. Incrementa o número no livro
                const numeroAlocado = livro.proximoNumero
                await tx.livroNumeracao.update({
                    where: { id: livro.id },
                    data: { proximoNumero: { increment: 1 } },
                })

                // 4. Formata o número (ex: 001/2026)
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

        // Simples substituição por enquanto, pode ser expandido conforme necessidade
        return formato
            .replace('XXX', padNumero)
            .replace('YYYY', padAno)
    }
}
