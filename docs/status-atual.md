# Status Atual do Projeto — SassGMN (ReviewAI)

> Última atualização: Junho 2026 — Fase 2 concluída  
> Finalidade: Referência técnica do estado atual para onboarding, planejamento e continuidade.

---

## 1. Arquitetura Atual

Sistema **SaaS** para gerenciamento e resposta automatizada de avaliações do Google Business Profile com IA (GPT-4).

### Topologia

```
Internet
   │
   ▼
nginx (:80/:443)  ──  TLS 1.2/1.3, rate limit, headers segurança
   ├──▶ frontend (Next.js :3000)   — App Router, SSR/RSC, TanStack Query
   └──▶ backend  (NestJS  :3001)   — REST API modular, Swagger /api/docs
              │
   ┌──────────┼─────────────────────────────────┐
   ▼          ▼                                 ▼
PostgreSQL  Redis :6379                  APIs Externas
:5432       (Bull queues)         Google Business + OpenAI + Sentry
```

### Fluxo principal

```
1. Login Google OAuth → backend emite JWT → /auth/callback → localStorage
2. CRON (6h) ou sync manual → fila Bull → processor busca avaliações via Google API
3. Usuário clica "Gerar resposta" → AiService → GPT-4 → DRAFT
4. MANUAL: usuário revisa → aprova → publica
   SEMI_AUTO: nota ≥ 4★ publica automaticamente | nota < 4★ aguarda revisão
   AUTO: gera + publica imediatamente para qualquer nota
5. GoogleService.postReply() → REST direto → Google Business Profile API v4
```

### Módulos do Backend

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | OAuth Google, emissão JWT, estratégias Passport |
| `UsersModule` | Perfil, audit log endpoint |
| `BusinessesModule` | CRUD de empresas, vinculação Google Profile |
| `ReviewsModule` | Listagem, sync via fila Bull, CRON scheduler (6h) |
| `ResponsesModule` | Generate / approve / reject / publish, modos de automação |
| `AiModule` | Integração OpenAI, prompt engineering por nota |
| `GoogleModule` | Google Business Profile API, refresh automático de tokens |
| `DashboardModule` | 12 queries paralelas para métricas reais |
| `AuditModule` | Log de ações — `@Global()`, injetável sem import explícito |

---

## 2. Funcionalidades Implementadas

### Autenticação e Segurança
- [x] Login exclusivo via Google OAuth 2.0
- [x] JWT backend + sessão NextAuth frontend (30 dias)
- [x] `validateEnv()` no bootstrap — encerra se variável obrigatória ausente
- [x] `helmet()` + CORS configurado
- [x] Rate limiting global via `@nestjs/throttler` (100 req/60s por IP)
- [x] Rate limiting específico no endpoint de IA (10 req/60s)
- [x] `compression()` para respostas gzip
- [x] Proteção de rotas: middleware frontend + `JwtAuthGuard` backend
- [x] Página `/auth/callback` captura JWT do backend após OAuth
- [x] nginx com TLS 1.2/1.3, headers de segurança, rate limiting por zona

### Gestão de Empresas
- [x] CRUD completo com verificação de ownership em todas as operações
- [x] Personalização por empresa: tom de voz, keywords, termos a evitar, template, WhatsApp, serviços
- [x] Três modos de automação: MANUAL, SEMI_AUTO, AUTO
- [x] **Tela guiada de vinculação Google Business Profile** — modal com lista de perfis, 3 estados (loading, erro, lista)
- [x] `POST /businesses/:id/connect-google` com auditoria

### Avaliações (Reviews)
- [x] Sincronização assíncrona via fila Bull + Redis
- [x] **CRON automático a cada 6h** (America/Sao_Paulo, configurável via `REVIEWS_SYNC_CRON`)
- [x] Deduplicação por `googleReviewId` e deduplicação de jobs na fila
- [x] Retry exponencial: 3 tentativas com backoff 5s → 10s → 20s
- [x] Listagem paginada com filtros (empresa, rating mín/máx, status, nome do avaliador)

