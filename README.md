# Doc's Cataguases 🏛️

Sistema de Gestão de Documentos e Portarias para a Prefeitura de Cataguases.

## 🚀 Sobre o Projeto
O Doc's Cataguases é uma plataforma moderna desenvolvida para simplificar a criação, tramitação e validação de documentos oficiais (Portarias) do município. O sistema foca em usabilidade, segurança e agilidade nos processos administrativos.

## ✨ Funcionalidades Principais
- **Fluxo de Onboarding**: Registro simplificado e aprovação de servidores por lotação/setor.
- **Wizard de Portarias**: Motor de criação guiada em 3 etapas com preenchimento dinâmico e máscaras inteligentes (CPF, Moeda).
- **Assinatura Digital**: Gestão de assinaturas em lote e fluxos de aprovação simplificados.
- **Validação Pública**: Consulta de autenticidade de documentos via Hash/QR Code para o cidadão.
- **Acervo Digital**: Organização de documentos por pastas com filtros avançados de busca.
- **Painel Administrativo**: Gestão completa de usuários (RBAC), modelos de documentos (DOCX) e variáveis sistêmicas.
- **Analytics**: Dashboards de produtividade e monitoramento de status em tempo real.

## 🛠️ Tecnologias Utilizadas
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Componentes**: [shadcn/ui](https://ui.shadcn.com/)
- **Gerenciamento de Estado**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Roteamento**: [TanStack Router](https://tanstack.com/router)
- **Backend/Infra**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS)
- **Segurança**: Controle de acesso baseado em permissões (ABAC) via [CASL](https://casl.js.org/)

## 📦 Como Iniciar

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/pedronxp/Docs-Cataguases.git
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   - Crie um arquivo `.env.local` na raiz
   - Siga as instruções do `.env.example`

4. **Executar em Desenvolvimento**:
   ```bash
   npm run dev
   ```
---

## 🤖 Trabalhando com IAs (Agentic Workflow)

Este projeto foi inteiramente desenhado sob uma arquitetura de **Engenharia de Prompt para IAs (Cursor, Windsurf, Lovable)**. Todo o conhecimento de negócio, fluxo de telas e regras de banco de dados estão descritos nos arquivos `.md` na raiz do projeto (iniciando pelo `00_INDEX.md`).

**Se você é um desenvolvedor utilizando IA em um novo ambiente, cole o comando abaixo no chat da sua IDE para realizar o Onboarding Automático:**

> "Olá, IA. Acabei de clonar este repositório. Este é um projeto GovTech Enterprise.
> 
> **AÇÃO IMEDIATA REQUERIDA (Onboarding do Desenvolvedor):**
> 1. Leia OBRIGATORIAMENTE o arquivo `00_INDEX.md` na raiz do projeto. Ele é o seu mapa mental.
> 2. Leia o arquivo `AGENTS_GITHUB.md` com extrema atenção. Ele dita as regras inquebráveis do seu comportamento (Agentic Workflow, Matriz de Branches, Push de Backup).
> 3. Entenda que nós NUNCA fazemos commits diretos na branch `main`.
> 4. Abra o arquivo `PROGRESS.md` e faça uma leitura do status atual do projeto (o que já tem `[x]` e o que falta `[ ]`).
> 
> 5. **PARE E GERE O SEU RELATÓRIO DE STATUS:**
>    - Diga-me qual foi a última tarefa concluída.
>    - Diga-me qual é a **próxima tarefa pendente** no `PROGRESS.md` e a qual **Matriz** ela pertence.
>    - Explique brevemente como você planeja desenvolvê-la (arquitetura).
>    - **PERGUNTE:** *"Posso criar a nova branch `<tipo>/<matriz>/<tarefa>` para começarmos os trabalhos neste computador?"*

---

**Desenvolvido com 🩵 para a Prefeitura de Cataguases.**

---

[English Version available here](./README.en.md)
