# ⚡ Monitoramento CloudConvert - Docs Cataguases

Este sistema foi projetado para gerenciar, monitorar e rotacionar múltiplas chaves (API Keys) da plataforma **CloudConvert**, que é utilizada para gerar os PDFs oficiais e timbrados das Portarias da Prefeitura.

O CloudConvert cobra por "minutos de conversão". Como contas gratuitas possuem limites diários/mensais restritos, este sistema permite adicionar várias contas diferentes (Chaves JWT) no `.env` e rotacioná-las pelo painel administrativo quando os créditos de uma chave se esgotam.

## Estrutura do Sistema

### 1. Backend Seguro (Next.js Route Handlers)
Os endpoints não expõem as chaves cruas para o cliente, apenas seus identificadores anonimizados e o total de créditos.

- **`GET /api/cloudconvert/status`**: Busca todas as variáveis `CLOUDCONVERT_API_KEY*` do servidor, faz uma requisição para a Nuvem da CloudConvert (`/v2/users/me`) e retorna o status em tempo real (Ativo, Esgotado, Erro) e o total de créditos.
- **`POST /api/cloudconvert/keys`**: Endpoint restrito a administradores. Permite gerenciar as chaves injetando ou removendo os tokens no próprio arquivo `.env` e editando qual é o índice ativo (`CLOUDCONVERT_CURRENT_KEY_INDEX`).

### 2. Painel Interativo Frontend (React + Shadcn UI)
**Local:** Menu Lateral > Monitor CloudConvert (`/admin/cloudconvert`)

Interface rica, integrada ao layout governamental da Prefeitura:
- Exibe o total de créditos unificados.
- Permite forçar a Chave Ativa com um botão (rotacionar).
- Botão azul de **Adicionar Nova Key** (que persiste no backend).
- Botão "Exportar .env" para backup local de segurança.
- Possui **Auto-Refresh de 30 segundos**.

### 3. Integração com o Gerador de PDF (Exemplo futuro)
No seu código do gerador de PDF (`cloudconvert.js`), modifique a inicialização para usar a chave ativa apontada pelo sistema:

```javascript
const activeIndex = process.env.CLOUDCONVERT_CURRENT_KEY_INDEX || '0';
const activeKeyName = activeIndex === '0' ? 'CLOUDCONVERT_API_KEY' : `CLOUDCONVERT_API_KEY_${activeIndex}`;
const activeToken = process.env[activeKeyName];

const cloudConvert = new CloudConvert(activeToken);
```

### 4. Arquivo Standalone (Legado / Leve)
**Local:** `apps/web/src/admin/cloudconvert-monitor.html`
Para ambientes de baixíssimos recursos ou manutenções rápidas, criamos um arquivo HTML de uma página que se comunica com o backend (`/api/cloudconvert/status`) usando Tailwind e Fetch nativo, cumprindo a solicitação do arquiteto.

## Configuração do .env

Certifique-se de iniciar seu arquivo de variáveis de ambiente com um padrão similar:

```env
CLOUDCONVERT_API_KEY=eyJ0eXAiOiJKV1QiLC...
CLOUDCONVERT_API_KEY_1=eyJ0eXAiOiJ...
CLOUDCONVERT_API_KEY_2=eyJ0eX...
CLOUDCONVERT_CURRENT_KEY_INDEX=1
```
