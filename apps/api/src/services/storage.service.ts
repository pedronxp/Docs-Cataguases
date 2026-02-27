import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export class StorageService {
    private static BUCKET = 'portarias'

    static async uploadBuffer(path: string, buffer: Buffer, contentType: string) {
        const { data, error } = await supabaseAdmin.storage
            .from(this.BUCKET)
            .upload(path, buffer, {
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
        const { data, error } = await supabaseAdmin.storage
            .from(this.BUCKET)
            .createSignedUrl(path, expiresIn)

        if (error) {
            console.error('[StorageService] Erro ao gerar URL assinada:', error)
            throw error
        }

        return data.signedUrl
    }
}
