# AGENTS_PAPEL_TIMBRADO.md — COMPLEMENTO: GESTAO DE PAPEL TIMBRADO
# Este arquivo define a regra arquitetural de como o sistema lida com 
# logos, cabecalhos e rodapes de diferentes secretarias.

---

## 1. REGRA DE OURO: O WORD E A FONTE DA VERDADE (SSOT)
O sistema Doc's Cataguases **NAO POSSUI** uma funcionalidade para upload de logos de secretarias para injetar imagens por cima do PDF. Isso causa quebra de margens e desalinhamento.

Toda a parte visual fixa (Logo da Prefeitura, Logo da Secretaria, endereco no rodape, marca d'agua, tipografia base) DEVE vir **embutida nativamente dentro do arquivo .docx** criado pelo Administrador no Microsoft Word.

---

## 2. COMO FUNCIONA NA TELA 9 (MODELOS DE DOCUMENTO)

Quando o Admin acessa a Tela 9 e clica em "Novo Modelo", ele deve preencher:
- **Nome do Modelo:** (Ex: "Portaria de Nomeacao - Saude")
- **Arquivo:** Upload do `.docx` (que ja contem o papel timbrado da Saude no cabecalho/rodape do Word).
- **Visibilidade (secretariaId):** 
  - Se selecionar uma Secretaria especifica (Ex: "Secretaria de Saude"), apenas usuarios daquela secretaria verao este modelo na hora de criar um documento.
  - Se deixar em branco (Geral), o modelo fica disponivel para toda a prefeitura (geralmente usa o papel timbrado padrao do Gabinete do Prefeito).

### Adicao na UI do Modal de Novo Modelo (Ciclo 1 e 2):
No formulario de "Novo Modelo" (Tela 9), certifique-se de que existe o campo Select "Visibilidade":
  - `[ ] Visivel para todas as Secretarias (Geral)`
  - `[ ] Restrito a uma Secretaria especifica:` -> `[Select: Secretaria de Saude, etc]`

---

## 3. SUPORTE A OFICIOS E MEMORANDOS (FUTURO)
Como a responsabilidade visual e do arquivo `.docx`, o sistema ja esta 100% preparado para gerar Oficios e Memorandos. Basta o Admin fazer upload de um `.docx` com o layout de um Oficio e nomear o modelo como "Oficio Padrao Externo". O motor do sistema (Preencher Tags -> Converter PDF) funciona de forma agnostica ao design do documento.