### Respostas com IA
- [x] Geração via GPT-4 com prompt engineering completo por nota (1★–5★)
- [x] Contexto da empresa no prompt: nome, segmento, cidade, serviços, tom de voz, keywords, termos a evitar, template
- [x] Fluxo: DRAFT → APPROVED → PUBLISHED
- [x] **Modo SEMI_AUTO**: nota ≥ 4★ → publica automaticamente; nota < 4★ → revisão manual
- [x] **Modo AUTO**: gera + aprova + publica para qualquer nota
- [x] Error handling tipado da OpenAI (429 → `ServiceUnavailableException`; 401/503 → exceções específicas)
- [x] Publicação via `auth.request()` REST direto (Google Business API v4)
- [x] `findAll()` com JOIN direto via Prisma — sem N+1

### Dashboard e Métricas Reais
- [x] `GET /dashboard/stats` com **12 queries paralelas** via `Promise.all()`:
  - Totais: reviews, businesses, responses
  - Por status: pending, generated, published, rejected
  - Médias: rating médio (1 decimal), tempo médio de resposta em horas
  - Distribuição de notas 1–5★ (groupBy)
  - Últimos 7 dias: novos reviews + publicações
- [x] Dashboard frontend: 8 StatsCards + barra visual de distribuição de notas + ações rápidas

### Logs de Auditoria
- [x] `AuditService` global com 11 `AuditAction`s definidos
- [x] `log()` **fire-and-forget** (`void`) — nunca interrompe o fluxo principal
- [x] 11 pontos instrumentados: login, register, business CRUD, sync, generate, approve, reject, publish, connect-google
- [x] `GET /users/audit-log?limit=50` para o usuário consultar seu histórico

### Monitoramento — Sentry
- [x] Backend `@sentry/node`: reporta erros HTTP 5xx, ignora 4xx esperados
- [x] Frontend `@sentry/nextjs`: client / server / edge configs + Session Replay
- [x] `global-error.tsx` captura erros de renderização React
- [x] `instrumentation.ts` integrado com Next.js runtime hooks
- [x] Condicional — **no-op silencioso** se `SENTRY_DSN` não configurado

### Infraestrutura
- [x] **Dockerfiles multi-stage** para backend (Node 20 Alpine, usuário não-root) e frontend (standalone)
- [x] **`docker-compose.prod.yml`**: postgres → redis → migrate job → backend → frontend → nginx, com healthchecks e `depends_on`
- [x] **`nginx/nginx.conf`**: TLS 1.2/1.3, redirect HTTP→HTTPS, virtual hosts (app + api), rate limiting por zona, cache de assets Next.js
- [x] `nginx/generate-certs-dev.sh` para certificados autoassinados de desenvolvimento
- [x] Certificados TLS gitignored (`.pem`, `.crt`, `.key` em `nginx/ssl/`)

### Testes Unitários
- [x] **67 testes, 3 suítes, 0 falhas**
  - `ai.service.spec.ts` — 28 testes: constructor, geração, por nota, erros OpenAI
  - `responses.service.spec.ts` — 33 testes: generate/approve/reject/publish, SEMI_AUTO, AUTO
  - `audit.service.spec.ts` — 6 testes: log, best-effort, findByUser

---

## 3. Funcionalidades Pendentes

### Prioridade Alta

