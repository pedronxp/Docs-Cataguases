# agents/_modulos/TUTORIAL.md — CENTRAL DE AJUDA E TUTORIAIS
# Leia junto com: agents/_base/AGENTS.md | agents/_base/MOCKS.md
# IA: Responda SEMPRE em português (pt-BR). Para melhor compreensão técnica, leia também TUTORIAL.en.md

---

## IDENTIDADE

Este arquivo define a Central de Ajuda interativa e dinâmica do sistema.
Tutoriais pesquisáveis, baseados em cargos, com FAQs e passo a passo visual.

---

## 1. O CONCEITO DA CENTRAL DE AJUDA (GOVTECH)

**Problema:** Manuais em PDF de 50 páginas não funcionam.

**Solução:** Central de Ajuda moderna com:

### 1.1. Características

1. **Pesquisável:** Barra de busca no topo que filtra instantaneamente
2. **Baseada em Cargos (Role-Based):**
   - Aba "Administração" SÓ aparece para `ADMIN_GERAL` ou `PREFEITO`
   - Aba "Operação" aparece para todos (criar portaria, fazer upload)
3. **Visual:** Cards simulando "Vídeos Curtos" e "Passo a Passo"
4. **FAQ Dinâmico:** Componente `Accordion` (Shadcn) para dúvidas frequentes
5. **Contextual:** Tutoriais específicos por funcionalidade

---

## 2. ROTA E SIDEBAR

### 2.1. Nova Rota

```
/_sistema/tutorial
```

### 2.2. Atualização no Sidebar

```typescript
// src/components/features/sidebar/AppSidebar.tsx

import { HelpCircle } from 'lucide-react'

// No final do array de items, separado:
{
  separador: true, // Adiciona linha divisória
},
{
  to: '/_sistema/tutorial',
  label: 'Central de Ajuda',
  icon: HelpCircle,
  action: 'ler',
  subject: 'all', // Todos têm acesso
}
```

---

## 3. ESTRUTURA DA PÁGINA

### 3.1. Layout Geral

```
┌────────────────────────────────────────────────────────────────┐
│ Central de Ajuda                                    [🔍 Buscar]│
├────────────────────────────────────────────────────────────────┤
│ Tabs: [Operação] [Administração*]                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📚 Tutoriais em Vídeo                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │ [▶] Como │ │ [▶] Assi-│ │ [▶] Con- │                       │
│  │ criar uma│ │ nar Porta│ │ sultar   │                       │
│  │ portaria │ │ rias     │ │ Acervo   │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
│                                                                 │
│  ❓ Perguntas Frequentes                                       │
│  ⊕ Como criar minha primeira portaria?                        │
│  ⊕ O que fazer se o PDF não foi gerado?                       │
│  ⊕ Como consultar documentos antigos?                         │
│                                                                 │
│  📖 Guias Passo a Passo                                        │
│  • Fluxo completo de uma portaria                             │
│  • Como configurar assinaturas                                 │
│  • Entendendo o painel de analytics                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

* Aba "Administração" visível apenas para ADMIN_GERAL e PREFEITO
```

---

## 4. COMPONENTES PRINCIPAIS

### 4.1. Header com Busca

```typescript
// src/routes/_sistema/tutorial.tsx

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const [busca, setBusca] = useState('')

<div className="mb-6">
  <div className="relative">
    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Buscar tutoriais ou dúvidas..."
      value={busca}
      onChange={(e) => setBusca(e.target.value)}
      className="pl-10"
    />
  </div>
</div>
```

### 4.2. Tabs por Cargo

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'

const ability = useAbility(AbilityContext)
const isAdmin = ability.can('gerenciar', 'all')

<Tabs defaultValue="operacao">
  <TabsList>
    <TabsTrigger value="operacao">Operação</TabsTrigger>
    {isAdmin && (
      <TabsTrigger value="administracao">Administração</TabsTrigger>
    )}
  </TabsList>

  <TabsContent value="operacao">
    <TutoriaisOperacao busca={busca} />
  </TabsContent>

  {isAdmin && (
    <TabsContent value="administracao">
      <TutoriaisAdmin busca={busca} />
    </TabsContent>
  )}
</Tabs>
```

### 4.3. Cards de Vídeo Tutorial

```typescript
// src/components/features/tutorial/CardVideoTutorial.tsx

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Play } from 'lucide-react'

interface Props {
  titulo: string
  descricao: string
  duracao: string
  videoUrl?: string
}

