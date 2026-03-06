# Design: Melhorias no Fluxo de Criação de Modelo

**Data:** 2026-03-01
**Branch:** Versao-0.02
**Status:** Aprovado para implementação

---

## Contexto

O wizard de criação de `ModeloDocumento` possui 3 passos (Dados Básicos → Conteúdo → Variáveis). O fluxo funciona, mas apresenta lacunas de UX, funcionalidades ausentes e riscos de integridade que podem gerar documentos corrompidos em produção.

---

## Melhorias Aprovadas

### Área A — UX/Usabilidade

#### A1. Drag-and-drop para reordenar variáveis
- **O que:** Interface de arrastar para reorganizar a lista de variáveis no Passo 3.
- **Por que:** O campo `ordem` já existe no schema mas não há forma visual de reordenar.
- **Como:** Instalar `@dnd-kit/core` + `@dnd-kit/sortable`. Substituir lista estática de variáveis por `SortableContext`. Ao reordenar, atualizar o campo `ordem` de cada item.
- **Impacto:** Schema inalterado. Apenas frontend.

#### A2. Highlight bidirecional variável ↔ template
- **O que:** Hover em variável da lista destaca o `{{TAG}}` correspondente no preview HTML, e vice-versa.
- **Por que:** Hoje os dois painéis são independentes — o usuário não sabe qual tag corresponde a qual variável sem ler os nomes.
- **Como:** Adicionar `data-chave="NOME_TAG"` nas `<span>` que envolvem as tags no HTML renderizado. No hover da variável, aplicar classe CSS `highlight` via `querySelector`. No hover da tag, fazer scroll + highlight da variável na lista.
- **Impacto:** Apenas frontend. Requer que a API de análise envolva tags em `<span>` com atributo `data-chave`.

#### A3. Preview ao vivo com dados de exemplo
- **O que:** Botão "Simular preenchimento" no Passo 3. Abre modal com mini-formulário das variáveis atuais. Ao preencher, o preview mostra o documento com valores reais.
- **Por que:** Dá confiança antes de salvar. Hoje só é possível ver o resultado após criar uma portaria real.
- **Como:** Estado local `previewValues: Record<string, string>`. Função `renderPreview(html, previewValues)` faz replace de `{{CHAVE}}` pelos valores. Modal lateral ou drawer sobreposto ao Passo 3.
- **Impacto:** Apenas frontend. Sem mudança de API.

#### A4. Indicador de cobertura de tags
- **O que:** Badge no topo do Passo 3 mostrando `X/Y tags mapeadas`. Tags não mapeadas destacadas em vermelho no preview.
- **Por que:** Hoje o usuário pode salvar o modelo sem perceber que esqueceu de configurar variáveis para algumas tags.
- **Como:** Derivado do estado atual: `tagsNoHtml` (regex) vs `variaveisDefinidas`. Diferença = tags descobertas. Badge muda de cor: verde (100%), amarelo (>50%), vermelho (<50%).
- **Impacto:** Apenas frontend. Complementa C1 (bloqueio de save).

---

### Área B — Funcionalidades Novas

#### B1. Valores padrão por variável
- **O que:** Campo `valorPadrao` opcional em cada `ModeloVariavel`. No formulário de portaria, o campo vem pré-preenchido.
- **Por que:** Campos como `CIDADE` são sempre `"Cataguases"` — reduz esforço do operador.
- **Schema:**
  ```prisma
  model ModeloVariavel {
    // ... campos existentes
    valorPadrao String? // NOVO
  }
  ```
- **Frontend:** Input adicional no card de cada variável no Passo 3: "Valor padrão (opcional)".
- **Backend:** Campo incluído no payload de criação/atualização e retornado nas listagens.
- **Impacto:** Migration Prisma + ajuste em wizard, API e formulário de portaria.

#### B2. Variáveis condicionais (show/hide)
- **O que:** Uma variável pode ter uma regra: só aparece no formulário se outra variável tiver determinado valor.
- **Por que:** Formulários longos com campos que só fazem sentido em contextos específicos (ex: campo `CNPJ_CONTRATADA` só aparece se `TIPO_ATO` = `"contrato"`).
- **Schema:**
  ```prisma
  model ModeloVariavel {
    // ... campos existentes
    regraCondicional Json? // { dependeDe: "CHAVE", valor: "valor" }
  }
  ```
- **Frontend:** No card de variável no Passo 3, seção expandível "Condicional": dropdown para escolher variável dependente + campo para o valor gatilho.
- **Formulário de portaria:** Lógica de renderização: `if (!regra || formData[regra.dependeDe] === regra.valor)` → exibe campo.
- **Impacto:** Migration Prisma + wizard + formulário de portaria.

#### B3. Agrupamento de variáveis em seções
- **O que:** Campo `grupo` em cada variável. No formulário de portaria, campos agrupados com cabeçalhos visuais.
- **Por que:** Modelos complexos (10+ variáveis) ficam difíceis de navegar sem organização.
- **Schema:**
  ```prisma
  model ModeloVariavel {
    // ... campos existentes
    grupo String? // ex: "Identificação", "Valores", "Assinaturas"
  }
  ```
