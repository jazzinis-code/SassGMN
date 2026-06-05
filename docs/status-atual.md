# Status Atual do Projeto — SassGMN (ReviewAI)

> Última atualização: Junho 2026 — Fase 2 concluída
> Finalidade: Referência técnica do estado atual para onboarding, planejamento e continuidade.

---

## 1. Arquitetura Atual

Aplicação **SaaS** para gerenciamento e resposta automatizada de avaliações do Google Business Profile com IA.

### Topologia de Produção

```
Internet
   │
   ▼
nginx (:80/:443)  ─── TLS 1.2/1.3, rate limit, headers segurança
   ├──▶ frontend (Next.js :3000)   — App Router, SSR/RSC
   └──▶ backend  (NestJS  :3001)   — REST API, Swagger /api/docs
              │
   ┌──────────┼─────────────────────────────────┐
   ▼          ▼                                 ▼
PostgreSQL  Redis :6379                  APIs Externas
:5432       (Bull queues)         Google Business + OpenAI + Sentry
```

### Padrão Arquitetural

| Camada | Padrão |
|---|---|
| Frontend | Next.js App Router, React Server Components, TanStack Query |
| Backend | NestJS modular (1 módulo por domínio), global guards/filters/interceptors |
| Comunicação | REST, envelope `{ data, statusCode, timestamp }` |
| Autenticação | Google OAuth → backend emite JWT → frontend armazena em localStorage |
| Filas | Bull + Redis, retry exponencial (3x: 5s → 10s → 20s) |
| Agendamento | @nestjs/schedule com CRON a cada 6h (America/Sao_Paulo) |
| Monitoramento | Sentry (backend: 5xx, frontend: React + browser) |

### Módulos do Backend

| Módulo | Responsabilidade |
|---|---|
| `AuthModule` | OAuth Google, emissão JWT, estratégias Passport |
| `UsersModule` | Perfil do usuário, audit log endpoint |
| `BusinessesModule` | CRUD de empresas, vinculação Google Profile |
| `ReviewsModule` | Listagem, sync Bull, CRON scheduler |
| `ResponsesModule` | Generate/approve/reject/publish, modos de automação |
| `AiModule` | Integração OpenAI, prompt engineering |
| `GoogleModule` | Google Business Profile API, token refresh |
| `DashboardModule` | Métricas reais — 12 queries paralelas |
| `AuditModule` | Log de ações (@Global — injetável em qualquer módulo) |

---

## 2. Funcionalidades Implementadas

### Autenticação e Segurança
- [x] Login via Google OAuth 2.0 com refresh automático de tokens
- [x] JWT backend + sessão NextAuth frontend (30 dias)
- [x] `validateEnv()` no bootstrap — falha rápida se var obrigatória ausente
- [x] `helmet()` + CORS configurado no NestJS
- [x] Rate limiting global via `@nestjs/throttler` (100 req/60s por IP)
- [x] Rate limiting específico no endpoint de IA (10 req/60s)
- [x] `compression()` para respostas gzip
- [x] Proteção de rotas: middleware frontend + JwtAuthGuard backend
- [x] Nginx com TLS 1.2/1.3, headers de segurança, rate limiting por zona

### Gestão de Empresas
- [x] CRUD completo com verificação de ownership
- [x] Personalização completa: tom de voz, keywords, termos a evitar, template, WhatsApp, serviços
- [x] Três modos de automação: MANUAL, SEMI_AUTO, AUTO
- [x] **Tela guiada de vinculação do Google Business Profile** (modal com lista de perfis, 3 estados)
- [x] `POST /businesses/:id/connect-google` com auditoria

### Avaliações (Reviews)
- [x] Sincronização assíncrona via fila Bull + Redis
- [x] **CRON automático a cada 6h** (America/Sao_Paulo, configurável via env)
- [x] Deduplicação por `googleReviewId`
- [x] Retry exponencial na fila (3 tentativas: 5s → 10s → 20s)
- [x] Deduplicação de jobs na fila (evita sync duplo)
- [x] Listagem paginada com filtros (empresa, rating, status, nome)

