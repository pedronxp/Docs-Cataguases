# Vinculação de Titulares (Secretários) aos Órgãos

**Objetivo:** Permitir que cada Secretaria tenha um usuário designado como "Secretário Responsável" (Titular), e que isso crie dinamicamente uma Variável de Sistema global no formato `SYS_SEC_[SIGLA]_NOME` para ser usada nos modelos de portaria.

## 1. Alterações no Banco de Dados (Prisma)
- Adicionar o campo `titularId` referenciando `User` na tabela `Secretaria`.
```prisma
model Secretaria {
  // ... campos existentes
  titularId String?
  titular   User?   @relation("SecretarioTitular", fields: [titularId], references: [id])
}

model User {
  // ...
  secretariasTitular Secretaria[] @relation("SecretarioTitular")
}
```

## 2. Lógica de Backend (`secretaria.service.ts`)
- **Atualizar Secretaria:** Ao editar a Secretaria e definir um `titularId`:
  1. Atualizar o registro da `Secretaria`.
  2. Buscar o Nome do Usuário escolhido.
  3. Realizar `upsert` na tabela `VariavelSistema`:
     - Chave: `SYS_SEC_{SIGLA}_NOME`
     - Valor: Nome do usuário
     - resolvidaAutomaticamente: `true`
- Ao desvincular o titular, excluir ou esvaziar a Variável de Sistema associada.

## 3. Lógica de Frontend (`_sistema.admin.organograma.tsx`)
1. **API de Busca:** Buscar a lista de usuários filtrando apenas `cargo === 'SECRETARIO'` (ou listar todos caso a regra de negócio exija flexibilidade).
2. **UI (Card):** Renderizar um Select/Dropdown estilizado abaixo do nome de cada Secretaria na listagem (ver print de referência).
3. **Trigger:** Ao selecionar no Dropdown, invocar patch na API para salvar a Secretaria e disparar o Trigger das Variáveis Globais.
4. **Feedback Visual:** Exibir um Badge em verde-claro com a chave `{{SYS_SEC_SIGLA_NOME}}` embaixo do Select.
