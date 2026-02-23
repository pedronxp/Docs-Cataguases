# Doc's Cataguases 🏛️

Document and Ordinance Management System for the City Hall of Cataguases.

## 🚀 About the Project
Doc's Cataguases is a modern platform designed to simplify the creation, processing, and validation of official municipal documents (Ordinances). The system focuses on usability, security, and agility in administrative processes.

## ✨ Key Features
- **Onboarding Flow**: Simplified registration and server approval by department/sector.
- **Ordinance Wizard**: 3-step guided creation engine with dynamic fields and smart masks (ID, Currency).
- **Digital Signature**: Batch signature management and simplified approval workflows.
- **Public Validation**: ciudadano authenticity check for documents via Hash/QR Code.
- **Digital Archive**: Document organization by folders with advanced search filters.
- **Admin Panel**: Full user management (RBAC), document templates (DOCX), and system variables.
- **Analytics**: Productivity dashboards and real-time system status monitoring.

## 🛠️ Tech Stack
- **Frontend**: [Next.js 15](https://nextjs.org/) (App Router), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Backend/Infra**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS)
- **Security**: Attribute-Based Access Control (ABAC) using [CASL](https://casl.js.org/)

## 📦 Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pedronxp/Docs-Cataguases.git
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Create a `.env.local` file in the root
   - Follow the instructions in `.env.example`

4. **Run in Development**:
   ```bash
   npm run dev
   ```

---

[Versão em Português disponível aqui](./README.md)