### Respostas com IA
- [x] Geração via GPT-4 com prompt engineering por nota (1★–5★)
- [x] Contexto completo da empresa no prompt (nome, segmento, cidade, serviços, tom de voz)
- [x] Fluxo: DRAFT → APPROVED → PUBLISHED
- [x] **Modo SEMI_AUTO implementado**: nota ≥ 4★ → auto-publica; nota < 4★ → revisão manual
- [x] Modo AUTO: gera + aprova + publica para qualquer nota
- [x] Error handling tipado da OpenAI (429/401/503 → exceções específicas)
- [x] Publicação REST direto via `auth.request()` (Google Business API v4)
- [x] Histórico paginado via JOIN direto (sem N+1)

### Dashboard e Métricas
- [x] **Endpoint `/dashboard/stats` com 12 queries paralelas**:
  - Totais: reviews, businesses, responses
  - Por status: pending, generated, published, rejected
  - Médias: rating médio, tempo médio de resposta (horas)
  - Distribuição de notas 1–5★ (groupBy)
  - Últimos 7 dias: novos reviews + publicações
- [x] Frontend dashboard reescrito com 8 StatsCards + barra de distribuição de notas

### Logs de Auditoria
- [x] `AuditService` global com 11 `AuditAction`s
- [x] `log()` best-effort — nunca interrompe o fluxo principal (void fire-and-forget)
- [x] Instrumentado em: login, register, business CRUD, sync, generate, approve, reject, publish, connect-google
- [x] Endpoint `GET /users/audit-log?limit=50` para consulta pelo usuário

### Monitoramento (Sentry)
- [x] Backend `@sentry/node`: reporta erros 5xx, ignora 4xx esperados
- [x] Frontend `@sentry/nextjs`: client/server/edge configs, Session Replay
- [x] `global-error.tsx` captura erros de renderização React
- [x] `instrumentation.ts` integra com Next.js runtime hooks
- [x] Condicional — no-op se `SENTRY_DSN` não configurado

### Infraestrutura
- [x] **Dockerfiles multi-stage** para backend (Node 20, usuário não-root) e frontend (standalone)
- [x] **docker-compose.prod.yml** com migrate job, healthchecks, depends_on
- [x] **nginx.conf** com TLS 1.2/1.3, redirect HTTP→HTTPS, rate limiting por zona, cache de assets
- [x] `nginx/generate-certs-dev.sh` para certificados autoassinados de desenvolvimento
- [x] Certificados gitignored (`.pem`, `.crt`, `.key`)

### Testes
- [x] **67 testes passando, 0 falhas**, 3 suítes:
  - `ai.service.spec.ts`: 28 testes — constructor, geração, por nota, erros HTTP OpenAI
  - `responses.service.spec.ts`: 33 testes — generate/approve/reject/publish, SEMI_AUTO, AUTO
  - `audit.service.spec.ts`: 6 testes — log, best-effort, findByUser

---

## 3. Funcionalidades Pendentes

### Prioridade Alta

