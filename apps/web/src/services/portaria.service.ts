import type { Portaria } from '../types/domain'
import type {
    CriarPortariaRequest, SubmeterPortariaRequest,
    PaginatedResponse, ListQueryParams,
} from '../types/api'
import { ok, err, type Result } from '../lib/result'
import { mockDelay, mockDB } from './_mock.helpers'

mockDB.portarias = [
    {
        id: 'port-001',
        titulo: 'Portaria de Nomeação - João Silva',
        numeroOficial: '042/2025',
        status: 'PUBLICADA',
        autorId: 'user-op-001',
        secretariaId: 'sec-rh',
        setorId: 'setor-dp',
        modeloId: 'modelo-nomeacao',
        pdfUrl: 'https://mock.storage/portaria-042.pdf',
        docxRascunhoUrl: null,
        hashAssinatura: 'sha256-abc123def456',
        dadosFormulario: { NOME_SERVIDOR: 'João Silva', CARGO: 'Assistente Administrativo' },
        createdAt: '2025-06-10T14:00:00Z',
        updatedAt: '2025-06-12T09:00:00Z',
    },
    {
        id: 'port-002',
        titulo: 'Portaria de Exoneração - Maria Santos',
        numeroOficial: null,
        status: 'RASCUNHO',
        autorId: 'user-op-001',
        secretariaId: 'sec-rh',
        setorId: null,
        modeloId: 'modelo-exoneracao',
        pdfUrl: null,
        docxRascunhoUrl: 'https://mock.storage/rascunho-port-002.docx',
        hashAssinatura: null,
        dadosFormulario: { NOME_SERVIDOR: 'Maria Santos', CARGO: 'Técnica Administrativa' },
        createdAt: '2025-06-15T09:30:00Z',
        updatedAt: '2025-06-15T09:30:00Z',
    },
    {
        id: 'port-003',
        titulo: 'Portaria de Gratificação - Carlos Souza',
        numeroOficial: '038/2025',
        status: 'FALHA_PROCESSAMENTO',
        autorId: 'user-op-001',
        secretariaId: 'sec-rh',
        setorId: null,
        modeloId: 'modelo-gratificacao',
        pdfUrl: null,
        docxRascunhoUrl: null,
        hashAssinatura: null,
        dadosFormulario: { NOME_SERVIDOR: 'Carlos Souza' },
        createdAt: '2025-06-14T11:00:00Z',
        updatedAt: '2025-06-14T12:00:00Z',
    },
    {
        id: 'port-004',
        titulo: 'Portaria de Licença - Ana Costa',
        numeroOficial: '039/2025',
        status: 'PENDENTE',
        autorId: 'user-op-001',
        secretariaId: 'sec-rh',
        setorId: null,
        modeloId: 'modelo-licenca',
        pdfUrl: 'https://mock.storage/portaria-039.pdf',
        docxRascunhoUrl: null,
        hashAssinatura: null,
        dadosFormulario: { NOME_SERVIDOR: 'Ana Costa' },
        createdAt: '2025-06-13T10:00:00Z',
        updatedAt: '2025-06-13T11:30:00Z',
    },
]

