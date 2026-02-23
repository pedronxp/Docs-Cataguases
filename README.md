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

[English Version available here](./README.en.md)
