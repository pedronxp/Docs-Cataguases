# agents/_modulos/WIZARD_PORTARIA.md — MOTOR DE CRIAÇÃO E WIZARD DE PORTARIA
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md | agents/_gestao/PROGRESS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também WIZARD_PORTARIA.en.md

---

## IDENTIDADE

Este arquivo especifica o motor do Wizard de criação de portaria (3 etapas).
Abrange o frontend (Ciclo 1 — concluído) e a integração real com o backend (Ciclo 3 — em andamento).
Nunca pule a etapa de Conferência. Nunca gere número oficial no frontend.

---

## 1. CONCEITO DO WIZARD (STEPPER)

A criação de um documento oficial é dividida em 3 etapas para reduzir erros e garantir rastreabilidade:

```
[ 1. Selecionar Modelo ] → [ 2. Preencher Dados ] → [ 3. Conferência e Envio ]
```

Componente visual: Stepper no topo da página, com indicador de etapa ativa.

---

## 2. ETAPA 1: SELEÇÃO DE MODELO

**Fonte de dados (Ciclo 1 — Mock):** `listarModelos()`
**Fonte de dados (Ciclo 3 — Real):** `GET /api/admin/modelos`

**Regras de visibilidade por role:**

| Role | Modelos que vê |
|---|---|
| `OPERADOR` | Prefeitura inteira (`secretariaId: null`) + própria secretaria |
| `GESTOR_SETOR` | Prefeitura inteira (`secretariaId: null`) + próprio setor |
| `SECRETARIO` | Prefeitura inteira + própria secretaria |
| `PREFEITO` | Todos os modelos |
| `ADMIN_GERAL` | Todos os modelos |

**UI:**
- Grid de Cards clicáveis (Shadcn Card com hover effect)
- Ao selecionar um Card, habilita o botão [Próximo →]
- Exibir nome, descrição e ícone do modelo

---

## 3. ETAPA 2: FORMULÁRIO DINÂMICO

O formulário se molda lendo `variaveis: ModeloVariavel[]` do modelo selecionado.
Nunca hardcode campos. O Admin configura, o sistema renderiza.

**Tipos de variável e renderização:**

| `tipo` | Componente renderizado |
|---|---|
| `texto` | `<Input type="text" />` |
| `numero` | `<Input type="number" />` |
| `data` | `<Input type="date" />` |
| `moeda` | `<Input />` com máscara `R$ 0,00` (react-imask) |
| `cpf` | `<Input />` com máscara `000.000.000-00` (react-imask) |
| `select` | `<Select>` do Shadcn usando `opcoes[]` configuradas |

**Regras:**
1. Asterisco vermelho `*` nas labels onde `obrigatorio === true`
2. Validação on-the-fly com Zod — não avança com campo obrigatório vazio ou CPF/moeda incompleto
3. Variáveis com prefixo `SYS_` (ex: `SYS_PREFEITO_NOME`) são preenchidas automaticamente pelo sistema — não exibir no formulário
4. Botões: [← Voltar] e [Próximo →]

---

## 4. ETAPA 3: CONFERÊNCIA E ENVIO

**UI:**
1. Card cinza claro com lista de chave/valor dos dados preenchidos
2. Alerta (amber): *"Confira os dados com atenção. Após gerar o rascunho, esses valores serão injetados no documento oficial."*
3. Botões: [← Corrigir Dados] e **[ ✅ Gerar Rascunho do Documento ]** (gov-blue, largo)

**Payload enviado ao clicar:**
```json
{
  "titulo": "Portaria de Nomeação - João da Silva",
  "modeloId": "uuid-do-modelo",
  "dadosFormulario": {
    "NOME_SERVIDOR": "João da Silva",
    "CPF_SERVIDOR": "123.456.789-00",
    "CARGO": "Assistente Administrativo"
  }
}
```

---

## 5. INTEGRAÇÃO REAL — CICLO 3

### Fluxo após clicar em "Gerar Rascunho"

```
1. Frontend chama POST /api/portarias
      ↓ resposta imediata:
   { id, status: 'PROCESSANDO', numeroOficial: '001/2026/SEMAD' }

2. Frontend redireciona para /portarias/revisao/$id

3. Tela de revisão faz polling:
   GET /api/portarias/[id] a cada POLLING_INTERVAL_MS (5.000ms)
   Máximo de POLLING_MAX_ATTEMPTS (60 tentativas = 5 minutos)

4. Quando status mudar:
   → PENDENTE      : exibir PDF gerado + botão de aprovação
   → FALHA_PROCESSAMENTO : exibir alerta de erro (ver seção abaixo)
```

### Estado FALHA_PROCESSAMENTO na tela de revisão

Quando `status === 'FALHA_PROCESSAMENTO'`:
- Exibir alerta destrutivo (vermelho): *"Ocorreu um erro ao gerar o documento. O número {{numeroOficial}} foi reservado e será reutilizado."*
- Exibir botão **[ 🔄 Tentar Novamente ]**
- Ao clicar: `PATCH /api/portarias/[id]/retry`
- Backend regenera apenas o PDF. **Nunca gera novo número.**
- Status volta para PROCESSANDO → polling reinicia

---

## 6. CHECKLIST DE CONCLUSÃO (Ciclo 3 — Wizard)

- [ ] `POST /api/portarias` retorna `{ id, status: 'PROCESSANDO', numeroOficial }`
- [ ] Polling de 5s funcionando na tela revisão
- [ ] Timeout de 5 minutos exibe mensagem de erro amigável
- [ ] `FALHA_PROCESSAMENTO` exibe alerta e botão de retry
- [ ] `PATCH /api/portarias/[id]/retry` regenera PDF sem novo número
- [ ] `GET /api/admin/modelos` substitui `listarModelos()` mock
- [ ] Variáveis `SYS_*` são preenchidas automaticamente, não aparecem no formulário
- [ ] `GESTOR_SETOR` vê apenas modelos do próprio setor + prefeitura
