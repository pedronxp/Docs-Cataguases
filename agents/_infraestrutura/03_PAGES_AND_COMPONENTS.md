
***

### 3. Salve como: `03_PAGES_AND_COMPONENTS.md`

```markdown
# NOVAS PÁGINAS E COMPONENTES UI (Next.js + Shadcn)

## 1. Página: Fila do Jornal (`/app/jornal/page.tsx`)
**Acesso:** Apenas `role === 'JORNALISTA'` ou `'ADMINGERAL'`.
**UI (Padrão Gov.br):**
- Tabela com colunas: ID da Fila, Secretaria Origem, Status da Assinatura (com ícone de anexo se for manual), Data de Chegada, Ações.
- Botão "Publicar e Numerar" abre um Modal (Dialog Shadcn).
**Modal de Numeração:**
- Input preenchido automaticamente com `numeroSugerido` via `livroNumeracao`.
- Texto de alerta: "Este é o número sequencial sugerido. Altere apenas se necessário."
- Ao submeter, dispara confirmação ("Tem certeza?") e atualiza `Portaria` e `JornalQueue`.

## 2. Componente: Modal de Assinatura Alternativa (`/components/portarias/AssinaturaModal.tsx`)
**Local:** Fica na tela de detalhes da portaria (`/app/portarias/[id]`), visível para `SECRETARIO` quando status é `AGUARDANDO_ASSINATURA`.
**Tabs/Tabs Shadcn:**
- Aba 1: "Assinatura Digital" (Fluxo normal)
- Aba 2: "Assinatura Manual" (Formulário: Textarea Justificativa + File Input p/ PDF)
- Aba 3: "Dispensar Assinatura" (Formulário: Textarea Justificativa + File Input opcional)
**Ação:** O submit deve fazer upload do arquivo (se houver) e chamar a API atualizando `assinaturaStatus`, `assinaturaJustificativa` e inserindo log no `FeedAtividade`.

## 3. Página: Painel de Acompanhamento (`/app/acompanhamento/page.tsx`)
**Acesso:** `ADMINGERAL` (vê todas) e `SECRETARIO` (vê as da sua secretaria).
**UI (Padrão Gov.br):**
- Cards de métricas no topo (Em Revisão, Aguardando Assinatura, Publicadas).
- Tabela principal listando as portarias.
- Ao clicar em uma linha, expande um "Sheet" (Drawer do Shadcn) na lateral direita contendo a **Timeline**.
**Timeline Component:**
- Mapeia a tabela `FeedAtividade` daquela portaria.
- Exibe os logs em formato vertical.
- Mensagens devem ser claras, como "Assinatura manual registrada por Daniel. [Ícone de Clip para baixar anexo]".
