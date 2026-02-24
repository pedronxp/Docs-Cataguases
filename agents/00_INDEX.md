# 🗂️ MAPA CENTRAL DOS AGENTES — DOC'S CATAGUASES
# Arquivo Mestre do ecossistema de IA do projeto.
# IA: Sempre leia este arquivo PRIMEIRO para entender qual agente acionar.
# Projeto: Doc's Cataguases — Sistema GovTech — Prefeitura de Cataguases/MG

---

## 📁 ESTRUTURA DE PASTAS

```
agents/
├── 00_INDEX.md                 ← VOCÊ ESTÁ AQUI (Mapa Central)
│
├── _base/                      ← Regras inviolaveis do sistema
│   ├── AGENTS.md               (Arquitetura, State Machine, tipos domain.ts)
│   ├── MOCKS.md                (Banco mock, servicos simulados, tipos reais)
│   └── GUIA_EQUIPE.md          (Manual de erros, conflitos de merge)
│
├── _infraestrutura/            ← Como o projeto e construido
│   ├── GITHUB.md               (DevOps, branches, commits, PRs — Quiz)
│   ├── CODE.md                 (Padroes Next.js 15, Server Actions — Quiz)
│   ├── DATABASE.md             (Supabase, tabelas, RLS, migrations — Quiz)
│   ├── DEPLOY.md               (Vercel, producao, checklist — Quiz)
│   ├── DESIGN.md               (Design system, Shadcn UI, Stitch MCP)
│   └── HEALTH.md               (Monitoramento, status do sistema)
│
├── _gestao/                    ← Como o projeto e gerenciado
│   ├── AUDITOR.md              (Visao 360, diagnostico, risco — Quiz)
│   ├── PROGRESS.md             (Product Manager, backlog, ciclos — Quiz)
│   └── CICLO2.md               (Planejamento do backend real)
│
└── _modulos/                   ← Funcionalidades do sistema
    ├── ONBOARDING.md           (Registro, lotacao, quarentena)
    ├── WIZARD_PORTARIA.md      (Motor de criacao, 3 etapas)
    ├── ASSINATURA.md           (Fluxo de assinatura, notificacoes)
    ├── ACERVO.md               (Busca, filtros, pastas por secretaria)
    ├── GESTAO_MODELOS.md       (Templates .docx, variaveis dinamicas)
    ├── VALIDACAO_PUBLICA.md    (Rota /validar, hash de autenticidade)
    ├── PAPEL_TIMBRADO.md       (Logos e papel timbrado no .docx)
    ├── LAYOUT_ASSINATURA.md    (Tags de assinatura, preview PDF)
    ├── ANALYTICS.md            (Dashboard de metricas, Recharts)
    ├── AUDITORIA_LOTE.md       (Assinatura em lote, trilha oculta)
    └── TUTORIAL.md             (Central de ajuda, FAQ por role)
```

---

## 🤖 QUAL AGENTE ACIONAR?

| Situacao | Agente Correto |
|---|---|
| Diagnostico geral do projeto | `_gestao/AUDITOR.md` |
| Iniciar nova tarefa | `_gestao/AUDITOR.md` → `_infraestrutura/GITHUB.md` |
| Substituir mock → Supabase real | `_infraestrutura/DATABASE.md` → `_infraestrutura/CODE.md` |
| Criar branch, commit ou PR | `_infraestrutura/GITHUB.md` |
| Escrever ou revisar codigo | `_infraestrutura/CODE.md` |
| Criar tabela ou policy RLS | `_infraestrutura/DATABASE.md` |
| Ver o que esta pendente no backlog | `_gestao/PROGRESS.md` |
| Fazer deploy na Vercel | `_infraestrutura/DEPLOY.md` |
| Trabalhar em funcionalidade especifica | Ver pasta `_modulos/` |
| Duvida de arquitetura ou regras base | `_base/AGENTS.md` |
| Conflito de merge ou erro de Git | `_base/GUIA_EQUIPE.md` |

---

## 📐 ORDEM OBRIGATORIA PARA QUALQUER NOVA TAREFA

```
1. _gestao/AUDITOR.md              → O que esta pendente? Qual o risco?
        ↓
2. _infraestrutura/DATABASE.md     → A tabela existe com RLS correto?
        ↓
3. _infraestrutura/CODE.md         → O codigo segue o padrao do projeto?
        ↓
4. _infraestrutura/GITHUB.md       → Commit e PR no branch correto?
        ↓
5. _gestao/PROGRESS.md             → Backlog atualizado?
        ↓
6. _infraestrutura/DEPLOY.md       → Pronto para producao?
```

---

## 🚦 ESTADO ATUAL DO PROJETO

| Ciclo | Status | Branch Atual |
|---|---|---|
| Ciclo 1 — Frontend + Mocks | ✅ Concluido | — |
| Ciclo 2 — Backend Real | 🔄 Em andamento | `chore/core/transicao-mock-real` |
| Ciclo 3 — Realtime + E-mails | ⏳ Planejado | — |

### Mocks Pendentes de Migracao (Ciclo 2)

| Servico Mock | Tabela Supabase Alvo | Observacao Critica |
|---|---|---|
| `auth.service.ts` | `profiles` + Supabase Auth | Campo `ativo: false` deve bloquear sessao |
| `portaria.service.ts` | `portarias` | Numeracao atomica obrigatoria (SELECT FOR UPDATE) |
| `usuario.service.ts` | `profiles` | `toggleAtivo` deve invalidar sessao ativa |
| `feed.service.ts` | `feed_atividades` | Insercao via trigger apos cada mutacao |
| `modelo.service.ts` | `modelos_documento` + `modelo_variaveis` | Respeitar campo `ordem` das variaveis |

---

## 🧬 ROLES DO SISTEMA (REFERENCIA RAPIDA)

| Role | Criar Portaria | Aprovar | Publicar | Gerenciar Usuarios | Gerenciar Modelos |
|---|---|---|---|---|---|
| `OPERADOR` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `SECRETARIO` | ✅ | ✅ (sua secretaria) | ❌ | ❌ | ❌ |
| `PREFEITO` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `ADMIN_GERAL` | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📞 FLUXO DE STATUS DAS PORTARIAS

```
RASCUNHO → PROCESSANDO → PENDENTE → APROVADA → PUBLICADA
                 ↓
          FALHA_PROCESSAMENTO → (tentarNovamente) → PROCESSANDO
```

> REGRA CRITICA: `tentarNovamente` NUNCA gera novo `numeroOficial`.
> O numero ja existente e reutilizado. Apenas o PDF e regerado.

---

## 📚 HIERARQUIA DE LEITURA (Para a IA iniciar uma sessao)

1. Leia este `00_INDEX.md` — Entenda o estado atual do projeto
2. Leia `_base/AGENTS.md` — Arquitetura e regras inviolaveis
3. Leia `_base/MOCKS.md` — Tipos reais do dominio
4. Acione o agente correto da tabela acima
