# 00_INDEX.md — MAPA E ORDEM DE LEITURA DOS AGENTS (DOC'S CATAGUASES)
# Arquivo mestre. Sempre que a IA perder contexto, leia este arquivo PRIMEIRO.

---

## 📌 A REGRA DE OURO
Você é o Agente de Desenvolvimento do "Doc's Cataguases" (Sistema GovTech).
O projeto está no **CICLO 1 (Frontend-First, Mock-Driven)**. 
NUNCA modifique regras de arquivos base para atender a um complemento. A hierarquia de leitura deve ser estritamente respeitada.

---

## 📂 ORDEM E HIERARQUIA DE LEITURA DOS ARQUIVOS .md

### 🧱 FASE 1: A BASE DO SISTEMA (Leitura Obrigatória)
1. `AGENTS.md` - Arquitetura Clean, regras de negócio invioláveis, State Machine e tipos base (`domain.ts`).
2. `MOCKS.md` - O banco de dados em memória (`mockDB`) e os serviços simulados.

### 🎨 FASE 2: DESIGN E UI
3. `AGENTS_DESIGN.md` - Identidade visual Gov.br e os `STITCH_PROMPT` para gerar as telas no Stitch MCP ANTES de codar.

### 🚀 FASE 3: CORE FEATURES E WIZARDS
4. `AGENTS_ONBOARDING.md` - Fluxo de Auto-registro, Lotação de Setores e Quarentena.
5. `AGENTS_WIZARD_PORTARIA.md` - Motor de criação (Tela 4): Stepper de 3 etapas, Formulário Dinâmico e Máscaras (CPF/Moeda).
6. `AGENTS_ASSINATURA.md` - Fluxo de `AGUARDANDO_ASSINATURA` e notificações.
7. `AGENTS_ACERVO.md` - Tela de Acervo Documental (histórico) e ABAC de Pastas por Secretaria.

### 🛡️ FASE 4: SEGURANÇA E GOVTECH AVANÇADO
8. `AGENTS_AUDITORIA_LOTE.md` - Assinatura em Lote com senha e Trilha de Auditoria Oculta (Log).
9. `AGENTS_VALIDACAO_PUBLICA.md` - Rota pública (`/validar`) e Hash Curto de autenticidade para o Cidadão.

### 📄 FASE 5: REGRAS DE DOCUMENTO (SSOT DO WORD)
10. `AGENTS_PAPEL_TIMBRADO.md` - Regra de embutir logos e papel timbrado direto no `.docx` original.
11. `AGENTS_LAYOUT_ASSINATURA.md` - Posicionamento de tags de assinatura (`{{SYS_ASSINANTE_NOME}}`) e Preview do PDF.

### 📊 FASE 6: INTELIGÊNCIA E SUPORTE
12. `AGENTS_ANALYTICS.md` - Dashboard de Métricas (Recharts) respondendo a Volume, Eficiência e Retrabalho.
13. `AGENTS_HEALTH.md` - Tela de Status do Sistema (Monitoramento de DB, CloudConvert e Jobs travados).
14. `AGENTS_TUTORIAL.md` - Central de Ajuda interativa, com FAQ filtrado por pesquisa e cargo (Role-Based).

### ⚙️ FASE 7: O FUTURO (Backend)
15. `AGENTS_CICLO2.md` - Backend Real (Next.js + Prisma + Supabase). **NÃO LER/IMPLEMENTAR NO CICLO 1.**


16. `AGENTS_GESTAO_MODELOS.md` - Como o Administrador cadastra os templates .docx e tipa as variáveis (CPF, Moeda, Texto) que alimentam o Wizard.

---

## 🚀 INSTRUÇÃO DE START
Sempre busque a regra base no `AGENTS.md` e o layout no `AGENTS_DESIGN.md` antes de implementar um complemento. Trabalhe de forma **cirúrgica e incremental**, acompanhando o `PROGRESS.md`.
