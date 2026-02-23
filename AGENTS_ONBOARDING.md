# AGENTS_ONBOARDING.md — COMPLEMENTO: FLUXO DE ONBOARDING E SETORES
# Leia junto com AGENTS.md, MOCKS.md e os demais complementos.
# Este arquivo resolve o problema de entrada de novos servidores e a hierarquia de Setores.

---

## O PROBLEMA (CONTEXTO GOVTECH)
Em sistemas de prefeitura com centenas de servidores, o Admin Geral nao pode cadastrar manualmente cada usuario. O servidor precisa poder se registrar, mas por seguranca, nao pode sair emitindo portarias imediatamente. 

ALEM DISSO: A prefeitura precisa de uma forma clara de gerenciar a hierarquia (Secretaria -> Setores), e o servidor recem-cadastrado precisa informar a qual Setor pertence.

---

## SOLUCAO ARQUITETURAL

1. **Auto-Registro (Sign Up):** Servidores podem criar conta informando E-mail Institucional, Nome e Senha.
2. **Onboarding (Lotação):** No primeiro login, o usuario e bloqueado na Tela de Lotacao para escolher sua Secretaria e Setor em cascata.
3. **Quarentena (Pendente de Aprovacao):** Apos informar a lotacao, a conta fica "Aguardando Liberacao" (role temporaria PENDENTE). O usuario nao acessa o Dashboard.
4. **Gestao de Setores (Admin):** Na Tela 13 (Gestao Municipal), o Admin pode clicar em uma Secretaria para abrir um painel lateral/modal gerenciando os Setores dela (Adicionar, Editar, Desativar).
5. **Aprovacao (Admin):** O Admin recebe um alerta na Tela 8 (Gestao de Usuarios) e aprova a entrada do servidor, definindo se ele e OPERADOR, GESTOR_SETOR, etc.

---

## ALTERACOES NO DOMINIO (src/types/domain.ts)

Adicione a role 'PENDENTE' em ROLES:

export const ROLES = {
  ADMIN_GERAL: 'ADMIN_GERAL',
  PREFEITO: 'PREFEITO',
  SECRETARIO: 'SECRETARIO',
  GESTOR_SETOR: 'GESTOR_SETOR',
  OPERADOR: 'OPERADOR',
  PENDENTE: 'PENDENTE', // <- NOVO: Usuario que acabou de se registrar
} as const

---

## 1. NOVA ROTA: TELA DE REGISTRO (/_auth/registro)

STITCH_PROMPT:
Design a clean government registration page for "Doc's Cataguases".
Layout: Centered white card on slate-50 background, max-w-md.
Header: City coat of arms placeholder circular 64px + Title "Criar Conta Servidor".
Form fields (full width):
  - Nome Completo
  - E-mail institucional (@cataguases.mg.gov.br)
  - Senha (password input)
  - Confirmar Senha
Button: "Cadastrar" (gov-blue).
Footer text: "Apenas e-mails institucionais oficiais serao aprovados."
Bottom link: "Ja possui conta? Fazer Login" (redirects to /_auth/login).
Style: Sober Brazilian Gov.br design system. High contrast.

---

## 2. NOVA ROTA: TELA DE ONBOARDING/LOTACAO (/_auth/onboarding)
(O usuario e redirecionado para ca obrigatoriamente se role === 'PENDENTE' e secretariaId === null)

STITCH_PROMPT:
Design an onboarding/lotacao step page for a government system.
Layout: Centered white card on slate-50 background, max-w-lg.
Header: Icon Building (gov-blue) + Title "Bem-vindo ao Doc's Cataguases"
Subtitle: "Para iniciar, informe sua lotacao atual na Prefeitura."
Form fields:
  - Select 1: "Secretaria" (placeholder "Ex: Secretaria de Saude")
  - Select 2: "Setor" (disabled until Secretaria is selected. Helper text: "Selecione a secretaria primeiro").
