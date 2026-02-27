import prisma from '@/lib/prisma'
import { Result, ok, err } from '@/lib/result'
import { NumeracaoService } from './numeracao.service'
import { PdfService } from './pdf.service'

/**
 * Serviço centralizado para gestão de Portarias.
 * Segue as regras de negócio definidas em BACKEND.md e AGENTS.md.
 */
export class PortariaService {
    /**
     * Cria uma nova portaria. Inicializa como RASCUNHO ou PROCESSANDO.
     */
    static async criar(data: {
        titulo: string
        descricao?: string
        modeloId: string
        formData: any
        secretariaId: string
        setorId?: string | null
        criadoPorId: string
        submetido?: boolean
    }): Promise<Result<any>> {
        try {
            const portaria = await prisma.portaria.create({
                data: {
                    titulo: data.titulo,
                    descricao: data.descricao,
                    modeloId: data.modeloId,
                    formData: data.formData,
                    secretariaId: data.secretariaId,
                    setorId: data.setorId,
                    criadoPorId: data.criadoPorId,
                    status: data.submetido ? 'PENDENTE' : 'RASCUNHO',
                },
                include: { modelo: true }
            })

            await this.registrarEvento({
                tipo: 'PORTARIA_CRIADA',
                mensagem: data.submetido ? `Portaria submetida para revisão` : `Portaria "${data.titulo}" criada como rascunho`,
                portariaId: portaria.id,
                usuarioId: data.criadoPorId,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId
            })

            return ok(portaria)
        } catch (error) {
            console.error('Erro no PortariaService.criar:', error)
            return err('Falha ao criar portaria no banco de dados.')
        }
    }

    /**
     * Aprova uma portaria pendente.
     */
    static async aprovar(id: string, usuarioId: string, observacao?: string): Promise<Result<any>> {
        try {
            const portaria = await prisma.portaria.findUnique({ where: { id } })
            if (!portaria) return err('Portaria não encontrada.')
            if (portaria.status !== 'PENDENTE') return err('Apenas portarias pendentes podem ser aprovadas.')

            const atualizada = await prisma.portaria.update({
                where: { id },
                data: { status: 'APROVADA' }
            })

            await this.registrarEvento({
                tipo: 'PORTARIA_APROVADA',
                mensagem: `Portaria aprovada pelo Secretário. Aguardando assinatura e numeração. ${observacao || ''}`,
                portariaId: id,
                usuarioId,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId,
                metadata: { observacao }
            })

            return ok(atualizada)
        } catch (error) {
            console.error('Erro ao aprovar portaria:', error)
            return err('Erro ao aprovar portaria.')
        }
    }

    /**
     * Rejeita uma portaria pendente, voltando-a para RASCUNHO.
     */
    static async rejeitar(id: string, usuarioId: string, observacao: string): Promise<Result<any>> {
        if (!observacao) return err('Motivo da rejeição é obrigatório.')

        try {
            const portaria = await prisma.portaria.findUnique({ where: { id } })
            if (!portaria) return err('Portaria não encontrada.')
            if (portaria.status !== 'PENDENTE') return err('Apenas portarias pendentes podem ser rejeitadas.')

            // Limpa o PDF ao rejeitar, pois o conteúdo precisará ser revisado
            const atualizada = await prisma.portaria.update({
                where: { id },
                data: {
                    status: 'RASCUNHO',
                    pdfUrl: null
                }
            })

            await this.registrarEvento({
                tipo: 'PORTARIA_REJEITADA',
                mensagem: `Portaria rejeitada: ${observacao}`,
                portariaId: id,
                usuarioId,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId,
                metadata: { observacao }
            })

            return ok(atualizada)
        } catch (error) {
            return err('Erro ao rejeitar portaria.')
        }
    }

    /**
     * Tenta reprocessar uma portaria que falhou.
     * CRÍTICO: Não gera novo número (Regra 8 do AGENTS.md).
     */
    static async retry(id: string, usuarioId: string): Promise<Result<any>> {
        try {
            const portaria = await prisma.portaria.findUnique({ where: { id } })
            if (!portaria) return err('Portaria não encontrada.')
            if (portaria.status !== 'FALHA_PROCESSAMENTO') return err('Portaria não possui falha de processamento.')

            const atualizada = await prisma.portaria.update({
                where: { id },
                data: { status: 'PROCESSANDO' }
            })

            await this.registrarEvento({
                tipo: 'PORTARIA_RETRY',
                mensagem: `Tentando reprocessar portaria ${portaria.numeroOficial}`,
                portariaId: id,
                usuarioId,
                secretariaId: portaria.secretariaId,
                setorId: portaria.setorId
            })

            return ok(atualizada)
        } catch (error) {
            return err('Erro ao reiniciar processamento.')
        }
    }

    /**
     * Busca uma portaria pelo hash de integridade ou ID (para validação pública).
     * Retorna apenas campos seguros para exibição pública.
     */
    static async buscarPorHash(query: string): Promise<Result<any>> {
        try {
            const portaria = await prisma.portaria.findFirst({
                where: {
                    OR: [
                        { hashIntegridade: query },
                        { id: query }
                    ],
                    status: 'PUBLICADA' // Só permite validar portarias já publicadas
                },
                select: {
                    id: true,
                    titulo: true,
                    numeroOficial: true,
                    status: true,
                    hashIntegridade: true,
                    dataPublicacao: true,
                    updatedAt: true,
                    secretaria: {
                        select: { nome: true, sigla: true }
                    }
                }
            })

            if (!portaria) return err('Documento não localizado ou ainda não publicado.')
            return ok(portaria)
        } catch (error) {
            console.error('Erro ao buscar portaria por hash:', error)
            return err('Erro na consulta de validação.')
        }
    }

    /**
     * Helper para registro de eventos no feed.
     */
    private static async registrarEvento(data: {
        tipo: string
        mensagem: string
        portariaId: string
        usuarioId: string
        secretariaId: string
        setorId?: string | null
        metadata?: any
    }) {
        await prisma.feedAtividade.create({
            data: {
                tipoEvento: data.tipo,
                mensagem: data.mensagem,
                portariaId: data.portariaId,
                autorId: data.usuarioId,
                secretariaId: data.secretariaId,
                setorId: data.setorId,
                metadata: data.metadata || {},
            }
        })
    }
}
