import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'
import { createContext } from 'react'
import type { Usuario } from '@/types/domain'
import { createContextualCan } from '@casl/react'

type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
    'aprovar' | 'rejeitar' | 'assinar' | 'publicar' | 'gerenciar' | 'manage' | 'visualizar'
type Subjects = 'Portaria' | 'Usuario' | 'Modelo' | 'Secretaria' | 'Setor' |
    'LivrosNumeracao' | 'VariavelSistema' | 'FeedAtividade' | 'Analytics' | 'all' | 'PortariaGlobal'

type Conditions = {
    secretariaId?: string
    setorId?: string
    autorId?: string
    status?: string
}

export type AppAbility = MongoAbility<[Actions, Subjects], Conditions>
export const AbilityContext = createContext<AppAbility>(null!)
export const Can = createContextualCan(AbilityContext.Consumer)

export function buildAbility(user: Usuario): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    // 'manage' é o wildcard do CASL que cobre todas as ações. 'all' cobre todos os subjects.
    if (user.role === 'ADMIN_GERAL') {
        can('manage', 'all')
        return build()
    }

    if (user.role === 'PREFEITO') {
        can('ler', 'all')
        can('assinar', 'Portaria')
        can('publicar', 'Portaria')
        return build()
    }

    if (user.role === 'SECRETARIO') {
        can('ler', 'Portaria', { secretariaId: user.secretariaId! })
        can('aprovar', 'Portaria', { secretariaId: user.secretariaId! })
        can('rejeitar', 'Portaria', { secretariaId: user.secretariaId! })
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId! })
    }

    if (user.role === 'GESTOR_SETOR') {
        can('ler', 'Portaria', { setorId: user.setorId! })
        can('editar', 'Portaria', { setorId: user.setorId!, status: 'RASCUNHO' })
        can('aprovar', 'Portaria', { setorId: user.setorId! })
    }

    if (user.role === 'OPERADOR') {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { autorId: user.id })
        can('editar', 'Portaria', { autorId: user.id, status: 'RASCUNHO' })
        can('submeter', 'Portaria', { autorId: user.id })
        cannot('deletar', 'Portaria')
        cannot('publicar', 'Portaria')
    }

    // Permissões granulares dinâmicas
    for (const permissao of user.permissoesExtra) {
        const parts = permissao.split(':')
        if (parts.length === 2) {
            const [action, subject] = parts as [Actions, Subjects]
            can(action, subject)
        }
    }

    return build()
}
