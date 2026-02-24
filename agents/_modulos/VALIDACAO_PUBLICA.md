# agents/_modulos/VALIDACAO_PUBLICA.md — PÁGINA DE VALIDAÇÃO PÚBLICA
# Leia junto com: agents/_base/AGENTS.md | agents/_infraestrutura/BACKEND.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também VALIDACAO_PUBLICA.en.md

---

## IDENTIDADE

Este arquivo especifica a página pública `/validar/[hash]` e o endpoint `GET /api/validar/[hash]`.
Acesso completamente público — sem login, sem token JWT, sem ABAC.
Qualquer cidadão com o hash do documento pode confirmar sua autenticidade.

---

## 1. CONCEITO

Cada portaria publicada ganha um `hashAssinatura` (SHA-256 do PDF em hex).
O cidadão, ao receber uma cópia impressa ou digital, pode acessar:

```
https://docs.cataguases.mg.gov.br/validar/[hashAssinatura]
```

E o sistema confirma instantaneamente se o documento é legítimo.

---

## 2. ROTA FRONTEND (`/validar`)

**Arquivo:** `src/routes/validar.$hash.tsx` (rota pública — fora do layout autenticado)

**Comportamento:**
- Não exige login. Guard Router não bloqueia.
- Ao montar, chama `GET /api/validar/[hash]`
- Enquanto carrega: skeleton loader centralizado
- Se encontrado: exibe bloco verde de confirmação
- Se não encontrado / hash inválido: exibe bloco vermelho de alerta

---

## 3. UI — DOCUMENTO ENCONTRADO

```
┌────────────────────────────────────────────────┐
│  ✓  Documento válido e autêntico                     │
│                                                      │
│  Título:    Portaria de Nomeação nº 001/2026/SEMAD   │
│  Número:    001/2026/SEMAD                           │
│  Publicado: 10 de jan. de 2026, às 14h32             │
│  Assinado por: Sr. Prefeito Municipal                │
│  Secretaria: Secretaria Municipal de Administração   │
│                                                      │
│  Hash SHA-256:                                       │
│  a3f1c9d2... (64 chars, fonte mono, quebra de linha)  │
│                                                      │
│  [ 📄 Ver PDF Oficial ]   [ Voltar ao Início ]        │
└────────────────────────────────────────────────┘
```

- Fundo: `bg-green-50`, borda: `border-green-200`, ícone: `✓` verde
- Botão "Ver PDF Oficial" abre `pdfUrl` em nova aba
- Botão "Voltar ao Início" redireciona para `/`

---

## 4. UI — DOCUMENTO NÃO ENCONTRADO

```
┌────────────────────────────────────────────────┐
│  ✕  Documento não encontrado                         │
│                                                      │
│  O hash informado não corresponde a nenhum           │
│  documento publicado neste sistema.                  │
│                                                      │
│  Verifique se o código foi copiado corretamente.     │
│                                                      │
│  [ Voltar ao Início ]                                │
└────────────────────────────────────────────────┘
```

- Fundo: `bg-red-50`, borda: `border-red-200`, ícone: `✕` vermelho

---

## 5. ENDPOINT BACKEND (Ciclo 3)

```
GET /api/validar/[hash]
  Auth:      NÃO requerida (público)
  ABAC:      NÃO aplicado
  Valida:    hash com formato válido (Zod: string hex de 64 chars ou prefixo mock)
  Consulta:  SELECT id, titulo, numeroOficial, assinadoEm, pdfUrl,
                    assinante { name }, secretaria { nome }
             FROM Portaria
             WHERE hashAssinatura = hash AND status = 'PUBLICADA'
  Retorno 200:
    {
      id, titulo, numeroOficial,
      assinadoEm,   // ISO timestamp
      pdfUrl,       // link público do Supabase Storage
      assinante: { name },
      secretaria: { nome }
    }
  Retorno 404: { error: 'Documento não encontrado.' }
  Retorno 400: { error: 'Hash inválido.' }
```

**Atenção:** Não expor campos sensíveis (CPF, dados formulário, autorId).

---

## 6. CHANCELA NO RODAPÉ DO PDF

O template DOCX deve conter a tag `{{SYS_CHANCELA_RODAPE}}` no rodapé.
O backend substitui por:

```
Documento eletrônico publicado pelo Sistema Doc's Cataguases.
Autenticidade verificável em: https://docs.cataguases.mg.gov.br/validar/[hashAssinatura]
Hash SHA-256: [hashAssinatura]
```

Fonte: tamanho 8, cor cinza, centralizado.

---

## 7. CHECKLIST DE CONCLUSÃO (Ciclo 3)

- [ ] `GET /api/validar/[hash]` retorna dados corretos sem autentiçao
- [ ] `GET /api/validar/[hash]` retorna 404 para hash inexistente
- [ ] `GET /api/validar/[hash]` retorna 400 para hash malformado
- [ ] Página `/validar/[hash]` acessível sem login (Guard Router não bloqueia)
- [ ] Bloco verde com dados completos do documento publicado
- [ ] Bloco vermelho para hash não encontrado
- [ ] Botão "Ver PDF Oficial" abre PDF em nova aba
- [ ] `SYS_CHANCELA_RODAPE` substituída corretamente no PDF final
