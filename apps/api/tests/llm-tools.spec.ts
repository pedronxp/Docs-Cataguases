import { describe, it, expect } from 'vitest'
import { filterToolsByRole, LLM_TOOLS } from '../src/lib/llm-tools'

describe('LLM Tools — Filtro por Role', () => {
  it('ADMIN_GERAL recebe todas as ferramentas', () => {
    const tools = filterToolsByRole('ADMIN_GERAL')
    expect(tools.length).toBe(LLM_TOOLS.length)
  })

  it('OPERADOR não recebe ferramentas de criação de secretaria', () => {
    const tools = filterToolsByRole('OPERADOR')
    const names = tools.map((t: any) => t.function.name)
    expect(names).not.toContain('criar_secretaria')
    expect(names).not.toContain('deletar_secretaria')
  })

  it('OPERADOR não recebe ferramentas de gerenciamento de usuários', () => {
    const tools = filterToolsByRole('OPERADOR')
    const names = tools.map((t: any) => t.function.name)
    expect(names).not.toContain('criar_usuario')
    expect(names).not.toContain('deletar_usuario')
    expect(names).not.toContain('editar_usuario')
  })

  it('OPERADOR recebe ferramentas de listagem', () => {
    const tools = filterToolsByRole('OPERADOR')
    const names = tools.map((t: any) => t.function.name)
    expect(names).toContain('listar_secretarias')
    expect(names).toContain('listar_setores_secretaria')
  })

  it('ADMIN_SETORIAL não recebe criar_secretaria mas recebe criar_setor', () => {
    const tools = filterToolsByRole('ADMIN_SETORIAL')
    const names = tools.map((t: any) => t.function.name)
    expect(names).not.toContain('criar_secretaria')
    expect(names).toContain('criar_setor')
  })

  it('role desconhecida recebe apenas ferramentas de leitura', () => {
    const tools = filterToolsByRole('UNKNOWN_ROLE')
    const names = tools.map((t: any) => t.function.name)
    // Ferramentas de listagem devem estar disponíveis
    expect(names.some((n: string) => n.startsWith('listar_'))).toBe(true)
    // Ferramentas destrutivas não devem estar
    expect(names).not.toContain('deletar_secretaria')
  })
})