- **Frontend:** Input de grupo no Passo 3 (com sugestões baseadas nos grupos já usados no modelo). Formulário de portaria agrupa por `grupo` com `<fieldset>` ou separadores visuais.
- **Impacto:** Migration Prisma + wizard + formulário de portaria.

#### B4. Versionamento de modelo
- **O que:** Ao editar um modelo que já tem portarias vinculadas, uma nova versão é criada em vez de sobrescrever.
- **Por que:** Hoje o `PATCH` sobrescreve o modelo inteiro. Portarias antigas apontam para o modelo modificado, perdendo a referência ao template original usado.
- **Schema:**
  ```prisma
  model ModeloDocumento {
    // ... campos existentes
    versao         Int     @default(1)           // NOVO
    modeloPaiId    String?                        // NOVO (aponta para versão anterior)
    modeloPai      ModeloDocumento? @relation("Versoes", fields: [modeloPaiId], references: [id])
    versoes        ModeloDocumento[] @relation("Versoes")
  }
  ```
- **Lógica:** Se `portarias.count > 0` ao editar → cria novo registro com `versao + 1` e `modeloPaiId = id_atual` → desativa o antigo.
- **Impacto:** Migration Prisma + ModeloService + API PATCH + UI de listagem (badge de versão).

---

### Área C — Confiabilidade e Validação

#### C1. Detecção de variáveis órfãs
- **O que:** Antes de salvar, cruzar tags `{{TAG}}` no HTML com variáveis definidas. Alertar sobre: (a) tag sem variável, (b) variável sem tag.
- **Por que:** Esses erros geram portarias com placeholders vazios ou campos inúteis no formulário — bug silencioso que só aparece em produção.
- **Como:**
  ```typescript
  const tagsNoHtml = extrairTags(conteudoHtml) // regex /\{\{([A-Z0-9_]+)\}\}/g
  const chavesDefinidas = variaveis.map(v => v.chave)
  const tagsSemVariavel = tagsNoHtml.filter(t => !chavesDefinidas.includes(t))
  const variaveisSemTag = chavesDefinidas.filter(c => !tagsNoHtml.includes(c))
  ```
- **UX:** Erros críticos (`tagsSemVariavel`) bloqueiam o save. Warnings (`variaveisSemTag`) mostram alerta com opção de ignorar.
- **Impacto:** Apenas frontend (lógica de validação no Passo 3).

#### C2. Validação de coerência de tipo
- **O que:** Se o `valorPadrao` (B1) for informado, valida se respeita o formato do tipo escolhido.
- **Por que:** Evita configurações silenciosamente erradas (ex: `valorPadrao: "abc"` em variável tipo `cpf`).
- **Como:** Mapa de validadores por tipo:
  ```typescript
  const validadores = {
    cpf: (v) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(v),
    data: (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v),
    numero: (v) => !isNaN(Number(v)),
    moeda: (v) => /^\d+([.,]\d{2})?$/.test(v),
  }
  ```
- **Impacto:** Apenas frontend.

#### C3. Bloqueio de save com erros críticos
- **O que:** Botão "Finalizar e Salvar" desabilitado se:
  1. Houver tags `{{TAG}}` sem variável correspondente (C1)
  2. O HTML contém `{{` mas nenhuma variável foi definida
  3. Nome do modelo já existe (verificação prévia via `GET /api/admin/modelos?nome=xxx` antes de submeter)
- **Por que:** Hoje esses erros só aparecem após tentativa de save — experiência ruim.
- **Como:** Estado derivado `errosCriticos: string[]`. Botão com `disabled={errosCriticos.length > 0}`. Tooltip listando os erros ao hover.
- **Impacto:** Apenas frontend + 1 endpoint de verificação de nome duplicado.

---

## Ordem de Implementação Sugerida

| Prioridade | Item | Complexidade | Impacto |
|------------|------|-------------|---------|
| 1 | C1 — Detecção de órfãos | Baixa | Alto |
| 2 | C3 — Bloqueio de save | Baixa | Alto |
| 3 | A4 — Badge de cobertura | Baixa | Médio |
| 4 | A2 — Highlight bidirecional | Média | Médio |
| 5 | A3 — Preview com dados | Média | Alto |
| 6 | B1 — Valores padrão | Média | Alto |
| 7 | A1 — Drag-and-drop | Média | Médio |
| 8 | B3 — Agrupamento | Média | Médio |
| 9 | B2 — Condicionais | Alta | Médio |
| 10 | B4 — Versionamento | Alta | Alto |

---

## Arquivos Afetados

### Apenas frontend (sem migration):
- `apps/web/src/routes/_sistema.admin.modelos.novo.tsx`
- `apps/web/src/services/modelo.service.ts`
- `apps/web/src/types/domain.ts` (novos campos opcionais)

### Frontend + backend + migration:
- `apps/api/prisma/schema.prisma` (B1: valorPadrao, B2: regraCondicional, B3: grupo, B4: versao/modeloPaiId)
- `apps/api/src/app/api/admin/modelos/route.ts`
- `apps/api/src/app/api/admin/modelos/[id]/route.ts`
- `apps/api/src/services/modelo.service.ts`
- `apps/web/src/routes/_sistema.administrativo.portarias.novo.tsx` (B1, B2, B3)