export function CardVideoTutorial({ titulo, descricao, duracao }: Props) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="aspect-video bg-slate-100 rounded-md flex items-center justify-center mb-3">
          <Play className="h-12 w-12 text-slate-400" />
        </div>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>
          {descricao}
          <span className="block mt-1 text-xs text-muted-foreground">{duracao}</span>
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
```

### 4.4. FAQ com Accordion

```typescript
// src/components/features/tutorial/FAQSection.tsx

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

interface FAQ {
  pergunta: string
  resposta: string
}

interface Props {
  faqs: FAQ[]
}

export function FAQSection({ faqs }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        ❓ Perguntas Frequentes
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{faq.pergunta}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.resposta}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
```

### 4.5. Lista de Guias Passo a Passo

```typescript
// src/components/features/tutorial/GuiasList.tsx

import { ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface Guia {
  titulo: string
  descricao: string
  slug: string
}

interface Props {
  guias: Guia[]
}

export function GuiasList({ guias }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        📖 Guias Passo a Passo
      </h3>
      <div className="space-y-2">
        {guias.map((guia) => (
          <Link 
            key={guia.slug}
            to={`/tutorial/${guia.slug}`}
            className="flex items-center justify-between p-3 rounded-md border hover:bg-accent transition-colors"
          >
            <div>
              <p className="font-medium">{guia.titulo}</p>
              <p className="text-sm text-muted-foreground">{guia.descricao}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

## 5. CONTEÚDO MOCK (Ciclo 1)

### 5.1. Tutoriais de Operação

```typescript
// src/data/tutoriais.ts

export const TUTORIAIS_OPERACAO = [
  {
    titulo: 'Como criar uma portaria',
    descricao: 'Passo a passo completo do Wizard de Portarias',
    duracao: '3:42 min',
    videoUrl: null, // Ciclo 3: Vimeo/YouTube embed
  },
  {
    titulo: 'Assinar portarias digitalmente',
    descricao: 'Entenda o fluxo de assinatura eletrônica',
    duracao: '2:15 min',
    videoUrl: null,
  },
  {
    titulo: 'Consultar o acervo oficial',
    descricao: 'Como buscar e visualizar documentos publicados',
    duracao: '1:50 min',
    videoUrl: null,
  },
  {
    titulo: 'Upload de documentos externos',
    descricao: 'Adicionar PDFs externos ao sistema',
    duracao: '2:30 min',
    videoUrl: null,
  },
]

export const FAQS_OPERACAO: FAQ[] = [
  {
    pergunta: 'Como criar minha primeira portaria?',
    resposta: 'Clique em "Nova Portaria" no menu lateral. Escolha um modelo, preencha os campos obrigatórios e clique em "Avançar" até finalizar o wizard. Ao concluir, a portaria ficará em rascunho até ser enviada para assinatura.',
  },
  {
    pergunta: 'O que fazer se o PDF não foi gerado?',
    resposta: 'Verifique se todos os campos obrigatórios foram preenchidos. Se o problema persistir, aguarde alguns minutos (o CloudConvert pode estar processando). Em caso de erro persistente, contate o administrador do sistema.',
  },
  {
    pergunta: 'Como consultar documentos antigos?',
    resposta: 'Acesse "Acervo Oficial" no menu lateral. Use os filtros de data, secretaria e tipo de documento para encontrar o que procura. Todos os documentos publicados ficam permanentemente disponíveis.',
  },
  {
    pergunta: 'Posso editar uma portaria após criá-la?',
    resposta: 'Sim, desde que ela esteja em status "Rascunho". Após ser enviada para assinatura ou publicada, não é mais possível editar. Nesse caso, será necessário criar uma nova portaria de retificação.',
  },
  {
    pergunta: 'Como funciona a numeração automática?',
    resposta: 'O sistema gera o número sequencial automaticamente baseado no ano e secretaria. Exemplo: 001/2025-SAUDE. A numeração só é atribuída definitivamente quando a portaria é publicada.',
  },
]

export const GUIAS_OPERACAO: Guia[] = [
  {
    titulo: 'Fluxo completo de uma portaria',
    descricao: 'Do rascunho até a publicação oficial',
    slug: 'fluxo-portaria',
  },
  {
    titulo: 'Diferença entre Rascunho e Publicada',
    descricao: 'Entenda os status dos documentos',
    slug: 'status-documentos',
  },
  {
    titulo: 'Trabalhando com modelos',
    descricao: 'Como escolher e usar templates',
    slug: 'usando-modelos',
  },
]
```

### 5.2. Tutoriais de Administração

```typescript
export const TUTORIAIS_ADMIN = [
  {
    titulo: 'Gerenciar usuários e permissões',
    descricao: 'Aprovar novos servidores e definir cargos',
    duracao: '4:20 min',
    videoUrl: null,
  },
  {
    titulo: 'Criar e editar modelos de documento',
    descricao: 'Upload de .docx e configuração de templates',
    duracao: '5:10 min',
    videoUrl: null,
  },
  {
    titulo: 'Configurar secretarias e setores',
    descricao: 'Estrutura organizacional da prefeitura',
    duracao: '3:45 min',
    videoUrl: null,
  },
  {
    titulo: 'Painel de Analytics',
    descricao: 'Como interpretar métricas e gráficos',
    duracao: '4:00 min',
    videoUrl: null,
  },
  {
    titulo: 'Trilha de Auditoria',
    descricao: 'Rastrear ações e garantir segurança',
    duracao: '3:30 min',
    videoUrl: null,
  },
]

export const FAQS_ADMIN: FAQ[] = [
  {
    pergunta: 'Como aprovar um novo servidor?',
    resposta: 'Acesse "Gestão de Usuários" > aba "Fila de Aprovação". Clique em "Aprovar" no servidor desejado, escolha o cargo apropriado (Operador, Gestor de Setor, Secretário) e confirme. O servidor receberá um e-mail de liberação.',
  },
  {
    pergunta: 'Como criar um novo modelo de documento?',
    resposta: 'Vá em "Modelos de Documento" > "Novo Modelo". Faça upload de um arquivo .docx (com papel timbrado já incluído), defina o nome, tipo e visibilidade (geral ou por secretaria). O modelo estará disponível imediatamente no Wizard.',
  },
  {
    pergunta: 'O que é a Trilha de Auditoria?',
    resposta: 'É um log técnico que registra todas as ações críticas do sistema: criação/edição/exclusão de documentos, mudanças de permissão, assinaturas. Acessível apenas para ADMIN_GERAL, garante rastreabilidade para fins legais.',
  },
  {
    pergunta: 'Como adicionar uma nova secretaria?',
    resposta: 'Acesse "Gestão Municipal" > "Secretarias" > "Nova Secretaria". Preencha nome, sigla e informações de contato. Após criação, você pode gerenciar os setores dessa secretaria clicando em "Gerenciar Setores".',
  },
  {
    pergunta: 'Posso desativar um usuário temporariamente?',
    resposta: 'Sim. Na "Gestão de Usuários", clique em "Editar" no usuário desejado e desmarque "Ativo". Ele não poderá mais fazer login, mas seus dados e documentos criados permanecerão no sistema.',
  },
]

export const GUIAS_ADMIN: Guia[] = [
  {
    titulo: 'Onboarding de novos servidores',
    descricao: 'Fluxo de registro e aprovação',
    slug: 'onboarding-completo',
  },
  {
    titulo: 'Configuração inicial do sistema',
    descricao: 'Primeiros passos para admins',
    slug: 'setup-inicial',
  },
  {
    titulo: 'Papel timbrado e identidade visual',
    descricao: 'Como criar modelos com logos',
    slug: 'papel-timbrado',
  },
  {
    titulo: 'Permissões ABAC explicadas',
    descricao: 'Entenda o sistema de controle de acesso',
    slug: 'permissoes-abac',
  },
]
```

---

## 6. COMPONENTE PRINCIPAL

```typescript
// src/routes/_sistema/tutorial.tsx

import { useState } from 'react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/lib/ability'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, HelpCircle } from 'lucide-react'
import { CardVideoTutorial } from '@/components/features/tutorial/CardVideoTutorial'
import { FAQSection } from '@/components/features/tutorial/FAQSection'
import { GuiasList } from '@/components/features/tutorial/GuiasList'
import {
  TUTORIAIS_OPERACAO,
  TUTORIAIS_ADMIN,
  FAQS_OPERACAO,
  FAQS_ADMIN,
  GUIAS_OPERACAO,
  GUIAS_ADMIN,
} from '@/data/tutoriais'

export default function TutorialPage() {
  const ability = useAbility(AbilityContext)
  const isAdmin = ability.can('gerenciar', 'all')
  const [busca, setBusca] = useState('')

  // Filtro de busca simples
  const filtrarConteudo = (texto: string) => {
    return texto.toLowerCase().includes(busca.toLowerCase())
  }

  return (
    <PageLayout title="Central de Ajuda" icon={HelpCircle}>
      {/* Barra de Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar tutoriais ou dúvidas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="operacao">
        <TabsList>
          <TabsTrigger value="operacao">Operação</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="administracao">Administração</TabsTrigger>
          )}
        </TabsList>

        {/* Aba Operação */}
        <TabsContent value="operacao" className="space-y-8">
          {/* Vídeos */}
          <section>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📚 Tutoriais em Vídeo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TUTORIAIS_OPERACAO.filter(t => 
                !busca || filtrarConteudo(t.titulo) || filtrarConteudo(t.descricao)
              ).map((tutorial, index) => (
                <CardVideoTutorial key={index} {...tutorial} />
              ))}
            </div>
          </section>

          {/* FAQs */}
          <FAQSection 
            faqs={FAQS_OPERACAO.filter(faq => 
              !busca || filtrarConteudo(faq.pergunta) || filtrarConteudo(faq.resposta)
            )} 
          />

          {/* Guias */}
          <GuiasList 
            guias={GUIAS_OPERACAO.filter(guia => 
              !busca || filtrarConteudo(guia.titulo) || filtrarConteudo(guia.descricao)
            )} 
          />
        </TabsContent>

        {/* Aba Administração */}
        {isAdmin && (
          <TabsContent value="administracao" className="space-y-8">
            {/* Vídeos Admin */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📚 Tutoriais em Vídeo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TUTORIAIS_ADMIN.filter(t => 
                  !busca || filtrarConteudo(t.titulo) || filtrarConteudo(t.descricao)
                ).map((tutorial, index) => (
                  <CardVideoTutorial key={index} {...tutorial} />
                ))}
              </div>
            </section>

            {/* FAQs Admin */}
            <FAQSection 
              faqs={FAQS_ADMIN.filter(faq => 
                !busca || filtrarConteudo(faq.pergunta) || filtrarConteudo(faq.resposta)
              )} 
            />

            {/* Guias Admin */}
            <GuiasList 
              guias={GUIAS_ADMIN.filter(guia => 
                !busca || filtrarConteudo(guia.titulo) || filtrarConteudo(guia.descricao)
              )} 
            />
          </TabsContent>
        )}
      </Tabs>
    </PageLayout>
  )
}
```

---

## 7. FUTURAS MELHORIAS (Ciclo 3)

### 7.1. Vídeos Reais

- Integração com Vimeo ou YouTube para embed de vídeos
- Gravação de screencasts com narração
- Legendas e transcrições

### 7.2. Busca Avançada

- Full-text search com Algolia ou ElasticSearch
- Sugestões automáticas (autocomplete)
- Histórico de buscas

### 7.3. Feedback do Usuário

- Botões "Útil" / "Não útil" em cada FAQ
- Sistema de comentários
- Sugestão de novos tutoriais

### 7.4. Guias Interativos

- Passo a passo com highlights na interface
- Tooltips contextuais
- Onboarding tours com Shepherd.js ou similar

---

## 8. CRITÉRIOS DE ACEITAÇÃO

- [ ] Página `/_sistema/tutorial` acessível para todos os usuários
- [ ] Item "Central de Ajuda" adicionado no sidebar (rodapé)
- [ ] Barra de busca funcionando com filtro instantâneo
- [ ] Aba "Operação" visível para todos
- [ ] Aba "Administração" visível apenas para `ADMIN_GERAL` e `PREFEITO`
- [ ] Cards de vídeo tutorial renderizados (placeholder por enquanto)
- [ ] FAQs exibidas com Accordion funcionando
- [ ] Guias passo a passo listados com links
- [ ] Busca filtra tutoriais, FAQs e guias simultaneamente
- [ ] Layout responsivo (mobile, tablet, desktop)
- [ ] Sem vídeos reais no Ciclo 1 (apenas placeholders)

---

## 9. CHECKLIST DE CONCLUSÃO (Ciclo 1)

- [ ] `src/routes/_sistema/tutorial.tsx` criado
- [ ] `CardVideoTutorial.tsx` componente criado
- [ ] `FAQSection.tsx` componente criado
- [ ] `GuiasList.tsx` componente criado
- [ ] `src/data/tutoriais.ts` criado com mock data
- [ ] Arrays: `TUTORIAIS_OPERACAO`, `TUTORIAIS_ADMIN`, `FAQS_OPERACAO`, `FAQS_ADMIN`, `GUIAS_OPERACAO`, `GUIAS_ADMIN`
- [ ] Item "Central de Ajuda" adicionado no sidebar
- [ ] Ícone `HelpCircle` do Lucide usado
- [ ] Tabs implementadas com visibilidade condicional
- [ ] Barra de busca com filtro funcionando
- [ ] Layout responsivo testado
- [ ] Accordion do Shadcn funcionando nos FAQs
