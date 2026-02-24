# agents/_modulos/PAPEL_TIMBRADO.md — GESTÃO DE PAPEL TIMBRADO
# Leia junto com: agents/_base/AGENTS.md | agents/_modulos/GESTAO_MODELOS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também PAPEL_TIMBRADO.en.md

---

## IDENTIDADE

Este arquivo define a regra arquitetural de como o sistema lida com
logos, cabeçalhos e rodapés de diferentes secretarias (Papel Timbrado).

---

## 1. REGRA DE OURO: O WORD É A FONTE DA VERDADE (SSOT)

**Princípio Arquitetural:**

O sistema Doc's Cataguases **NÃO POSSUI** funcionalidade para upload de logos de secretarias
para injeção dinâmica por cima do PDF. Isso causaria:
- Quebra de margens
- Desalinhamento de conteúdo
- Complexidade desnecessária de posicionamento de imagens
- Inconsistência visual entre documentos

**Solução:**

Toda a parte visual fixa (Logo da Prefeitura, Logo da Secretaria, endereço no rodapé,
marca d'água, tipografia base) DEVE vir **embutida nativamente dentro do arquivo .docx**
criado pelo Administrador no Microsoft Word.

---

## 2. VANTAGENS DESTA ABORDAGEM

### 2.1. Controle Total de Design

- Designer da Prefeitura tem controle pixel-perfect no Word
- Sem limitações de posição ou tamanho impostas pelo sistema
- Pode usar recursos avançados do Word (marca d'água, cabeçalho/rodapé diferentes por seção)

### 2.2. Sem Lógica de Renderização Complexa

- Sistema não precisa manipular imagens
- Não há cálculos de margem ou sobreposição
- CloudConvert/LibreOffice recebe `.docx` completo e gera PDF fiel

### 2.3. Escalabilidade

- Cada Secretaria pode ter múltiplos modelos com designs diferentes
- Ofícios, Memorandos, Portarias: todos usam o mesmo motor
- Atualização de design: basta re-upload do `.docx` (não requer deploy)

### 2.4. Compatibilidade

- Qualquer logo/imagem/fonte suportada pelo Word funciona
- Não há restrições de formato ou resolução

---

## 3. COMO FUNCIONA NA PRÁTICA

### 3.1. Criação do Modelo (Admin no Word)

**Passo 1:** Admin abre Microsoft Word

**Passo 2:** Cria papel timbrado:
- Insere → Cabeçalho: Logo da Prefeitura (esquerda) + Logo da Secretaria (direita)
- Insere → Rodapé: Endereço, Telefone, Site
- Configura margens adequadas
- Define estilos de título, parágrafos

**Passo 3:** Adiciona placeholders (tags de preenchimento):
```
PORTARIA Nº {{numero}}

O Secretário de {{secretaria}}, no uso de suas atribuições legais...

R E S O L V E:

Art. 1º - {{artigo_1}}

Art. 2º - Esta Portaria entra em vigor na data de sua publicação.

{{cidade}}, {{data}}

_______________________________
{{nome_assinante}}
{{cargo_assinante}}
```

**Passo 4:** Salva como `portaria-nomeacao-saude.docx`

### 3.2. Upload na Tela 9 (Gestão de Modelos)

**Rota:** `/_sistema/admin/modelos`

Admin clica "Novo Modelo" e preenche:

| Campo | Valor | Descrição |
|---|---|---|
| **Nome** | `Portaria de Nomeação - Saúde` | Nome amigável para operadores |
| **Tipo** | `PORTARIA` | Categoria do documento |
| **Arquivo** | `portaria-nomeacao-saude.docx` | Upload do `.docx` criado |
| **Visibilidade** | `Secretaria de Saúde` | Restrito a esta secretaria |
| **Ativo** | `☑️ Sim` | Disponível para uso |

**Resultado:**
- Arquivo armazenado: `/storage/modelos/portaria-nomeacao-saude.docx`
- Apenas usuários da Secretaria de Saúde veem este modelo no Wizard

### 3.3. Uso pelo Operador (Wizard de Portaria)

**Tela 1 do Wizard:**

Operador da Saúde vê dropdown "Selecione o Modelo":
- Portaria de Nomeação - Saúde ✓ (visível, pois pertence à Saúde)
- Portaria de Férias - Saúde
- Portaria Genérica - Geral (disponível para todos)

**NÃO aparecem:**
- Portaria de Nomeação - Educação (outra secretaria)
- Portaria de Licença - RH (outra secretaria)

---

## 4. ESTRUTURA DE VISIBILIDADE

### 4.1. Modelo Geral (secretariaId = null)

**Quem vê:** Todos os usuários, independente da secretaria

**Uso típico:**
- Portarias do Gabinete do Prefeito
- Modelos genéricos de uso comum
- Papel timbrado padrão da Prefeitura

**Exemplo:**
```typescript
{
  id: 'modelo-001',
  nome: 'Portaria Genérica - Prefeitura',
  tipo: 'PORTARIA',
  arquivoUrl: '/storage/modelos/portaria-generica.docx',
  secretariaId: null, // <- GERAL
  ativo: true,
}
```

### 4.2. Modelo Específico (secretariaId != null)

**Quem vê:** Apenas usuários com `usuario.secretariaId === modelo.secretariaId`

**Uso típico:**
- Papel timbrado personalizado da Secretaria
- Modelos com campos específicos de uma pasta
- Layout diferenciado por órgão

**Exemplo:**
```typescript
{
  id: 'modelo-002',
  nome: 'Portaria de Nomeação - Saúde',
  tipo: 'PORTARIA',
  arquivoUrl: '/storage/modelos/portaria-nomeacao-saude.docx',
  secretariaId: 'sec-saude', // <- RESTRITO
  ativo: true,
}
```

---

## 5. LÓGICA DE FILTRAGEM (BACKEND)

```typescript
// src/services/modelo.service.ts

export async function listarModelosDisponiveis(): Promise<Result<Modelo[]>> {
  const usuarioAtual = obterUsuarioAutenticado()
  
  // Busca modelos gerais + modelos da secretaria do usuário
  const modelos = await prisma.modelo.findMany({
    where: {
      ativo: true,
      OR: [
        { secretariaId: null }, // Modelos gerais
        { secretariaId: usuarioAtual.secretariaId }, // Modelos da secretaria
      ],
    },
    orderBy: { nome: 'asc' },
  })
  
  return ok(modelos)
}
```

---

## 6. MODAL DE NOVO MODELO (UI)

### 6.1. Campos do Formulário

```typescript
// src/components/features/modelos/ModalNovoModelo.tsx

<Form>
  <FormField name="nome">
    <Label>Nome do Modelo</Label>
    <Input placeholder="Ex: Portaria de Férias - RH" />
  </FormField>

  <FormField name="tipo">
    <Label>Tipo de Documento</Label>
    <Select>
      <SelectItem value="PORTARIA">Portaria</SelectItem>
      <SelectItem value="OFICIO">Ofício</SelectItem>
      <SelectItem value="MEMORANDO">Memorando</SelectItem>
      <SelectItem value="DECRETO">Decreto</SelectItem>
    </Select>
  </FormField>

  <FormField name="arquivo">
    <Label>Arquivo .docx</Label>
    <Input type="file" accept=".docx" />
    <FormDescription>
      Tamanho máximo: 5MB. Certifique-se de incluir logos e papel timbrado no próprio Word.
    </FormDescription>
  </FormField>

  <FormField name="visibilidade">
    <Label>Visibilidade</Label>
    <RadioGroup defaultValue="geral">
      <RadioGroupItem value="geral">
        <Label>Visível para todas as Secretarias (Geral)</Label>
      </RadioGroupItem>
      <RadioGroupItem value="especifica">
        <Label>Restrito a uma Secretaria específica</Label>
        {visibilidade === 'especifica' && (
          <Select name="secretariaId">
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Escolha a secretaria" />
            </SelectTrigger>
            <SelectContent>
              {secretarias.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </RadioGroupItem>
    </RadioGroup>
  </FormField>

  <FormField name="ativo">
    <div className="flex items-center gap-2">
      <Checkbox id="ativo" defaultChecked />
      <Label htmlFor="ativo">Modelo ativo (disponível para uso)</Label>
    </div>
  </FormField>
</Form>
```

---

## 7. SUPORTE A OFÍCIOS E MEMORANDOS

### 7.1. Princípio de Agnosticismo

Como a responsabilidade visual é do arquivo `.docx`, o sistema **já está 100% preparado**
para gerar Ofícios, Memorandos, Decretos, etc.

### 7.2. Fluxo para Adicionar Novo Tipo

**Passo 1:** Admin cria `.docx` com layout de Ofício no Word

**Passo 2:** Faz upload na Tela 9, selecionando `Tipo: OFÍCIO`

**Passo 3:** Sistema armazena normalmente

**Passo 4:** Operador usa Wizard (mesmo fluxo de Portaria)

**Passo 5:** Motor de preenchimento:
- Lê `.docx`
- Substitui tags `{{campo}}`
- Envia para CloudConvert
- Gera PDF final

**Não há diferença no código.** O motor é agnóstico ao design.

### 7.3. Exemplos de Tags Comuns

**Portaria:**
```
{{numero}}, {{secretaria}}, {{artigo_1}}, {{cidade}}, {{data}}, {{nome_assinante}}
```

**Ofício:**
```
{{numero_oficio}}, {{destinatario}}, {{cargo_destinatario}}, {{corpo_texto}}, {{saudacao}}
```

**Memorando:**
```
{{numero_memo}}, {{de}}, {{para}}, {{assunto}}, {{mensagem}}
```

---

## 8. ESPECIFICAÇÕES TÉCNICAS

### 8.1. Upload de Arquivo

| Propriedade | Valor |
|---|---|
| Formato aceito | `.docx` (Microsoft Word 2007+) |
| Tamanho máximo | 5MB |
| Armazenamento | `/storage/modelos/` ou Supabase Storage |
| Validação | Magic bytes: `50 4B 03 04` (ZIP) |

### 8.2. Modelo no Banco (Prisma)

```prisma
model Modelo {
  id           String   @id @default(cuid())
  nome         String
  tipo         TipoDocumento // PORTARIA, OFICIO, MEMORANDO, DECRETO
  arquivoUrl   String
  secretariaId String?
  ativo        Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  secretaria Secretaria? @relation(fields: [secretariaId], references: [id])
  portarias  Portaria[]

  @@index([secretariaId])
  @@index([tipo])
}

enum TipoDocumento {
  PORTARIA
  OFICIO
  MEMORANDO
  DECRETO
}
```

### 8.3. Endpoints (Ciclo 3)

```
GET /api/modelos
  Auth:    Autenticado
  Filtro:  Automático (secretariaId do usuário + gerais)
  Retorna: Modelo[]

POST /api/modelos
  Body:    FormData { nome, tipo, arquivo, secretariaId?, ativo }
  Auth:    Requer gerenciar:all
  Retorna: Modelo criado

PATCH /api/modelos/[id]
  Body:    { nome?, tipo?, secretariaId?, ativo? }
  Auth:    Requer gerenciar:all
  Retorna: Modelo atualizado

DELETE /api/modelos/[id]
  Auth:    Requer gerenciar:all
  Retorna: 204 No Content
```

---

## 9. CASOS DE USO

### 9.1. Secretaria com Identidade Visual Própria

**Cenário:** Secretaria de Saúde tem logo próprio e quer papel timbrado diferenciado

**Solução:**
1. Designer cria `.docx` com logo da Saúde
2. Admin faz upload marcando `secretariaId: Saude`
3. Apenas operadores da Saúde veem este modelo

### 9.2. Prefeitura com Múltiplos Layouts

**Cenário:** Prefeitura quer papel timbrado diferente para documentos internos vs. externos

**Solução:**
1. Cria 2 modelos:
   - `Portaria Interna - Geral` (secretariaId = null)
   - `Portaria Externa - Geral` (secretariaId = null)
2. Ambos disponíveis para todos, operador escolhe no Wizard

### 9.3. Migração de Layout

**Cenário:** Prefeitura atualiza identidade visual

**Solução:**
1. Admin cria novos `.docx` com novo layout
2. Desativa modelos antigos (`ativo: false`)
3. Faz upload dos novos
4. **Sem deploy, sem código.** Sistema funciona imediatamente.

---

## 10. CRITÉRIOS DE ACEITAÇÃO

- [ ] Campo "Visibilidade" no modal de Novo Modelo
- [ ] Opção "Geral" cria modelo com `secretariaId = null`
- [ ] Opção "Específica" exige seleção de Secretaria
- [ ] Upload de `.docx` aceita apenas arquivos Word
- [ ] Validação de tamanho máximo (5MB)
- [ ] Listagem de modelos filtra automaticamente por secretaria do usuário
- [ ] Modelos gerais (secretariaId = null) visíveis para todos
- [ ] Modelos específicos visíveis apenas para secretaria correta
- [ ] Admin pode desativar modelos sem deletar
- [ ] Wizard de Portaria lista apenas modelos ativos e visíveis
- [ ] Upload de modelo com papel timbrado embutido funciona sem modificação do PDF
- [ ] CloudConvert preserva logos e formatação do `.docx` original

---

## 11. CHECKLIST DE CONCLUSÃO (Ciclo 1)

- [ ] Model `Modelo` no Prisma Schema com campo `secretariaId` opcional
- [ ] Enum `TipoDocumento` criado (PORTARIA, OFICIO, MEMORANDO, DECRETO)
- [ ] `src/services/modelo.service.ts` com lógica de filtragem por visibilidade
- [ ] `ModalNovoModelo.tsx` com campo "Visibilidade" (Geral vs. Específica)
- [ ] RadioGroup para escolher tipo de visibilidade
- [ ] Select de Secretarias condicional (aparece apenas se Específica)
- [ ] Validação de upload: `.docx` apenas, máx 5MB
- [ ] Endpoint `GET /api/modelos` com filtro automático por secretaria
- [ ] Endpoint `POST /api/modelos` com upload de arquivo
- [ ] Testes de filtragem: usuário vê apenas modelos permitidos
- [ ] Documentação para Admin sobre como criar papel timbrado no Word