| # | Funcionalidade | Observação |
|---|---|---|
| 1 | **HTTPS em produção** | nginx configurado — depende de certificados reais (Let's Encrypt ou comprado) |
| 2 | **Criptografia dos tokens OAuth** | `google_tokens` armazena access/refresh em texto puro no banco |
| 3 | **Testes de integração** | Apenas testes unitários — sem cobertura E2E ou de integração |
| 4 | **Processor da fila `responses`** | Fila registrada no AppModule, sem `@Process` implementado |

### Prioridade Média

| # | Funcionalidade |
|---|---|
| 5 | Cache Redis para `GET /dashboard/stats` (TTL 5 min — evita 12 queries a cada acesso) |
| 6 | Lógica de planos (FREE/PRO/ENTERPRISE — enum existe, sem regras de negócio) |
| 7 | Notificações por email/WhatsApp para reviews negativos |
| 8 | Deleção de conta (botão na UI de settings, sem ação real no backend) |

### Prioridade Baixa

| # | Funcionalidade |
|---|---|
| 9 | Export de dados (CSV / PDF) |
| 10 | Webhooks Google para receber avaliações em tempo real |
| 11 | Analytics com gráficos históricos (recharts / chart.js) |
| 12 | Suporte a múltiplos idiomas nas respostas IA |
| 13 | Migrar Bull v4 legado para BullMQ moderno |

---

## 4. Banco de Dados

**SGBD:** PostgreSQL 15 · **ORM:** Prisma 5.8 · **Migrations:** 1 migration inicial (`20240101000000_init`)

### Modelos

| Model | Tabela | Descrição |
|---|---|---|
| `User` | `users` | Usuário autenticado — email (unique), plano, googleId (unique) |
| `Business` | `businesses` | Empresa — tom de voz, keywords, serviços, modo de automação |
| `Review` | `reviews` | Avaliação Google — nota 1-5, comentário, status de resposta |
| `Response` | `responses` | Resposta IA — texto gerado, publicado, status, publishedAt |
| `GoogleToken` | `google_tokens` | Tokens OAuth — access + refresh em texto puro ⚠️ |
| `AuditLog` | `audit_logs` | Log de ações — `details` como JSON serializado |

### Enums

| Enum | Valores |
|---|---|
| `Plan` | `FREE` · `PRO` · `ENTERPRISE` |
| `AutomationMode` | `MANUAL` · `SEMI_AUTO` · `AUTO` |
| `ReviewResponseStatus` | `PENDING` · `GENERATED` · `APPROVED` · `PUBLISHED` · `REJECTED` |
| `ResponseStatus` | `DRAFT` · `APPROVED` · `PUBLISHED` · `REJECTED` |

### Relacionamentos

```
User 1──N Business 1──N Review 1──N Response
User 1──N GoogleToken
User 1──N AuditLog

Todas as FKs com onDelete: Cascade
```

---

## 5. Integrações

### Google APIs

| API | Versão | Uso |
|---|---|---|
| `mybusinessaccountmanagement` | v1 | Listar contas Google Business |
| `mybusinessbusinessinformation` | v1 | Listar locais / perfis |
| Google Business Reviews (REST direto) | v4 | Buscar avaliações + publicar respostas via `auth.request()` |
| Google OAuth 2.0 | — | Autenticação + escopo `business.manage` |

> **Nota:** A API de reviews v4 não está disponível no googleapis bundle — o código usa `auth.request()` com chamadas REST diretas para `mybusiness.googleapis.com/v4`. Funciona, mas pode necessitar atualização quando o Google publicar v1 de Reviews.

### OpenAI API

| Parâmetro | Valor |
|---|---|
| SDK | `openai` v4.24 |
| Endpoint | Chat Completions |
| Modelo padrão | `gpt-4` (configurável via `OPENAI_MODEL`) |
| Temperature | `0.8` — respostas criativas mas controladas |
| Max tokens | `500` |
| Error handling | 429 → `ServiceUnavailableException` · 401 → `InternalServerErrorException` · 503 → `ServiceUnavailableException` |

### Redis / Bull (Filas)

| Fila | Processor | Jobs | Retry |
|---|---|---|---|
| `reviews-sync` | `ReviewsSyncProcessor` | `sync-reviews` | 3× exponencial (5s→10s→20s) |
| `responses` | ❌ Sem processor | — | — |

### Sentry (Monitoramento)

| Camada | SDK | O que captura |
|---|---|---|
| Backend | `@sentry/node` | Erros HTTP 5xx com contexto (url, method, status) |
| Frontend browser | `@sentry/nextjs` | Erros JS, Session Replay (10% / 100% on error) |
| Frontend SSR/RSC | `@sentry/nextjs` | Erros de Server Components e Route Handlers |
| Frontend Edge | `@sentry/nextjs` | Erros de middleware |

---

## 6. Últimos Commits

| Hash | Mensagem | Etapa |
|---|---|---|
| `b1c4aa5` | `chore(deps): registra dependências Sentry nos package.json` | Fase 2 — finalização |
| `5066a0f` | `docs: Etapa 9 — README e docs/status-atual.md atualizados para Fase 2` | Etapa 9 |
| `92f32be` | `feat(sentry): Etapa 8 — monitoramento de erros com Sentry` | Etapa 8 |
| `8505fa9` | `test(unit): Etapa 7 — testes unitários (67 testes, 0 falhas)` | Etapa 7 |
| `ecb221d` | `feat(google-connect): Etapa 6 — tela guiada para vincular Perfil Google` | Etapa 6 |
| `fe0f983` | `feat(dashboard): Etapa 5 — endpoint de métricas reais + dashboard atualizado` | Etapa 5 |
| `a2650c8` | `feat(audit): Etapa 4 — logs de auditoria implementados` | Etapa 4 |
| `cd805fd` | `feat(cron): Etapa 3 — sincronização automática a cada 6h` | Etapa 3 |
| `a7f47db` | `feat(nginx): Etapa 2 — configuração nginx com HTTPS` | Etapa 2 |
| `78a43a6` | `feat(docker): Etapa 1 — Dockerfiles multi-stage` | Etapa 1 |
| `8fa34f2` | `feat: Fase 1 — MVP funcional` | Fase 1 |
| `55feea5` | `fix: corrige erros de tipo no build do frontend` | Fase 1 |
| `ac64935` | `docs: adiciona documentação de status atual do projeto` | Inicial |
| `248bdd1` | `feat: scaffold complete Google Reviews AI system` | Scaffold |

---

## 7. Próximos Passos

### Imediatos — Para ativar em produção hoje

```bash
# 1. Preencher variáveis obrigatórias
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Editar com: DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID,
#             GOOGLE_CLIENT_SECRET, OPENAI_API_KEY, NEXTAUTH_SECRET

# 2. Gerar certificados (dev: autoassinados | prod: Let's Encrypt)
chmod +x nginx/generate-certs-dev.sh && ./nginx/generate-certs-dev.sh

# 3. Subir tudo
docker-compose -f docker-compose.prod.yml up -d --build

# Alternativa desenvolvimento local:
docker-compose up -d          # sobe apenas postgres + redis
cd backend && npx prisma migrate deploy
npm run dev:backend            # porta 3001
npm run dev:frontend           # porta 3000
```

### Fase 3 — Qualidade Avançada (próxima sprint)

| Prioridade | Tarefa |
|---|---|
| 🔴 Alta | Criptografar tokens OAuth no banco (`google_tokens`) |
| 🔴 Alta | Configurar certificados TLS reais (Let's Encrypt) em produção |
| 🟡 Média | Cache Redis para `GET /dashboard/stats` (TTL 5 min) |
| 🟡 Média | Testes de integração — fluxo OAuth E2E, sync Bull com Redis real |
| 🟡 Média | Logger estruturado JSON (Winston / Pino) para observabilidade |
| 🟡 Média | Processor da fila `responses` |
| 🟠 Baixa | Métricas de performance com Prometheus / Grafana |

### Fase 4 — Evolução de Produto

| Prioridade | Funcionalidade |
|---|---|
| 🟡 Alta | Lógica de planos — limites por tier FREE / PRO / ENTERPRISE |
| 🟡 Média | Notificações email / WhatsApp para reviews negativos |
| 🟠 Média | Analytics com gráficos históricos (recharts) |
| 🟠 Baixa | Export de relatórios CSV / PDF |
| 🟠 Baixa | Webhooks Google para avaliações em tempo real |
| 🟠 Baixa | Suporte a múltiplos idiomas nas respostas IA |

---

## Estado de Build e Testes

| Validação | Resultado | Data |
|---|---|---|
| `tsc --noEmit` (backend) | ✅ 0 erros | Junho 2026 |
| `next build` (frontend) | ✅ 11 rotas, 0 erros | Junho 2026 |
| `jest` (67 testes) | ✅ 67 passou, 0 falhas | Junho 2026 |
| `nest build` | ✅ OK | Junho 2026 |
| `prisma validate` | ✅ Schema válido | Junho 2026 |

---

*Última atualização: Junho 2026 — Fase 2 concluída — commit `b1c4aa5`*
