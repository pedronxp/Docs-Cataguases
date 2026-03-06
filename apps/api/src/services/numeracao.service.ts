import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'

// Formatos padrão criados automaticamente se o livro ainda não existir para o tipo
const FORMATO_PADRAO: Record<string, string> = {
    PORTARIA: 'PORT-{N}/CATAGUASES',
    MEMORANDO: 'MEM-{N}/{ANO}',
    OFICIO: 'OF-{N}/{ANO}',
    LEI: 'LEI-{N}/{ANO}',
}

const NOME_PADRAO: Record<string, string> = {
    PORTARIA: 'Portarias Cataguases',
    MEMORANDO: 'Memorandos Cataguases',
    OFICIO: 'Ofícios Cataguases',
    LEI: 'Leis Cataguases',
}

export class NumeracaoService {
    /**
     * Aloca o próximo número oficial de forma atômica.
     * Seleciona o livro correto pelo tipoDocumento do modelo.
     * Suporta placeholders {N} (3 dígitos) e {ANO} (ano atual) no formato_base.
     */
    static async alocarNumero(
        portariaId: string,
        tipoDocumento: string = 'PORTARIA',
        aprovadorId: string,
        ip: string = '127.0.0.1'
    ): Promise<Result<string>> {
        try {
            return await prisma.$transaction(async (tx) => {
                // SELECT FOR UPDATE — trava o livro do tipo correto atomicamente
                const livros = await tx.$queryRaw<any[]>`
                    SELECT id, nome, "formato_base", "proximo_numero", logs
                    FROM "LivrosNumeracao"
                    WHERE ativo = true
                    AND "tipoDocumento" = ${tipoDocumento}::"TipoDocumento"
                    LIMIT 1
                    FOR UPDATE
                `

                let livro = livros[0]

                // Autocria o livro se ainda não existir para este tipo
                if (!livro) {
                    const formato = FORMATO_PADRAO[tipoDocumento] ?? `DOC-{N}/{ANO}`
                    const nome = NOME_PADRAO[tipoDocumento] ?? `Documentos ${tipoDocumento}`
                    livro = await (tx as any).livrosNumeracao.create({
                        data: {
                            nome,
                            tipoDocumento: tipoDocumento as any,
                            formato_base: formato,
                            proximo_numero: 1,
                            numero_inicial: 1,
                            ativo: true
                        }
                    })
                }

                const numeroAlocado = livro.proximo_numero
                const anoAtual = new Date().getFullYear().toString()
                const numeroFormatado = livro.formato_base
                    .replace('{N}', String(numeroAlocado).padStart(3, '0'))
                    .replace('{ANO}', anoAtual)

                const novoLog = {
                    numero: String(numeroAlocado).padStart(3, '0'),
                    portaria_id: portariaId,
                    aprovador: aprovadorId,
                    data: new Date().toISOString(),
                    ip
                }

                const logsAtuais = Array.isArray(livro.logs) ? livro.logs : []

                await (tx as any).livrosNumeracao.update({
                    where: { id: livro.id },
                    data: {
                        proximo_numero: numeroAlocado + 1,
                        logs: [...logsAtuais, novoLog],
                        atualizado_em: new Date()
                    }
                })

                return ok(numeroFormatado)
            })
        } catch (error) {
            console.error('[NumeracaoService] Erro ao alocar número:', error)
            return err('Falha técnica ao gerar numeração oficial. Verifique o Livro de Numeração.')
        }
    }

    /**
     * Alias para alocarNumero compatível com código legado que esperava alocarNumeroPortaria.
     */
    static async alocarNumeroPortaria(portariaId: string, aprovadorId: string, ip: string = '127.0.0.1') {
        return this.alocarNumero(portariaId, 'PORTARIA', aprovadorId, ip)
    }
}
