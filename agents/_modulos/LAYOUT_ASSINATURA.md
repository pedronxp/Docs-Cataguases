# agents/_modulos/LAYOUT_ASSINATURA.md — POSICIONAMENTO DA ASSINATURA NO DOCX
# Leia junto com: agents/_base/AGENTS.md | agents/_modulos/ASSINATURA.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também LAYOUT_ASSINATURA.en.md

---

## IDENTIDADE

Este arquivo garante que a assinatura eletrônica seja renderizada no local correto
do documento, respeitando o Manual de Redação Oficial.
A responsabilidade de dizer ONDE a assinatura vai ficar é do template `.docx`, não do código.

---

## 1. O PROBLEMA DO LAYOUT NO PDF

Sistemas que tentam "injetar" uma assinatura por cima de um PDF pronto costumam
quebrar o layout, sobrepor texto ou gerar páginas em branco.
Em órgãos públicos, o alinhamento da assinatura (direita, centro) é rígido.

---

## 2. A SOLUÇÃO: SSOT NO WORD

O Admin insere as tags abaixo no local exato do Microsoft Word onde deseja
que a assinatura apareça (centralizado, alinhado à direita, com ou sem linha superior).

### Tags SYS_ de Assinatura

| Tag | Substituída por |
|---|---|
| `{{SYS_ASSINANTE_NOME}}` | `user.name` de quem assinou |
| `{{SYS_ASSINANTE_CARGO}}` | `user.role` formatado (ex: Prefeito Municipal) |
| `{{SYS_DATA_ASSINATURA}}` | Timestamp do clique em "Assinar" (ex: 10 de jan. de 2026) |
| `{{SYS_CHANCELA_RODAPE}}` | Texto legal + hash SHA-256 (fonte 8, rodapé) |

> No Ciclo 1: adicionar estas chaves na tabela da Tela Variáveis de Sistema
> para que o Admin saiba que devem ser usadas nos templates.

---

## 3. FLUXO BACKEND NA ASSINATURA (Ciclo 3)

Quando `PATCH /api/portarias/[id]/assinar` é chamado:

```
1. Backend baixa o .docx de rascunho do Supabase Storage
2. Faz replace() das tags SYS_ASSINANTE_* com dados reais do assinante
3. Substitui SYS_CHANCELA_RODAPE pelo texto legal + hashAssinatura gerado
4. Envia o .docx final para o CloudConvert
5. CloudConvert devolve o PDF imutável
6. PDF salvo no Supabase Storage como versão oficial final
7. Banco atualizado: pdfUrl → URL do PDF final, status → PUBLICADA
```

---

## 4. PREVIEW ANTES DA ASSINATURA

**Problema:** O assinante precisa ver onde sua assinatura vai ficar antes de confirmar.
Ele não pode ver as tags cruas `{{SYS_ASSINANTE_NOME}}`.

**Solução:** Dois PDFs distintos por portaria.

### PDF de Preview (gerado quando vai de RASCUNHO → PROCESSANDO)
O backend substitui as tags de assinatura por placeholders amigáveis:

| Tag original | Placeholder no Preview |
|---|---|
| `{{SYS_ASSINANTE_NOME}}` | `[ Local da Assinatura Eletrônica ]` |
| `{{SYS_DATA_ASSINATURA}}` | `[ Data e Hora da Assinatura ]` |
| `{{SYS_CHANCELA_RODAPE}}` | `[ A tarja de validação com Hash será inserida aqui ]` |

Este é o PDF exibido nos status `PENDENTE`, `APROVADA` e `AGUARDANDO_ASSINATURA`.

### PDF Final (gerado no momento da assinatura)

```
1. Backend busca o .docx rascunho original (ignora o PDF de preview)
2. Substitui as tags pelas informações reais e criptográficas
3. Gera novo PDF via CloudConvert
4. Sobrescreve pdfUrl no banco com o link do PDF definitivo
```

> No Ciclo 1: o iframe do frontend exibe apenas um PDF mockado.
> O dev usa PDFs de exemplo com o desenho da assinatura para simular a experiência visual.

---

## 5. CHECKLIST DE CONCLUSÃO (Ciclo 3)

- [ ] PDF de preview gerado com placeholders no submit do operador
- [ ] PDF final gerado com dados reais no clique de assinar
- [ ] `pdfUrl` sobrescrito após assinatura
- [ ] `SYS_CHANCELA_RODAPE` com hash e URL de validação pública
- [ ] Iframe do frontend exibe PDF correto conforme status
