# Status Atual do Projeto — SassGMN (ReviewAI)

> Documento gerado em: Junho 2026  
> Finalidade: Mapeamento técnico completo do estado atual da aplicação para guiar as próximas fases de desenvolvimento.

---

## 1. Arquitetura Atual

O projeto é uma aplicação **SaaS para gerenciamento e resposta automatizada de avaliações do Google Business Profile**, utilizando IA para gerar respostas personalizadas por empresa.

### Topologia

```
Browser (Next.js :3000) ──HTTP/REST──▶ NestJS API (:3001)
                                              │
                  ┌───────────────────────────┼──────────────────────┐
                  ▼                           ▼                      ▼
          PostgreSQL :5432            Redis :6379            APIs Externas
          (Prisma ORM)               (Bull Queues)     Google Business + OpenAI
```

### Padrão Arquitetural

- **Frontend:** Next.js 14 App Router, desacoplado, consome API REST via Axios
- **Backend:** NestJS com arquitetura modular (um módulo por domínio)
- **Comunicação:** REST com envelope padronizado `{ data, statusCode, timestamp }`
- **Autenticação:** Google OAuth 2.0 (frontend via NextAuth + backend via Passport)
- **Filas:** Bull + Redis para processamento assíncrono de sincronização de avaliações
- **Infra:** Docker Compose sobe apenas PostgreSQL e Redis (sem containers de aplicação)

### Fluxo Principal

```
1. Login via Google OAuth 2.0
2. Sincronização de avaliações do Google Business Profile (via fila Bull)
3. Geração de resposta personalizada via GPT-4
4. Aprovação manual ou automática (conforme modo configurado)
5. Publicação da resposta diretamente no perfil do Google
```

---

## 2. Funcionalidades Implementadas

### Autenticação e Usuários
- [x] Login exclusivo via Google OAuth 2.0
- [x] JWT gerado pelo backend após autenticação OAuth
- [x] Refresh automático de tokens Google expirados
- [x] Sessão persistente via NextAuth (30 dias)
- [x] Proteção de rotas via middleware (frontend) e JwtAuthGuard (backend)
- [x] Decorators `@Public()` e `@CurrentUser()` no backend

### Gestão de Empresas
- [x] CRUD completo (criar, listar, editar, deletar)
- [x] Personalização por empresa: tom de voz, palavras-chave, termos a evitar, template de resposta, WhatsApp, serviços, segmento, cidade
- [x] Três modos de automação: MANUAL, SEMI_AUTO, AUTO
- [x] Soft delete via campo `isActive`
- [x] Verificação de propriedade em todas as operações (`ForbiddenException`)

### Avaliações (Reviews)
- [x] Sincronização assíncrona de avaliações via fila Bull + Redis
- [x] Deduplicação por `googleReviewId`
- [x] Listagem paginada com filtros (empresa, rating mín/máx, status, nome do avaliador)
- [x] Atualização manual de status da avaliação

### Respostas com IA (Responses)
- [x] Geração de respostas via GPT-4 com prompt engineering completo por nota (1★ a 5★)
- [x] Fluxo completo: DRAFT → APPROVED → PUBLISHED
- [x] Edição manual da resposta antes de publicar
- [x] Rejeição com reversão de status
- [x] Publicação direta no Google Business Profile via API
- [x] Modo AUTO: gera + aprova + publica automaticamente
- [x] Histórico paginado de todas as respostas

### Google Business Profile
- [x] Listagem de perfis/locais vinculados
- [x] Armazenamento de tokens OAuth no banco (access + refresh)

### Frontend / Dashboard
- [x] Dashboard com métricas (total de reviews, pendentes, publicadas, empresas)
- [x] Design system próprio com 14 componentes base (Button, Badge, Card, Input, Select, Modal, Spinner, StarRating, etc.)
- [x] Toggle visual de modo de automação
- [x] Editor de resposta com suporte a regeneração
- [x] Filtros e paginação na listagem de avaliações

### Infraestrutura e API
- [x] Swagger disponível em `/api/docs` com BearerAuth
- [x] Global exception filter com padronização de erros `{ statusCode, timestamp, path, message }`
- [x] Response transform interceptor `{ data, statusCode, timestamp }`
- [x] Configuração tipada em 6 namespaces: `app`, `database`, `google`, `jwt`, `openai`, `redis`
- [x] Docker Compose para PostgreSQL 15 e Redis 7 com healthchecks

---

## 3. Funcionalidades Pendentes

### Prioridade Alta — Bloqueiam uso em produção

