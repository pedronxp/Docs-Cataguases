import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'
import { User, Portaria } from '@prisma/client'

/**
 * Ações permitidas no sistema.
 */
type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
    'aprovar' | 'rejeitar' | 'assinar' | 'publicar' | 'gerenciar' | 'manage'

/**
 * Entidades (Subjects) protegidas.
 */
type Subjects = 'Portaria' | 'User' | 'ModeloDocumento' | 'Modelo' | 'Secretaria' | 'Setor' |
    'LivrosNumeracao' | 'VariavelSistema' | 'FeedAtividade' | 'Analytics' | 'all'

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

    // 2. PREFEITO: Assinatura e visualização global
    if (user.role === 'PREFEITO') {
        can('ler', 'all')
        can('assinar', 'Portaria')
        can('publicar', 'Portaria')
        return build()
    }

    // 3. SECRETARIO: Gestão da própria secretaria
    if (user.role === 'SECRETARIO' && user.secretariaId) {
        can('ler', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('aprovar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('rejeitar', 'Portaria', { secretariaId: user.secretariaId } as any)
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId } as any)
    }

    // 4. GESTOR_SETOR: Gestão do próprio setor
    if (user.role === 'GESTOR_SETOR' && user.setorId) {
        can('ler', 'Portaria', { setorId: user.setorId } as any)
        can('editar', 'Portaria', { setorId: user.setorId, status: 'RASCUNHO' } as any)
        can('aprovar', 'Portaria', { setorId: user.setorId } as any)
    }

    // 5. OPERADOR: Criação e visualização das próprias portarias
    if (user.role === 'OPERADOR') {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { criadoPorId: user.id } as any)
        can('editar', 'Portaria', { criadoPorId: user.id, status: 'RASCUNHO' } as any)
        can('submeter', 'Portaria', { criadoPorId: user.id } as any)
        cannot('deletar', 'Portaria')
    }

    // 6. Permissões granuladas dinâmicas (permissoesExtra)
    // Formato no banco: "acao:Subject" (ex: "deletar:Portaria")
    for (const permissao of user.permissoesExtra) {
        const parts = permissao.split(':')
        if (parts.length === 2) {
            const [action, subject] = parts as [Actions, Subjects]
            can(action, subject)
        }
    }

    return build()
}
