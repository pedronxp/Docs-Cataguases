import { ok, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'


export interface DadosGestao {
    id: string
    nomeGestao: string
    dataInicio: string
    dataFim: string
    prefeito: string
    vicePrefeito: string
    chefeGabinete: string
    secretarios: Record<string, string> // ID da Secretaria -> Nome do Secretário
}

// Estado In-Memory Temporário
let mockGestoes: DadosGestao[] = [
    {
        id: 'gestao-2025-2028',
        nomeGestao: '2025-2028',
        dataInicio: '2025-01-01',
        dataFim: '2028-12-31',
        prefeito: 'Pedro Alves',
        vicePrefeito: 'João da Silva',
        chefeGabinete: 'Maria Fernandes',
        secretarios: {
            '1': 'Antônio Costa', // GP
            '2': 'Dra. Ana Lúcia', // SMS
            '3': 'Prof. Carlos Mendes', // SME
            '4': 'Marcos Souza', // SMA
        }
    },
    {
        id: 'gestao-2021-2024',
        nomeGestao: '2021-2024',
        dataInicio: '2021-01-01',
        dataFim: '2024-12-31',
        prefeito: 'Carlos Oliveira',
        vicePrefeito: 'Manoel Nunes',
        chefeGabinete: 'Luciana Silva',
        secretarios: {}
    }
]

export async function listarGestoes(): Promise<Result<DadosGestao[]>> {
    await mockDelay(400)
    return ok([...mockGestoes])
}

export async function salvarGestao(dados: DadosGestao): Promise<Result<DadosGestao>> {
    await mockDelay(600)
    const index = mockGestoes.findIndex(g => g.id === dados.id)
    if (index >= 0) {
        mockGestoes[index] = { ...dados }
    } else {
        mockGestoes.push({ ...dados })
    }
    return ok({ ...dados })
}
