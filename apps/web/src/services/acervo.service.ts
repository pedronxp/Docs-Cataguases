import type { Portaria } from '../types/domain'
import type { PaginatedResponse } from '../types/api'
import { ok, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

export interface AcervoQueryParams {
    secretariaId?: string
    busca?: string
    ano?: number
    setorId?: string
    page?: number
    pageSize?: number
    statusFiltro?: string[]
}

export async function buscarAcervo(
    params: AcervoQueryParams
): Promise<Result<PaginatedResponse<Portaria>>> {
    await mockDelay(500)

    let lista = [...mockDB.portarias]

    // Filtro de status (padrão: apenas PUBLICADA)
    const statusFiltro = params.statusFiltro ?? ['PUBLICADA']
    lista = lista.filter((p) => statusFiltro.includes(p.status))

    // Filtro ABAC por secretaria
    // Se secretariaId for fornecido, filtra por ela. 
    // No frontend, se o usuário não tiver 'visualizar:PortariaGlobal', 
    // ele só pode passar a sua própria secretariaId.
    if (params.secretariaId) {
        lista = lista.filter((p) => p.secretariaId === params.secretariaId)
    }

    // Filtro por setor
    if (params.setorId) {
        lista = lista.filter((p) => p.setorId === params.setorId)
    }

    // Filtro por ano (extrai do numeroOficial ou updatedAt)
    if (params.ano) {
        lista = lista.filter((p) => {
            const ano = p.numeroOficial?.split('/')[1] ??
                new Date(p.updatedAt).getFullYear().toString()
            return ano === String(params.ano)
        })
    }

    // Busca por texto (número, título ou valor em dadosFormulario)
    if (params.busca) {
        const termo = params.busca.toLowerCase()
        lista = lista.filter((p) =>
            p.titulo.toLowerCase().includes(termo) ||
            (p.numeroOficial ?? '').toLowerCase().includes(termo) ||
            Object.values(p.dadosFormulario).some((v) => v.toLowerCase().includes(termo))
        )
    }

    // Ordena por data de publicação (mais recente primeiro)
    lista.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 15
    const total = lista.length
    const data = lista.slice((page - 1) * pageSize, page * pageSize)

    return ok({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

// Retorna contagem de docs publicados por secretaria (para os badges das pastas)
export async function contarPorSecretaria(): Promise<Result<Record<string, number>>> {
    await mockDelay(200)
    const contadores: Record<string, number> = {}
    mockDB.portarias
        .filter((p) => p.status === 'PUBLICADA')
        .forEach((p) => {
            contadores[p.secretariaId] = (contadores[p.secretariaId] ?? 0) + 1
        })
    return ok(contadores)
}
