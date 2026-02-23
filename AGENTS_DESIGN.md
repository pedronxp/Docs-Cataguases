# AGENTS_DESIGN.md — COMPLEMENTO: DESIGN SYSTEM COM STITCH MCP
# Leia junto com AGENTS.md, MOCKS.md, AGENTS_ASSINATURA.md e AGENTS_ACERVO.md
# Este arquivo define como TODAS as telas devem ser geradas visualmente

---

## REGRA ABSOLUTA DE DESIGN

TODAS as telas do sistema devem ser projetadas primeiro no Stitch MCP
antes de qualquer linha de codigo React ser escrita.
NUNCA escreva JSX de uma tela sem antes ter o layout aprovado no Stitch.

Fluxo obrigatorio por tela:
1. Gerar o layout no Stitch MCP com as instrucoes abaixo
2. Revisar e aprovar o layout
3. So entao escrever o codigo React baseado no layout aprovado

---

## IDENTIDADE VISUAL — PADRAO GOV.BR SOBRIO

Paleta de cores obrigatoria:
  Fundo geral:         #F8FAFC  (slate-50)
  Fundo card/painel:   #FFFFFF  (white)
  Borda padrao:        #E2E8F0  (slate-200)
  Texto principal:     #1E293B  (slate-800)
  Texto secundario:    #64748B  (slate-500)
  Azul Gov principal:  #1351B4  (gov-blue)
  Verde Gov:           #168821  (gov-green)
  Destaque alerta:     #F59E0B  (amber-500)
  Destaque erro:       #EF4444  (red-500)
  Destaque assinatura: #7C3AED  (purple-700)

Tipografia:
  Familia: Rawline, fallback Inter, fallback system sans-serif
  Titulo de pagina:  18px font-semibold slate-800
  Subtitulo/label:   14px font-medium slate-600
  Corpo de texto:    14px font-normal slate-700
  Texto auxiliar:    12px font-normal slate-500
  Codigo/hash:       12px font-mono slate-500

Regras visuais inviolaveis:
  - PROIBIDO dark mode forcado
  - PROIBIDO glassmorphism
  - PROIBIDO gradientes chamativos
  - PROIBIDO sombras pesadas (use shadow-sm no maximo)
  - SEMPRE alto contraste minimo WCAG AA
  - SEMPRE bordas sutis border border-slate-200
  - Bordas arredondadas: rounded-md para cards, rounded-lg para modais

---

## GRID E LAYOUT BASE

Todas as telas usam o componente PageLayout com esta estrutura:

  SIDEBAR (w-56, fixo, bg-white, border-r)
    Logo "Doc's Cataguases" (h-14, border-b)
    nav item
    nav item ativo (bg-slate-100, text-gov-blue)
    nav item com badge contador roxo no canto direito

  HEADER (h-14, bg-white, border-b, px-6)
    Titulo da pagina | [Acoes] [Avatar usuario]

  MAIN (flex-1, overflow-y-auto, p-6, bg-slate-50)
    conteudo da tela

---

## INSTRUCOES DO STITCH MCP POR TELA

Use exatamente o texto de cada STITCH_PROMPT ao chamar o Stitch MCP.

---

TELA 1 — LOGIN

