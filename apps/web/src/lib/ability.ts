import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability'
import { createContext } from 'react'
import type { Usuario } from '@/types/domain'
import { createContextualCan } from '@casl/react'

type Actions = 'criar' | 'ler' | 'editar' | 'deletar' | 'submeter' |
    'aprovar' | 'rejeitar' | 'assinar' | 'publicar' | 'gerenciar' | 'manage' | 'visualizar' | 'transferir' | 'claim'
type Subjects = 'Portaria' | 'Usuario' | 'Modelo' | 'Secretaria' | 'Setor' |
    'LivrosNumeracao' | 'VariavelSistema' | 'FeedAtividade' | 'Analytics' | 'all' | 'PortariaGlobal' | 'Revisao'

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
        can('publicar', 'Portaria', { secretariaId: user.secretariaId! })
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId! })
        // Secretário pode monitorar revisões da sua secretaria
        can('gerenciar', 'Revisao')
        can('ler', 'Revisao')
    }

    if (user.role === 'REVISOR') {
        can('ler', 'Portaria', { secretariaId: user.secretariaId! })
        can('aprovar', 'Portaria', { secretariaId: user.secretariaId! })
        can('rejeitar', 'Portaria', { secretariaId: user.secretariaId! })
        can('ler', 'FeedAtividade', { secretariaId: user.secretariaId! })
        can('claim', 'Revisao')
        can('transferir', 'Revisao')
        can('ler', 'Revisao')
    }

    if (user.role === 'OPERADOR') {
        can('criar', 'Portaria')
        can('ler', 'Portaria', { autorId: user.id })
        can('editar', 'Portaria', { autorId: user.id, status: 'RASCUNHO' })
        can('submeter', 'Portaria', { autorId: user.id })
        cannot('deletar', 'Portaria')
        cannot('publicar', 'Portaria')
        can('ler', 'FeedAtividade')
    }

    // Permissões granulares dinâmicas
    // Formato: "acao:Subject" (global) ou "acao:Subject:secretaria" (escopado à secretaria do usuário)
    for (const permissao of user.permissoesExtra) {
        const [action, subject, escopo] = permissao.split(':') as [Actions, Subjects, string?]
        if (!action || !subject) continue
        if (escopo === 'secretaria' && user.secretariaId) {
            can(action, subject, { secretariaId: user.secretariaId! })
        } else {
            can(action, subject)
        }
    }

    return build()
}
