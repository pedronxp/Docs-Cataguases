import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true'
        }
    })
}

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session || !['ADMIN_GERAL'].includes(session.role)) {
            return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const action = String(body.action)
        const keyId = String(body.keyId)
        const newKey = String(body.newKey)

        // Resolve caminho do .env (ajustar conforme a estrutura da pasta, considerando onde roda o Next API)
        const envPath = path.resolve(process.cwd(), '.env')

        let envContent = ''
        try {
            envContent = fs.readFileSync(envPath, 'utf8')
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Arquivo .env não acessível. Rode local.' }, { status: 500 })
        }

        const envLines = envContent.split('\n')

        if (action === 'set_active') {
            // Acha o index pelo numero final do keyId
            const index = keyId === 'CLOUDCONVERT_API_KEY' ? '0' : keyId.split('_').pop()

            let foundCurrent = false
            for (let i = 0; i < envLines.length; i++) {
                if (envLines[i].startsWith('CLOUDCONVERT_CURRENT_KEY_INDEX=')) {
                    envLines[i] = `CLOUDCONVERT_CURRENT_KEY_INDEX=${index}`
                    foundCurrent = true
                }
            }
            if (!foundCurrent) envLines.push(`CLOUDCONVERT_CURRENT_KEY_INDEX=${index}`)

            fs.writeFileSync(envPath, envLines.join('\n'))

            return NextResponse.json({ success: true, message: `Chave ${keyId} ativada.` })
        }
        else if (action === 'add_key') {
            // Conta quantas existem
            let count = 0
            for (let l of envLines) if (l.startsWith('CLOUDCONVERT_API_KEY')) count++

            const novoId = count === 0 ? 'CLOUDCONVERT_API_KEY' : `CLOUDCONVERT_API_KEY_${count + 1}`
            envLines.push(`${novoId}=${newKey}`)
            fs.writeFileSync(envPath, envLines.join('\n'))

            return NextResponse.json({ success: true, message: `Chave ${novoId} adicionada com sucesso.` })
        }
        else if (action === 'delete_key') {
            const filtered = envLines.filter(l => !l.startsWith(keyId + '='))
            fs.writeFileSync(envPath, filtered.join('\n'))
            return NextResponse.json({ success: true, message: `Chave excluída.` })
        }

        return NextResponse.json({ success: false, error: 'Ação inválida.' }, { status: 400 })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
