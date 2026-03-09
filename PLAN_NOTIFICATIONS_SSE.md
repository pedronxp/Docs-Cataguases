# Plano de Implementação: Notificações em Tempo Real

## 1. Contexto e Objetivo
O sistema já possui a tabela `FeedAtividade` que registra todas as mudanças de estado das portarias (aprovação, rejeição, assinatura, publicação, etc.). O objetivo é notificar os usuários em tempo real sobre essas mudanças sem que precisem atualizar a página manualmente.

A solução principal utilizará **Server-Sent Events (SSE)** nativo do Next.js + EventSource no frontend, garantindo uma arquitetura serverless resiliente, prevenindo timeouts (Vercel) e memory leaks. Adicionalmente, também indicamos o caminho via **Supabase Realtime** caso se opte pela solução nativa do banco já utilizado no projeto.

## 2. Estratégia Tecnológica (SSE Nativo)
- **Zero libs externas**: Uso exclusivo das APIs nativas do Next.js 15 (App Router) e Web APIs.
- **Segurança**: Autenticação via persistência de sessão já existente (Cookies JWT via `lib/auth`), evitando trafegar tokens pela URL do EventSource (`?token=...`).
- **Resiliência Serverless**: Implementação de *Graceful Disconnect* (~55s) na API para contornar o limite de timeout da Vercel (onde conexões longas geram erro 504), forçando a reconexão automática e saudável pelo browser.
- **Gestão de Memória (Frontend)**: O *store* Zustand armazenará apennas as últimas 50 notificações para não sobrecarregar o `localStorage`.
- **Prevenção de Memory Leak (Backend)**: Interceptação ativa de fechamento de conexão (`request.signal.onabort`) para limpar os *polling loops* de consultas ao banco caso a aba seja fechada.

---

## 3. Estrutura de Arquivos

### 3.1 Backend — API Route SSE
**Arquivo:** `apps/api/src/app/api/notifications/sse/route.ts` (CRIAR)

```typescript
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth"; // Ajuste conforme seu auth
import prisma from "@/lib/prisma"; // Ajuste conforme seu client prisma

export const dynamic = 'force-dynamic'; 

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  // Usa o último timestamp enviado pelo client, ou a data atual
  let lastEventAt = url.searchParams.get("lastEventAt") || new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Loop de Busca no BD
      const poll = async () => {
        try {
          const novasNotificacoes = await prisma.feedAtividade.findMany({
            where: {
              createdAt: { gt: new Date(lastEventAt) },
              // Exemplo de filtro RLS / permissionamento (opcional se RLS ativo no DB):
              // orgaoId: session.user.orgaoId
            },
            orderBy: { createdAt: 'asc' }
          });

          if (novasNotificacoes.length > 0) {
            novasNotificacoes.forEach((notif) => sendEvent(notif));
            lastEventAt = novasNotificacoes[novasNotificacoes.length - 1].createdAt.toISOString();
          }
        } catch (error) {
          console.error("Erro no poll de notificações", error);
        }
      };

      const intervalId = setInterval(poll, 5000);

      // Heartbeat para manter a conexão aberta em proxies
      const heartbeatId = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 25000);

      // GRACEFUL DISCONNECT: Encerra antes de bater o limite da Vercel
      // O Limit Hobby Vercel é 10s-15s, Pro é 60s. Ajuste o timeout abaixo perante seu plano.
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        try { controller.close() } catch(e) {}
      }, 55000); 

      // MEMORY LEAK PREVENTION: Limpeza caso o usuário feche a aba
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        clearTimeout(timeoutId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
```

### 3.2 Frontend — Zustand Store
**Arquivo:** `apps/web/src/store/notifications.store.ts` (CRIAR)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NotificacaoItem } from '@/types/domain';

interface NotificationsState {
  notificacoes: NotificacaoItem[];
  naoLidas: number;
  ultimaVista: string;
  addNotificacao: (notificacao: NotificacaoItem) => void;
  marcarTodasLidas: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notificacoes: [],
      naoLidas: 0,
      ultimaVista: new Date().toISOString(),

      addNotificacao: (notif) => {
        const state = get();
        
        // Previne duplicatas de reconexões colidentes
        if (state.notificacoes.some((n) => n.id === notif.id)) return;
        
        // Mantém apenas as últimas 50 para preservar o LocalStorage
        const updatedList = [notif, ...state.notificacoes].slice(0, 50);

        set({
           notificacoes: updatedList,
           naoLidas: state.naoLidas + 1,
           // Avança o cursor histórico para o hook SSE
           ultimaVista: notif.createdAt
        });
      },

      marcarTodasLidas: () => set({ naoLidas: 0 })
    }),
    {
      name: 'sistemkt-notifications',
    }
  )
);
```

### 3.3 Frontend — Custom Hook de Conexão SSE
**Arquivo:** `apps/web/src/hooks/use-notifications-sse.ts` (CRIAR)

```typescript
import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '@/store/notifications.store';
import { useToast } from '@/hooks/use-toast';

