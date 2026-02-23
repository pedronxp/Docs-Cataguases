import type { VariavelSistema } from '../types/domain'
import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export async function listarVariaveis(): Promise<Result<VariavelSistema[]>> {
    await mockDelay(400)
    return ok([...mockDB.variaveisSistema])
}

export async function salvarVariavel(variavel: Omit<VariavelSistema, 'id'> & { id?: string }): Promise<Result<VariavelSistema>> {
    await mockDelay(600)
    if (variavel.id) {
        const index = mockDB.variaveisSistema.findIndex(v => v.id === variavel.id)
        if (index !== -1) {
            mockDB.variaveisSistema[index] = { ...mockDB.variaveisSistema[index], ...variavel }
            return ok(mockDB.variaveisSistema[index])
        }
    }
    const nova: VariavelSistema = {
        ...variavel,
        id: `v-${Date.now()}`,
        resolvidaAutomaticamente: variavel.resolvidaAutomaticamente ?? false
    }
    mockDB.variaveisSistema.push(nova)
    return ok(nova)
}

export async function excluirVariavel(id: string): Promise<Result<void>> {
    await mockDelay(400)
    mockDB.variaveisSistema = mockDB.variaveisSistema.filter(v => v.id !== id)
    return ok(undefined)
}

export const variavelService = {
    listarVariaveis,
    salvarVariavel,
    excluirVariavel,
}