| # | Funcionalidade | Observação |
|---|---|---|
| 1 | **HTTPS em produção** | nginx configurado, mas depende de certificados reais (Let's Encrypt ou comprado) |
| 2 | **Criptografia dos tokens OAuth** | `google_tokens` armazena access/refresh em texto puro no banco |
| 3 | **Testes de integração** | Somente testes unitários — sem testes E2E ou de integração |
| 4 | **Fila `responses` sem processor** | Registrada no módulo, sem implementação do `@Process` |

### Prioridade Média

| # | Funcionalidade |
|---|---|
| 5 | Lógica de planos (FREE/PRO/ENTERPRISE definidos, sem regras de negócio) |
| 6 | Notificações por email/WhatsApp para reviews negativos |
| 7 | Deleção de conta (botão na UI, sem ação real no backend) |
| 8 | Endpoint `/dashboard/stats` com cache Redis (evitar 12 queries a cada acesso) |

### Prioridade Baixa

| # | Funcionalidade |
|---|---|
| 9 | Export de dados (CSV / PDF) |
| 10 | Webhooks Google para avaliações em tempo real |
| 11 | Analytics com gráficos históricos (recharts/chart.js) |
| 12 | Suporte a múltiplos idiomas nas respostas IA |
| 13 | Migrar Bull v4 para BullMQ (mais moderno) |

---

## 4. Banco de Dados

**PostgreSQL 15** via **Prisma 5.8** · 1 migration inicial (`20240101000000_init`)

### Modelos

| Model | Tabela | Descrição |
|---|---|---|
| `User` | `users` | Usuário autenticado (email único, plano, googleId) |
| `Business` | `businesses` | Empresa com configurações de personalização da IA |
| `Review` | `reviews` | Avaliação Google (nota 1-5, comentário, status) |
| `Response` | `responses` | Resposta IA (texto gerado, publicado, status, publishedAt) |
| `GoogleToken` | `google_tokens` | Tokens OAuth Google por usuário (texto puro — ver pendência #2) |
| `AuditLog` | `audit_logs` | Log de ações com JSON serializado em `details` |

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
(todas as FKs com onDelete: Cascade)
```

---

## 5. APIs Utilizadas

### Google APIs

| API | Versão | Uso |
|---|---|---|
| `mybusinessaccountmanagement` | v1 | Listar contas Google Business |
| `mybusinessbusinessinformation` | v1 | Listar locais/perfis |
| Google Business Reviews (REST direto) | v4 | Buscar avaliações + publicar respostas via `auth.request()` |
| Google OAuth 2.0 | — | Autenticação + escopo `business.manage` |

> **Nota:** A API de reviews v4 não está disponível no googleapis bundle — o código usa `auth.request()` com chamadas REST diretas para `mybusiness.googleapis.com/v4`. Isso funciona mas pode precisar de atualização quando o Google migrar para v1 Reviews.

### OpenAI API

| Parâmetro | Valor |
|---|---|
| SDK | `openai` v4.24 |
| Endpoint | Chat Completions |
| Modelo padrão | `gpt-4` (configurável via `OPENAI_MODEL`) |
| Temperature | `0.8` |
| Max tokens | `500` |
| Error handling | 429 → `ServiceUnavailableException`; 401 → `InternalServerErrorException`; 503 → `ServiceUnavailableException` |

### Endpoints Internos

| Método | Rota | Auth | Rate Limit |
|---|---|---|---|
| GET | `/auth/google` | Public | — |
| GET | `/auth/google/callback` | Public | — |
| GET | `/auth/me` | JWT | 100/60s |
| GET | `/users/me` | JWT | 100/60s |
| PATCH | `/users/me` | JWT | 100/60s |
| GET | `/users/audit-log` | JWT | 100/60s |
| POST | `/businesses` | JWT | 100/60s |
| GET | `/businesses` | JWT | 100/60s |
| GET | `/businesses/:id` | JWT | 100/60s |
| PATCH | `/businesses/:id` | JWT | 100/60s |
| DELETE | `/businesses/:id` | JWT | 100/60s |
| POST | `/businesses/:id/connect-google` | JWT | 100/60s |
| GET | `/reviews` | JWT | 100/60s |
| GET | `/reviews/:id` | JWT | 100/60s |
| POST | `/reviews/sync/:businessId` | JWT | 100/60s |
| PATCH | `/reviews/:id/status` | JWT | 100/60s |
| GET | `/responses` | JWT | 100/60s |
| GET | `/responses/review/:reviewId` | JWT | 100/60s |
| POST | `/responses/generate/:reviewId` | JWT | **10/60s** |
| PATCH | `/responses/:id/approve` | JWT | 100/60s |
| PATCH | `/responses/:id/reject` | JWT | 100/60s |
| POST | `/responses/:id/publish` | JWT | 100/60s |
| GET | `/google/profiles` | JWT | 100/60s |
| GET | `/dashboard/stats` | JWT | 100/60s |

---

## 6. Riscos Identificados

### Riscos Ativos (ainda existem)

| Risco | Impacto | Mitigação Atual |
|---|---|---|
| Tokens OAuth em texto puro no banco | Alto — vazamento se banco comprometido | Nenhuma — pendência #2 |
| API Google Reviews v4 (REST direto) | Médio — pode ser descontinuada | Uso de `auth.request()` é resiliente |
| Sem testes de integração | Médio — regressões em fluxos E2E | 67 testes unitários cobrem lógica de negócio |
| Fila `responses` sem processor | Baixo — registrada mas não usada | Não impacta fluxo atual |

### Riscos Resolvidos na Fase 1 e Fase 2

| Risco | Como foi resolvido |
|---|---|
| JWT secret hardcoded | `validateEnv()` no bootstrap, sem fallback |
| Sem rate limiting | `@nestjs/throttler` global + específico em `/generate` |
| Sem headers de segurança | `helmet()` + nginx headers |
| API Google SDK deprecada | Migrado para `auth.request()` REST direto |
| SEMI_AUTO não funcionava | Implementado: nota ≥ 4★ auto-publica |
| AuditLog nunca gravado | 11 pontos de instrumentação, best-effort |
| Sem monitoramento | Sentry backend (5xx) + frontend (React + browser) |
| Sem testes | 67 testes unitários cobrindo os serviços críticos |
| Sem Dockerfiles | Multi-stage para backend e frontend + docker-compose.prod.yml |
| Sem HTTPS configurado | nginx com TLS 1.2/1.3 + geração de certs de desenvolvimento |
| CRON ausente | `ReviewsSchedulerService` a cada 6h, deduplicação de jobs |
| Dashboard com dados falsos | `GET /dashboard/stats` com 12 queries paralelas |
| Sem vinculação guiada Google | `GoogleProfilePicker` + `POST /businesses/:id/connect-google` |
| N+1 em `ResponsesService.findAll` | JOIN direto via Prisma nested `where` |
| `getSession()` a cada request | `localStorage` token com interceptor síncrono |
| Página `/auth/callback` inexistente | Criada com `Suspense` boundary correto |

---

## 7. Fases de Desenvolvimento

### Fase 1 — Estabilização ✅ Concluída

Commits: `55feea5` → `8fa34f2`

- [x] Migrar Google Business API de v4 SDK para REST direto
- [x] Implementar SEMI_AUTO em `ResponsesService`
- [x] Rate limiting com `@nestjs/throttler`
- [x] JWT secret sem fallback, `validateEnv()` no bootstrap
- [x] Helmet + compression no `main.ts`
- [x] Página `/auth/callback` criada
- [x] `api.ts` com localStorage token (remove `getSession()` assíncrono)
- [x] Correção de tipos TypeScript (`AutomationMode` enum, `next-auth.d.ts`)

### Fase 2 — Produção ✅ Concluída

Commits: `78a43a6` → `92f32be`

- [x] **Etapa 1**: Dockerfiles multi-stage + `docker-compose.prod.yml`
- [x] **Etapa 2**: nginx com TLS 1.2/1.3, HTTPS, rate limiting, headers
- [x] **Etapa 3**: `ReviewsSchedulerService` com CRON a cada 6h
- [x] **Etapa 4**: `AuditModule` global, 11 AuditActions, 11 pontos instrumentados
- [x] **Etapa 5**: `GET /dashboard/stats` com 12 queries paralelas + dashboard frontend
- [x] **Etapa 6**: `GoogleProfilePicker` modal + `POST /businesses/:id/connect-google`
- [x] **Etapa 7**: 67 testes unitários (AiService 28, ResponsesService 33, AuditService 6)
- [x] **Etapa 8**: Sentry backend (@sentry/node) + frontend (@sentry/nextjs)

### Fase 3 — Qualidade Avançada (Próxima)

- [ ] Criptografar tokens OAuth no banco (`google_tokens`)
- [ ] Cache Redis para `/dashboard/stats` (TTL 5 min)
- [ ] Testes de integração (fluxo OAuth E2E, sync Bull)
- [ ] Processor da fila `responses`
- [ ] Logger estruturado (Winston com JSON)
- [ ] Métricas de performance (Prometheus/Grafana)

### Fase 4 — Evolução de Produto

- [ ] Lógica de planos (FREE/PRO/ENTERPRISE com limites)
- [ ] Notificações email/WhatsApp para reviews negativos
- [ ] Analytics com gráficos históricos
- [ ] Export CSV/PDF de relatórios
- [ ] Webhooks Google para avaliações em tempo real
- [ ] Multi-idioma nas respostas IA

---

*Última atualização: Junho 2026 — Fase 2 concluída*