STITCH_PROMPT:
Design a clean government login page for "Doc's Cataguases" -
Prefeitura de Cataguases/MG document management system.
Style: Brazilian Gov.br design system. Sober, high contrast, no dark mode.
Background: slate-50 (#F8FAFC).
Card: white, border slate-200, rounded-lg, shadow-sm, max-w-md, centered.
Elements:
- Top: city coat of arms placeholder circular 64px slate-200 background
- Title: "Doc's Cataguases" in gov-blue (#1351B4) font-semibold
- Subtitle: "Prefeitura de Cataguases . MG" in slate-500 text-sm
- Divider line
- Label "E-mail institucional" + Input full width
- Label "Senha" + Input type password with show/hide toggle
- Button "Entrar" full width bg gov-blue white text
- Footer: "Acesso restrito a servidores municipais" slate-400 text-xs centered
No registration link. No social login. No decorative images.

---

TELA 2 — DASHBOARD

STITCH_PROMPT:
Design a government dashboard page for a document management system.
Layout: sidebar 224px white + main area slate-50 background.
Sidebar: Logo area h-14 border-bottom. Nav items with icons: Dashboard active,
Portarias, Acervo, Modelos, Usuarios, Numeracao, Analytics.
One nav item shows purple badge counter number 2 on the right side.
Active item: bg-slate-100 text gov-blue #1351B4.
Header: white h-14 border-bottom. Left: page title "Dashboard".
Right: user avatar with initials, user name, logout button.
Main content p-6:
Row of 3 summary cards white border rounded-md shadow-sm:
  Card 1: icon FileText blue, title "Rascunhos", large number "4"
  Card 2: icon Clock amber, title "Aguardando Revisao", large number "2"
  Card 3: icon CheckCircle green, title "Publicadas este mes", large number "18"
Purple alert card bg-purple-50 border-purple-200 rounded-lg below cards:
  Title "Documentos aguardando sua assinatura (1)"
  List item: "Portaria 043/2025 . Enviado ha 12 minutos" + blue "Assinar" button
Section title "Feed de Atividades" with separator line.
Activity feed list of white cards with border rounded-md:
  Each item: colored icon left + message text + relative time right
  Event types: PUBLICADA green icon, CRIADA blue icon, FALHA red icon, ASSINATURA purple icon
Style: Brazilian Gov.br sober. No gradients. No dark mode.

---

TELA 3 — LISTA DE PORTARIAS

STITCH_PROMPT:
Design a government document list page with data table.
Layout: same sidebar and header as dashboard.
Page title: "Portarias". Header action button: "Nova Portaria" gov-blue small.
Filter bar white card border rounded-md p-4:
  Search input placeholder "Buscar por numero ou titulo" w-64.
  Status select dropdown showing all statuses.
  Date range inputs optional compact style.
Data table white background border rounded-md shadow-sm:
  Columns: Numero, Titulo, Status, Secretaria, Data, Acoes
  Row 1: "042/2025", "Portaria de Nomeacao - Joao Silva",
         green badge "Publicada", RH, 10/06/2025, [Ver] button
  Row 2: "—", "Portaria de Exoneracao - Maria Santos",
         slate badge "Rascunho", RH, 15/06/2025, [Editar] button
  Row 3 highlighted bg-red-50: "038/2025", "Portaria de Gratificacao - Carlos Souza",
         red badge "Falha no PDF", RH, 14/06/2025, [Tentar Novamente] red outline button
  Row 4: "039/2025", "Portaria de Licenca - Ana Costa",
         yellow badge "Aguardando Revisao", RH, 13/06/2025, [Ver] button
Pagination: "Anterior  Pagina 1 de 4  Proxima" centered below table.
Style: Brazilian Gov.br sober. Status badges use soft colored backgrounds.

---

TELA 4 — NOVA PORTARIA

STITCH_PROMPT:
Design a 2-step document creation wizard for a government system.
Layout: same sidebar and header. Page title: "Nova Portaria".
Step indicator at top: Step 1 "Selecionar Modelo" active, arrow, Step 2 "Preencher Dados".
Step 1 content:
  Subtitle: "Selecione o tipo de documento a ser criado"
  Grid 3 columns of model selection cards white border rounded-lg with hover shadow-md:
    Card 1: FileText icon gov-blue, "Portaria de Nomeacao",
            description "Para nomear servidores em cargos efetivos", tag badge "Geral"
    Card 2: FileText icon gov-blue, "Portaria de Exoneracao",
            description "Para exonerar servidores", tag badge "Geral"
    Card 3: FileText icon amber, "Portaria de Gratificacao",
            description "Para concessao de beneficios", tag badge "RH" secretaria badge
    Selected card state: border-2 border-gov-blue bg-blue-50
  Bottom actions: [Cancelar] outline button + [Proximo] gov-blue button disabled if none selected
Style: Brazilian Gov.br sober. Cards have subtle hover effect.

---

TELA 5 — REVISAO DE PORTARIA

STITCH_PROMPT:
Design a document review page for government portaria workflow.
Layout: same sidebar and header. Page title: "Revisao de Portaria".
Status banner at top bg-amber-50 border-amber-200 rounded-lg p-4:
  Clock icon + text "Esta portaria esta em rascunho. Baixe, edite no Word e faca upload."
Two column layout with gap:
Left column flex-1:
  Card "Informacoes do Documento" white border rounded-md p-4:
    Title: "Portaria de Exoneracao - Maria Santos"
    Field rows showing: Modelo, Secretaria, Criado em, Autor
    Preview shows SYS_NUMERO_PORTARIA as bold amber text "[RASCUNHO]"
  Card "Dados Preenchidos" white border rounded-md p-4:
    Table showing form field names and values in pairs
Right column w-80:
  Card "Acoes" white border rounded-md p-4:
    Step 1: download button "Baixar Rascunho .docx" outline style full width
    Divider text "ou edite no Word e faca upload"
    Step 2: Upload dropzone dashed border slate-200 rounded-md p-6 centered content:
      Upload cloud icon + "Arraste o .docx editado aqui" + "ou clique para selecionar"
      Small text "Apenas arquivos .docx . Maximo 10MB" in slate-400
    Divider line
    Submit button "Submeter Documento Oficial" gov-blue full width large size
    Helper text below: "Apos submeter, um numero oficial sera alocado automaticamente."
Style: Brazilian Gov.br sober. Clear step-by-step visual hierarchy.

---

TELA 6 — VISUALIZACAO E APROVACAO

STITCH_PROMPT:
Design a document approval and signing page for a government document system.
Layout: same sidebar and header. Page title: "Portaria 039/2025".
Status bar at top: large purple badge "Aguardando Assinatura"
plus text "Enviado para assinatura de Sr. Prefeito ha 23 minutos".
Two column layout:
Left column flex-1 with min height:
  PDF Preview area white border rounded-md bg-slate-100:
    Shows iframe placeholder for PDF viewer.
    Fallback state: centered slate icon + text "PDF em processamento"
Right column w-80 with space between cards:
  Card "Numero Oficial" white border-2 border-gov-blue rounded-md p-4 text-center:
    Large bold text "039/2025" in gov-blue color.
    Small text "Secretaria de RH . 2025"
  Card "Acoes Disponiveis" white border rounded-md p-4:
    [Aprovar] green outline button full-width
    [Rejeitar] red outline button full-width
    [Enviar para Assinatura] gov-blue button full-width
    [Assinar e Publicar] large gov-blue button with pen icon, only for designated signer
  Purple info card bg-purple-50 border-purple-200 rounded-md p-3:
    "Aguardando assinatura de Sr. Prefeito"
    "Enviado ha 23 minutos"
  Green success card bg-green-50 border-green-200 rounded-md p-3 when published:
    "Publicada Oficialmente" with checkmark
    "Assinado por: Sr. Prefeito"
    "Em: 10/06/2025 as 14:32"
    Hash value in monospace font text-xs
Style: Brazilian Gov.br sober. Clear hierarchy of actions per role.

---

TELA 7 — ACERVO DOCUMENTAL

STITCH_PROMPT:
Design a document archive page for a government document management system.
Layout: same sidebar and header. Page title: "Acervo Documental".
Two panel layout side by side:
Left panel w-48 shrink-0:
  Title "Secretarias" in slate-500 uppercase text-xs with margin bottom
  Folder navigation list:
    Folder "RH" active state: bg-gov-blue text-white rounded-md, shows count "24" on right
    Folder "Obras": text-slate-600 hover bg-slate-100, count "12"
    Folder "Saude": text-slate-600, count "31"
    Folder "Educacao": text-slate-600, count "8"
    Folder "Administracao": text-slate-600, count "45"
Right panel flex-1:
  Filter bar row: Search input "Buscar por numero, titulo ou servidor",
                  Year select showing "2025",
                  Setor select showing "Todos os setores"
  Table title: "Portarias — Secretaria de RH (24 documentos)"
  Data table white border rounded-md:
    Columns: Numero, Titulo, Setor, Data Publicacao, Acoes
    Row 1: "042/2025", "Portaria de Nomeacao - Joao Silva", DP, 12/06/2025, [PDF] [Detalhes]
    Row 2: "041/2025", "Portaria de Ferias - Carla Lima", DP, 10/06/2025, [PDF] [Detalhes]
    Row 3: "038/2025", "Portaria de Gratificacao - Pedro Alves", —, 02/06/2025, [PDF] [Detalhes]
  Pagination: "Anterior  Pagina 1 de 2  Proxima" centered
Note: left panel only visible for users with cross-secretaria view permission.
Style: Brazilian Gov.br sober. File and folder metaphor for familiarity.

---

TELA 8 — GESTAO DE USUARIOS

STITCH_PROMPT:
Design a user management admin page for a government system.
Layout: same sidebar and header. Page title: "Gestao de Usuarios".
Header action: [+ Novo Usuario] button.
Filter bar white card: search by name or email input, Role filter select, Status filter select.
Users data table white border rounded-md:
  Columns: Nome, E-mail, Cargo/Role, Secretaria, Status, Acoes
  Row 1: Avatar initials "AG", "Admin Geral", admin@cataguases.mg.gov.br,
         dark badge "ADMIN GERAL", dash, green dot "Ativo", [Editar]
  Row 2: Avatar "SP", "Sr. Prefeito", prefeito@cataguases.mg.gov.br,
         gov-blue badge "PREFEITO", dash, green dot "Ativo", [Editar]
  Row 3: Avatar "DS", "Dra. Secretaria", secretario@cataguases.mg.gov.br,
         teal badge "SECRETARIO", "Sec. RH", green dot "Ativo", [Editar]
  Row 4: Avatar "OP", "Operador Padrao", operador@cataguases.mg.gov.br,
         slate badge "OPERADOR", "Sec. RH . DP", green dot "Ativo", [Editar]
  Row 5: Avatar "OI", "Operadora Inativa", inativa@cataguases.mg.gov.br,
         slate badge "OPERADOR", "Sec. RH", red dot "Inativo", [Editar] [Ativar]
Edit modal Dialog max-w-lg:
  Section "Dados": Role select, Secretaria select, Setor select, Ativo toggle switch
  Section "Permissoes Extras" with description "Permissoes adicionais alem do cargo":
    Checkbox unchecked: "Deletar Portarias"
    Checkbox unchecked: "Aprovar Portarias"
    Checkbox unchecked: "Assinar e Publicar Portarias"
    Checkbox unchecked: "Gerenciar Modelos de Documento"
    Checkbox checked: "Ver acervo de TODAS as Secretarias"
  Footer: [Cancelar] outline button + [Salvar Alteracoes] gov-blue button
Style: Brazilian Gov.br sober. Distinct badge colors per role type.

---

TELA 9 — MODELOS DE DOCUMENTO

STITCH_PROMPT:
Design an admin page to manage document templates for a government system.
Layout: same sidebar and header. Page title: "Modelos de Documento".
Header action: [+ Novo Modelo] button.
Template cards in 2 column grid with gap:
Card 1 white border rounded-lg p-4:
  Header row: FileText icon gov-blue + title "Portaria de Nomeacao" + green badge "Ativo"
  Description text: "Para nomear servidores em cargos efetivos ou comissionados."
  Tag badge slate: "Geral" meaning available to all secretarias
  Variables preview section bg-slate-50 rounded p-3 margin-top:
    Small title "Variaveis (3)" text-xs slate-500
    Bullet list: NOME_SERVIDOR tipo texto, CARGO tipo texto, DATA_INICIO tipo data
  Action buttons row: [Editar Variaveis] outline small, [Substituir .docx] outline small, disable toggle
Card 2: similar layout for "Portaria de Exoneracao" with 3 variables
Card 3 with dashed border slate-300 rounded-lg p-4 bg-slate-50:
  Centered content: cloud upload icon + "Novo Modelo" title
  Description: "Faca upload de um .docx com as variaveis entre chaves duplas ja inseridas"
  [Fazer Upload] button centered
Style: Brazilian Gov.br sober. Clear variable mapping visualization.

---

TELA 10 — FLUXO DE NUMERACAO

STITCH_PROMPT:
Design an admin page showing document numbering books for a government system.
Layout: same sidebar and header. Page title: "Fluxo de Numeracao".
Header controls: year selector dropdown "2025" + [+ Novo Livro] button.
Stats row of 3 cards white border rounded-md:
  Card 1: "Total emitidas em 2025", large number "87", gov-blue accent
  Card 2: "Secretarias com livro ativo", large number "5", green accent
  Card 3: "Ultimo numero emitido", large number "087/2025", slate accent
Numbering books data table white border rounded-md:
  Columns: Secretaria, Setor, Formato, Prox. Numero, Total Emitidas, Acoes
  Row 1: "Secretaria de RH", "Todos", "NNN/AAAA", bold "088", "87", [Editar]
  Row 2: "Secretaria de Obras", "Projetos", "NNN/AAAA", "024", "23", [Editar]
  Row 3: "Secretaria de Saude", "Todos", "AAAA/NNN", "015", "14", [Editar]
  Last row dashed style: [+ Adicionar Livro para outra Secretaria] centered button
Warning card bg-amber-50 border-amber-200 rounded-md p-3 below table:
  Warning icon + "Atencao: o numero proximo NAO pode ser editado manualmente apos
  portarias publicadas. Contate o suporte tecnico para correcoes."
Style: Brazilian Gov.br sober. Emphasize immutability of atomic numbering.

---

TELA 11 — VARIAVEIS DE SISTEMA

STITCH_PROMPT:
Design a no-code admin page to manage system variable keys for document templates.
Layout: same sidebar and header. Page title: "Variaveis de Sistema".
Header action: [+ Nova Variavel] button.
Info banner bg-blue-50 border-blue-200 rounded-md p-3 below header:
  Info icon + "Variaveis com prefixo SYS_ sao substituidas automaticamente em todos
  os documentos. Use a variavel entre chaves duplas nos templates .docx."
Variables data table white border rounded-md:
  Columns: Chave, Valor Atual, Descricao, Auto-resolvida, Acoes
  Row 1: monospace code "SYS_NOME_PREFEITO", "Joao da Silva",
         "Nome do Prefeito em exercicio", green badge "Sim", [Editar]
  Row 2: monospace "SYS_GESTAO_ATUAL", "Gestao 2025-2028",
         "Identificacao da gestao vigente", green badge "Sim", [Editar]
  Row 3: monospace "SYS_NUMERO_PORTARIA", "[RASCUNHO] / auto",
         "Numero oficial alocado no submit", green badge "Sim", readonly no edit button
  Row 4: monospace "SYS_DATA_EXTENSO", "auto",
         "Data por extenso no momento da geracao", green badge "Sim", readonly
  Row 5: monospace "SYS_CIDADE_UF", "Cataguases/MG",
         "Cidade e estado", slate badge "Nao", [Editar]
Edit modal with fields: Chave readonly, Valor editable, Descricao editable.
Style: Brazilian Gov.br sober. Monospace font for all variable key names.

---

TELA 12 — ANALYTICS

STITCH_PROMPT:
Design an analytics dashboard page for a government document management system.
Layout: same sidebar and header. Page title: "Analytics".
Header controls: date range selector "Jan 2025 – Jun 2025" + [Exportar CSV] button.
Stats row of 4 cards white border rounded-md:
  Card 1: "Total de Portarias", number "312", upward trend "+12% vs periodo anterior"
  Card 2: "Publicadas", number "287", green color, trend "+8%"
  Card 3: "Tempo Medio de Publicacao", "2.3 dias", blue color
  Card 4: "Taxa de Rejeicao", "4.2%", amber color
Full width chart card white border rounded-md:
  Title "Portarias por Mes — 2025"
  Bar chart with months Jan through Jun on x-axis and document count on y-axis
  Bars colored in gov-blue #1351B4 with hover tooltip showing exact count
Two column chart row below:
  Left card: "Distribuicao por Secretaria" horizontal bar chart
    RH: long bar 87 documents
    Obras: medium bar 54
    Saude: medium bar 43
    Educacao: short bar 28
    Admin: longest bar 100
  Right card: "Status Atual" donut chart
    Publicadas 91% largest slice gov-blue
    Pendentes 5% amber slice
    Rascunhos 4% slate slice
    Legend with colored dots below chart
Style: Brazilian Gov.br sober. Gov-blue as primary chart color. White chart backgrounds. Clean gridlines.

---

TELA 13 — GESTAO MUNICIPAL

STITCH_PROMPT:
Design an admin setup page to manage the active mayor and city secretaries.
Layout: same sidebar and header. Page title: "Gestao Municipal".
Active management card white border-2 border-gov-blue rounded-lg p-6:
  Top row: green badge "Gestao Ativa"
  Title: "Gestao 2025-2028" font-semibold text-xl
  Info fields displayed as label/value pairs:
    Prefeito: "Joao da Silva"
    Periodo: "01/01/2025 — 31/12/2028"
    Decreto de posse: "Decreto no 001/2025"
  Action button: [Editar Gestao Ativa] outline gov-blue
Section title "Secretarias Cadastradas" with separator:
  Data table white border rounded-md:
    Columns: Sigla, Nome Completo, Secretario(a), Status, Acoes
    Row 1: "RH", "Secretaria de Recursos Humanos", "Dra. Ana Lima", green "Ativa", [Editar]
    Row 2: "OBR", "Secretaria de Obras", "Eng. Carlos Mota", green "Ativa", [Editar]
    Row 3: "SAU", "Secretaria de Saude", "Dr. Pedro Alves", green "Ativa", [Editar]
  Add button with dashed border: [+ Adicionar Secretaria]
Style: Brazilian Gov.br sober. Official and trustworthy government appearance.

---

## INSTRUCAO PARA O AGENTE

Para CADA tela do Roadmap, siga este fluxo obrigatorio:

1. Localize o STITCH_PROMPT da tela neste arquivo
2. Chame o Stitch MCP com esse texto exato
3. Aguarde aprovacao visual do layout gerado
4. Somente apos aprovacao escreva o codigo React
5. Use os componentes Shadcn/UI que mais se aproximam do layout aprovado
6. Marque com check quando tela estiver codificada e aprovada

NUNCA pule a etapa do Stitch.
NUNCA escreva JSX sem layout aprovado.

---

## ORDEM DE EXECUCAO — GERAR TODOS OS LAYOUTS ANTES DE CODAR

1.  Stitch: Login
2.  Stitch: Dashboard
3.  Stitch: Lista de Portarias
4.  Stitch: Nova Portaria
5.  Stitch: Revisao
6.  Stitch: Visualizacao e Aprovacao
7.  Stitch: Acervo Documental
8.  Stitch: Gestao de Usuarios
9.  Stitch: Modelos de Documento
10. Stitch: Fluxo de Numeracao
11. Stitch: Variaveis de Sistema
12. Stitch: Analytics
13. Stitch: Gestao Municipal

Apos aprovacao de TODOS os layouts, iniciar codificacao na ordem do Roadmap do AGENTS.md.
