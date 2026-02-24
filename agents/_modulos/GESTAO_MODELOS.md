# agents/_modulos/GESTAO_MODELOS.md — ADMINISTRAÇÃO DE MODELOS E VARIÁVEIS
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_modulos/WIZARD_PORTARIA.md | agents/_modulos/PAPEL_TIMBRADO.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também GESTAO_MODELOS.en.md

---

## IDENTIDADE

Este arquivo especifica as telas de gestão de Modelos de Documento e Variáveis de Sistema.
O Admin configura os "moldes" que alimentam o Wizard. Nunca hardcode campos no Wizard.
Todo campo que aparece no Wizard existe porque um Admin o cadastrou aqui primeiro.

---

## 1. CONCEITO: A FÁBRICA DE FORMULÁRIOS

O fluxo de administração de um modelo acontece em 3 etapas:

```
[ 1. Dados Básicos ] → [ 2. Upload do .docx + Extração de Tags ] → [ 3. Configuração das Variáveis ]
```

O template `.docx` DEVE seguir o padrão de papel timbrado da Prefeitura.
Consulte `agents/_modulos/PAPEL_TIMBRADO.md` antes de criar ou validar templates.

---

## 2. TIPO `ModeloVariavel` (CONTRATO MÍNIMO)

Este tipo é a ligação entre o template DOCX e o Wizard. Definir em `src/types/domain.ts`.

```typescript
export type TipoVariavel = 'texto' | 'numero' | 'data' | 'moeda' | 'cpf' | 'select'

export interface ModeloVariavel {
  tag:         string        // nome da tag exata no .docx, ex: 'NOME_SERVIDOR'
  label:       string        // rótulo exibido no Wizard, ex: 'Nome Completo do Servidor'
  tipo:        TipoVariavel  // tipo do campo renderizado no Wizard
  obrigatorio: boolean       // se true: asterisco vermelho + validação Zod
  opcoes:      string[]      // só usado quando tipo === 'select', ex: ['Efetivo', 'Comissionado']
  ordem:       number        // posição de exibição no formulário (1, 2, 3...)
}

export interface Modelo {
  id:           string
  nome:         string              // ex: 'Portaria de Nomeação'
  categoria:    string              // ex: 'RH', 'Licitação', 'Gabinete'
  secretariaId: string | null       // null = global (todas as secretarias vêem)
  docxUrl:      string              // URL do .docx no Supabase Storage
  variaveis:    ModeloVariavel[]    // lista ordenada de variáveis de usuário
  ativo:        boolean             // false = oculto na vitrine do Wizard
  createdAt:    string
  updatedAt:    string
}
```

---

## 3. ETAPA 1: DADOS BÁSICOS

**Campos do formulário:**
- `nome` (texto, obrigatório) — Ex: "Portaria de Nomeação"
- `categoria` (select) — Valores: RH, Licitação, Gabinete, Financeiro, Outros
- `secretariaId` (select) — Deixar em branco = Global (todas as secretarias)
- `ativo` (switch) — Padrão: true

**Regra ABAC:** Só `ADMIN_GERAL` pode criar modelos globais (`secretariaId: null`).
`SECRETARIO` só pode criar modelos da própria secretaria.

---

## 4. ETAPA 2: UPLOAD DO .DOCX E EXTRAÇÃO DE TAGS

### Regra do template
O arquivo `.docx` deve usar o papel timbrado oficial da Prefeitura.
Consulte `agents/_modulos/PAPEL_TIMBRADO.md` para o padrão visual obrigatório.

### Extração de tags (frontend, Ciclo 1 — mock)

```typescript
// Regex de extração: encontra tudo entre {{ e }}
const TAG_REGEX = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g

// Prefixos de variáveis de sistema (ignorar — o backend preenche automaticamente)
const SYS_PREFIXES = ['SYS_']

export function extrairTagsDocx(textoDocx: string): string[] {
  const matches = [...textoDocx.matchAll(TAG_REGEX)]
  const tags = matches.map(m => m[1].trim())
  const unicas = [...new Set(tags)]                              // remove duplicadas
  return unicas.filter(t => !SYS_PREFIXES.some(p => t.startsWith(p))) // remove SYS_*
}
```

**Comportamento do frontend após upload:**
1. Leitura do `.docx` via `mammoth.js` (extrai texto bruto)
2. Aplica `extrairTagsDocx()` sobre o texto
3. Para cada tag extraída, gera um card na Etapa 3
4. O arquivo `.docx` é enviado via `POST /api/upload` — retorna `{ docxUrl }`

---

## 5. ETAPA 3: CONFIGURAÇÃO DAS VARIÁVEIS

Para cada tag extraída na Etapa 2, o Admin configura:

| Campo | Tipo | Descrição |
|---|---|---|
| `label` | texto | Rótulo exibido ao usuário no Wizard |
| `tipo` | select | `texto`, `numero`, `data`, `moeda`, `cpf`, `select` |
| `obrigatorio` | switch | Se obrigatório na validação Zod |
| `opcoes` | textarea | Só aparece quando `tipo === 'select'`. Uma opção por linha. |
| `ordem` | number | Ordem de exibição no Wizard (padrão: ordem de extração) |

**Regra:** A Etapa 3 só aparece após o `.docx` ser submetido com sucesso.

---

## 6. VARIÁVEIS DE SISTEMA (TELA SEPARADA)

**Rota:** `/_sistema/admin/variaveis`

O Admin preenche dados fixos da prefeitura que mudam raramente.
O Wizard NUNCA exibe essas variáveis ao usuário final — o backend injeta silenciosamente.

