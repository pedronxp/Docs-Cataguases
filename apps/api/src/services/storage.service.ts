import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export class StorageService {
    private static BUCKET = 'portarias'

    /**
     * Sanitiza o path/nome de arquivo para ser compatível com o Supabase Storage.
     * Remove acentos, substitui espaços por hífens e remove caracteres inválidos.
     */
    static sanitizePath(path: string): string {
        return path
            .normalize('NFD')                        // Decompõe acentos (ex: ã → a + combining)
            .replace(/[\u0300-\u036f]/g, '')          // Remove os diacríticos (acentos)
            .replace(/\s+/g, '-')                    // Espaços → hífens
            .replace(/[^a-zA-Z0-9._\-\/]/g, '')      // Remove qualquer outro char inválido
    }

    static async uploadBuffer(path: string, buffer: Buffer, contentType: string) {
        const safePath = this.sanitizePath(path)

        const { data, error } = await supabaseAdmin.storage
            .from(this.BUCKET)
            .upload(safePath, buffer, {
                contentType,
                upsert: true
            })

        if (error) {
            console.error('[StorageService] Erro no upload:', error)
            throw error
        }

        return data
    }

    static async getSignedUrl(path: string, expiresIn = 3600) {
        const safePath = this.sanitizePath(path)
        const { data, error } = await supabaseAdmin.storage
            .from(this.BUCKET)
            .createSignedUrl(safePath, expiresIn)

        if (error) {
            console.error('[StorageService] Erro ao gerar URL assinada:', error)
            throw error
        }

        return data.signedUrl
    }
}