export async function listarPortarias(
    params: ListQueryParams = {}
): Promise<Result<PaginatedResponse<Portaria>>> {
    await mockDelay()
    let lista = [...mockDB.portarias]
    if (params.status) lista = lista.filter((p) => p.status === params.status)
    if (params.secretariaId) lista = lista.filter((p) => p.secretariaId === params.secretariaId)
    if (params.busca)
        lista = lista.filter((p) =>
            p.titulo.toLowerCase().includes(params.busca!.toLowerCase())
        )
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 10
    const total = lista.length
    const data = lista.slice((page - 1) * pageSize, page * pageSize)
    return ok({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function buscarPortaria(id: string): Promise<Result<Portaria>> {
    await mockDelay(300)
    const portaria = mockDB.portarias.find((p) => p.id === id)
    if (!portaria) return err(`Portaria "${id}" não encontrada.`)
    return ok({ ...portaria })
}

export async function criarPortaria(
    payload: CriarPortariaRequest
): Promise<Result<Portaria>> {
    await mockDelay(800)
    const nova: Portaria = {
        id: `port-${Date.now()}`,
        titulo: payload.titulo,
        numeroOficial: null,
        status: 'RASCUNHO',
        autorId: 'user-op-001',
        secretariaId: 'sec-rh',
        setorId: null,
        modeloId: payload.modeloId,
        pdfUrl: null,
        docxRascunhoUrl: `https://mock.storage/rascunho-${Date.now()}.docx`,
        hashAssinatura: null,
        dadosFormulario: payload.dadosFormulario,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
    mockDB.portarias.unshift(nova)
    return ok(nova)
}

export async function assinarPortaria(id: string): Promise<Result<Portaria>> {
    await mockDelay(1200)
    const portaria = mockDB.portarias.find(p => p.id === id)
    if (!portaria) return err('Portaria não encontrada.')

    portaria.status = 'PUBLICADA'
    portaria.numeroOficial = `${Math.floor(Math.random() * 999).toString().padStart(3, '0')}/2025`
    portaria.hashAssinatura = `sha256-${Math.random().toString(36).substring(2, 15)}`
    portaria.updatedAt = new Date().toISOString()

    // Adicionar ao feed
    mockDB.feed.unshift({
        id: `f-${Date.now()}`,
        tipoEvento: 'PORTARIA_PUBLICADA',
        mensagem: `Portaria ${portaria.numeroOficial} foi assinada e publicada oficialmente.`,
        portariaId: portaria.id,
        autorId: 'user-prefeito',
        secretariaId: portaria.secretariaId,
        setorId: portaria.setorId,
        metadata: { numero: portaria.numeroOficial, titulo: portaria.titulo },
        createdAt: new Date().toISOString(),
    })

    return ok({ ...portaria })
}

export async function submeterPortaria(
    payload: SubmeterPortariaRequest
): Promise<Result<Portaria>> {
    await mockDelay(1500)
    const portaria = mockDB.portarias.find((p) => p.id === payload.portariaId)
    if (!portaria) return err('Portaria não encontrada.')
    if (portaria.status !== 'RASCUNHO') return err('Apenas rascunhos podem ser submetidos.')

    const seq = String(Math.floor(Math.random() * 99) + 1).padStart(3, '0')
    portaria.numeroOficial = `${seq}/${new Date().getFullYear()}`
    portaria.status = 'PROCESSANDO'
    portaria.updatedAt = new Date().toISOString()

    setTimeout(() => {
        const p = mockDB.portarias.find((x) => x.id === payload.portariaId)
        if (p) {
            p.status = 'PENDENTE'
            p.pdfUrl = `https://mock.storage/${p.numeroOficial!.replace('/', '-')}.pdf`
            p.updatedAt = new Date().toISOString()
        }
    }, 4000)

    return ok({ ...portaria })
}

export async function tentarNovamente(portariaId: string): Promise<Result<Portaria>> {
    await mockDelay(1500)
    const portaria = mockDB.portarias.find((p) => p.id === portariaId)
    if (!portaria) return err('Portaria não encontrada.')
    if (portaria.status !== 'FALHA_PROCESSAMENTO')
        return err('Apenas portarias com falha podem ser reprocessadas.')

    portaria.status = 'PROCESSANDO'
    portaria.updatedAt = new Date().toISOString()

    setTimeout(() => {
        const p = mockDB.portarias.find((x) => x.id === portariaId)
        if (p) {
            p.status = 'PENDENTE'
            p.pdfUrl = `https://mock.storage/retry-${p.numeroOficial!.replace('/', '-')}.pdf`
            p.updatedAt = new Date().toISOString()
        }
    }, 4000)

    return ok({ ...portaria })
}

export async function aprovarPortaria(portariaId: string): Promise<Result<Portaria>> {
    await mockDelay(500)
    const portaria = mockDB.portarias.find((p) => p.id === portariaId)
    if (!portaria) return err('Portaria não encontrada.')
    if (portaria.status !== 'PENDENTE')
        return err('Apenas portarias pendentes podem ser aprovadas.')
    portaria.status = 'APROVADA'
    portaria.updatedAt = new Date().toISOString()
    return ok({ ...portaria })
}

export async function rejeitarPortaria(portariaId: string): Promise<Result<Portaria>> {
    await mockDelay(500)
    const portaria = mockDB.portarias.find((p) => p.id === portariaId)
    if (!portaria) return err('Portaria não encontrada.')
    portaria.status = 'RASCUNHO'
    portaria.updatedAt = new Date().toISOString()
    return ok({ ...portaria })
}

export async function publicarPortaria(portariaId: string): Promise<Result<Portaria>> {
    await mockDelay(700)
    const portaria = mockDB.portarias.find((p) => p.id === portariaId)
    if (!portaria) return err('Portaria não encontrada.')
    if (portaria.status !== 'APROVADA')
        return err('Apenas portarias aprovadas podem ser publicadas.')
    portaria.status = 'PUBLICADA'
    portaria.hashAssinatura = `sha256-${Date.now()}`
    portaria.updatedAt = new Date().toISOString()
    return ok({ ...portaria })
}

export async function assinarLote(ids: string[]): Promise<Result<Portaria[]>> {
    await mockDelay(1500)
    const updated: Portaria[] = []

    for (const id of ids) {
        const portaria = mockDB.portarias.find((p) => p.id === id)
        if (portaria && portaria.status === 'APROVADA') {
            portaria.status = 'PUBLICADA'
            portaria.numeroOficial = `PORT-${Math.floor(100 + Math.random() * 900)}/2024`
            portaria.hashAssinatura = `sha256-${Math.random().toString(36).substring(2, 15)}`
            portaria.updatedAt = new Date().toISOString()
            updated.push({ ...portaria })
        }
    }

    return ok(updated)
}
export const portariaService = {
    listarPortarias,
    buscarPortaria,
    obterPortaria: buscarPortaria,
    criarPortaria,
    assinarPortaria,
    submeterPortaria,
    assinarLote,
    tentarNovamente,
    aprovarPortaria,
    rejeitarPortaria,
    publicarPortaria,
}
