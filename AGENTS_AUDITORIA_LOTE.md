# AGENTS_AUDITORIA_LOTE.md — COMPLEMENTO: ASSINATURA EM LOTE E AUDITORIA
# Leia junto com AGENTS.md, MOCKS.md e PROGRESS.md
# Este arquivo implementa seguranca avancada e produtividade para a Alta Gestao.

---

## 1. ASSINATURA EM LOTE (PRODUTIVIDADE)

**O Problema:** O Prefeito ou Secretario nao pode abrir 50 portarias uma por uma para assinar.
**A Solucao:** Uma nova aba na tela "Portarias" chamada "Minhas Assinaturas Pendentes" com checkboxes para selecao multipla.

### Nova Permissao CASL
Nenhuma nova. Se o usuario tem `can('assinar', 'Portaria')`, ele tem acesso a funcionalidade em lote.

### Alteracao na UI: Tela 3 (Lista de Portarias)
Adicionar Tabs na Tela 3 (`/_sistema/administrativo/portarias`):
- Aba 1: "Todas as Portarias" (Tabela padrao que ja existe).
- Aba 2: "Aguardando Minha Assinatura" (So aparece se o usuario logado tiver documentos onde `assinanteId === usuario.id`).

**STITCH_PROMPT PARA A ABA DE ASSINATURA:**
Design the "Aguardando Minha Assinatura" tab for the Portarias page.
Layout: Data table with multi-select checkboxes.
Top Bar (sticky/floating when items selected):
  Bg-purple-50, border-purple-200, p-3 rounded-md flex justify-between items-center.
  Text: "12 documentos selecionados".
  Button: [✍️ Assinar Lote] (gov-blue).
Table Columns: [Checkbox] | Numero | Titulo | Secretaria | Recebido Ha | [Ver] button
Row: [X] checked | 043/2025 | "Portaria de Ferias - Joao" | RH | "2 horas" | [Ver]
Style: Sober Brazilian Gov.br design.

### O Modal de Assinatura (Seguranca)
Quando clica em "Assinar Lote" (ou mesmo ao assinar individualmente na Tela 6), o sistema deve exigir confirmacao de identidade.

**STITCH_PROMPT PARA O MODAL DE ASSINATURA:**
Design a security confirmation Dialog for signing documents.
Title: "Confirmar Assinatura Eletronica".
Description: "Voce esta prestes a assinar 12 documentos oficiais. Esta acao e irreversivel e os documentos serao publicados publicamente."
Form field: Password input (Label: "Digite sua senha de acesso para confirmar").
Footer: [Cancelar] outline + [Confirmar e Publicar] green button.

### Regra de Negocio do Lote (Backend / Mocks)
- Ao confirmar a senha (mock pode aceitar qualquer string por enquanto), o servico itera sobre o array de IDs selecionados.
- Gera um Hash SHA-256 para cada um: `hash = SHA256(portariaId + usuarioId + timestamp)`.
- Muda o status de todos para `PUBLICADA` e preenche `assinadoEm`.
- (Futuro) Dispara 1 notificacao pro sistema avisando "12 documentos publicados com sucesso".

---

## 2. TRILHA DE AUDITORIA BLINDADA (SEGURANCA)

**O Problema:** O `FeedAtividade` e bonito, mas nao grava dados tecnicos ou delecoes para auditoria legal.
**A Solucao:** Uma tabela `AuditLog` invisivel para o usuario comum, acessivel apenas pelo `ADMIN_GERAL` em uma nova tela (Tela 15).

### Adicao no Prisma Schema (Para o Ciclo 2, ja preparar mocks no Ciclo 1)
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String   // Quem fez
  action    String   // Ex: UPDATE_USER_ROLE, DELETE_PORTARIA, SIGN_LOTE
  entity    String   // Tabela afetada: User, Portaria
  entityId  String   // ID do registro afetado
  oldData   Json?    // O que era antes
  newData   Json?    // Como ficou
  ipAddress String?  // IP da requisicao
  createdAt DateTime @default(now())
}
