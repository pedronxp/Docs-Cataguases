import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

export class NumeracaoService {
    /**
     * Aloca o próximo número oficial para uma portaria de forma atômica.
     * Segue o padrão de Livro Único e Numeração Contínua de Cataguases.
     */
    static async alocarNumeroPortaria(
        portariaId: string,
        aprovadorId: string,
        ip: string = '127.0.0.1'
    ): Promise<Result<string>> {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. SELECT FOR UPDATE - Trava o livro ativo
                // Usamos queryRaw para garantir o lock pessimista em Postgres
                const livros = await tx.$queryRaw<any[]>`
                    SELECT id, nome, "formato_base", "proximo_numero", logs
                    FROM "LivrosNumeracao"
                    WHERE ativo = true
                    ORDER BY criado_em ASC
                    LIMIT 1
                    FOR UPDATE
                `

                let livro = livros[0]

                if (!livro) {
                    // Se não existir, cria o livro padrão de Cataguases
                    livro = await tx.livrosNumeracao.create({
                        data: {
                            nome: "Numeração Geral Cataguases",
                            formato_base: "PORT-{N}/CATAGUASES",
                            proximo_numero: 1,
                            numero_inicial: 1,
                            ativo: true
                        }
                    })
                }

                const numeroAlocado = livro.proximo_numero
                const numeroFormatado = livro.formato_base.replace('{N}', String(numeroAlocado).padStart(4, '0'))

                // 2. Registra o Log de Auditoria no JSON do Livro
                const novoLog = {
                    numero: String(numeroAlocado).padStart(4, '0'),
                    portaria_id: portariaId,
                    aprovador: aprovadorId,
                    data: new Date().toISOString(),
                    ip: ip
                }

                const logsAtuais = Array.isArray(livro.logs) ? livro.logs : []
                const novosLogs = [...logsAtuais, novoLog]

                // 3. Atualiza o contador e os logs
                await tx.livrosNumeracao.update({
                    where: { id: livro.id },
                    data: {
                        proximo_numero: numeroAlocado + 1,
                        logs: novosLogs,
                        atualizado_em: new Date()
                    }
                })

                return ok(numeroFormatado)
            })
        } catch (error) {
            console.error('Erro ao alocar número oficial (Cataguases):', error)
            return err('Falha técnica ao gerar numeração oficial. Verifique o Livro de Numeração.')
        }
    }
}