| # | Funcionalidade | Observação |
|---|---|---|
| 1 | **Modo SEMI_AUTO** | Definido no schema e na UI, mas a lógica condicional não existe no `ResponsesService` — comporta-se igual ao MANUAL |
| 2 | **AuditLog** | Tabela e model existem no banco, nenhuma ação é registrada em qualquer service |
| 3 | **Testes automatizados** | Jest configurado, scripts no `package.json`, zero arquivos `.spec.ts` em todo o projeto |
| 4 | **Dockerfiles de aplicação** | Docker Compose sobe apenas infra — não é possível containerizar os apps para produção |
| 5 | **Rate limiting na API** | Endpoint `/responses/generate` pode ser chamado ilimitadamente, gerando custo descontrolado na OpenAI |

### Prioridade Média — Limitam o produto

| # | Funcionalidade |
|---|---|
| 6 | Sincronização automática periódica via CRON (`ScheduleModule` importado sem nenhum `@Cron`) |
| 7 | Endpoint `/google/connect/:businessId` documentado no README mas não implementado |
| 8 | Lógica de planos (FREE/PRO/ENTERPRISE definidos no schema, sem regras de negócio) |
| 9 | Processor da fila `responses` (registrada no módulo, sem implementação) |
| 10 | Endpoint de stats reais para o dashboard (métricas calculadas no backend) |
| 11 | Criptografia dos tokens OAuth armazenados no banco |

### Prioridade Baixa — Melhorias de produto

| # | Funcionalidade |
|---|---|
| 12 | Notificações (UI de settings existe, sem backend) |
| 13 | Deleção de conta (botão na UI, sem ação real) |
| 14 | Export de dados (CSV / relatórios) |
| 15 | Webhooks do Google para avaliações em tempo real |
| 16 | Analytics com gráficos (rating médio, tempo de resposta, volume por período) |

---

## 4. Banco de Dados

**SGBD:** PostgreSQL 15 · **ORM:** Prisma 5.8 · **Migrations:** 1 migration inicial (`20240101000000_init`)

### Modelos

| Model | Tabela | Descrição |
|---|---|---|
| `User` | `users` | Usuário autenticado (email único, plano, googleId) |
| `Business` | `businesses` | Empresa/perfil com configurações de personalização de IA |
| `Review` | `reviews` | Avaliação do Google (nota 1-5, comentário, status de resposta) |
| `Response` | `responses` | Resposta gerada pela IA (texto gerado, publicado, status, data de publicação) |
| `GoogleToken` | `google_tokens` | Tokens OAuth do Google por usuário (access + refresh) |
| `AuditLog` | `audit_logs` | Log de ações — **schema existe, nunca é gravado** |

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
```

Todas as FKs com `onDelete: Cascade`.

---

## 5. APIs Utilizadas

### Google APIs

| API | Versão | Uso |
|---|---|---|
| `mybusinessaccountmanagement` | v1 | Listar contas Google Business |
| `mybusinessbusinessinformation` | v1 | Listar locais/perfis |
| `mybusiness` (**legado**) | **v4** ⚠️ | Buscar avaliações + publicar respostas |
| Google OAuth 2.0 | — | Autenticação de usuários + permissão `business.manage` |

> ⚠️ **Atenção crítica:** A API `mybusiness v4` está **deprecada pelo Google**. O código atual usa `(google as any)` para contornar a falta de suporte no SDK oficial, indicando risco de quebra iminente.

### OpenAI API

| Parâmetro | Valor |
|---|---|
| SDK | openai v4.24 |
| Endpoint | Chat Completions |
| Modelo padrão | `gpt-4` (configurável via env `OPENAI_MODEL`) |
| Temperature | `0.8` |
| Max tokens | `500` |
| Prompt | Sistema completo com contexto da empresa + regras por nota (1★–5★) |

### Endpoints da API Interna (NestJS)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/auth/google` | Inicia OAuth Google |
| GET | `/auth/google/callback` | Callback OAuth → emite JWT → redireciona |
| GET | `/auth/me` | Usuário autenticado |
| GET | `/users/me` | Perfil do usuário |
| PATCH | `/users/me` | Atualizar nome |
| POST | `/businesses` | Criar empresa |
| GET | `/businesses` | Listar empresas (paginado) |
| GET | `/businesses/:id` | Detalhe da empresa |
| PATCH | `/businesses/:id` | Atualizar empresa |
| DELETE | `/businesses/:id` | Remover empresa |
| GET | `/reviews` | Listar avaliações (filtros + paginação) |
| GET | `/reviews/:id` | Detalhe da avaliação |
| POST | `/reviews/sync/:businessId` | Enfileirar sync de avaliações do Google |
| PATCH | `/reviews/:id/status` | Atualizar status da avaliação |
| GET | `/responses` | Histórico de respostas (paginado) |
| GET | `/responses/review/:reviewId` | Respostas de uma avaliação |
| POST | `/responses/generate/:reviewId` | Gerar resposta com IA |
| PATCH | `/responses/:id/approve` | Aprovar resposta |
| PATCH | `/responses/:id/reject` | Rejeitar resposta |
| POST | `/responses/:id/publish` | Publicar no Google |
| GET | `/google/profiles` | Listar perfis Google Business |

