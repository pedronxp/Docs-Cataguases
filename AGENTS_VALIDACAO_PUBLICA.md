# AGENTS_LAYOUT_ASSINATURA.md — COMPLEMENTO: POSICIONAMENTO DA ASSINATURA NO DOCX
# Este arquivo garante que a assinatura eletronica seja renderizada no local correto do documento, 
# respeitando o Manual de Redacao Oficial.

---

## 1. O PROBLEMA DO LAYOUT NO PDF
Sistemas que tentam "injetar" uma assinatura por cima de um PDF pronto costumam quebrar o layout, sobrepor texto ou gerar paginas em branco. Em orgaos publicos, o alinhamento da assinatura (direita, centro) e rigoroso.

---

## 2. A SOLUCAO: SSOT (Single Source of Truth) NO WORD
A responsabilidade de dizer ONDE a assinatura vai ficar e do template `.docx`, nao do codigo React ou do backend.

### Novas Variaveis de Sistema (SYS_TAGS)
O Admin deve inserir as seguintes tags no local exato onde deseja que a assinatura apareca no Microsoft Word (centralizado, alinhado a direita, com ou sem linha superior):

- `{{SYS_ASSINANTE_NOME}}`: Trocado pelo `user.name` de quem digitou a senha e clicou em assinar.
- `{{SYS_ASSINANTE_CARGO}}`: Trocado pelo `user.role` (Ex: Prefeito, Secretario de Saude).
- `{{SYS_DATA_ASSINATURA}}`: Trocado pelo timestamp do momento exato do clique (Ex: 10 de junho de 2025).
- `{{SYS_CHANCELA_RODAPE}}`: Colocada no rodape do Word, fonte tamanho 8. Trocada pelo texto legal e o Hash de validacao publica.

---

## 3. NOVO FLUXO DE ASSINATURA (CICLO 2 - BACKEND)
No Ciclo 2, quando o endpoint `PATCH /api/portarias/[id]/assinar` for chamado:
1. O backend baixa o `.docx` de rascunho (que o operador subiu na tela de revisao).
2. O backend faz um `replace()` das tags `{{SYS_ASSINANTE_*}}` com os dados do usuario logado (Prefeito/Secretario) e a tag do rodape com o Hash recem-gerado.
3. O backend envia esse `.docx` ja preenchido com os dados finais do assinante para o CloudConvert.
4. O CloudConvert devolve o PDF imutavel.
5. O PDF e salvo no Supabase Storage como a versao final e oficial.

*(Nota para a IA: No Ciclo 1, apenas adicione essas novas chaves na tabela da Tela 11 - Variaveis de Sistema, para que o Admin saiba que elas existem e devem ser usadas nos templates).*
