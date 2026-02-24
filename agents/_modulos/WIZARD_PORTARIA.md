# AGENTS_WIZARD_PORTARIA.md — COMPLEMENTO: MOTOR DE CRIAÇÃO E WIZARD
# Leia junto com AGENTS.md, MOCKS.md e PROGRESS.md
# Este arquivo detalha a engenharia da Tela 4 (Nova Portaria) e o Formulário Dinâmico.

---

## 1. O CONCEITO DO WIZARD (STEPPER)
A criação de um documento oficial é fatiada em passos para reduzir erros de digitação e garantir agilidade.

Componente visual no topo (Stepper):
`[ 1. Selecionar Modelo ] -> [ 2. Preencher Dados ] -> [ 3. Conferência ]`

---

## 2. ETAPA 1: SELEÇÃO DE MODELO (A Vitrine)
O usuário escolhe qual "molde" de documento ele quer criar.

**Regras:**
1. A tela faz um fetch em `listarModelos()`.
2. Exibe APENAS modelos da prefeitura inteira (`secretariaId === null`) ou da Secretaria do usuário logado.
3. Grid de Cards clicáveis (Shadcn Card com hover effect).
4. Ao clicar em um Card, o botão [Próximo →] é habilitado e avança para a Etapa 2.

---

## 3. ETAPA 2: FORMULÁRIO DINÂMICO E MÁSCARAS (O Motor)
O formulário se molda sozinho lendo as `variaveis: ModeloVariavel[]` configuradas pelo Admin no modelo selecionado. O sistema não adivinha campos; ele obedece a configuração.

**Regras de Renderização (React Hook Form):**
1. O sistema faz um `.map()` nas variáveis e renderiza o input correspondente com base no `tipo` cadastrado pelo Admin:
   - `tipo === 'texto'` -> `<Input type="text" />`
   - `tipo === 'numero'` -> `<Input type="number" />`
   - `tipo === 'data'` -> `<Input type="date" />`
   - `tipo === 'moeda'` -> `<Input />` com máscara de Real (R$ 0,00)
   - `tipo === 'cpf'` -> `<Input />` com máscara de CPF (000.000.000-00)
   - `tipo === 'select'` -> `<Select>` do Shadcn usando as `opcoes[]` cadastradas.
2. Adiciona um asterisco vermelho `*` nas labels onde `obrigatorio === true`.
3. Validação on-the-fly (Zod): Não deixa avançar para o Resumo se faltar campo obrigatório ou se o CPF/Moeda estiver incompleto.
4. Botões inferiores: [← Voltar] e [Próximo →].

---

## 4. ETAPA 3: CONFERÊNCIA (O Resumo de Segurança)
Última etapa antes de sujar o banco de dados. Serve para o servidor revisar o que digitou e evitar retrabalho.

**Regras e UI:**
1. **Resumo dos Dados:** Renderiza uma lista limpa de chave/valor em um Card cinza claro.
   Exemplo visual:
   - **Nome do Servidor:** João da Silva
   - **CPF:** 123.456.789-00
   - **Cargo:** Assistente Administrativo
2. Alerta (amber-50): "Confira os dados com atenção. Após gerar o rascunho, esses valores serão injetados no documento oficial."
3. Botões inferiores: [← Corrigir Dados] e o botão final **[ ✅ Gerar Rascunho do Documento ]** (gov-blue, grande).

### O Payload Final de Submissão
Quando clica no botão final, o Hook Form envia:
```json
{
  "titulo": "Portaria de Nomeação - João da Silva", 
  "modeloId": "modelo-nomeacao",
  "dadosFormulario": {
    "NOME_SERVIDOR": "João da Silva",
    "CPF_SERVIDOR": "123.456.789-00",
    "CARGO": "Assistente Administrativo"
  }
}
