# Plano de Atualizacao — Doc's Cataguases v2.0

## Fase 1 — Estabilizacao (Semana 1-2)

### Deploy das correcoes recentes
- [ ] Executar `npx prisma db seed` para corrigir formato de numeracao (PORT-{N}/{ANO})
- [ ] Validar que portarias existentes nao foram afetadas pelo novo formato
- [ ] Testar extracao de brasao com DOCX reais da prefeitura (EMF e PNG)
- [ ] Verificar feed do dashboard filtrado por usuario em producao
- [ ] Monitorar sanitizer de LLM (verificar que CPFs nao vazam nos logs do provider)
- [ ] Testar API /api/pdf/extract com PDFs reais da prefeitura

### Monitoramento
- [ ] Verificar circuit breaker dos LLMs (logs de 429/402)
- [ ] Monitorar taxa de sucesso do CloudConvert vs LibreOffice
- [ ] Verificar consumo de tokens por provider (dashboard admin)

## Fase 2 — Robustez (Semana 3-4)

### Testes automatizados
- [ ] Criar suite de testes para NumeracaoService (atomicidade, formato)
- [ ] Testes para DocxHeaderService (EMF, PNG, sem imagem, sem cabecalho)
- [ ] Testes para llm-sanitizer (CPF, CNPJ, dados bancarios)
- [ ] Testes para fluxo de portaria (transicoes de estado validas e invalidas)
- [ ] Testes E2E basicos com Playwright (login, criar portaria, submeter)

### Seguranca
- [ ] Rate limiting por usuario na API /api/llm/chat (max 50 req/hora)
- [ ] Audit trail imutavel: adicionar hash encadeado nos logs de feed
- [ ] Revisar CORS e headers de seguranca
- [ ] Implementar Content Security Policy (CSP)

### Infra
- [ ] Backup automatizado do Supabase (pg_dump diario + sync do Storage)
- [ ] Health check endpoint (/api/health) para monitoramento externo
- [ ] Documentar API com Swagger/OpenAPI

## Fase 3 — Evolucao (Mes 2-3)

### Funcionalidades
- [ ] OCR para PDFs escaneados (Tesseract + pdf2image)
- [ ] Versionamento de modelos com diff visual entre versoes
- [ ] Dashboard analytics avancado com graficos de tendencia
- [ ] Workflow customizavel (admin define etapas por tipo de documento)
- [ ] Notificacoes por email (SendGrid/Resend)

### Performance
- [ ] Cache Redis para consultas frequentes (sidebar-counts, feed)
- [ ] Paginacao server-side no feed de atividades
- [ ] Lazy loading de componentes pesados (analytics, modelos)
- [ ] Image optimization com next/image para brasoes e logos

### UX
- [ ] Wizard de modelo melhorado com preview lado-a-lado
- [ ] Arrastar-e-soltar variaveis no editor de modelo
- [ ] Modo escuro (dark theme)
- [ ] Atalhos de teclado (Ctrl+N nova portaria, Ctrl+S salvar)

## Fase 4 — Expansao (Mes 4+)

### Integracao
- [ ] Assinatura digital ICP-Brasil com certificado A1/A3
- [ ] Integracao com e-SIC e Portal da Transparencia
- [ ] API publica para consulta de documentos (read-only)
- [ ] Webhook para notificar sistemas externos

### Escalabilidade
- [ ] Progressive Web App (PWA) com suporte offline
- [ ] Multi-tenant para outros municipios
- [ ] Microservicos: separar LLM service em servico independente
- [ ] CDN para PDFs publicados

## Metricas de Sucesso

| Metrica | Meta | Como medir |
|---------|------|------------|
| Tempo medio de publicacao | < 5 dias | Analytics: data criacao -> data publicacao |
| Taxa de rejeicao | < 15% | Feed: rejeitadas / total submetidas |
| Uptime do sistema | > 99.5% | Health check + monitoring |
| Satisfacao do usuario | > 4/5 | Pesquisa periodica |
| Documentos publicados/mes | Crescente | Analytics mensal |

## Riscos e Mitigacao

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| Queda do Supabase | Baixa | Backup diario + fallback read-only |
| Esgotamento de tokens LLM | Media | Circuit breaker + 4 providers + chaves reserva |
| CloudConvert indisponivel | Baixa | LibreOffice local como fallback |
| Vazamento de dados | Mitigado | Sanitizer ativo + CASL + logs de auditoria |
| Crescimento do banco | Media | Arquivamento de portarias antigas (> 2 anos) |