export function useNotificationsSSE() {
  const { addNotificacao } = useNotificationsStore();
  const { toast } = useToast();
  
  // Usar Ref focado para não re-trigar o useEffect em cada mensagem
  const ultimaVistaRef = useRef(useNotificationsStore.getState().ultimaVista);

  useEffect(() => {
    // Escuta store sem causar re-render do hook original
    const unsubscribe = useNotificationsStore.subscribe((state) => {
        ultimaVistaRef.current = state.ultimaVista;
    });

    const connectSSE = () => {
      const url = `/api/notifications/sse?lastEventAt=${ultimaVistaRef.current}`;
      
      // withCredentials = true garante o envio de HttpOnly Cookies (Sessão)
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addNotificacao(data);
          
          toast({
            title: "Nova Atualização",
            description: data.mensagem,
          });
        } catch (error) {
          console.error("Erro processando notificação SSE:", error);
        }
      };

      eventSource.onerror = (error) => {
         // Fecha stream p/ limpar e tentar de novo com Backoff delay
         eventSource.close();
         setTimeout(() => connectSSE(), 5000); 
      };

      return eventSource;
    };

    let es = connectSSE();

    return () => {
      es.close();
      unsubscribe();
    };
  }, [addNotificacao, toast]);
}
```

### 3.4 Frontend — Componentes UI
**Arquivo:** `apps/web/src/components/shared/NotificationBell.tsx` (CRIAR)
- **Estrutura Base:** Um botão *Trigger* usando `Popover` do **shadcn/ui**.
- **Indicador:** Badge posicionado em abosute (`-top-1 -right-1`) renderizando `naoLidas` do *store*. (Oculto se igual a 0).
- **Lista:** Dentro do *PopoverContent*, uma `ScrollArea` listando a variável `notificacoes`.
- **Ações:** Botão interno p/ chamar `marcarTodasLidas()`. Links nas notificações roteando via TanStack Router (`<Link to="/portarias/$id" params={{ id: item.portariaId }}>`).

**Arquivo:** `apps/web/src/components/shared/AppHeader.tsx` (MODIFICAR)
- Importar `<NotificationBell />`.
- Instanciar a escuta **silenciosa**: `useNotificationsSSE();` no nível mais alto do Layout Autenticado para que escute navegando por qualquer tela.

### 3.5 Domínio / Tipagem
**Arquivo:** `apps/web/src/types/domain.ts` (MODIFICAR/ADICIONAR)

```typescript
export interface NotificacaoItem {
  id: string;
  tipoEvento: string;
  mensagem: string;
  portariaId: string;
  portariaTitulo?: string;
  createdAt: string;
  lida?: boolean;
}
```

---

## 4. Alternativa Simplificada: Supabase Realtime (Recomendado)
Como este projeto já utiliza Supabase e Next.js/Zustand, é possível descartar toda a API Route e lógicas complexas de serverless HTTP connections utilizando o SDK nativo do próprio Banco:

```typescript
// Substituto imediato p/ o hook use-notifications-sse.ts usando Supabase puro:
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Supabase Client
import { useNotificationsStore } from '@/store/notifications.store';

export function useSupabaseNotifications() {
  const { addNotificacao } = useNotificationsStore();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('notificacoes-feed')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'FeedAtividade',
          // RLS (Row Level Security) já cobre que o user só consiga
          // escutar registros pertinentes ao órgão dele.
        },
        (payload) => {
          const novaAtividade = payload.new as NotificacaoItem;
          addNotificacao(novaAtividade);
          
          // Chame de Toast aqui, etc.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNotificacao, supabase]);
}
```

> **Vantagens de usar o Supabase Realtime invés de Next.js custom SSE:**
> - Zero uso de Edge/Serverless Functions da Vercel = 0 custo operacional por tempo de conexão de APIs.
> - O controle de Websocket é totalmente abstraído, sem problemas de timeouts de timeout de provedor.
> - Conforme regras do `user_global` _"RLS ativo no Supabase para todas as tabelas"_, o Supabase só emitirá Realtime via policies, dispensando criar a query de permissão e polling manual.

---

## 5. Roteiro de Verificação 
1. **Comportamento base**: Abrir o sistema em dois computadores/browsers.
2. **Emissão**: Usuário A aprova a portaria.
3. **Recepção**: Usuário B recebe a notificação no toast (no canto inferior da tela) em no máximo 5 segundos.
4. **UI**: O Sino atualiza seu *badge counter* corretamente (1, 2, ...).
5. **Persistência local**: Dar <kbd>F5</kbd> na aba do usuário B e confirmar se o histórico no Sino reaparece.
6. **Limpeza**: Ao abrir o dropdown e clicar em "Marcar como lidas", o badge zera/desaparece.
7. **Reconexão Edge Case**: Pausar e retomar a conexão de internet do computador B; A assinatura SSE ou Channel Realtime deve ser restabelecida organicamente.
