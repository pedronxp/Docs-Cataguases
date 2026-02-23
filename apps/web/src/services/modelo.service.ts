import type { ModeloDocumento } from '../types/domain'
import { ok, err, type Result } from '../lib/result'
import { mockDelay } from './_mock.helpers'

const MOCK_MODELOS: ModeloDocumento[] = [
    {
        id: 'modelo-nomeacao', nome: 'Portaria de Nomeação',
        descricao: 'Para nomear servidores em cargos efetivos ou comissionados.',
        secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-nomeacao.docx',
        ativo: true,
        variaveis: [
            { id: 'v1', modeloId: 'modelo-nomeacao', chave: 'NOME_SERVIDOR', label: 'Nome Completo do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1, descricao: 'Insira o nome completo do servidor que será nomeado, conforme registro no RH. Exemplo: João Carlos da Silva.' },
            { id: 'v2', modeloId: 'modelo-nomeacao', chave: 'CARGO', label: 'Cargo de Destino', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 2, descricao: 'Informe o nome oficial do cargo conforme o organograma. Exemplo: Assessor Jurídico II.' },
            { id: 'v3', modeloId: 'modelo-nomeacao', chave: 'DATA_INICIO', label: 'Data de Início de Exercício', tipo: 'data', opcoes: [], obrigatorio: true, ordem: 3, descricao: 'Data em que o servidor assume efetivamente as funções do cargo.' },
            { id: 'v10', modeloId: 'modelo-nomeacao', chave: 'LOTACAO', label: 'Lotação', tipo: 'texto', opcoes: [], obrigatorio: false, ordem: 4, descricao: 'Secretaria ou setor onde o servidor será lotado. Se não preenchido, será usado o padrão da secretaria de origem.' },
        ],
    },
    {
        id: 'modelo-exoneracao', nome: 'Portaria de Exoneração',
        descricao: 'Para exonerar servidores de cargos comissionados.',
        secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-exoneracao.docx',
        ativo: true,
        variaveis: [
            { id: 'v4', modeloId: 'modelo-exoneracao', chave: 'NOME_SERVIDOR', label: 'Nome Completo do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1, descricao: 'Nome completo conforme cadastro no sistema de RH.' },
            { id: 'v5', modeloId: 'modelo-exoneracao', chave: 'CARGO', label: 'Cargo Atual', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 2, descricao: 'O cargo do qual o servidor será exonerado.' },
            { id: 'v6', modeloId: 'modelo-exoneracao', chave: 'MOTIVO', label: 'Motivo da Exoneração', tipo: 'select', opcoes: ['A pedido', 'De ofício', 'Por conclusão de mandato'], obrigatorio: true, ordem: 3, descricao: 'Selecione o tipo de exoneração. "A pedido" quando o servidor solicita, "De ofício" quando é determinação da administração.' },
            { id: 'v11', modeloId: 'modelo-exoneracao', chave: 'DATA_EFEITO', label: 'Data do Efeito', tipo: 'data', opcoes: [], obrigatorio: true, ordem: 4, descricao: 'Data a partir da qual a exoneração passa a valer legalmente.' },
        ],
    },
    {
        id: 'modelo-gratificacao', nome: 'Portaria de Gratificação',
        descricao: 'Para concessão de gratificações e benefícios.',
        secretariaId: 'sec-rh', docxTemplateUrl: 'https://mock.storage/template-gratificacao.docx',
        ativo: true,
        variaveis: [
            { id: 'v7', modeloId: 'modelo-gratificacao', chave: 'NOME_SERVIDOR', label: 'Nome Completo do Servidor', tipo: 'texto', opcoes: [], obrigatorio: true, ordem: 1, descricao: 'Nome do servidor beneficiário da gratificação.' },
            { id: 'v8', modeloId: 'modelo-gratificacao', chave: 'PERCENTUAL', label: 'Percentual da Gratificação (%)', tipo: 'numero', opcoes: [], obrigatorio: true, ordem: 2, descricao: 'Valor percentual a ser aplicado sobre o vencimento base. Exemplo: 30 para 30%.' },
            { id: 'v9', modeloId: 'modelo-gratificacao', chave: 'JUSTIFICATIVA', label: 'Justificativa / Fundamentação', tipo: 'textarea', opcoes: [], obrigatorio: true, ordem: 3, descricao: 'Explique o motivo da concessão. Cite a lei ou decreto que ampara a gratificação, se aplicável.' },
        ],
    },
    {
        id: 'modelo-adicional', nome: 'Portaria de Concessão de Adicional',
        descricao: 'Para concessão de adicional remuneratório a servidor efetivo.',
        secretariaId: null, docxTemplateUrl: 'https://mock.storage/template-adicional.docx',
        ativo: true,
        variaveis: [
            { id: 'va1', modeloId: 'modelo-adicional', chave: 'NOME_SERVIDOR', label: 'Nome Completo do Servidor', tipo: 'texto' as const, opcoes: [], obrigatorio: true, ordem: 1, descricao: 'Nome completo conforme o registro funcional.' },
            { id: 'va2', modeloId: 'modelo-adicional', chave: 'CPF_SERVIDOR', label: 'CPF do Servidor', tipo: 'cpf' as const, opcoes: [], obrigatorio: true, ordem: 2, descricao: 'CPF do servidor beneficiário. Será formatado automaticamente.' },
            { id: 'va3', modeloId: 'modelo-adicional', chave: 'TIPO_ADICIONAL', label: 'Tipo de Adicional', tipo: 'select' as const, opcoes: ['Insalubridade', 'Periculosidade', 'Noturno', 'Função Gratificada'], obrigatorio: true, ordem: 3, descricao: 'Selecione o tipo de adicional que será concedido.' },
            { id: 'va4', modeloId: 'modelo-adicional', chave: 'VALOR_ADICIONAL', label: 'Valor do Adicional (R$)', tipo: 'moeda' as const, opcoes: [], obrigatorio: true, ordem: 4, descricao: 'Valor em reais do adicional a ser concedido mensalmente.' },
            { id: 'va5', modeloId: 'modelo-adicional', chave: 'DATA_INICIO', label: 'Data de Início', tipo: 'data' as const, opcoes: [], obrigatorio: true, ordem: 5, descricao: 'Data a partir da qual o adicional passa a incidir.' },
        ],
    },
]


export async function listarModelos(): Promise<Result<ModeloDocumento[]>> {
    await mockDelay(400)
    return ok(MOCK_MODELOS.filter((m) => m.ativo))
}

export async function buscarModelo(id: string): Promise<Result<ModeloDocumento>> {
    await mockDelay(200)
    const modelo = MOCK_MODELOS.find((m) => m.id === id)
    if (!modelo) return err(`Modelo "${id}" não encontrado.`)
    return ok(modelo)
}
