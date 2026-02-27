import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session || !['ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        // Ler todas as chaves dinamicamente do process.env
        const keys: { id: string, key: string, name: string }[] = []

        // Padrão 1: CLOUDCONVERT_API_KEY
        if (process.env.CLOUDCONVERT_API_KEY) {
            keys.push({
                id: 'CLOUDCONVERT_API_KEY',
                key: process.env.CLOUDCONVERT_API_KEY,
                name: 'Chave Principal'
            })
        }

        // Padrão 2: CLOUDCONVERT_API_KEY_X
        const envKeys = Object.keys(process.env)
            .filter(k => k.startsWith('CLOUDCONVERT_API_KEY_'))
            .sort((a, b) => {
                const numA = parseInt(a.split('_').pop() || '0', 10)
                const numB = parseInt(b.split('_').pop() || '0', 10)
                return numA - numB
            })

        for (const k of envKeys) {
            keys.push({
                id: k,
                key: process.env[k]!,
                name: `Chave ${k.split('_').pop()}`
            })
        }

        if (keys.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma chave configurada' }, { status: 404 })
        }

        const activeIndex = parseInt(process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0', 10)

        const statusPromises = keys.map(async (k, index) => {
            try {
                console.log(`[Status] Checando chave: ${k.id} (prefixo: ${k.key.substring(0, 10)}...)`);
                // Consultar API do CloudConvert
                const res = await fetch('https://api.cloudconvert.com/v2/users/me', {
                    headers: { 'Authorization': `Bearer ${k.key.trim()}` }
                })

                if (res.status === 402) {
                    console.warn(`[Status] Chave ${k.id} esgotada (402)`);
                    return {
                        id: k.id,
                        name: k.name,
                        isActive: index === activeIndex,
                        status: 'exhausted',
                        credits: 0,
                        used: 'ESGOTADA',
                        error: 'Saldo Esgotado (402)'
                    }
                }

                if (res.status === 403) {
                    console.warn(`[Status] Chave ${k.id} sem escopo user.read (403)`);
                    return {
                        id: k.id,
                        name: k.name,
                        isActive: index === activeIndex,
                        status: 'warning',
                        credits: '?',
                        used: '?',
                        error: 'Falta escopo user.read'
                    }
                }

                if (!res.ok) {
                    const errText = await res.text();
                    console.error(`[Status] Erro na chave ${k.id}: ${res.status} - ${errText}`);
                    let errorMsg = `Erro ${res.status}`;
                    if (errText.includes('Invalid scope')) errorMsg = 'Falta escopo user.read';

                    return {
                        id: k.id,
                        name: k.name,
                        isActive: index === activeIndex,
                        status: 'error',
                        credits: 0,
                        used: 0,
                        error: errorMsg
                    }
                }

                const json = await res.json()
                const credits = json.data.credits || 0
                console.log(`[Status] Chave ${k.id} OK: ${credits} créditos`);

                return {
                    id: k.id,
                    name: k.name,
                    isActive: index === activeIndex,
                    status: (credits > 0) ? 'active' : 'exhausted',
                    credits: credits,
                    used: 'Consultar Site', // A API não retorna usado no /me de forma direta
                    username: json.data.username,
                    email: json.data.email
                }
            } catch (err: any) {
                return {
                    id: k.id,
                    name: k.name,
                    isActive: index === activeIndex,
                    status: 'error',
                    credits: 0,
                    used: 0,
                    error: err.message || 'Erro de rede'
                }
            }
        })

        const results = await Promise.all(statusPromises)

        return NextResponse.json({ success: true, data: results })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
