# ReviewAI — Gerenciamento Inteligente de Avaliações Google

Sistema SaaS para gerenciamento e resposta automatizada de avaliações do Google Business Profile utilizando IA. Gera respostas personalizadas por empresa, publica diretamente no Google e se adapta ao volume com três modos de automação.

---

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Configuração do Google Cloud](#configuração-do-google-cloud)
- [Configuração da OpenAI](#configuração-da-openai)
- [Deploy em Produção](#deploy-em-produção)
- [Documentação da API](#documentação-da-api)
- [Banco de Dados](#banco-de-dados)
- [Modos de Automação](#modos-de-automação)
- [Monitoramento](#monitoramento)
- [Testes](#testes)
- [Contribuindo](#contribuindo)

---

## Sobre o Projeto

Empresas no Google Business Profile recebem avaliações diariamente. Responder cada uma de forma personalizada, rápida e profissional é essencial — mas consome tempo. O **ReviewAI** automatiza esse processo:

- Sincroniza avaliações automaticamente a cada 6 horas via agendamento (CRON)
- Gera respostas com GPT-4 usando o contexto da empresa (tom de voz, serviços, palavras-chave)
- Publica diretamente no Google Business Profile
- Oferece três modos de operação: revisão manual, semiautomático ou totalmente automático

---

## Funcionalidades

| Funcionalidade | Status |
|---|---|
| Login via Google OAuth 2.0 | ✅ |
| Multi-empresas (gerenciar vários perfis) | ✅ |
| Vinculação guiada do Google Business Profile | ✅ |
| Sincronização automática de avaliações (CRON 6h) | ✅ |
| Geração de respostas com GPT-4 | ✅ |
| Modos MANUAL, SEMI_AUTO e AUTO | ✅ |
| Aprovação / edição / rejeição de respostas | ✅ |
| Publicação direta no Google | ✅ |
| Dashboard com métricas reais | ✅ |
| Logs de auditoria por ação | ✅ |
| Rate limiting na API | ✅ |
| Monitoramento de erros com Sentry | ✅ |
| Testes unitários (67 testes) | ✅ |
| Deploy com Docker + nginx + HTTPS | ✅ |

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10 + TypeScript |
| Frontend | Next.js 14 (App Router) + TypeScript |
| Banco de Dados | PostgreSQL 15 via Prisma 5 |
| Cache / Filas | Redis 7 + Bull |
| Autenticação | Google OAuth 2.0 + JWT + NextAuth.js 4 |
| IA | OpenAI SDK v4 (GPT-4 / GPT-3.5-turbo) |
| Google APIs | mybusinessaccountmanagement v1 + mybusinessbusinessinformation v1 |
| Estilização | Tailwind CSS 3 |
| Proxy / HTTPS | nginx (TLS 1.2/1.3) |
| Monitoramento | Sentry (@sentry/node + @sentry/nextjs) |
| Testes | Jest + @nestjs/testing |
| Containers | Docker + Docker Compose |

---

## Arquitetura

```
Browser (:3000)  ──HTTPS──▶  nginx  ──▶  Frontend (Next.js :3000)
                                    └──▶  Backend API (NestJS :3001)
                                                    │
                        ┌───────────────────────────┼──────────────────┐
                        ▼                           ▼                  ▼
                PostgreSQL :5432            Redis :6379         APIs Externas
                (Prisma ORM)               (Bull Queues)   Google + OpenAI + Sentry
```

**Fluxo principal:**

```
1. Login Google OAuth → backend emite JWT → /auth/callback → localStorage
2. CRON (6h) ou manual → enfileira sync Bull → processor busca Google API
3. Usuário clica "Gerar resposta" → AiService → GPT-4 → resposta como DRAFT
4. Modo MANUAL: usuário revisa → aprova → publica
   Modo SEMI_AUTO: nota ≥ 4★ publica automático; nota < 4★ aguarda revisão
   Modo AUTO: publica imediatamente para qualquer nota
5. GoogleService.postReply() → REST direto → Google Business Profile API v4
```

---

## Pré-requisitos

- **Node.js** 20 LTS
- **Docker** e **Docker Compose**
- **Conta Google Cloud** com Google Business Profile API habilitada
- **Chave da API OpenAI**

---

## Instalação e Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/jazzinis-code/SassGMN.git
cd SassGMN
```

### 2. Instalar dependências

```bash
npm install          # instala todos os workspaces (backend + frontend)
```

### 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edite os dois arquivos com seus valores reais
```

### 4. Subir infraestrutura (banco + redis)

```bash
docker-compose up -d
docker-compose ps    # verifique se ambos estão healthy
```

### 5. Rodar migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 6. Iniciar em desenvolvimento

```bash
# Terminal 1 — Backend (:3001)
npm run dev:backend

# Terminal 2 — Frontend (:3000)
npm run dev:frontend
```

Acesse: **http://localhost:3000**  
Swagger: **http://localhost:3001/api/docs**

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL | ✅ |
| `REDIS_HOST` | Host do Redis | ✅ |
| `REDIS_PORT` | Porta do Redis (padrão: 6379) | — |
| `GOOGLE_CLIENT_ID` | ID OAuth Google | ✅ |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | ✅ |
| `GOOGLE_CALLBACK_URL` | URL de callback OAuth backend | ✅ |
| `JWT_SECRET` | Chave secreta JWT (32+ chars) | ✅ |
| `JWT_EXPIRES_IN` | Expiração do JWT (padrão: 7d) | — |
| `OPENAI_API_KEY` | Chave da API OpenAI | ✅ |
| `OPENAI_MODEL` | Modelo OpenAI (padrão: gpt-4) | — |
| `PORT` | Porta do servidor (padrão: 3001) | — |
| `FRONTEND_URL` | URL do frontend para CORS | ✅ |
| `REVIEWS_SYNC_CRON` | Expressão cron do sync automático | — |
| `SENTRY_DSN` | DSN do Sentry (opcional) | — |
| `APP_VERSION` | Versão para rastreamento Sentry | — |

### Frontend (`frontend/.env`)

| Variável | Descrição | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL da API backend | ✅ |
| `NEXTAUTH_URL` | URL base do NextAuth | ✅ |
| `NEXTAUTH_SECRET` | Chave secreta NextAuth (32+ chars) | ✅ |
| `GOOGLE_CLIENT_ID` | ID OAuth Google | ✅ |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth Google | ✅ |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN do Sentry browser (opcional) | — |
| `NEXT_PUBLIC_APP_VERSION` | Versão para rastreamento Sentry | — |

---

## Configuração do Google Cloud

### 1. Ativar APIs

No [Google Cloud Console](https://console.cloud.google.com/) → APIs e Serviços → Biblioteca, ative:

- **Google Business Profile API**
- **My Business Account Management API**
- **My Business Business Information API**

### 2. Tela de consentimento OAuth

- Tipo: **Externo**
- Escopos necessários:
  - `openid`, `email`, `profile`
  - `https://www.googleapis.com/auth/business.manage`
- Adicione seu email como usuário de teste (modo de teste)

### 3. Credenciais OAuth 2.0

Tipo: **Aplicativo da Web**

URIs de redirecionamento autorizados:
```
http://localhost:3001/auth/google/callback    # backend (dev)
https://api.seudominio.com/auth/google/callback  # backend (prod)
```

> ⚠️ O escopo `business.manage` requer verificação do Google para uso em produção com usuários externos.

---

## Configuração da OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com/) → API Keys → Create new key
2. Adicione ao `backend/.env` como `OPENAI_API_KEY`

| Modelo | Qualidade | Custo | Recomendação |
|---|---|---|---|
| `gpt-4` | Excelente | Alto | Produção com alta qualidade |
| `gpt-4-turbo` | Excelente | Médio | Melhor custo-benefício |
| `gpt-3.5-turbo` | Boa | Baixo | Desenvolvimento / testes |

---

## Deploy em Produção

### Build completo com Docker

```bash
# Gera certificado autoassinado para testes (produção: use Let's Encrypt)
chmod +x nginx/generate-certs-dev.sh
./nginx/generate-certs-dev.sh

# Build e sobe todos os serviços
docker-compose -f docker-compose.prod.yml up -d --build
```

O `docker-compose.prod.yml` inclui:
- **postgres** — banco de dados com healthcheck
- **redis** — cache e filas com healthcheck
- **migrate** — job de migration (roda uma vez e encerra)
- **backend** — NestJS API na porta 3001
- **frontend** — Next.js standalone na porta 3000
- **nginx** — proxy reverso com HTTPS nas portas 80/443

### Certificados Let's Encrypt (produção)

```bash
# Gerar certificados reais com Certbot
docker run --rm \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d app.seudominio.com \
  -d api.seudominio.com \
  --email seu@email.com --agree-tos --non-interactive

# Copiar para nginx/ssl/
cp /etc/letsencrypt/live/seudominio.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/seudominio.com/privkey.pem   nginx/ssl/
```

### Checklist de produção

- [ ] `JWT_SECRET` e `NEXTAUTH_SECRET` com 32+ caracteres aleatórios
- [ ] `SENTRY_DSN` configurado (obter em sentry.io)
- [ ] Certificados TLS configurados em `nginx/ssl/`
- [ ] Variável `NODE_ENV=production` definida
- [ ] Backups automáticos do PostgreSQL configurados
- [ ] `GOOGLE_CALLBACK_URL` apontando para domínio de produção

---

## Documentação da API

Swagger disponível em: `http://localhost:3001/api/docs`

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/auth/google` | Inicia OAuth Google |
| GET | `/auth/google/callback` | Callback OAuth → JWT → redirect |
| GET | `/auth/me` | Usuário autenticado |
| GET | `/users/me` | Perfil do usuário |
| PATCH | `/users/me` | Atualizar nome |
| GET | `/users/audit-log` | Histórico de ações do usuário |
| POST | `/businesses` | Criar empresa |
| GET | `/businesses` | Listar empresas (paginado) |
| GET | `/businesses/:id` | Detalhe da empresa |
| PATCH | `/businesses/:id` | Atualizar empresa |
| DELETE | `/businesses/:id` | Remover empresa |
| POST | `/businesses/:id/connect-google` | Vincular perfil Google |
| GET | `/reviews` | Listar avaliações (filtros + paginação) |
| GET | `/reviews/:id` | Detalhe da avaliação |
| POST | `/reviews/sync/:businessId` | Enfileirar sync |
| PATCH | `/reviews/:id/status` | Atualizar status |
| GET | `/responses` | Histórico de respostas |
| GET | `/responses/review/:reviewId` | Respostas de uma avaliação |
| POST | `/responses/generate/:reviewId` | Gerar com IA (rate limit: 10/min) |
| PATCH | `/responses/:id/approve` | Aprovar |
| PATCH | `/responses/:id/reject` | Rejeitar |
| POST | `/responses/:id/publish` | Publicar no Google |
| GET | `/google/profiles` | Listar perfis Google Business |
| GET | `/dashboard/stats` | Métricas reais do dashboard |

---

## Banco de Dados

**PostgreSQL 15** via **Prisma 5** — 1 migration inicial (`20240101000000_init`)

```
User ──1:N──▶ Business ──1:N──▶ Review ──1:N──▶ Response
User ──1:N──▶ GoogleToken
User ──1:N──▶ AuditLog
```

| Enum | Valores |
|---|---|
| `Plan` | FREE · PRO · ENTERPRISE |
| `AutomationMode` | MANUAL · SEMI_AUTO · AUTO |
| `ReviewResponseStatus` | PENDING · GENERATED · APPROVED · PUBLISHED · REJECTED |
| `ResponseStatus` | DRAFT · APPROVED · PUBLISHED · REJECTED |

---

## Modos de Automação

| Modo | Comportamento | Uso Ideal |
|---|---|---|
| **MANUAL** | IA gera resposta como DRAFT; usuário revisa, edita e aprova antes de publicar | Controle total sobre cada resposta |
| **SEMI_AUTO** | Avaliações 4-5★: publica automaticamente. Avaliações 1-3★: aguarda revisão manual | Alto volume sem abrir mão do controle nas negativas |
| **AUTO** | Gera e publica imediatamente para qualquer nota | Altíssimo volume com configurações bem ajustadas |

---

## Monitoramento

O projeto usa **Sentry** para rastreamento de erros em produção.

**Backend:** reporta automaticamente erros HTTP 5xx com contexto (URL, método, status).  
**Frontend:** captura erros React (via `global-error.tsx`), erros de Server Components e erros de browser com Session Replay.

Para ativar, configure `SENTRY_DSN` (backend) e `NEXT_PUBLIC_SENTRY_DSN` (frontend) com o DSN do seu projeto em [sentry.io](https://sentry.io).

---

## Testes

```bash
# Rodar todos os testes unitários
cd backend && npx jest --forceExit

# Rodar com cobertura
cd backend && npx jest --coverage --forceExit

# Rodar suíte específica
cd backend && npx jest --testPathPattern="ai.service.spec" --forceExit
```

**Cobertura atual:** 67 testes em 3 suítes
- `ai.service.spec.ts` — 28 testes (AiService completo)
- `responses.service.spec.ts` — 33 testes (ResponsesService completo)
- `audit.service.spec.ts` — 6 testes (AuditService)

---

## Contribuindo

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     nova funcionalidade
fix:      correção de bug
docs:     documentação
refactor: refatoração sem mudança de comportamento
test:     testes
chore:    manutenção, deps, config
```

**Diretrizes:**
- TypeScript com tipagem explícita
- Padrão modular NestJS (module/controller/service)
- Testes para qualquer nova lógica de negócio
- PRs com descrição clara do que foi alterado e por quê

---

## Licença

MIT — veja [LICENSE](LICENSE) para detalhes.
