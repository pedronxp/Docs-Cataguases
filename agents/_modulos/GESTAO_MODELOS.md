# AGENTS_GESTAO_MODELOS.md — COMPLEMENTO: ADMINISTRAÇÃO DE MODELOS E VARIÁVEIS
# Leia junto com AGENTS.md, AGENTS_WIZARD_PORTARIA.md e MOCKS.md
# Detalha como os Administradores criam os moldes dinâmicos que alimentam o Wizard.

---

## 1. O CONCEITO (A FÁBRICA DE FORMULÁRIOS)
Para que o sistema gere um documento perfeito e dinâmico, o Administrador (ou TI da Prefeitura) precisa configurar um "Modelo de Documento". 

O processo acontece em 3 passos na tela de Gestão de Modelos:
`[ 1. Dados do Modelo ] -> [ 2. Upload do Arquivo .docx ] -> [ 3. Configuração das Variáveis ]`

---

## 2. ETAPA 1: DADOS BÁSICOS DO MODELO
O Admin define as regras de quem pode ver este modelo.
- **Nome:** Ex: "Portaria de Nomeação"
- **Categoria:** Ex: RH, Licitação, Gabinete.
- **Secretaria:** Se deixar em branco (null), o modelo é Global (todas as secretarias podem usar). Se escolher "Saúde", só a Saúde vê na vitrine.

---

## 3. ETAPA 2: UPLOAD DO .DOCX E LEITURA DE TAGS (A MÁGICA)
O Admin faz o upload de um arquivo Word (`.docx`) contendo marcações no texto.
Exemplo no Word: *"Nomeia o servidor {{NOME_SERVIDOR}}, portador do CPF {{CPF_SERVIDOR}} para o cargo..."*

**O que o Frontend faz aqui:**
1. Lê o arquivo via Javascript/Mock e extrai tudo que está entre chaves `{{ }}`.
2. Ignora as **Variáveis de Sistema** (ex: `{{SYS_DATA_HOJE}}`, `{{SYS_ASSINANTE_NOME}}`, `{{SYS_NUMERO_PORTARIA}}`), pois o backend preenche isso sozinho.
3. Separa as **Variáveis de Usuário** (ex: `{{NOME_SERVIDOR}}`, `{{CPF_SERVIDOR}}`) para a próxima etapa.

---

## 4. ETAPA 3: CONFIGURAÇÃO DAS VARIÁVEIS (Tipagem)
Para cada Variável de Usuário encontrada no `.docx`, o sistema gera um card para o Admin configurar como ela deve se comportar no Wizard da Tela 4.

**O Admin precisa definir para cada tag:**
1. **Label (Rótulo):** Como vai aparecer na tela. Ex: "Nome Completo do Servidor".
2. **Tipo do Campo (Select):**
   - `texto` (Campo de texto livre)
   - `numero` (Apenas números)
   - `data` (Calendário)
   - `moeda` (Máscara de R$ automática)
   - `cpf` (Máscara 000.000.000-00 automática)
   - `select` (Menu dropdown)
3. **Opções (Apenas se for Select):** Ex: "Efetivo, Comissionado, Estagiário".
4. **Obrigatório (Switch):** Sim ou Não.

---

## 5. VARIÁVEIS GLOBAIS DE SISTEMA (Somente Leitura)
Existe uma tela separada chamada **Variáveis de Sistema**. Lá, o Admin preenche dados fixos da prefeitura que mudam raramente.
Exemplos:
- `{{SYS_PREFEITO_NOME}}` = "João Silva"
- `{{SYS_MUNICIPIO_NOME}}` = "Cataguases"
- `{{SYS_ESTADO_SIGLA}}` = "MG"
- `{{SYS_CNPJ_PREFEITURA}}` = "00.000.000/0001-00"

*Regra:* O Wizard NUNCA pede essas variáveis para o usuário digitar. O sistema injeta elas no `.docx` silenciosamente na hora de gerar o rascunho.

---

## 6. INSTRUÇÃO PARA A IDE
1. Leia este arquivo ao desenvolver as telas `/_sistema/admin/modelos` e `/_sistema/admin/variaveis`.
2. A tela de criação de Modelo deve ter um fluxo visual claro onde a Etapa 3 (Configurar Variáveis) só aparece APÓS o arquivo `.docx` ser submetido (simulado no mock).
3. O payload de salvamento do modelo deve conter a matriz exata de variáveis esperada pelo `AGENTS_WIZARD_PORTARIA.md`.