### Variáveis obrigatórias (devem existir no banco antes do primeiro uso)

| Tag | Descrição | Exemplo |
|---|---|---|
| `SYS_PREFEITO_NOME` | Nome completo do Prefeito | "João Silva" |
| `SYS_MUNICIPIO_NOME` | Nome do Município | "Cataguases" |
| `SYS_ESTADO_SIGLA` | Sigla do Estado | "MG" |
| `SYS_CNPJ_PREFEITURA` | CNPJ da Prefeitura | "00.000.000/0001-00" |
| `SYS_DATA_HOJE` | Data atual formatada | Gerada automaticamente pelo backend |
| `SYS_NUMERO_PORTARIA` | Número oficial do documento | Gerado atomicamente pelo backend |
| `SYS_ASSINANTE_NOME` | Nome do assinante | Preenchido no fluxo de assinatura |
| `SYS_ASSINANTE_CARGO` | Cargo do assinante | Preenchido no fluxo de assinatura |
| `SYS_DATA_ASSINATURA` | Timestamp da assinatura | Preenchido no fluxo de assinatura |
| `SYS_CHANCELA_RODAPE` | Chancela com hash | Preenchido no fluxo de assinatura |

```typescript
// Tipo para variáveis de sistema (apps/api/prisma + src/types/domain.ts)
export interface VariavelSistema {
  id:        string
  chave:     string   // ex: 'SYS_PREFEITO_NOME'
  valor:     string   // ex: 'João Silva'
  descricao: string   // exibido na tela de admin
  editavel:  boolean  // false = gerada automaticamente pelo backend (não mostrar input)
  updatedAt: string
}
```

---

## 7. ENDPOINTS BACKEND (Ciclo 3)

```
GET  /api/admin/modelos
  ABAC:    ability.can('gerenciar', 'Modelo')
  Filtro:  secretariaId do usuário (ADMIN_GERAL vê todos)
  Retorna: Modelo[] com variaveis[]

POST /api/admin/modelos
  ABAC:    ability.can('gerenciar', 'Modelo')
  Body:    { nome, categoria, secretariaId, docxUrl, variaveis: ModeloVariavel[], ativo }
  Retorna: Modelo criado

GET  /api/admin/modelos/[id]
  ABAC:    ability.can('gerenciar', 'Modelo')
  Retorna: Modelo com variaveis[] completas

PATCH /api/admin/modelos/[id]
  ABAC:    ability.can('gerenciar', 'Modelo')
  Body:    Partial<{ nome, categoria, secretariaId, docxUrl, variaveis, ativo }>
  Retorna: Modelo atualizado

DELETE /api/admin/modelos/[id]
  ABAC:    ability.can('gerenciar', 'Modelo') e role === 'ADMIN_GERAL'
  Regra:   Só pode deletar se não houver portarias vinculadas ao modelo
  Retorna: { success: true }

GET  /api/admin/variaveis
  ABAC:    ability.can('gerenciar', 'VariavelSistema')
  Retorna: VariavelSistema[] (apenas as editáveis na tela)

PATCH /api/admin/variaveis/[id]
  ABAC:    ability.can('gerenciar', 'VariavelSistema') e role === 'ADMIN_GERAL'
  Body:    { valor: string }
  Retorna: VariavelSistema atualizada
```

---

## 8. PAYLOAD COMPLETO DE CRIAÇÃO DE MODELO

```json
{
  "nome": "Portaria de Nomeação",
  "categoria": "RH",
  "secretariaId": null,
  "docxUrl": "https://storage.supabase.co/.../portaria-nomeacao.docx",
  "ativo": true,
  "variaveis": [
    { "tag": "NOME_SERVIDOR",  "label": "Nome Completo do Servidor", "tipo": "texto",  "obrigatorio": true,  "opcoes": [], "ordem": 1 },
    { "tag": "CPF_SERVIDOR",   "label": "CPF do Servidor",           "tipo": "cpf",    "obrigatorio": true,  "opcoes": [], "ordem": 2 },
    { "tag": "CARGO",          "label": "Cargo",                     "tipo": "select", "obrigatorio": true,  "opcoes": ["Efetivo", "Comissionado", "Estagiário"], "ordem": 3 },
    { "tag": "SALARIO",        "label": "Salário",                   "tipo": "moeda",  "obrigatorio": true,  "opcoes": [], "ordem": 4 },
    { "tag": "DATA_INICIO",    "label": "Data de Início",            "tipo": "data",   "obrigatorio": true,  "opcoes": [], "ordem": 5 }
  ]
}
```

---

## 9. CHECKLIST DE CONCLUSÃO (Ciclo 3)

- [ ] Interface `ModeloVariavel` e `Modelo` definidas em `src/types/domain.ts`
- [ ] Interface `VariavelSistema` definida em `src/types/domain.ts`
- [ ] `extrairTagsDocx()` funcionando com regex correto e filtro `SYS_*`
- [ ] Etapa 3 só aparece após upload bem-sucedido do `.docx`
- [ ] `GET /api/admin/modelos` retorna modelos com `variaveis[]`
- [ ] `POST /api/admin/modelos` valida payload com Zod
- [ ] `DELETE /api/admin/modelos/[id]` bloqueia se houver portarias vinculadas
- [ ] Variáveis `SYS_*` não aparecem no formulário do Wizard
- [ ] `GET /api/admin/variaveis` retorna apenas as variáveis editáveis
- [ ] Template `.docx` segue padrão de papel timbrado (`PAPEL_TIMBRADO.md`)