Alert banner (amber-50): "Apos enviar, seu acesso passara por uma validacao de seguranca da administracao."
Button: "Confirmar Lotacao" (gov-blue).
Style: Sober Brazilian Gov.br design system.

---

## 3. NOVA ROTA: TELA DE AGUARDANDO LIBERACAO (/_auth/aguardando)
(O usuario e redirecionado para ca se role === 'PENDENTE' e secretariaId !== null)

STITCH_PROMPT:
Design an "Awaiting Approval" static page for a government system.
Layout: Centered white card on slate-50 background, max-w-md, text-center.
Header: Icon Clock or ShieldCheck (large, slate-400) + Title "Conta em Analise".
Body text: "Sua solicitacao de acesso para a [Secretaria de Saude - Setor de Compras] foi recebida."
Body text 2: "Por questoes de seguranca, um administrador precisa validar seu vinculo antes de liberar a criacao de documentos oficiais."
Button: "Voltar para o Login" (outline).
Style: Sober Brazilian Gov.br design system.

---

## 4. ATUALIZACAO NA TELA 8: GESTAO DE USUARIOS (/_sistema/admin/usuarios)

Adicione abas (Tabs) na pagina atual de usuarios:
- Aba 1: "Usuarios Ativos" (A tabela atual que ja definimos no AGENTS_DESIGN.md).
- Aba 2: "Fila de Aprovacao (3)" (Nova tabela).

STITCH_PROMPT DA FILA DE APROVACAO:
Design the "Fila de Aprovacao" tab for the User Management admin page.
Layout: Table layout.
Columns: Nome | E-mail | Lotacao Solicitada | Data | Acoes
Row 1: "Carlos Mota", "carlos@cataguases...", "Sec. Saude / Compras", "Ha 2 horas",
       Buttons: [Aprovar Acesso] (gov-blue) | [Recusar] (outline red)
Approval Modal (Dialog):
  Title: "Aprovar Servidor: Carlos Mota".
  Text: "Confirme o nivel de permissao deste usuario."
  Select: "Cargo no Sistema" (Options: Operador, Gestor de Setor, Secretario).
  Button: "Aprovar e Enviar E-mail" (gov-blue).

---

## 5. ATUALIZACAO NA TELA 13: GESTAO MUNICIPAL (Setores)

O Admin precisa de um lugar para criar os "Setores" que vao aparecer no onboarding do usuario. Isso fica dentro da Tela 13 (Gestao Municipal).

Na tabela de "Secretarias Cadastradas" (ja definida no AGENTS_DESIGN.md), mude o botao "Acoes" para um botao [Gerenciar Setores].
Ao clicar, abre um Drawer (Painel lateral direito) do Shadcn.

STITCH_PROMPT DO DRAWER DE SETORES:
Design a right-side panel (Drawer/Sheet) to manage "Setores" of a specific Secretaria.
Header: Title "Setores - Secretaria de Saude" + close (X) button.
Content:
  Input field + [Adicionar Setor] button inline.
  List of existing sectors (white border rounded-md p-3 mb-2):
    Item 1: "Departamento de Compras" + [Editar] [Desativar] icons on right.
    Item 2: "Recursos Humanos Interno" + [Editar] [Desativar] icons on right.
    Item 3: "Gabinete do Secretario" + [Editar] [Desativar] icons on right.
Style: Sober Brazilian Gov.br design system.

---

## LOGICA DE PROTECAO DE ROTAS (FRONTEND GUARD)

Em src/routes/__root.tsx (ou onde voce estiver fazendo o guard do TanStack Router):

```typescript
// Regra de Ouro do Onboarding
if (usuario.role === 'PENDENTE') {
  if (!usuario.secretariaId) {
    // Nao preencheu lotacao ainda
    throw redirect({ to: '/_auth/onboarding' })
  } else {
    // Preencheu lotacao, aguardando admin
    throw redirect({ to: '/_auth/aguardando' })
  }
}
