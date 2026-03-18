import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'
import { User, Portaria } from '@prisma/client'

/**
 * Ações permitidas no sistema.
 */
type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
    'aprovar' | 'rejeitar' | 'assinar' | 'publicar' | 'gerenciar' | 'manage' | 'transferir' | 'claim'

/**
 * Entidades (Subjects) protegidas.
 */
type Subjects = 'Portaria' | 'User' | 'ModeloDocumento' | 'Modelo' | 'Secretaria' | 'Setor' |
    'LivrosNumeracao' | 'VariavelSistema' | 'FeedAtividade' | 'Analytics' | 'all' | 'Revisao'

/**
 * Definição de condições para filtragem de objetos.
 * Campos devem bater com os modelos do Prisma.
 */
interface Conditions {
    secretariaId?: string
    setorId?: string
    criadoPorId?: string
    status?: string
    [key: string | symbol]: any
}

export type AppAbility = MongoAbility<[Actions, Subjects], Conditions>

/**
 * Constrói a instância de Ability baseada no usuário logado.
 * Segue rigorosamente as regras do AGENTS.md e BACKEND.md.
 */
export function buildAbility(user: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    // 1. ADMIN_GERAL: Acesso total
    if (user.role === 'ADMIN_GERAL') {
        can('manage', 'all')
        return build()
    }

    // 2. PREFEITO: Assinatura, visualização global e criação de portarias
    if (user.role === 'PREFEITO') {
        can('ler', 'all')
        can('criar', 'Portaria')
        can('assinar', 'Portaria')
        can('publicar', 'Portaria')
        return build()
    }

    // 3. SECRETARIO: Gestão da própria secretaria + criação de portarias
    if (user.role === 'SECRETARIO' && user.secretariaId) {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('editar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('submeter', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('aprovar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('rejeitar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId } as any)
        can('ler', 'Analytics')
    }

    // 4. REVISOR: Revisão claim-based de portarias da secretaria + criação
    if (user.role === 'REVISOR' && user.secretariaId) {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('editar', 'Portaria', { secretariaId: user.secretariaId, status: 'RASCUNHO' } as any)
        can('submeter', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('aprovar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('rejeitar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId } as any)
        can('claim', 'Revisao')
        can('transferir', 'Revisao')
        can('ler', 'Revisao')
    }

    // 5. OPERADOR: Criação e visualização das próprias portarias
    if (user.role === 'OPERADOR') {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { criadoPorId: user.id } as any)
        can('editar', 'Portaria', { criadoPorId: user.id, status: 'RASCUNHO' } as any)
        can('submeter', 'Portaria', { criadoPorId: user.id } as any)
        cannot('deletar', 'Portaria')
        can('ler', 'FeedAtividade')
    }

    // 6. Permissões granuladas dinâmicas (permissoesExtra)
    // Formato: "acao:Subject" (global) ou "acao:Subject:secretaria" (escopado à secretaria do usuário)
    for (const permissao of user.permissoesExtra) {
        const [action, subject, escopo] = permissao.split(':') as [Actions, Subjects, string?]
        if (!action || !subject) continue
        if (escopo === 'secretaria' && user.secretariaId) {
            can(action, subject, { secretariaId: user.secretariaId } as any)
        } else {
            can(action, subject)
        }
    }

    return build()
}
