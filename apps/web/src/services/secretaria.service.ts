import type { Secretaria } from '../types/domain'
export type { Secretaria }

import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export async function listarSecretarias(): Promise<Result<Secretaria[]>> {
    await mockDelay(300)
    return ok([...mockDB.secretarias])
}

export async function criarSecretaria(dados: Omit<Secretaria, 'id'>): Promise<Result<Secretaria>> {
    await mockDelay(400)
    const nova: Secretaria = {
        ...dados,
        id: Math.random().toString(36).substring(7)
    }
    mockDB.secretarias.push(nova)
    return ok(nova)
}

export async function deletarSecretaria(id: string): Promise<Result<void>> {
    await mockDelay(400)
    mockDB.secretarias = mockDB.secretarias.filter(s => s.id !== id)
    return ok(undefined)
}
