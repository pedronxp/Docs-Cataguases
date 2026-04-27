import { createClient } from '@supabase/supabase-js'

type SupabaseAdminClient = ReturnType<typeof createClient>

let supabaseAdminClient: SupabaseAdminClient | null = null

function getSupabaseAdmin(): SupabaseAdminClient {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas.')
    }

    if (!supabaseAdminClient) {
        supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey)
    }

    return supabaseAdminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
    get(_target, prop) {
        return (getSupabaseAdmin() as any)[prop]
    },
})

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

        const { data, error } = await getSupabaseAdmin().storage
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
        const { data, error } = await getSupabaseAdmin().storage
            .from(this.BUCKET)
            .createSignedUrl(safePath, expiresIn)

        if (error) {
            console.error('[StorageService] Erro ao gerar URL assinada:', error)
            throw error
        }

        return data.signedUrl
    }
}
