import prisma from '@/lib/prisma'
import { PdfService } from './pdf.service'
import { Result, ok, err } from '@/lib/result'

export class AssinaturaService {
    /**
     * Valida se o documento não foi alterado desde a sua geração.
     */
    static async validarIntegridade(portariaId: string): Promise<Result<boolean>> {
        try {
            const portaria = await prisma.portaria.findUnique({
                where: { id: portariaId },
                include: { modelo: true }
            })

            if (!portaria || !portaria.hashIntegridade) {
                return err('Documento não encontrado ou ainda não numerado.')
            }

            // Reconstrói o HTML para validar o hash (mesma lógica do pdf.service)
            let htmlFinal = (portaria.modelo as any).conteudoHtml
            const formData = portaria.formData as Record<string, string>

            Object.entries(formData).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g')
                htmlFinal = htmlFinal.replace(regex, value)
            })

            htmlFinal = htmlFinal.replace(/{{NUMERO_OFICIAL}}/g, portaria.numeroOficial || '')
            htmlFinal = htmlFinal.replace(/{{DATA_ATUAL}}/g, portaria.createdAt.toLocaleDateString('pt-BR'))

            const hashCalculado = PdfService.gerarHash(htmlFinal)

            if (hashCalculado !== portaria.hashIntegridade) {
                return err('ALERTA: A integridade do documento foi violada! O conteúdo atual não confere com o hash original.')
            }

            return ok(true)
        } catch (error) {
            console.error('Erro ao validar integridade:', error)
            return err('Erro técnico ao validar documento.')
        }
    }

    /**
     * Registra a assinatura digital de uma autoridade.
     */
    static async assinarDocumento(
        portariaId: string,
        usuarioId: string,
        cargo: string
    ): Promise<Result<any>> {
        // Apenas Prefeito e Secretário podem assinar (Simulação de regra de negócio)
        const cargosAutorizados = ['PREFEITO', 'SECRETARIO', 'ADMIN_GERAL']
        if (!cargosAutorizados.includes(cargo)) {
            return err('Usuário não possui atribuições para assinar este tipo de documento.')
        }

        try {
            const validacao = await this.validarIntegridade(portariaId)
            if (!validacao.ok) return validacao

            const portaria = await prisma.$transaction(async (tx: any) => {
                const p = await tx.portaria.update({
                    where: { id: portariaId },
                    data: {
                        status: 'ASSINADO',
                        assinadoEm: new Date(),
                        assinadoPorId: usuarioId,
                    }
                })

                // Registra no feed de atividades
                await tx.feedAtividade.create({
                    data: {
                        tipoEvento: 'ASSINATURA',
                        mensagem: `Documento assinado digitalmente por ${cargo}.`,
                        portariaId: p.id,
                        autorId: usuarioId,
                        secretariaId: p.secretariaId,
                        setorId: p.setorId,
                        metadata: {
                            timestamp: new Date().toISOString(),
                            hashValido: true
                        }
                    }
                })

                return p
            })

            return ok(portaria)
        } catch (error) {
            console.error('Erro ao assinar documento:', error)
            return err('Falha ao registrar assinatura digital.')
        }
    }
}
