import { supabaseAdmin } from '@/lib/supabase'
import { Result, ok, err } from '@/lib/result'

export class StorageService {
    private static BUCKET_PORTARIAS = 'portarias-oficiais'
    private static BUCKET_MODELOS = 'modelos-documentos'

    /**
     * Faz o upload de um arquivo para o Supabase Storage.
     */
    static async uploadDocumento(
        caminho: string,
        buffer: Buffer,
        contentType: string = 'application/pdf'
    ): Promise<Result<string>> {
        try {
            const { data, error } = await supabaseAdmin.storage
                .from(this.BUCKET_PORTARIAS)
                .upload(caminho, buffer, {
                    contentType,
                    upsert: true,
                })

            if (error) {
                console.error('Erro no upload para Supabase Storage:', error)
                return err(`Falha ao salvar arquivo no servidor: ${error.message}`)
            }

            // Obtém a URL pública (ou assinada)
            const { data: urlData } = supabaseAdmin.storage
                .from(this.BUCKET_PORTARIAS)
                .getPublicUrl(data.path)

            return ok(urlData.publicUrl)
        } catch (error) {
            console.error('Erro inesperado no StorageService:', error)
            return err('Contate o suporte: erro inesperado no serviço de armazenamento.')
        }
    }

    /**
     * Gera uma URL assinada para acesso privado a um documento.
     */
    static async obterUrlAssinada(caminho: string, expiracaoSegundos: number = 3600): Promise<Result<string>> {
        try {
            const { data, error } = await supabaseAdmin.storage
                .from(this.BUCKET_PORTARIAS)
                .createSignedUrl(caminho, expiracaoSegundos)

            if (error) return err(`Erro ao gerar link de acesso: ${error.message}`)
            return ok(data.signedUrl)
        } catch (error) {
            return err('Erro técnico ao recuperar link do documento.')
        }
    }

    /**
     * Remove um documento do storage.
     */
    static async deletarDocumento(caminho: string): Promise<Result<boolean>> {
        try {
            const { error } = await supabaseAdmin.storage
                .from(this.BUCKET_PORTARIAS)
                .remove([caminho])

            if (error) return err(`Erro ao deletar: ${error.message}`)
            return ok(true)
        } catch (error) {
            return err('Erro ao remover arquivo físico.')
        }
    }
}
