export const mockUser = {
  id: 'user-001',
  name: 'Teste Silva',
  email: 'teste@cataguases.mg.gov.br',
  role: 'OPERADOR',
  ativo: true,
  secretariaId: 'sec-001',
  setorId: 'set-001',
  limiteTokensLlm: 500000,
  tokensUsadosMesLlm: 0,
}

export const mockLlmMessage = (role: string, content: string) => ({
  role, content,
})

export const mockSseToken = async (payload: Record<string, any>, secret: string) => {
  const { SignJWT } = await import('jose')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret))
}
