# Design: Dashboard Jornal & Publicação Oficial
**Data:** 2026-03-01
**Status:** Aprovado
**Versão:** 0.02

---

## Contexto

O Dashboard Jornal é a **etapa final do fluxo oficial** de uma portaria municipal.
O responsável por essa etapa é o usuário com role **JORNALISTA** (também acessível ao ADMIN_GERAL).

```
OPERADOR → REVISOR → SECRETÁRIO → PREFEITO assina → [JORNAL] → PUBLICADA
```

---

## Rotas

| Rota | Arquivo | Propósito |
|------|---------|-----------|
| `/jornal` | `_sistema.jornal.tsx` | Dashboard operacional principal |
| `/jornal/guia` | `_sistema.jornal.guia.tsx` | Guia de referência do fluxo |

---

## Dashboard Principal (`/jornal`)

### Cards de Métricas (topo)

4 cards responsivos em linha (quebra 2x2 em telas menores):

| Card | Valor | Subtexto |
|------|-------|---------|
| Pendentes Hoje | contagem da fila | "Aguardando numeração" |
| Publicadas Hoje | contagem do dia | "Processadas hoje" |
| Próximo Número | ex: PORT-0013/2026 | "A ser atribuído na próx. ação" |
| Total no Ano | contagem anual | "Desde Jan/YYYY" |

### Tabela da Fila

Colunas:

| Coluna | Detalhe |
|--------|---------|
| Checkbox | Seleção para processamento em lote |
| Secretaria | Sigla em badge + nome completo |
| Documento | Título da portaria (clicável — abre a portaria) |
| Tipo Assinatura | Badge colorido: Digital / Manual / Dispensada |
| Entrada na Fila | Data relativa ("há 2h") + data absoluta no tooltip |
| Ação | Botão "Numerar" (processamento individual) |

### Barra de Ação em Lote

- Aparece animada na base da tela quando ≥ 1 item selecionado
- Exibe: `N portarias selecionadas`
- Botão: `Numerar Selecionadas (N)`
- Abre dialog de confirmação listando todos os documentos selecionados
- Processa sequencialmente com indicador de progresso por item

### Responsividade

- Cards: 4 colunas em desktop → 2x2 em tablet → 1 coluna em mobile
- Tabela: colapsa colunas secundárias (Entrada) em telas < 1024px
- Barra de lote: full-width em todas as resoluções
- Testado para monitores de 1366x768 até ultrawide

### Header da Página

```
Publicação Oficial                    [Guia] [Sincronizar]
Oficialização e numeração de atos municipais.
```

- Sem emojis — linguagem govtech formal
- Botão "Guia" navega para `/jornal/guia`
- Botão "Sincronizar" recarrega a fila

---

## Guia de Referência (`/jornal/guia`)

### Estrutura

1. **Header** — Botão "← Voltar ao Dashboard" fixo no topo
2. **Fluxo Completo** — Diagrama visual de todas as etapas do sistema, destacando a etapa do Jornalista
3. **Sua Etapa: Publicação Oficial** — Passo a passo focado no Jornalista
4. **FAQ** — Accordion com dúvidas frequentes

### Abas por Tipo de Documento

```
[Portaria]  [Memorando]  [Ofício]  [Lei]
    ↑
  (ativa)    (Em breve — desabilitadas)
```

- Cada aba contém o fluxo específico daquele tipo de documento
- Tipos futuros são exibidos como "Em breve" — sem reescrever a página quando ativados

### Passos do Jornalista (aba Portaria)

1. **Verificar a fila** — o que observar antes de numerar
2. **Confirmar assinatura** — tipos aceitos e o que cada um significa
3. **Numerar** — como usar modo individual e modo em lote
4. **Verificar publicação** — como confirmar que o número foi gerado corretamente

### FAQ (Accordion)

- O que fazer se uma portaria aparecer sem assinatura?
- Posso desfazer uma numeração?
- O que significa "operação atômica"?
- Como funciona a numeração em lote?

---

## Decisão Arquitetural: Preparação para Multi-Documentos

**Prazo estimado para Memorando/Ofício:** ~1 mês após conclusão do fluxo de Portaria.

**Abordagem escolhida: Opção A — Fila Polimórfica**

Migration mínima na `JornalQueue`:

```prisma
enum TipoDocumento {
  PORTARIA
  MEMORANDO
  OFICIO
  LEI
}

model JornalQueue {
  documentoId   String        // ID genérico (era portariaId)
  tipoDocumento TipoDocumento // novo campo
  portaria      Portaria?     // relação opcional mantida para compatibilidade
  // ... demais campos inalterados
}
```

**Por quê esta abordagem:**
- Zero quebra no fluxo atual de Portaria
- LivrosNumeracao já suporta múltiplos tipos via `tipos_suportados` JSON
- Quando Memorando chegar: só adicionar enum + lógica de relação
- Evita refatoração maior (Opção C) que seria prematura agora

---

## Componentes a Criar / Modificar

### Frontend (`apps/web`)

| Arquivo | Ação |
|---------|------|
| `src/routes/_sistema.jornal.tsx` | Reescrever — novo design |
| `src/routes/_sistema.jornal.guia.tsx` | Criar — página do guia |

### Backend (`apps/api`)

| Arquivo | Ação |
|---------|------|
| `prisma/schema.prisma` | Adicionar `TipoDocumento` enum + atualizar `JornalQueue` |
| `src/app/api/jornal/route.ts` | Adaptar GET para retornar métricas + suporte polimórfico |

---

## O que NÃO muda

- Lógica de numeração atômica (`NumeracaoService`) — sem alterações
- API de publicação (`POST /api/jornal`) — apenas adaptação do campo `portariaId` → `documentoId`
- Página Admin Livros (`/admin/livros`) — sem alterações
- CASL abilities para JORNALISTA — sem alterações