---

## 6. Riscos Identificados

### Riscos Críticos

| Risco | Impacto | Probabilidade |
|---|---|---|
| API Google Business v4 deprecada | Quebra total de sync e publicação sem aviso | **Alta** |
| Sem rate limiting no endpoint de IA | Fatura OpenAI irrestrita em produção | **Alta** |
| Zero testes automatizados | Regressões invisíveis a cada mudança | **Alta** |
| JWT secret com fallback hardcoded | Comprometimento de todas as sessões sem `.env` | **Média** |
| Sem HTTPS configurado | Tokens JWT expostos em tráfego de rede | **Alta** em produção |

### Riscos Médios

| Risco | Impacto |
|---|---|
| Tokens OAuth armazenados em texto puro no banco | Vazamento total se o banco for comprometido |
| Dupla autenticação OAuth independente (NextAuth + Passport) | Confusão de tokens, complexidade de debug |
| Query N+1 em `ResponsesService.findAll()` | Degradação de performance em escala |
| Fila Bull sem configuração de retry/backoff | Falhas silenciosas na sincronização |
| Sem monitoramento de erros (Sentry/similar) | Erros em produção invisíveis |

### Riscos Baixos

| Risco |
|---|
| `ScheduleModule` importado sem uso — overhead desnecessário |
| Bull v4 legado em vez de BullMQ moderno |
| Sem `helmet` nem `compression` no bootstrap do NestJS |
| `getSession()` chamado a cada requisição Axios no frontend |

---

## 7. Próximas Fases de Desenvolvimento

### Fase 1 — Estabilização e Segurança
*Pré-requisito para qualquer deploy em produção.*

- [ ] Migrar API Google de v4 legada para `mybusinessreviews v1`
- [ ] Implementar lógica do modo SEMI_AUTO em `ResponsesService`
- [ ] Instalar `@nestjs/throttler` e limitar endpoint de geração de IA
- [ ] Remover JWT secret hardcoded; validar variáveis de ambiente obrigatórias no bootstrap
- [ ] Criar Dockerfiles otimizados para backend e frontend
- [ ] Adicionar `helmet` e `compression` no `main.ts`

### Fase 2 — Funcionalidades Críticas Faltantes
*Completa o produto conforme documentado no README.*

- [ ] Implementar gravação de AuditLog nas ações: login, generate, approve, reject, publish
- [ ] Criar CRON de sincronização automática de avaliações a cada 6h
- [ ] Implementar endpoint `/google/connect/:businessId` para vinculação guiada
- [ ] Criar endpoint `/dashboard/stats` com métricas reais calculadas no banco
- [ ] Criptografar tokens OAuth armazenados em `google_tokens`
- [ ] Implementar processor da fila `responses`

### Fase 3 — Qualidade e Observabilidade
*Sustentabilidade técnica do projeto.*

- [ ] Escrever testes unitários para `AiService`, `ResponsesService`, `AuthService`
- [ ] Escrever testes de integração para os fluxos OAuth e geração/publicação
- [ ] Integrar Sentry para rastreamento de erros em produção
- [ ] Configurar logger estruturado (Winston ou Pino)
- [ ] Corrigir N+1 em `ResponsesService.findAll()` com JOIN direto no Prisma
- [ ] Configurar retry com backoff exponencial nas filas Bull

### Fase 4 — Evolução de Produto
*Diferenciação e crescimento.*

- [ ] Implementar lógica de planos (limites por tier FREE/PRO/ENTERPRISE)
- [ ] Notificações por email/WhatsApp para reviews negativos
- [ ] Dashboard de analytics com gráficos (rating médio, volume, tempo de resposta)
- [ ] Export de relatórios em CSV/PDF
- [ ] Webhooks do Google para receber novas avaliações em tempo real
- [ ] Suporte a múltiplos idiomas nas respostas geradas pela IA

---

*Última atualização: Junho 2026*
